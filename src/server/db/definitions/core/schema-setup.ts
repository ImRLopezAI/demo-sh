import { z } from 'zod'
import type { AsyncStorageAdapter, SyncStorageAdapter } from '../adapters'
import {
	extractFieldsAndRelations,
	type FlowFieldExtractionResult,
} from '../fields/flow-field-wiring'
import { NoSeriesV2Manager } from '../no-series'
import type { ObservabilityHooks } from '../observability/types'
import { PluginHookManager } from '../plugins/hook-manager'
import {
	createRelationsContext,
	inferInverseRelations,
	type RelationsContext,
	type RelationsSchema,
	type TableRelations,
} from '../relations'
import type {
	AnyTableBuilder,
	ComputedFn,
	SchemaContext,
	SchemaOptions,
	TypedOneHelper,
	TypedTableConfig,
	ZodShape,
} from '../types'
import {
	type AutoIncrementConfig,
	extractAutoIncrementConfigs,
	extractNoSeriesConfigs,
	type ForeignKeyInfo,
	type ParentChildRelation,
	resolveTableOrder,
} from './schema-helpers'
import { createTableDefinition, createTypedOneHelper } from './table-builder'

// ============================================================================
// Relation map builder (shared between sync and async)
// ============================================================================

export interface RelationMaps {
	childToParentMap: Map<string, ParentChildRelation[]>
	foreignKeyFields: Map<string, Map<string, ForeignKeyInfo>>
}

/**
 * Build parent-child and foreign key maps from explicit relations.
 */
export function buildRelationMaps(
	explicitRelations: Record<string, unknown>,
): RelationMaps {
	const childToParentMap = new Map<string, ParentChildRelation[]>()
	const foreignKeyFields = new Map<string, Map<string, ForeignKeyInfo>>()

	if (!explicitRelations) return { childToParentMap, foreignKeyFields }

	type RelDef = {
		__type: string
		__target: string
		config: {
			from: { __table: string; __column: string }
			to: { __table: string; __column: string }
		}
	}

	for (const [parentTable, tableRels] of Object.entries(
		explicitRelations as Record<string, Record<string, RelDef>>,
	)) {
		if (!tableRels) continue
		for (const rel of Object.values(tableRels)) {
			if (rel.__type === 'many') {
				const childTable = rel.__target
				const parentField = rel.config.from.__column
				const childField = rel.config.to.__column
				const existing = childToParentMap.get(childTable) ?? []
				existing.push({ parentTable, parentField, childField })
				childToParentMap.set(childTable, existing)
			}
		}
	}

	for (const [tableName, tableRelations] of Object.entries(
		explicitRelations as Record<string, Record<string, RelDef>>,
	)) {
		if (!tableRelations) continue
		const fieldMap = new Map<string, ForeignKeyInfo>()
		for (const rel of Object.values(tableRelations)) {
			if (rel.__type === 'one') {
				const fromColumn = rel.config.from.__column
				const targetTable = rel.__target
				const targetColumn = rel.config.to.__column
				if (rel.config.from.__table === tableName) {
					fieldMap.set(fromColumn, { targetTable, targetColumn })
				}
			}
		}
		if (fieldMap.size > 0) {
			foreignKeyFields.set(tableName, fieldMap)
		}
	}

	return { childToParentMap, foreignKeyFields }
}

// ============================================================================
// Schema preparation result
// ============================================================================

export interface SchemaPreparation<
	Tables extends Record<string, AnyTableBuilder>,
	Relations extends RelationsSchema<Tables>,
> {
	tables: Tables
	typedOneHelper: TypedOneHelper<string>
	pluginManager: PluginHookManager
	observabilityState: { enabled: boolean; hooks: ObservabilityHooks }
	noSeriesManager: NoSeriesV2Manager
	tableNoSeriesConfigs: Map<string, Array<{ code: string; field: string }>>
	tableAutoIncrementConfigs: Map<string, AutoIncrementConfig[]>
	autoIncrementState: Map<string, number>
	explicitRelations: Relations
	childToParentMap: Map<string, ParentChildRelation[]>
	foreignKeyFields: Map<string, Map<string, ForeignKeyInfo>>
	tableOrder: string[]
	fieldExtraction: FlowFieldExtractionResult
	defaultSeed: number
}

/**
 * Prepare schema configuration shared between sync and async.
 * Handles: callback execution, config extraction, relation building, table ordering.
 */
export function prepareSchema<
	Tables extends Record<string, AnyTableBuilder>,
	Relations extends RelationsSchema<Tables> = Record<string, never>,
>(
	callback: (ctx: SchemaContext<string>) => Tables,
	options: SchemaOptions<
		SyncStorageAdapter | AsyncStorageAdapter | undefined,
		Tables
	> & {
		relations?: (ctx: RelationsContext<Tables>) => Relations
	} = {},
): SchemaPreparation<Tables, Relations> {
	const { defaultSeed = 10 } = options

	const pluginManager = new PluginHookManager(options.plugins)

	const observabilityState = {
		enabled: options.observability?.enabled ?? false,
		hooks: { ...options.observability?.hooks } as ObservabilityHooks,
	}

	const typedOneHelper = createTypedOneHelper(z)

	const contextCreateTable = <T extends ZodShape>(
		name: string,
		config: TypedTableConfig<T, string>,
	) => createTableDefinition(z, typedOneHelper, name, config)

	const ctx: SchemaContext<string> = { createTable: contextCreateTable }
	const tables = callback(ctx)

	// Extract NoSeries, AutoIncrement configs
	const noSeriesManager = new NoSeriesV2Manager()
	const tableNoSeriesConfigs = extractNoSeriesConfigs(tables, noSeriesManager)
	const { tableAutoIncrementConfigs, autoIncrementState } =
		extractAutoIncrementConfigs(tables, typedOneHelper)

	// Extract flow fields, computed fns, relation metadata, and reverse relations
	const fieldExtraction = extractFieldsAndRelations(
		tables as Record<
			string,
			{
				_definition: {
					schemaInput: unknown
					computedFn?: ComputedFn<object, Record<string, unknown>>
				}
			}
		>,
		typedOneHelper,
	)

	// Process explicit relations
	let explicitRelations: Relations = {} as Relations
	if (options.relations) {
		const relationsContext = createRelationsContext(tables)
		const definedRelations = options.relations(relationsContext)
		explicitRelations = inferInverseRelations(
			definedRelations as Record<string, TableRelations | undefined>,
		) as Relations
	}

	// Build parent-child and FK maps
	const { childToParentMap, foreignKeyFields } = buildRelationMaps(
		explicitRelations as Record<string, unknown>,
	)

	// Resolve table order for seeding
	const tableOrder = resolveTableOrder(tables, childToParentMap, typedOneHelper)

	return {
		tables,
		typedOneHelper,
		pluginManager,
		observabilityState,
		noSeriesManager,
		tableNoSeriesConfigs,
		tableAutoIncrementConfigs,
		autoIncrementState,
		explicitRelations,
		childToParentMap,
		foreignKeyFields,
		tableOrder,
		fieldExtraction,
		defaultSeed,
	}
}
