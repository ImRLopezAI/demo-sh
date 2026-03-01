import {
	BUILT_IN_LAYOUT_KEYS,
	type BuiltInLayoutKey,
	buildGenericDataSet,
	createDefaultReportDefinition,
	dataSetDefinitionSchema,
	executeDataSet,
	findDataSetForEntity,
	getBuiltInLayout,
	isReportDefinition,
	listBuiltInLayouts,
	listDesignerTemplates,
	migrateLayoutToReportDefinition,
	parseDataSetObject,
	parseLayoutDraft,
	parseReportDefinitionDraft,
	REPORT_MODULE_IDS,
	REPORTING_ALLOWED_TABLES,
	renderReportFile,
	reportDefinitionSchema,
	reportLayoutSchema,
	validateLayout,
	validateReportDefinition,
} from '@server/reporting'
import type { DataSetDefinition } from '@server/reporting/contracts'
import type {
	DatasetSchemaJson,
	ReportDefinition,
} from '@server/reporting/designer-contracts'
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
	reportDefinitionDraft: z.string().optional(),
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

const designerSaveInputSchema = z
	.object({
		layoutId: z.string().trim().min(1).optional(),
		moduleId: z.enum(REPORT_MODULE_IDS),
		entityId: z.string().trim().min(1).max(120),
		name: z.string().trim().min(1).max(120),
		reportDefinitionDraft: z.string().optional(),
		reportDefinition: reportDefinitionSchema.optional(),
		datasetSchemaJson: z.record(z.string(), z.unknown()).optional(),
		datasetSchemaVersion: z.string().trim().max(120).optional(),
		dataSetDraft: dataSetDefinitionSchema.optional(),
		active: z.boolean().optional(),
	})
	.refine(
		(value) => Boolean(value.reportDefinitionDraft || value.reportDefinition),
		{
			message: 'reportDefinitionDraft or reportDefinition is required',
		},
	)

const designerLoadInputSchema = z.object({
	layoutId: z.string().trim().min(1),
})

const designerLoadResultSchema = z.object({
	layoutId: z.string(),
	moduleId: z.string(),
	entityId: z.string(),
	name: z.string(),
	reportDefinition: reportDefinitionSchema,
	datasetSchemaJson: z.record(z.string(), z.unknown()).optional(),
	datasetSchemaVersion: z.string().optional(),
	dataSetDefinition: dataSetDefinitionSchema.optional(),
	active: z.boolean(),
	versionNo: z.number().int().min(1),
})

const datasetSchemaInput = z.object({
	moduleId: z.enum(REPORT_MODULE_IDS),
	entityId: z.string().trim().min(1).max(120),
	layoutId: z.string().trim().optional(),
})

const datasetSampleInput = datasetSchemaInput.extend({
	limit: z.number().int().min(1).max(50).default(20),
	filters: z.record(z.string(), filterValueSchema).optional(),
})

const designerPreviewInputSchema = z.object({
	moduleId: z.enum(REPORT_MODULE_IDS),
	entityId: z.string().trim().min(1).max(120),
	layoutId: z.string().trim().optional(),
	reportDefinitionDraft: z.string().optional(),
	reportDefinition: reportDefinitionSchema.optional(),
	dataSetDraft: dataSetDefinitionSchema.optional(),
	limit: z.number().int().min(1).max(5000).default(200),
	filters: z.record(z.string(), filterValueSchema).optional(),
	ids: z.array(z.string().trim().min(1)).max(500).optional(),
})

const datasetSampleResultSchema = z.object({
	rows: z.array(z.record(z.string(), z.unknown())),
	summary: z.record(z.string(), z.unknown()),
	suggestedColumns: z.array(
		z.object({
			key: z.string(),
			label: z.string(),
		}),
	),
})

const designerTemplateSchema = z.object({
	key: z.string(),
	name: z.string(),
	reportDefinition: reportDefinitionSchema,
})

const convertLayoutInputSchema = z.object({
	layoutId: z.string().trim().min(1),
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

function parseStoredReportDefinition(params: {
	reportDefinitionJson?: string | null
	layoutJson?: string | null
	name?: string | null
}): ReportDefinition {
	if (params.reportDefinitionJson) {
		try {
			const parsed = JSON.parse(params.reportDefinitionJson) as unknown
			return validateReportDefinition(parsed)
		} catch {
			// fall through to migration fallback
		}
	}
	if (params.layoutJson) {
		try {
			const legacy = parseStoredLayout(params.layoutJson)
			return migrateLayoutToReportDefinition(legacy)
		} catch {
			// fall through to default fallback
		}
	}
	return createDefaultReportDefinition(params.name ?? 'Untitled report')
}

function valueType(value: unknown): string {
	if (value === null || value === undefined) return 'string'
	if (typeof value === 'string') return 'string'
	if (typeof value === 'number') return 'number'
	if (typeof value === 'boolean') return 'boolean'
	if (Array.isArray(value)) return 'array'
	if (typeof value === 'object') return 'object'
	return 'string'
}

function objectShape(
	input: Record<string, unknown>,
): Record<string, Record<string, unknown>> {
	const properties: Record<string, Record<string, unknown>> = {}
	for (const [key, value] of Object.entries(input)) {
		if (key.startsWith('_')) continue
		properties[key] = {
			type: valueType(value),
			title: key,
		}
	}
	return properties
}

function dataSetDefinitionToJsonSchema(
	definition: DataSetDefinition | undefined,
): DatasetSchemaJson {
	if (!definition) {
		return {
			type: 'object',
			properties: {
				Fields: { type: 'object', properties: {} },
				Summary: { type: 'object', properties: {} },
			},
		}
	}
	const fields: Record<string, unknown> = {}
	for (const field of definition.fields) {
		if ('type' in field && field.type === 'related') {
			const nestedProps: Record<string, unknown> = {}
			for (const nested of field.fields) {
				if ('type' in nested && nested.type === 'related') {
					nestedProps[nested.name] = {
						type: 'object',
						properties: Object.fromEntries(
							nested.fields.map((leaf) => [
								leaf.name,
								{ type: 'string', title: leaf.label },
							]),
						),
					}
					continue
				}
				nestedProps[nested.name] = { type: 'string', title: nested.label }
			}
			fields[field.name] = {
				type: 'object',
				title: field.label,
				properties: nestedProps,
			}
			continue
		}
		fields[field.name] = { type: 'string', title: field.label }
	}
	return {
		$schema: 'https://json-schema.org/draft/2020-12/schema',
		type: 'object',
		properties: {
			Fields: {
				type: 'object',
				properties: fields,
			},
			Summary: {
				type: 'object',
				properties: fields,
			},
		},
	}
}

function inferDatasetSchemaFromData(
	rows: Array<Record<string, unknown>>,
	summary: Record<string, unknown> | undefined,
): DatasetSchemaJson {
	const firstRow = rows[0] ?? {}
	return {
		$schema: 'https://json-schema.org/draft/2020-12/schema',
		type: 'object',
		properties: {
			Fields: {
				type: 'object',
				properties: objectShape(firstRow),
			},
			Summary: {
				type: 'object',
				properties: objectShape(summary ?? {}),
			},
		},
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
		reportDefinition:
			row.definitionVersion === 2
				? parseStoredReportDefinition({
						reportDefinitionJson: row.reportDefinitionJson,
						layoutJson: row.schemaJson,
						name: row.name,
					})
				: undefined,
	}
}

function resolveLayout(params: {
	context: RpcContextType
	moduleId: (typeof REPORT_MODULE_IDS)[number]
	entityId: string
	layoutId?: string
	builtInLayout?: BuiltInLayoutKey
	layoutDraft?: string
	reportDefinitionDraft?: string
}) {
	if (params.reportDefinitionDraft) {
		const parsed = parseReportDefinitionDraft(params.reportDefinitionDraft)
		if (!parsed) {
			throw new Error('Report definition draft is not valid')
		}
		return {
			layout: validateReportDefinition(parsed),
			layoutRef: 'DRAFT_DESIGNER',
			datasetDefinition: undefined,
		}
	}

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
			layout:
				loaded.row.definitionVersion === 2
					? (loaded.reportDefinition ?? loaded.layout)
					: loaded.layout,
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
			layout:
				loaded.row.definitionVersion === 2
					? (loaded.reportDefinition ?? loaded.layout)
					: loaded.layout,
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

function resolveDesignerDefinitionInput(input: {
	reportDefinitionDraft?: string
	reportDefinition?: ReportDefinition
	name?: string
}): ReportDefinition {
	if (input.reportDefinitionDraft) {
		const parsed = parseReportDefinitionDraft(input.reportDefinitionDraft)
		if (!parsed) throw new Error('Report definition draft is not valid')
		return validateReportDefinition(parsed)
	}
	if (input.reportDefinition) {
		return validateReportDefinition(input.reportDefinition)
	}
	return createDefaultReportDefinition(input.name ?? 'Untitled report')
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
						if (row.definitionVersion === 2) {
							const definition = parseStoredReportDefinition({
								reportDefinitionJson: row.reportDefinitionJson,
								layoutJson: row.schemaJson,
								name: row.name,
							})
							return [
								{
									id: row._id,
									key: null,
									name: row.name,
									pageSize:
										typeof definition.page.size === 'string'
											? definition.page.size
											: 'A4',
									orientation: definition.page.orientation,
									blockCount: definition.bands.length,
									source: 'CUSTOM' as const,
									moduleId: row.moduleId,
									entityId: row.entityId,
									active: row.active,
									versionNo: row.versionNo,
									isDefault: defaultLayoutRef === row._id,
								},
							]
						}
						const legacyLayout = parseStoredLayout(row.schemaJson)
						return [
							{
								id: row._id,
								key: null,
								name: row.name,
								pageSize: legacyLayout.pageSize,
								orientation: legacyLayout.orientation,
								blockCount: legacyLayout.blocks.length,
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
					definitionVersion: 1,
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
					definitionVersion: 1,
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
					definitionVersion: loaded.row.definitionVersion ?? 1,
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
					reportDefinitionDraft: input.reportDefinitionDraft,
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
		saveReport: publicProcedure
			.input(designerSaveInputSchema)
			.output(layoutMutationResultSchema)
			.route({
				method: 'POST',
				summary: 'Create or update a visual report designer definition',
			})
			.handler(({ input, context }) => {
				assertRole(context, 'MANAGER', 'visual report save')
				const reportDefinition = resolveDesignerDefinitionInput({
					reportDefinitionDraft: input.reportDefinitionDraft,
					reportDefinition: input.reportDefinition,
					name: input.name,
				})
				const now = new Date().toISOString()
				const fallbackLayout = getBuiltInLayout('A4_SUMMARY')
				if (!fallbackLayout) {
					throw new Error('Built-in A4_SUMMARY layout not found')
				}

				if (input.layoutId) {
					const loaded = loadCustomLayout(context, input.layoutId)
					const nextVersion = loaded.row.versionNo + 1
					const updated = context.db.schemas.reportLayouts.update(
						loaded.row._id,
						{
							moduleId: input.moduleId,
							entityId: input.entityId,
							name: input.name,
							reportDefinitionJson: safeJson(reportDefinition),
							definitionVersion: 2,
							datasetSchemaJson: input.datasetSchemaJson,
							datasetSchemaVersion: input.datasetSchemaVersion,
							datasetDefinition:
								input.dataSetDraft ??
								(loaded.row.datasetDefinition as DataSetDefinition | undefined),
							schemaJson: loaded.row.schemaJson || safeJson(fallbackLayout),
							versionNo: nextVersion,
							active: input.active ?? loaded.row.active,
							updatedByUserId: context.auth.userId,
							updatedAt: now,
						},
					)
					if (!updated) throw new Error('Unable to update visual report')

					context.db.schemas.reportLayoutVersions.insert({
						layoutId: updated._id,
						versionNo: nextVersion,
						schemaJson: updated.schemaJson,
						reportDefinitionJson: safeJson(reportDefinition),
						definitionVersion: 2,
						datasetSchemaJson: input.datasetSchemaJson,
						datasetSchemaVersion: input.datasetSchemaVersion,
						datasetDefinition:
							input.dataSetDraft ??
							(loaded.row.datasetDefinition as DataSetDefinition | undefined),
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
				}

				const created = context.db.schemas.reportLayouts.insert({
					moduleId: input.moduleId,
					entityId: input.entityId,
					name: input.name,
					baseTemplate: 'A4_SUMMARY',
					schemaJson: safeJson(fallbackLayout),
					reportDefinitionJson: safeJson(reportDefinition),
					definitionVersion: 2,
					datasetSchemaJson: input.datasetSchemaJson,
					datasetSchemaVersion: input.datasetSchemaVersion,
					datasetDefinition: input.dataSetDraft,
					isSystem: false,
					active: input.active ?? true,
					versionNo: 1,
					createdByUserId: context.auth.userId,
					updatedByUserId: context.auth.userId,
					updatedAt: now,
				})

				context.db.schemas.reportLayoutVersions.insert({
					layoutId: created._id,
					versionNo: 1,
					schemaJson: created.schemaJson,
					reportDefinitionJson: safeJson(reportDefinition),
					definitionVersion: 2,
					datasetSchemaJson: input.datasetSchemaJson,
					datasetSchemaVersion: input.datasetSchemaVersion,
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
		loadReport: publicProcedure
			.input(designerLoadInputSchema)
			.output(designerLoadResultSchema)
			.route({
				method: 'GET',
				summary: 'Load visual report designer definition by layout id',
			})
			.handler(({ input, context }) => {
				assertRole(context, 'VIEWER', 'visual report read')
				const loaded = loadCustomLayout(context, input.layoutId)
				const reportDefinition =
					loaded.reportDefinition ??
					parseStoredReportDefinition({
						reportDefinitionJson: loaded.row.reportDefinitionJson,
						layoutJson: loaded.row.schemaJson,
						name: loaded.row.name,
					})

				const datasetSchemaJson = (loaded.row.datasetSchemaJson ??
					dataSetDefinitionToJsonSchema(
						loaded.row.datasetDefinition as DataSetDefinition | undefined,
					)) as Record<string, unknown>

				return {
					layoutId: loaded.row._id,
					moduleId: loaded.row.moduleId,
					entityId: loaded.row.entityId,
					name: loaded.row.name,
					reportDefinition,
					datasetSchemaJson,
					datasetSchemaVersion: loaded.row.datasetSchemaVersion,
					dataSetDefinition: loaded.row.datasetDefinition as
						| DataSetDefinition
						| undefined,
					active: loaded.row.active,
					versionNo: loaded.row.versionNo,
				}
			}),
		getDatasetSchema: publicProcedure
			.input(datasetSchemaInput)
			.output(z.record(z.string(), z.unknown()))
			.route({
				method: 'GET',
				summary: 'Get dataset JSON schema for visual designer field picker',
			})
			.handler(({ input, context }) => {
				assertRole(context, 'VIEWER', 'dataset schema read')

				if (input.layoutId) {
					const loaded = loadCustomLayout(context, input.layoutId)
					if (loaded.row.datasetSchemaJson) {
						return loaded.row.datasetSchemaJson as Record<string, unknown>
					}
					return dataSetDefinitionToJsonSchema(
						loaded.row.datasetDefinition as DataSetDefinition | undefined,
					) as Record<string, unknown>
				}

				const builtInDataSet = findDataSetForEntity(
					input.moduleId,
					input.entityId,
				)
				if (builtInDataSet) {
					return dataSetDefinitionToJsonSchema(
						builtInDataSet.definition,
					) as Record<string, unknown>
				}

				const fallback = buildGenericDataSet(context, {
					moduleId: input.moduleId,
					entityId: input.entityId,
					limit: 1,
				})
				return inferDatasetSchemaFromData(
					fallback.rows,
					fallback.summary,
				) as Record<string, unknown>
			}),
		getDatasetSample: publicProcedure
			.input(datasetSampleInput)
			.output(datasetSampleResultSchema)
			.route({
				method: 'GET',
				summary: 'Get capped dataset rows for designer preview',
			})
			.handler(({ input, context }) => {
				assertRole(context, 'VIEWER', 'dataset sample read')
				const fromLayout = input.layoutId
					? loadCustomLayout(context, input.layoutId)
					: null
				const builtIn = findDataSetForEntity(input.moduleId, input.entityId)
				const datasetDefinition = (fromLayout?.row.datasetDefinition ??
					builtIn?.definition) as DataSetDefinition | undefined
				const dataSet = resolveDataSet({
					context,
					moduleId: input.moduleId,
					entityId: input.entityId,
					layoutId: input.layoutId,
					datasetDefinition,
					filters: input.filters,
					limit: input.limit,
				})
				return {
					rows: dataSet.rows.slice(0, input.limit),
					summary: (dataSet.summary ?? {}) as Record<string, unknown>,
					suggestedColumns: dataSet.suggestedColumns ?? [],
				}
			}),
		previewDesignerReport: publicProcedure
			.input(designerPreviewInputSchema)
			.route({
				method: 'POST',
				summary: 'Render visual report designer preview PDF',
			})
			.handler(async ({ input, context }) => {
				assertRole(context, 'VIEWER', 'visual report preview')
				const loaded = input.layoutId
					? loadCustomLayout(context, input.layoutId, { requireActive: true })
					: null
				const reportDefinition = resolveDesignerDefinitionInput({
					reportDefinitionDraft: input.reportDefinitionDraft,
					reportDefinition: input.reportDefinition,
					name: loaded?.row.name,
				})
				const dataSet = resolveDataSet({
					context,
					moduleId: input.moduleId,
					entityId: input.entityId,
					layoutId: input.layoutId,
					datasetDefinition: (input.dataSetDraft ??
						(loaded?.row.datasetDefinition as DataSetDefinition | undefined)) as
						| DataSetDefinition
						| undefined,
					filters: input.filters,
					limit: input.limit,
					ids: input.ids,
				})
				const file = await renderReportFile({
					layout: reportDefinition,
					dataSet,
					filenameSuffix: 'designer-preview',
				})
				context.resHeaders?.set('Content-Type', 'application/pdf')
				context.resHeaders?.set(
					'Content-Disposition',
					`inline; filename="${file.name}"`,
				)
				context.resHeaders?.set('Cache-Control', 'no-store')
				return file
			}),
		exportReport: publicProcedure
			.input(designerPreviewInputSchema)
			.route({
				method: 'POST',
				summary: 'Generate final PDF from visual report designer layout',
			})
			.handler(async ({ input, context }) => {
				assertRole(context, 'VIEWER', 'visual report export')
				const loaded = input.layoutId
					? loadCustomLayout(context, input.layoutId, { requireActive: true })
					: null
				const reportDefinition = resolveDesignerDefinitionInput({
					reportDefinitionDraft: input.reportDefinitionDraft,
					reportDefinition: input.reportDefinition,
					name: loaded?.row.name,
				})
				const dataSet = resolveDataSet({
					context,
					moduleId: input.moduleId,
					entityId: input.entityId,
					layoutId: input.layoutId,
					datasetDefinition: (input.dataSetDraft ??
						(loaded?.row.datasetDefinition as DataSetDefinition | undefined)) as
						| DataSetDefinition
						| undefined,
					filters: input.filters,
					limit: input.limit,
					ids: input.ids,
				})
				const file = await renderReportFile({
					layout: reportDefinition,
					dataSet,
				})
				context.resHeaders?.set('Content-Type', 'application/pdf')
				context.resHeaders?.set(
					'Content-Disposition',
					`attachment; filename="${file.name}"`,
				)
				return file
			}),
		convertLegacyLayout: publicProcedure
			.input(convertLayoutInputSchema)
			.output(designerLoadResultSchema)
			.route({
				method: 'POST',
				summary: 'Convert legacy block layout to visual report definition',
			})
			.handler(({ input, context }) => {
				assertRole(context, 'MANAGER', 'convert legacy layout')
				const loaded = loadCustomLayout(context, input.layoutId)
				const reportDefinition = isReportDefinition(loaded.reportDefinition)
					? loaded.reportDefinition
					: migrateLayoutToReportDefinition(loaded.layout)
				const now = new Date().toISOString()
				const nextVersion =
					loaded.row.definitionVersion === 2
						? loaded.row.versionNo
						: loaded.row.versionNo + 1
				const updated = context.db.schemas.reportLayouts.update(
					loaded.row._id,
					{
						reportDefinitionJson: safeJson(reportDefinition),
						definitionVersion: 2,
						versionNo: nextVersion,
						updatedByUserId: context.auth.userId,
						updatedAt: now,
					},
				)
				if (!updated) throw new Error('Unable to convert layout')
				context.db.schemas.reportLayoutVersions.insert({
					layoutId: updated._id,
					versionNo: nextVersion,
					schemaJson: updated.schemaJson,
					reportDefinitionJson: safeJson(reportDefinition),
					definitionVersion: 2,
					datasetDefinition: updated.datasetDefinition,
					datasetSchemaJson: updated.datasetSchemaJson,
					datasetSchemaVersion: updated.datasetSchemaVersion,
					changedByUserId: context.auth.userId,
					changedAt: now,
				})
				return {
					layoutId: updated._id,
					moduleId: updated.moduleId,
					entityId: updated.entityId,
					name: updated.name,
					reportDefinition,
					datasetSchemaJson: (updated.datasetSchemaJson ??
						dataSetDefinitionToJsonSchema(
							updated.datasetDefinition as DataSetDefinition | undefined,
						)) as Record<string, unknown>,
					datasetSchemaVersion: updated.datasetSchemaVersion,
					dataSetDefinition: updated.datasetDefinition as
						| DataSetDefinition
						| undefined,
					active: updated.active,
					versionNo: updated.versionNo,
				}
			}),
		listDesignerTemplates: publicProcedure
			.output(z.array(designerTemplateSchema))
			.route({
				method: 'GET',
				summary: 'List built-in templates for visual report designer',
			})
			.handler(() =>
				listDesignerTemplates().map((item) => ({
					key: item.key,
					name: item.definition.name,
					reportDefinition: item.definition,
				})),
			),
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
