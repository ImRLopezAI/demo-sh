import {
	BUILT_IN_LAYOUT_KEYS,
	type BuiltInLayoutKey,
	buildGenericDataSet,
	dataSetDefinitionSchema,
	executeDataSet,
	findDataSetForEntity,
	getBuiltInLayout,
	listBuiltInLayouts,
	parseDataSetObject,
	parseLayoutDraft,
	REPORT_MODULE_IDS,
	REPORTING_ALLOWED_TABLES,
	renderReportFile,
	reportLayoutSchema,
	validateLayout,
} from '@server/reporting'
import type { DataSetDefinition } from '@server/reporting/contracts'
import {
	createRPCRouter,
	publicProcedure,
	type RpcContextType,
} from '@server/rpc/init'
import z from 'zod'
import { assertRole } from '../authz'

const filterValueSchema = z.union([
	z.string(),
	z.number(),
	z.boolean(),
	z.null(),
])

const generateReportInputSchema = z.object({
	moduleId: z.enum(REPORT_MODULE_IDS),
	entityId: z.string().trim().min(1).max(120),
	layoutId: z.string().trim().optional(),
	builtInLayout: z.enum(BUILT_IN_LAYOUT_KEYS).optional(),
	filters: z.record(z.string(), filterValueSchema).optional(),
	limit: z.number().int().min(1).max(5000).default(200),
	ids: z.array(z.string().trim().min(1)).max(500).optional(),
})

const previewReportInputSchema = generateReportInputSchema.extend({
	layoutDraft: z.string().optional(),
	datasetDraft: dataSetDefinitionSchema.optional(),
	previewOptions: z
		.object({
			rowLimit: z.number().int().min(1).max(500).default(50),
			page: z.number().int().min(1).default(1),
			sampleMode: z.enum(['HEAD', 'RANDOM']).default('HEAD'),
		})
		.optional(),
})

const createLayoutInputSchema = z.object({
	moduleId: z.enum(REPORT_MODULE_IDS),
	entityId: z.string().trim().min(1).max(120),
	name: z.string().trim().min(1).max(120),
	baseTemplate: z.enum(BUILT_IN_LAYOUT_KEYS).default('A4_SUMMARY'),
	layoutDraft: z.string().optional(),
	dataSetDraft: dataSetDefinitionSchema.optional(),
})

const saveLayoutVersionInputSchema = z.object({
	layoutId: z.string().trim().min(1),
	layoutDraft: z.string().min(2),
	dataSetDraft: dataSetDefinitionSchema.optional(),
	name: z.string().trim().min(1).max(120).optional(),
	active: z.boolean().optional(),
})

const setDefaultLayoutInputSchema = z
	.object({
		moduleId: z.enum(REPORT_MODULE_IDS),
		entityId: z.string().trim().min(1).max(120),
		layoutId: z.string().trim().optional(),
		builtInLayout: z.enum(BUILT_IN_LAYOUT_KEYS).optional(),
	})
	.refine((value) => Boolean(value.layoutId || value.builtInLayout), {
		message: 'Either layoutId or builtInLayout is required',
	})

const listLayoutsInputSchema = z
	.object({
		moduleId: z.enum(REPORT_MODULE_IDS).optional(),
		entityId: z.string().optional(),
		includeSystem: z.boolean().default(true),
		includeInactive: z.boolean().default(false),
	})
	.default({
		includeSystem: true,
		includeInactive: false,
	})

const getLayoutInputSchema = z
	.object({
		layoutId: z.string().trim().optional(),
		builtInLayout: z.enum(BUILT_IN_LAYOUT_KEYS).optional(),
	})
	.refine((value) => Boolean(value.layoutId || value.builtInLayout), {
		message: 'Either layoutId or builtInLayout is required',
	})

const listLayoutItemSchema = z.object({
	id: z.string(),
	key: z.string().nullable(),
	name: z.string(),
	pageSize: z.enum(['A4', 'LETTER', 'THERMAL']),
	orientation: z.enum(['portrait', 'landscape']),
	blockCount: z.number().int().min(1),
	source: z.enum(['SYSTEM', 'CUSTOM']),
	moduleId: z.string().optional(),
	entityId: z.string().optional(),
	active: z.boolean().optional(),
	versionNo: z.number().int().min(1).optional(),
	isDefault: z.boolean().optional(),
	hasDataset: z.boolean().optional(),
})

const getLayoutResultSchema = z.object({
	id: z.string(),
	key: z.string().nullable(),
	name: z.string(),
	source: z.enum(['SYSTEM', 'CUSTOM']),
	moduleId: z.string().optional(),
	entityId: z.string().optional(),
	active: z.boolean(),
	versionNo: z.number().int().min(1),
	layout: reportLayoutSchema,
	datasetDefinition: dataSetDefinitionSchema.optional(),
})

const layoutMutationResultSchema = z.object({
	layoutId: z.string(),
	moduleId: z.string(),
	entityId: z.string(),
	name: z.string(),
	versionNo: z.number().int().min(1),
	active: z.boolean(),
})

function readTenantId(row: unknown): string {
	return (row as { tenantId?: string }).tenantId ?? 'demo-tenant'
}

function randomSampleRows<T>(rows: T[], maxRows: number): T[] {
	if (rows.length <= maxRows) return rows
	const sampled = [...rows]
	for (let i = sampled.length - 1; i > 0; i -= 1) {
		const j = Math.floor(Math.random() * (i + 1))
		const tmp = sampled[i]
		sampled[i] = sampled[j] as T
		sampled[j] = tmp as T
	}
	return sampled.slice(0, maxRows)
}

function parseStoredLayout(layoutJson: string) {
	try {
		return validateLayout(JSON.parse(layoutJson) as unknown)
	} catch {
		throw new Error('Stored layout schema is invalid')
	}
}

function loadCustomLayout(
	context: RpcContextType,
	layoutId: string,
	opts?: { requireActive?: boolean },
) {
	const row = context.db.schemas.reportLayouts.get(layoutId)
	if (!row || readTenantId(row) !== context.auth.tenantId) {
		throw new Error('Report layout not found')
	}
	if (opts?.requireActive && !row.active) {
		throw new Error('Report layout is inactive')
	}
	return {
		row,
		layout: parseStoredLayout(row.schemaJson),
	}
}

function resolveLayout(params: {
	context: RpcContextType
	moduleId: (typeof REPORT_MODULE_IDS)[number]
	entityId: string
	layoutId?: string
	builtInLayout?: BuiltInLayoutKey
	layoutDraft?: string
}) {
	if (params.layoutDraft) {
		const parsed = parseLayoutDraft(params.layoutDraft)
		if (!parsed) {
			throw new Error('Layout draft is not valid JSON schema')
		}
		return {
			layout: validateLayout(parsed),
			layoutRef: 'DRAFT',
			datasetDefinition: undefined,
		}
	}

	if (params.layoutId) {
		const loaded = loadCustomLayout(params.context, params.layoutId, {
			requireActive: true,
		})
		return {
			layout: loaded.layout,
			layoutRef: loaded.row._id,
			datasetDefinition: loaded.row.datasetDefinition as
				| DataSetDefinition
				| undefined,
		}
	}

	if (params.builtInLayout) {
		const builtIn = getBuiltInLayout(params.builtInLayout)
		if (!builtIn)
			throw new Error(`Unknown built-in layout: ${params.builtInLayout}`)
		return {
			layout: builtIn,
			layoutRef: params.builtInLayout,
			datasetDefinition: undefined,
		}
	}

	const defaultLayout = params.context.db.schemas.reportDefaults.findMany({
		where: (row) =>
			readTenantId(row) === params.context.auth.tenantId &&
			row.moduleId === params.moduleId &&
			row.entityId === params.entityId,
		limit: 1,
	})[0]

	if (defaultLayout?.defaultLayoutRef) {
		if (
			(BUILT_IN_LAYOUT_KEYS as readonly string[]).includes(
				defaultLayout.defaultLayoutRef,
			)
		) {
			const builtIn = defaultLayout.defaultLayoutRef as BuiltInLayoutKey
			const builtInLayout = getBuiltInLayout(builtIn)
			if (builtInLayout) {
				return {
					layout: builtInLayout,
					layoutRef: builtIn,
					datasetDefinition: undefined,
				}
			}
		}

		const loaded = loadCustomLayout(
			params.context,
			defaultLayout.defaultLayoutRef,
			{
				requireActive: true,
			},
		)
		return {
			layout: loaded.layout,
			layoutRef: loaded.row._id,
			datasetDefinition: loaded.row.datasetDefinition as
				| DataSetDefinition
				| undefined,
		}
	}

	const fallback = getBuiltInLayout('A4_SUMMARY')
	if (!fallback) throw new Error('Default layout A4_SUMMARY not found')
	return {
		layout: fallback,
		layoutRef: 'A4_SUMMARY',
		datasetDefinition: undefined,
	}
}

function resolveDataSet(params: {
	context: RpcContextType
	moduleId: (typeof REPORT_MODULE_IDS)[number]
	entityId: string
	layoutId?: string
	datasetDefinition?: DataSetDefinition
	filters?: Record<string, string | number | boolean | null>
	limit: number
	ids?: string[]
}) {
	// Path A: Layout has a stored dataset definition (plain object)
	if (params.datasetDefinition) {
		try {
			const definition = parseDataSetObject(params.datasetDefinition)
			return executeDataSet(params.context, definition, {
				moduleId: params.moduleId,
				entityId: params.entityId,
				ids: params.ids,
				filters: params.filters,
				limit: params.limit,
			})
		} catch {
			// Fall through to generic if dataset validation fails
		}
	}

	// Path A2: Check built-in dataset for single-record requests
	if (params.ids?.length === 1) {
		const builtIn = findDataSetForEntity(params.moduleId, params.entityId)
		if (builtIn) {
			return executeDataSet(params.context, builtIn.definition, {
				moduleId: params.moduleId,
				entityId: params.entityId,
				ids: params.ids,
				filters: params.filters,
				limit: params.limit,
			})
		}
	}

	// Path B: Generic fallback (existing behavior)
	return buildGenericDataSet(params.context, {
		moduleId: params.moduleId,
		entityId: params.entityId,
		layoutId: params.layoutId,
		filters: params.filters,
		limit: params.limit,
		ids: params.ids,
	})
}

function safeJson(value: unknown): string {
	try {
		return JSON.stringify(value ?? {})
	} catch {
		return '{}'
	}
}

export const reportingRouter = createRPCRouter(
	{
		listLayouts: publicProcedure
			.input(listLayoutsInputSchema)
			.output(z.array(listLayoutItemSchema))
			.route({
				method: 'GET',
				summary: 'List built-in and custom report layouts',
			})
			.handler(({ input, context }) => {
				assertRole(context, 'VIEWER', 'report layout listing')

				const defaultLayoutRef =
					input.moduleId && input.entityId
						? context.db.schemas.reportDefaults.findMany({
								where: (row) =>
									readTenantId(row) === context.auth.tenantId &&
									row.moduleId === input.moduleId &&
									row.entityId === input.entityId,
								limit: 1,
							})[0]?.defaultLayoutRef
						: undefined

				const systemLayouts = input.includeSystem
					? listBuiltInLayouts().map((layout) => ({
							id: layout.key,
							key: layout.key,
							name: layout.name,
							pageSize: layout.pageSize,
							orientation: layout.orientation,
							blockCount: layout.blocks.length,
							source: 'SYSTEM' as const,
							moduleId: input.moduleId,
							entityId: input.entityId,
							active: true,
							versionNo: 1,
							isDefault: defaultLayoutRef === layout.key,
						}))
					: []

				const customRows = context.db.schemas.reportLayouts.findMany({
					where: (row) => {
						if (readTenantId(row) !== context.auth.tenantId) return false
						if (input.moduleId && row.moduleId !== input.moduleId) return false
						if (input.entityId && row.entityId !== input.entityId) return false
						if (!input.includeInactive && !row.active) return false
						return true
					},
					orderBy: { field: '_updatedAt', direction: 'desc' },
					limit: 1000,
				})

				const customLayouts = customRows.flatMap((row) => {
					try {
						const layout = parseStoredLayout(row.schemaJson)
						return [
							{
								id: row._id,
								key: null,
								name: row.name,
								pageSize: layout.pageSize,
								orientation: layout.orientation,
								blockCount: layout.blocks.length,
								source: 'CUSTOM' as const,
								moduleId: row.moduleId,
								entityId: row.entityId,
								active: row.active,
								versionNo: row.versionNo,
								isDefault: defaultLayoutRef === row._id,
							},
						]
					} catch {
						return []
					}
				})

				return [...customLayouts, ...systemLayouts]
			}),
		getLayout: publicProcedure
			.input(getLayoutInputSchema)
			.output(getLayoutResultSchema)
			.route({
				method: 'GET',
				summary: 'Get a report layout schema for editor and preview',
			})
			.handler(({ input, context }) => {
				assertRole(context, 'VIEWER', 'report layout read')

				if (input.layoutId) {
					const loaded = loadCustomLayout(context, input.layoutId)
					return {
						id: loaded.row._id,
						key: null,
						name: loaded.row.name,
						source: 'CUSTOM' as const,
						moduleId: loaded.row.moduleId,
						entityId: loaded.row.entityId,
						active: loaded.row.active,
						versionNo: loaded.row.versionNo,
						layout: loaded.layout,
						datasetDefinition: loaded.row.datasetDefinition as
							| DataSetDefinition
							| undefined,
					}
				}

				const builtInKey = input.builtInLayout ?? 'A4_SUMMARY'
				const builtInLayout = getBuiltInLayout(builtInKey)
				if (!builtInLayout) throw new Error(`Unknown layout: ${builtInKey}`)
				return {
					id: builtInLayout.key,
					key: builtInLayout.key,
					name: builtInLayout.name,
					source: 'SYSTEM' as const,
					moduleId: undefined,
					entityId: undefined,
					active: true,
					versionNo: 1,
					layout: builtInLayout,
				}
			}),
		createLayout: publicProcedure
			.input(createLayoutInputSchema)
			.output(layoutMutationResultSchema)
			.route({
				method: 'POST',
				summary: 'Create custom report layout from built-in or draft',
			})
			.handler(({ input, context }) => {
				assertRole(context, 'MANAGER', 'report layout create')

				const layout = input.layoutDraft
					? (() => {
							const parsed = parseLayoutDraft(input.layoutDraft)
							if (!parsed)
								throw new Error('Layout draft is not valid JSON schema')
							return validateLayout(parsed)
						})()
					: getBuiltInLayout(input.baseTemplate)

				const now = new Date().toISOString()
				const created = context.db.schemas.reportLayouts.insert({
					moduleId: input.moduleId,
					entityId: input.entityId,
					name: input.name,
					baseTemplate: input.baseTemplate,
					schemaJson: safeJson(layout),
					datasetDefinition: input.dataSetDraft,
					isSystem: false,
					active: true,
					versionNo: 1,
					createdByUserId: context.auth.userId,
					updatedByUserId: context.auth.userId,
					updatedAt: now,
				})

				context.db.schemas.reportLayoutVersions.insert({
					layoutId: created._id,
					versionNo: 1,
					schemaJson: safeJson(layout),
					datasetDefinition: input.dataSetDraft,
					changedByUserId: context.auth.userId,
					changedAt: now,
				})

				return {
					layoutId: created._id,
					moduleId: created.moduleId,
					entityId: created.entityId,
					name: created.name,
					versionNo: created.versionNo,
					active: created.active,
				}
			}),
		saveLayoutVersion: publicProcedure
			.input(saveLayoutVersionInputSchema)
			.output(layoutMutationResultSchema)
			.route({
				method: 'POST',
				summary: 'Save new version for a custom report layout',
			})
			.handler(({ input, context }) => {
				assertRole(context, 'MANAGER', 'report layout save version')
				const loaded = loadCustomLayout(context, input.layoutId)
				const parsed = parseLayoutDraft(input.layoutDraft)
				if (!parsed) {
					throw new Error('Layout draft is not valid JSON schema')
				}
				const layout = validateLayout(parsed)

				const nextVersion = loaded.row.versionNo + 1
				const now = new Date().toISOString()

				const updated = context.db.schemas.reportLayouts.update(
					loaded.row._id,
					{
						schemaJson: safeJson(layout),
						datasetDefinition:
							input.dataSetDraft ?? loaded.row.datasetDefinition,
						versionNo: nextVersion,
						name: input.name ?? loaded.row.name,
						active: input.active ?? loaded.row.active,
						updatedByUserId: context.auth.userId,
						updatedAt: now,
					},
				)
				if (!updated) {
					throw new Error('Unable to update report layout')
				}

				context.db.schemas.reportLayoutVersions.insert({
					layoutId: updated._id,
					versionNo: nextVersion,
					schemaJson: safeJson(layout),
					datasetDefinition: input.dataSetDraft ?? loaded.row.datasetDefinition,
					changedByUserId: context.auth.userId,
					changedAt: now,
				})

				return {
					layoutId: updated._id,
					moduleId: updated.moduleId,
					entityId: updated.entityId,
					name: updated.name,
					versionNo: updated.versionNo,
					active: updated.active,
				}
			}),
		setDefaultLayout: publicProcedure
			.input(setDefaultLayoutInputSchema)
			.output(
				z.object({
					moduleId: z.enum(REPORT_MODULE_IDS),
					entityId: z.string(),
					defaultLayoutRef: z.string(),
				}),
			)
			.route({
				method: 'POST',
				summary: 'Set default layout for module/entity',
			})
			.handler(({ input, context }) => {
				assertRole(context, 'MANAGER', 'set default report layout')

				let defaultLayoutRef: string | undefined = input.builtInLayout
				if (input.layoutId) {
					const loaded = loadCustomLayout(context, input.layoutId, {
						requireActive: true,
					})
					defaultLayoutRef = loaded.row._id
				}
				if (!defaultLayoutRef) {
					throw new Error('Default layout reference is required')
				}

				const now = new Date().toISOString()
				const existing = context.db.schemas.reportDefaults.findMany({
					where: (row) =>
						readTenantId(row) === context.auth.tenantId &&
						row.moduleId === input.moduleId &&
						row.entityId === input.entityId,
					limit: 1,
				})[0]

				if (existing) {
					context.db.schemas.reportDefaults.update(existing._id, {
						defaultLayoutRef,
						updatedByUserId: context.auth.userId,
						updatedAt: now,
					})
				} else {
					context.db.schemas.reportDefaults.insert({
						moduleId: input.moduleId,
						entityId: input.entityId,
						defaultLayoutRef,
						updatedByUserId: context.auth.userId,
						updatedAt: now,
					})
				}

				return {
					moduleId: input.moduleId,
					entityId: input.entityId,
					defaultLayoutRef,
				}
			}),
		previewReport: publicProcedure
			.input(previewReportInputSchema)
			.route({
				method: 'POST',
				summary: 'Render preview PDF without persistence',
			})
			.handler(async ({ input, context }) => {
				assertRole(context, 'VIEWER', 'report preview')

				const { layout, datasetDefinition } = resolveLayout({
					context,
					moduleId: input.moduleId,
					entityId: input.entityId,
					layoutId: input.layoutId,
					builtInLayout: input.builtInLayout,
					layoutDraft: input.layoutDraft,
				})

				const previewLimit = input.previewOptions?.rowLimit ?? 50
				const dataSet = resolveDataSet({
					context,
					moduleId: input.moduleId,
					entityId: input.entityId,
					layoutId: input.layoutId,
					datasetDefinition: (input.datasetDraft ?? datasetDefinition) as
						| DataSetDefinition
						| undefined,
					filters: input.filters,
					limit: Math.min(input.limit, previewLimit),
					ids: input.ids,
				})

				if (input.previewOptions?.sampleMode === 'RANDOM') {
					dataSet.rows = randomSampleRows(dataSet.rows, previewLimit)
				}

				const file = await renderReportFile({
					layout,
					dataSet,
					filenameSuffix: 'preview',
				})

				context.resHeaders?.set('Content-Type', 'application/pdf')
				context.resHeaders?.set(
					'Content-Disposition',
					`inline; filename="${file.name}"`,
				)
				context.resHeaders?.set('Cache-Control', 'no-store')

				return file
			}),
		generateReport: publicProcedure
			.input(generateReportInputSchema)
			.route({
				method: 'POST',
				summary: 'Generate report PDF for module/entity',
			})
			.handler(async ({ input, context }) => {
				assertRole(context, 'VIEWER', 'report generation')

				const { layout, layoutRef, datasetDefinition } = resolveLayout({
					context,
					moduleId: input.moduleId,
					entityId: input.entityId,
					layoutId: input.layoutId,
					builtInLayout: input.builtInLayout,
				})

				const dataSet = resolveDataSet({
					context,
					moduleId: input.moduleId,
					entityId: input.entityId,
					layoutId: input.layoutId,
					datasetDefinition,
					filters: input.filters,
					limit: input.limit,
					ids: input.ids,
				})
				const filtersJson = safeJson(input.filters)
				try {
					const file = await renderReportFile({
						layout,
						dataSet,
					})

					context.db.schemas.reportRuns.insert({
						moduleId: input.moduleId,
						entityId: input.entityId,
						layoutRef,
						requestedByUserId: context.auth.userId,
						filtersJson,
						status: 'GENERATED',
						outputFileName: file.name,
						generatedAt: new Date().toISOString(),
					})

					context.resHeaders.set('Content-Type', 'application/pdf')
					context.resHeaders.set(
						'Content-Disposition',
						`attachment; filename="${file.name}"`,
					)
					return file
				} catch (error) {
					context.db.schemas.reportRuns.insert({
						moduleId: input.moduleId,
						entityId: input.entityId,
						layoutRef,
						requestedByUserId: context.auth.userId,
						filtersJson,
						status: 'FAILED',
						errorSummary:
							error instanceof Error
								? error.message
								: 'Report generation failed',
						generatedAt: new Date().toISOString(),
					})
					throw error
				}
			}),
		getAvailableTables: publicProcedure
			.output(
				z.array(
					z.object({
						table: z.string(),
						fields: z.array(z.string()),
					}),
				),
			)
			.route({
				method: 'GET',
				summary: 'List tables available for dataset definitions',
			})
			.handler(({ context }) => {
				assertRole(context, 'MANAGER', 'available tables listing')

				return Array.from(REPORTING_ALLOWED_TABLES).map((tableName) => {
					const table = context.db.schemas[
						tableName as keyof typeof context.db.schemas
					] as unknown as
						| {
								findMany: (opts: { limit: number }) => Record<string, unknown>[]
						  }
						| undefined
					if (!table) return { table: tableName, fields: [] }

					// Sample first row to discover field names
					const sample = table.findMany({ limit: 1 })[0]
					const fields = sample
						? Object.keys(sample).filter((k) => !k.startsWith('_'))
						: []

					return { table: tableName, fields }
				})
			}),
	},
	{
		tags: ['Reporting'],
	},
)
