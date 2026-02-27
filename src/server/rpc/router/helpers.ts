import { db } from '@server/db'
import {
	createRPCRouter,
	publicProcedure,
	type RpcContextType,
} from '@server/rpc/init'
import z from 'zod'
import { type AuthRole, assertRole } from './authz'

type TableNames = keyof RpcContextType['db']['schemas']

type TransitionMap = Record<string, readonly string[]>
type ViewTableMap = Record<string, string>
type ParentRelationConstraint = {
	childField: string
	parentTable: TableNames
	parentField?: string
	required?: boolean
	errorMessage?: string
}

/** Generic table interface for the dynamic CRUD helper — avoids uncallable union signatures */
interface GenericTable {
	findMany(options?: {
		where?: (item: Record<string, any>) => boolean
		orderBy?: { field: string; direction: 'asc' | 'desc' }
		limit?: number
		offset?: number
		columns?: Record<string, boolean>
		with?: Record<string, boolean>
	}): Record<string, any>[]
	get(id: string): Record<string, any> | undefined
	insert(item: Record<string, any>): Record<string, any>
	update(
		id: string,
		updates: Record<string, any>,
	): Record<string, any> | undefined
	delete(id: string): boolean
	insertSchema?: z.ZodObject<any>
	updateSchema?: z.ZodObject<any>
}

export interface CrudRouterConfig {
	moduleName: string
	prefix?: string
	primaryTable: TableNames
	viewTables: ViewTableMap
	parentRelations?: ParentRelationConstraint[]
	statusField?: string
	transitions?: TransitionMap
	reasonRequiredStatuses?: readonly string[]
	statusRoleRequirements?: Partial<Record<string, AuthRole>>
	rolePolicy?: Partial<CrudRolePolicy>
	createSchema?: z.ZodObject<any>
	updateSchema?: z.ZodObject<any>
}

export interface CrudRolePolicy {
	list: AuthRole
	listViewRecords: AuthRole
	getById: AuthRole
	create: AuthRole
	update: AuthRole
	delete: AuthRole
	transitionStatus: AuthRole
	kpis: AuthRole
}

const DEFAULT_CRUD_ROLE_POLICY: CrudRolePolicy = {
	list: 'VIEWER',
	listViewRecords: 'VIEWER',
	getById: 'VIEWER',
	create: 'AGENT',
	update: 'AGENT',
	delete: 'MANAGER',
	transitionStatus: 'AGENT',
	kpis: 'VIEWER',
}
function getTable(
	context: RpcContextType,
	tableName: TableNames,
): GenericTable {
	const table = context.db.schemas[tableName]
	if (!table) {
		throw new Error(`Table "${tableName}" is not available`)
	}
	return table as GenericTable
}

function ensureTenantAccess(
	row: Record<string, any> | undefined,
	tenantId: string,
	resourceName: string,
): asserts row is Record<string, any> {
	if (!row) {
		throw new Error(`${resourceName} not found`)
	}
	if ((row.tenantId ?? 'demo-tenant') !== tenantId) {
		throw new Error(`Cross-tenant access is not allowed`)
	}
}

function collectStatuses(
	rows: Record<string, any>[],
	statusField: string | undefined,
) {
	if (!statusField) return {}

	const counts: Record<string, number> = {}
	for (const row of rows) {
		const statusValue = row[statusField]
		if (!statusValue) continue
		const key = String(statusValue)
		counts[key] = (counts[key] ?? 0) + 1
	}
	return counts
}

function resolveSchemas(config: CrudRouterConfig) {
	const table = db.schemas[config.primaryTable] as GenericTable | undefined
	const createSchema =
		config.createSchema ?? table?.insertSchema ?? z.object({})
	const updateSchema =
		config.updateSchema ?? table?.updateSchema ?? z.object({})
	return { createSchema, updateSchema }
}

const filterValueSchema = z.object({
	operator: z.string(),
	value: z
		.union([z.string(), z.number(), z.boolean(), z.array(z.string())])
		.optional(),
	endValue: z.union([z.string(), z.number()]).optional(),
})

const structuredFiltersSchema = z
	.array(
		z.object({
			id: z.string(),
			value: filterValueSchema,
		}),
	)
	.optional()

const queryOptsSchema = z.object({
	with: z.record(z.string(), z.boolean()).optional(),
	filters: z
		.record(
			z.string(),
			z.union([z.string(), z.number(), z.boolean(), z.null()]),
		)
		.optional(),
	structuredFilters: structuredFiltersSchema,
	orderBy: z
		.object({
			field: z.string(),
			direction: z.enum(['asc', 'desc']).default('asc'),
		})
		.optional(),
	columns: z.record(z.string(), z.boolean()).optional(),
})

function isDateStr(value: unknown): boolean {
	if (value instanceof Date) return !Number.isNaN(value.getTime())
	if (typeof value === 'string') {
		const d = new Date(value)
		return !Number.isNaN(d.getTime())
	}
	return false
}

function toDateStr(value: unknown): string {
	return new Date(value as string | Date).toDateString()
}

export function createTenantScopedCrudRouter(config: CrudRouterConfig) {
	const { createSchema, updateSchema } = resolveSchemas(config)
	const matchesFilters = (
		row: Record<string, any>,
		filters: Record<string, string | number | boolean | null> | undefined,
	) => {
		if (!filters) return true
		for (const [key, value] of Object.entries(filters)) {
			const rowValue = row[key]
			if (value === null) {
				if (rowValue !== null && rowValue !== undefined) return false
				continue
			}
			if (rowValue !== value) return false
		}
		return true
	}

	const matchesStructuredFilters = (
		row: Record<string, any>,
		filters:
			| Array<{
					id: string
					value: { operator: string; value?: any; endValue?: any }
			  }>
			| undefined,
	) => {
		if (!filters || filters.length === 0) return true
		for (const filter of filters) {
			const cellValue = row[filter.id]
			const { operator, value, endValue } = filter.value

			// Empty/not-empty checks
			if (operator === 'isEmpty') {
				const empty =
					cellValue == null ||
					cellValue === '' ||
					(Array.isArray(cellValue) && cellValue.length === 0)
				if (!empty) return false
				continue
			}
			if (operator === 'isNotEmpty') {
				const empty =
					cellValue == null ||
					cellValue === '' ||
					(Array.isArray(cellValue) && cellValue.length === 0)
				if (empty) return false
				continue
			}

			// Boolean operators
			if (operator === 'isTrue') {
				if (cellValue !== true) return false
				continue
			}
			if (operator === 'isFalse') {
				if (cellValue !== false && cellValue) return false
				continue
			}

			// Skip if no filter value provided
			if (value === undefined || value === null || value === '') continue

			const cellStr = String(cellValue ?? '').toLowerCase()
			const valStr =
				typeof value === 'string' ? value.toLowerCase() : String(value)

			// Text operators
			if (operator === 'contains') {
				if (!cellStr.includes(valStr)) return false
				continue
			}
			if (operator === 'notContains') {
				if (cellStr.includes(valStr)) return false
				continue
			}
			if (operator === 'startsWith') {
				if (!cellStr.startsWith(valStr)) return false
				continue
			}
			if (operator === 'endsWith') {
				if (!cellStr.endsWith(valStr)) return false
				continue
			}

			// Equality (handles number, date, string)
			if (operator === 'equals') {
				if (typeof cellValue === 'number' && typeof value === 'number') {
					if (cellValue !== value) return false
				} else if (typeof value === 'string' && isDateStr(cellValue)) {
					if (toDateStr(cellValue) !== toDateStr(value)) return false
				} else {
					if (cellStr !== valStr) return false
				}
				continue
			}
			if (operator === 'notEquals') {
				if (typeof cellValue === 'number' && typeof value === 'number') {
					if (cellValue === value) return false
				} else if (typeof value === 'string' && isDateStr(cellValue)) {
					if (toDateStr(cellValue) === toDateStr(value)) return false
				} else {
					if (cellStr === valStr) return false
				}
				continue
			}

			// Numeric operators
			if (typeof cellValue === 'number' && typeof value === 'number') {
				if (operator === 'greaterThan' && !(cellValue > value)) return false
				if (operator === 'greaterThanOrEqual' && !(cellValue >= value))
					return false
				if (operator === 'lessThan' && !(cellValue < value)) return false
				if (operator === 'lessThanOrEqual' && !(cellValue <= value))
					return false
				if (
					operator === 'isBetween' &&
					typeof endValue === 'number' &&
					!(cellValue >= value && cellValue <= endValue)
				)
					return false
				continue
			}

			// Date operators
			if (typeof value === 'string' && isDateStr(cellValue)) {
				const cellDate = new Date(cellValue)
				const filterDate = new Date(value)
				if (operator === 'before' && !(cellDate < filterDate)) return false
				if (operator === 'after' && !(cellDate > filterDate)) return false
				if (operator === 'onOrBefore' && !(cellDate <= filterDate)) return false
				if (operator === 'onOrAfter' && !(cellDate >= filterDate)) return false
				if (operator === 'isBetween' && typeof endValue === 'string') {
					const endDate = new Date(endValue)
					if (!(cellDate >= filterDate && cellDate <= endDate)) return false
				}
				continue
			}

			// Select operators
			if (operator === 'is') {
				const match = Array.isArray(cellValue)
					? cellValue.some((v: any) => String(v) === String(value))
					: String(cellValue) === String(value)
				if (!match) return false
				continue
			}
			if (operator === 'isNot') {
				const match = Array.isArray(cellValue)
					? cellValue.some((v: any) => String(v) === String(value))
					: String(cellValue) === String(value)
				if (match) return false
				continue
			}
			if (operator === 'isAnyOf' && Array.isArray(value)) {
				const match = Array.isArray(cellValue)
					? cellValue.some((v: any) =>
							value.some((fv: string) => String(v) === String(fv)),
						)
					: value.some((fv: string) => String(cellValue) === String(fv))
				if (!match) return false
				continue
			}
			if (operator === 'isNoneOf' && Array.isArray(value)) {
				const match = Array.isArray(cellValue)
					? cellValue.some((v: any) =>
							value.some((fv: string) => String(v) === String(fv)),
						)
					: value.some((fv: string) => String(cellValue) === String(fv))
				if (match) return false
			}
		}
		return true
	}

	const listInputSchema = z
		.object({
			limit: z.number().min(1).max(200).default(25),
			offset: z.number().min(0).default(0),
			search: z.string().max(200).optional(),
		})
		.merge(queryOptsSchema)
		.default({ limit: 25, offset: 0 })

	const getByIdInputSchema = z
		.object({
			id: z.string(),
		})
		.merge(queryOptsSchema)

	const deleteInputSchema = z.object({
		id: z.string(),
	})

	const transitionSchema = z.object({
		id: z.string(),
		toStatus: z.string(),
		reason: z.string().optional(),
	})

	const viewListInputSchema = z
		.object({
			viewId: z.string(),
			limit: z.number().min(1).max(200).default(25),
			offset: z.number().min(0).default(0),
			search: z.string().max(200).optional(),
		})
		.merge(queryOptsSchema)
		.default({ viewId: 'overview', limit: 25, offset: 0 })

	const NAME = config.prefix ?? config.moduleName
	const rolePolicy: CrudRolePolicy = {
		...DEFAULT_CRUD_ROLE_POLICY,
		...config.rolePolicy,
	}

	const validateParentRelations = ({
		context,
		tenantId,
		payload,
	}: {
		context: RpcContextType
		tenantId: string
		payload: Record<string, unknown>
	}) => {
		for (const relation of config.parentRelations ?? []) {
			const value = payload[relation.childField]
			const required = relation.required ?? true
			if (value === undefined || value === null || value === '') {
				if (required) {
					throw new Error(
						relation.errorMessage ??
							`${NAME} requires "${relation.childField}" to reference a parent record`,
					)
				}
				continue
			}

			const parentTable = getTable(context, relation.parentTable)
			const parentField = relation.parentField ?? '_id'
			const parentRecord = parentTable.findMany({
				where: (row) =>
					(row.tenantId ?? 'demo-tenant') === tenantId &&
					row[parentField] === value,
				limit: 1,
				columns: { _id: true },
			})[0]

			if (!parentRecord) {
				throw new Error(
					relation.errorMessage ??
						`Invalid "${relation.childField}": parent not found`,
				)
			}
		}
	}

	return createRPCRouter(
		{
			list: publicProcedure
				.input(listInputSchema)
				.route({ method: 'GET', summary: `List ${NAME}` })
				.handler(({ input, context }) => {
					assertRole(context, rolePolicy.list, `${NAME} list`)
					const table = getTable(context, config.primaryTable)
					const tenantId = context.auth.tenantId
					const search = input.search?.trim().toLowerCase()

					const items = table.findMany({
						where: (row) => {
							if ((row.tenantId ?? 'demo-tenant') !== tenantId) return false
							if (!matchesFilters(row, input.filters)) return false
							if (!matchesStructuredFilters(row, input.structuredFilters))
								return false
							if (search) {
								return Object.values(row).some((v: any) => {
									if (v == null) return false
									return String(v).toLowerCase().includes(search)
								})
							}
							return true
						},
						orderBy: input.orderBy ?? {
							field: '_updatedAt',
							direction: 'desc',
						},
						limit: input.limit,
						offset: input.offset,
						columns: input.columns,
						with: input.with,
					})

					return {
						items,
						nextOffset:
							items.length === input.limit ? input.offset + input.limit : null,
					}
				}),

			listViewRecords: publicProcedure
				.input(viewListInputSchema)
				.route({ method: 'GET', summary: `List ${NAME} view` })
				.handler(({ input, context }) => {
					assertRole(
						context,
						rolePolicy.listViewRecords,
						`${NAME} list view records`,
					)
					const tableName = (config.viewTables[input.viewId] ??
						config.primaryTable) as TableNames
					const table = getTable(context, tableName)
					const tenantId = context.auth.tenantId
					const search = input.search?.trim().toLowerCase()

					const items = table.findMany({
						where: (row) => {
							if ((row.tenantId ?? 'demo-tenant') !== tenantId) return false
							if (!matchesFilters(row, input.filters)) return false
							if (!matchesStructuredFilters(row, input.structuredFilters))
								return false
							if (search) {
								return Object.values(row).some((v: any) => {
									if (v == null) return false
									return String(v).toLowerCase().includes(search)
								})
							}
							return true
						},
						orderBy: input.orderBy ?? {
							field: '_updatedAt',
							direction: 'desc',
						},
						limit: input.limit,
						offset: input.offset,
						columns: input.columns,
						with: input.with,
					})

					return {
						tableName,
						viewId: input.viewId,
						items,
						nextOffset:
							items.length === input.limit ? input.offset + input.limit : null,
					}
				}),

			getById: publicProcedure
				.input(getByIdInputSchema)
				.route({ method: 'GET', summary: `Get ${NAME} by ID` })
				.handler(({ input, context }) => {
					assertRole(context, rolePolicy.getById, `${NAME} get by id`)
					const table = getTable(context, config.primaryTable)
					const hasQueryOpts = input.with || input.columns
					if (hasQueryOpts) {
						const rows = table.findMany({
							where: (row) => row._id === input.id,
							limit: 1,
							columns: input.columns,
							with: input.with,
						})
						const row = rows[0]
						ensureTenantAccess(row, context.auth.tenantId, config.primaryTable)
						return row
					}
					const row = table.get(input.id)
					ensureTenantAccess(row, context.auth.tenantId, config.primaryTable)
					return row
				}),

			create: publicProcedure
				.input(createSchema)
				.route({ method: 'POST', summary: `Create ${NAME}` })
				.handler(({ input, context }) => {
					assertRole(context, rolePolicy.create, `${NAME} create`)
					const table = getTable(context, config.primaryTable)
					const payload = {
						...input,
						tenantId: context.auth.tenantId,
						createdByUserId: context.auth.userId,
						updatedByUserId: context.auth.userId,
					}
					validateParentRelations({
						context,
						tenantId: context.auth.tenantId,
						payload,
					})

					return table.insert(payload)
				}),

			update: publicProcedure
				.input(
					z.object({
						id: z.string(),
						data: updateSchema,
					}),
				)
				.route({ method: 'PATCH', summary: `Update ${NAME}` })
				.handler(({ input, context }) => {
					assertRole(context, rolePolicy.update, `${NAME} update`)
					const table = getTable(context, config.primaryTable)
					const existing = table.get(input.id)
					ensureTenantAccess(
						existing,
						context.auth.tenantId,
						config.primaryTable,
					)

					const payload = {
						...existing,
						...input.data,
					}
					validateParentRelations({
						context,
						tenantId: context.auth.tenantId,
						payload,
					})

					return table.update(input.id, {
						...input.data,
						updatedByUserId: context.auth.userId,
					})
				}),

			delete: publicProcedure
				.input(deleteInputSchema)
				.route({ method: 'DELETE', summary: `Delete ${NAME}` })
				.handler(({ input, context }) => {
					assertRole(context, rolePolicy.delete, `${NAME} delete`)
					const table = getTable(context, config.primaryTable)
					const existing = table.get(input.id)
					ensureTenantAccess(
						existing,
						context.auth.tenantId,
						config.primaryTable,
					)
					return { deleted: table.delete(input.id) }
				}),

			transitionStatus: publicProcedure
				.input(transitionSchema)
				.route({
					method: 'POST',
					summary: `Transition ${NAME} status`,
				})
				.handler(({ input, context }) => {
					if (!config.statusField) {
						throw new Error(`${NAME} does not have workflow status configured`)
					}
					assertRole(
						context,
						rolePolicy.transitionStatus,
						`${NAME} status transition`,
					)
					const requiredRole = config.statusRoleRequirements?.[input.toStatus]
					if (requiredRole) {
						assertRole(
							context,
							requiredRole,
							`${NAME} transition to "${input.toStatus}"`,
						)
					}

					const table = getTable(context, config.primaryTable)
					const existing = table.get(input.id)
					ensureTenantAccess(
						existing,
						context.auth.tenantId,
						config.primaryTable,
					)

					const currentStatus = String(existing[config.statusField] ?? '')
					if (config.transitions && currentStatus in config.transitions) {
						const allowed = config.transitions[currentStatus] ?? []
						if (!allowed.includes(input.toStatus)) {
							throw new Error(
								`Transition "${currentStatus}" -> "${input.toStatus}" is not allowed`,
							)
						}
					}

					if (
						config.reasonRequiredStatuses?.includes(input.toStatus) &&
						!input.reason
					) {
						throw new Error(
							`A reason is required for status "${input.toStatus}"`,
						)
					}

					const updatePayload: Record<string, unknown> = {
						[config.statusField]: input.toStatus,
						updatedByUserId: context.auth.userId,
					}

					if ('statusUpdatedAt' in existing) {
						updatePayload.statusUpdatedAt = new Date()
					}
					if ('statusReason' in existing && input.reason) {
						updatePayload.statusReason = input.reason
					}

					return table.update(input.id, updatePayload)
				}),

			kpis: publicProcedure
				.input(z.object({}).default({}))
				.route({ method: 'GET', summary: `Get ${NAME} KPIs` })
				.handler(({ context }) => {
					assertRole(context, rolePolicy.kpis, `${NAME} kpis`)
					const table = getTable(context, config.primaryTable)
					const tenantId = context.auth.tenantId
					const tenantFilter = (row: any) =>
						(row.tenantId ?? 'demo-tenant') === tenantId

					// Use column selection for status counting to avoid triggering expensive computed fields
					const scopedRows = table.findMany({
						where: tenantFilter,
						...(config.statusField
							? { columns: { _id: true, [config.statusField]: true } }
							: { columns: { _id: true } }),
					})

					// Only fetch 5 recent records with full data
					const recent = table.findMany({
						where: tenantFilter,
						orderBy: { field: '_updatedAt', direction: 'desc' as const },
						limit: 5,
					})

					return {
						total: scopedRows.length,
						statusCounts: collectStatuses(scopedRows, config.statusField),
						recent,
					}
				}),
		},
		{
			tags: [config.moduleName],
		},
	)
}
