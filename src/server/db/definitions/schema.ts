import { createId } from '@paralleldrive/cuid2'
import { z } from 'zod'
import {
	type AsyncStorageAdapter,
	createMemoryAdapter,
	decodeCursor,
	encodeCursor,
	type PaginatedResult,
	type SyncStorageAdapter,
} from './adapters'
import {
	applyColumnSelection,
	applyOrdering,
	applyPagination,
	applyWhereFilter,
} from './core/query-helpers'
// Import field utilities from the fields module
import { computeFlowField, flowField } from './fields'
// Import zod utilities from the fields module
import { getZodMeta, hasZodTrait } from './fields/zod-utils'
import {
	createNoSeriesV2Api,
	type InternalsApi,
	NoSeriesV2Manager,
} from './no-series'
// Import observability types
import type { ObservabilityHooks } from './observability/types'
// Import plugin hook manager from the plugins module
import { PluginHookManager } from './plugins/hook-manager'
import type { TablePlugin } from './plugins/types'
import {
	createRelationsContext,
	inferInverseRelations,
	type RelationsContext,
	type RelationsSchema,
	type TableRelations,
	type WithInferredRelations,
} from './relations'
// Import seeding utilities from the seeding module
import { type GenerationContext, generateValueFromMeta } from './seeding'
import {
	AsyncReactiveTable,
	ReactiveTable,
	type TableIndex,
	type TableSnapshot,
	type WithSystemFields,
} from './table'
// Import types from the types module
import {
	type AnyTableBuilder,
	type AsyncDatabaseSchema,
	type ComputedFn,
	type DatabaseSchema,
	type DerivedView,
	FIELD_TYPES,
	type FieldMeta,
	type FieldType,
	type FlowFieldConfig,
	type FlowFieldContext,
	type FlowFieldDef,
	type FlowFieldType,
	type ObservabilityApi,
	type PluginApi,
	type QueryHelpers,
	type RelationField,
	type SchemaContext,
	type SchemaOptions,
	type SeedConfig,
	type SetupTableApi,
	type TableBuilder,
	type TableDefinition,
	type TypedDatabaseSchema,
	type TypedOneHelper,
	type TypedSetupTableBuilder,
	type TypedTableBuilder,
	type TypedTableConfig,
	type TypedTableDef,
	type TypedTableMap,
	type TypedTableMapWithRelations,
	type TypedTransactionOp,
	type WithConfig,
	type ZodShape,
} from './types'

// Re-export for backward compatibility
export { FIELD_TYPES, flowField, type FieldType }

// ============================================================================
// Callback-based defineSchema (Type-Safe Relations)
// ============================================================================

/**
 * Define a database schema using a callback for full type-safe relations.
 *
 * @example
 * ```ts
 * const db = defineSchema(({ createTable }) => ({
 *   users: createTable('users', {
 *     schema: { name: z.string(), email: z.string() },
 *   }).table(),
 *
 *   posts: createTable('posts', {
 *     // `one` is typed to only accept 'users' | 'posts'
 *     schema: (one) => ({
 *       title: z.string(),
 *       authorId: one('users'),
 *     }),
 *   }).table(),
 * }))
 *
 * // Fully typed eager loading
 * const posts = db.schemas.posts.findMany({
 *   with: { author: true }
 * })
 * // TypeScript knows: posts[0].author.name exists
 * ```
 */
/**
 * Define a database schema with optional explicit relations.
 * When relations are provided, the `with` config in queries becomes fully type-safe.
 *
 * @example
 * ```ts
 * const db = defineSchema(({ createTable }) => ({
 *   users: createTable('users', { schema: { name: z.string() } }).table(),
 *   posts: createTable('posts', { schema: { title: z.string(), authorId: z.string() } }).table(),
 * }), {
 *   relations: (r) => ({
 *     posts: {
 *       author: r.one.users({ from: r.posts.authorId, to: r.users._id }),
 *     },
 *     users: {
 *       posts: r.many.posts({ from: r.users._id, to: r.posts.authorId }),
 *     },
 *   }),
 * })
 *
 * // Type-safe eager loading
 * const posts = db.schemas.posts.findMany({ with: { author: true } })
 * posts[0].author.name // fully typed!
 *
 * const users = db.schemas.users.findMany({ with: { posts: true } })
 * users[0].posts // Post[] - fully typed!
 * ```
 */
export function defineSchema<
	TableNames extends string,
	Tables extends Record<TableNames, AnyTableBuilder>,
	Relations extends RelationsSchema<Tables> = Record<string, never>,
>(
	callback: (ctx: SchemaContext<TableNames>) => Tables,
	options?: SchemaOptions<undefined, Tables> & {
		relations?: (ctx: RelationsContext<Tables>) => Relations
	},
): TypedDatabaseSchema<Tables, Relations>
export function defineSchema<
	TableNames extends string,
	Tables extends Record<TableNames, AnyTableBuilder>,
	Relations extends RelationsSchema<Tables> = Record<string, never>,
>(
	callback: (ctx: SchemaContext<TableNames>) => Tables,
	options: SchemaOptions<AsyncStorageAdapter, Tables> & {
		relations?: (ctx: RelationsContext<Tables>) => Relations
	},
): Promise<TypedDatabaseSchema<Tables, Relations>>
export function defineSchema<
	TableNames extends string,
	Tables extends Record<TableNames, AnyTableBuilder>,
	Relations extends RelationsSchema<Tables> = Record<string, never>,
>(
	callback: (ctx: SchemaContext<TableNames>) => Tables,
	options?: SchemaOptions<
		SyncStorageAdapter | AsyncStorageAdapter | undefined,
		Tables
	> & {
		relations?: (ctx: RelationsContext<Tables>) => Relations
	},
):
	| TypedDatabaseSchema<Tables, Relations>
	| Promise<TypedDatabaseSchema<Tables, Relations>> {
	const adapter = options?.adapter
	if (adapter && adapter.type === 'async') {
		return defineSchemaImplAsync(
			callback,
			options as SchemaOptions<AsyncStorageAdapter, Tables> & {
				relations?: (ctx: RelationsContext<Tables>) => Relations
			},
		)
	}
	return defineSchemaImpl(callback, options ?? {})
}

// ============================================================================
// Callback-based defineSchema Implementation
// ============================================================================

/**
 * Implementation for the callback-based defineSchema API.
 * Provides full type-safety for relations and eager loading.
 */
function defineSchemaImpl<
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
): TypedDatabaseSchema<Tables, Relations> {
	const { defaultSeed = 10 } = options
	const syncAdapter =
		(options.adapter as SyncStorageAdapter | undefined) ?? createMemoryAdapter()
	const tableInstances = new Map<string, ReactiveTable<object>>()
	const globalListeners = new Set<() => void>()

	// Initialize plugin hook manager
	const pluginManager = new PluginHookManager(options.plugins)

	// Initialize observability state
	const observabilityState = {
		enabled: options.observability?.enabled ?? false,
		hooks: { ...options.observability?.hooks } as ObservabilityHooks,
	}

	// Collect table builders created by the callback
	const tableBuilders: Record<string, AnyTableBuilder> = {}

	// Explicit relations schema (populated after tables are created)
	let explicitRelations: Relations = {} as Relations

	// Create the typed one helper that tracks relations with branding
	const typedOneHelper: TypedOneHelper<string> = (tableName) => {
		return z.string().meta({ related: tableName }) as RelationField<
			typeof tableName
		>
	}

	// Create the context-aware createTable function
	const contextCreateTable = <T extends ZodShape>(
		name: string,
		config: TypedTableConfig<T, string>,
	): TypedTableDef<T, z.infer<z.ZodObject<T>>> => {
		const shape =
			typeof config.schema === 'function'
				? config.schema(typedOneHelper)
				: config.schema
		const schema = z.object(shape)
		type TInferred = z.infer<typeof schema>

		const definition: TypedTableDef<T, TInferred> = {
			name,
			schema,
			schemaInput: config.schema,
			seedConfig: config.seed,
			noSeriesConfig: config.noSeries,
			table: () => createTypedTableBuilder(definition, shape),
			setupTable: () => createTypedSetupTableBuilder(definition, shape),
		}

		return definition
	}

	// Create a typed setup table builder (for single-document config tables)
	function createTypedSetupTableBuilder<
		T extends ZodShape,
		TInferred extends object,
		TComputed extends Record<string, unknown>,
	>(
		definition: TypedTableDef<T, TInferred>,
		shape: T,
	): TypedSetupTableBuilder<T, TInferred, TComputed> {
		const builder: TypedSetupTableBuilder<T, TInferred, TComputed> = {
			__tableType: 'setup' as const,
			_defaultValues: {},
			_definition: definition as TypedTableDef<T, TInferred>,
			_inferredType: {} as TInferred,
			_computedType: {} as TComputed,
			_shape: shape,
			_isSetupTable: true as const,
			// Setup tables don't use these but need them for compatibility with table creation
			_indexes: [],
			_uniqueConstraints: [],
			_historyEnabled: false,
			_noSeriesConfig: undefined,

			defaults(values) {
				this._defaultValues = values
				return this
			},

			computed<TNewComputed extends Record<string, unknown>>(
				fn: (row: TInferred, ctx: FlowFieldContext) => TNewComputed,
			): TypedSetupTableBuilder<T, TInferred, TNewComputed> {
				const newDefinition = {
					...definition,
					computedFn: fn,
				}
				const newBuilder = createTypedSetupTableBuilder<
					T,
					TInferred,
					TNewComputed
				>(newDefinition as TypedTableDef<T, TInferred>, shape)
				newBuilder._defaultValues = this._defaultValues as Partial<TInferred>
				;(
					newBuilder._definition as TypedTableDef<T, TInferred> & {
						computedFn?: unknown
					}
				).computedFn = fn
				return newBuilder
			},
		}

		return builder
	}

	// Create a typed table builder
	function createTypedTableBuilder<
		T extends ZodShape,
		TInferred extends object,
		TComputed extends Record<string, unknown>,
	>(
		definition: TypedTableDef<T, TInferred>,
		shape: T,
	): TypedTableBuilder<T, TInferred, TComputed> {
		const builder: TypedTableBuilder<T, TInferred, TComputed> = {
			_indexes: [],
			_uniqueConstraints: [],
			_defaultValues: {},
			_historyEnabled: false,
			_noSeriesConfig: definition.noSeriesConfig,
			_definition: definition as TypedTableDef<T, TInferred>,
			_inferredType: {} as TInferred,
			_computedType: {} as TComputed,
			_shape: shape,

			index(indexName, fields) {
				this._indexes.push({ name: indexName, fields: fields as string[] })
				return this
			},

			unique(constraintName, fields) {
				this._uniqueConstraints.push({
					name: constraintName,
					fields: fields as string[],
				})
				return this
			},

			defaults(values) {
				this._defaultValues = values
				return this
			},

			enableHistory() {
				this._historyEnabled = true
				return this
			},

			computed<TNewComputed extends Record<string, unknown>>(
				fn: (row: TInferred, ctx: FlowFieldContext) => TNewComputed,
			): TypedTableBuilder<T, TInferred, TNewComputed> {
				const newDefinition = {
					...definition,
					computedFn: fn,
				}
				const newBuilder = createTypedTableBuilder<T, TInferred, TNewComputed>(
					newDefinition as TypedTableDef<T, TInferred>,
					shape,
				)
				newBuilder._indexes = this._indexes
				newBuilder._uniqueConstraints = this._uniqueConstraints
				newBuilder._defaultValues = this._defaultValues as Partial<TInferred>
				newBuilder._historyEnabled = this._historyEnabled
				newBuilder._noSeriesConfig = this._noSeriesConfig
				;(
					newBuilder._definition as TypedTableDef<T, TInferred> & {
						computedFn?: unknown
					}
				).computedFn = fn
				return newBuilder
			},
		}

		return builder
	}

	// Execute the callback to get the table definitions
	const ctx: SchemaContext<string> = { createTable: contextCreateTable }
	const tables = callback(ctx)

	// Store builders for later use
	Object.assign(tableBuilders, tables)

	// Create reactive tables
	for (const [tableName, builder] of Object.entries(tables)) {
		const indexes: TableIndex<object>[] = builder._indexes.map((idx) => ({
			name: idx.name,
			fields: idx.fields as (keyof object)[],
		}))
		const uniqueConstraints =
			builder._uniqueConstraints?.map((uc) => ({
				name: uc.name,
				fields: uc.fields as (keyof object)[],
			})) ?? []
		const defaultValues = builder._defaultValues ?? {}
		const enableHistory = builder._historyEnabled ?? false

		const table = new ReactiveTable<object>(tableName, {
			indexes,
			uniqueConstraints,
			defaultValues,
			enableHistory,
			adapter: syncAdapter,
		})

		// Subscribe to table changes and notify global listeners
		table.subscribe(() => {
			for (const listener of globalListeners) {
				listener()
			}
		})

		tableInstances.set(tableName, table)
	}

	// Create V2 NoSeriesManager and register configs
	const noSeriesManager = new NoSeriesV2Manager()
	// Map of tableName -> array of V2 configs for that table (for applyToInsert)
	const tableNoSeriesConfigs = new Map<
		string,
		Array<{ code: string; field: string }>
	>()
	for (const [tableName, builder] of Object.entries(tables)) {
		const noSeriesConfig = builder._noSeriesConfig
		if (noSeriesConfig) {
			const configs = Array.isArray(noSeriesConfig)
				? noSeriesConfig
				: [noSeriesConfig]
			const v2Configs: Array<{ code: string; field: string }> = []
			for (const config of configs) {
				const seriesCode = `${tableName}:${config.field}`
				noSeriesManager.register({
					code: seriesCode,
					pattern: config.pattern,
					initialValue: config.initialValue,
					incrementBy: config.incrementBy,
				})
				v2Configs.push({ code: seriesCode, field: config.field })
			}
			tableNoSeriesConfigs.set(tableName, v2Configs)
		}
	}

	// Extract flowField definitions and computed functions for each table
	const flowFieldDefs = new Map<string, Map<string, FlowFieldDef>>()
	const computedFns = new Map<
		string,
		ComputedFn<object, Record<string, unknown>>
	>()

	// Build relation metadata map: tableName -> { fieldName: relatedTableName }
	type RelationMeta = {
		fieldName: string
		relatedTable: string
		relationName: string
		onDelete?: 'cascade' | 'setNull' | 'restrict'
	}
	const relationMeta = new Map<string, RelationMeta[]>()

	// Build reverse relation map for cascade/setNull/restrict: parentTable -> [{ childTable, fieldName, onDelete }]
	type ReverseRelation = {
		childTable: string
		fieldName: string
		onDelete: 'cascade' | 'setNull' | 'restrict'
	}
	const reverseRelations = new Map<string, ReverseRelation[]>()

	for (const [tableName, builder] of Object.entries(tables)) {
		const schemaInput = builder._definition.schemaInput
		const shape =
			typeof schemaInput === 'function'
				? schemaInput(typedOneHelper)
				: schemaInput
		const fieldDefs = new Map<string, FlowFieldDef>()
		const tableRelations: RelationMeta[] = []

		for (const [fieldName, fieldSchema] of Object.entries(shape)) {
			const meta = getZodMeta(fieldSchema as z.ZodType)
			if (meta?.flowField) {
				fieldDefs.set(fieldName, meta.flowField)
			}

			// Track relation metadata for eager loading
			if (meta?.related) {
				const relationName = fieldName.endsWith('Id')
					? fieldName.slice(0, -2)
					: fieldName
				tableRelations.push({
					fieldName,
					relatedTable: meta.related,
					relationName,
					onDelete: meta.onDelete,
				})

				// Build reverse relation map for cascade/setNull/restrict
				if (meta.onDelete) {
					const reverseList = reverseRelations.get(meta.related) ?? []
					reverseList.push({
						childTable: tableName,
						fieldName,
						onDelete: meta.onDelete,
					})
					reverseRelations.set(meta.related, reverseList)
				}
			}
		}

		if (tableRelations.length > 0) {
			relationMeta.set(tableName, tableRelations)
		}
		if (fieldDefs.size > 0) {
			flowFieldDefs.set(tableName, fieldDefs)
		}

		// Extract computed function if defined
		const computedFn = (
			builder._definition as TypedTableDef<ZodShape, object> & {
				computedFn?: ComputedFn<object, Record<string, unknown>>
			}
		).computedFn
		if (computedFn) {
			computedFns.set(tableName, computedFn)
		}
	}

	// Context for flowField functions
	// Create wrapper objects that apply computed fields when data is accessed
	const flowFieldSchemas: Record<
		string,
		{
			toArray: () => object[]
			findMany: (options?: { where?: (item: object) => boolean }) => object[]
		}
	> = {}
	for (const [tableName, table] of tableInstances) {
		const computedFn = computedFns.get(tableName)

		// Helper to apply computed fields to items
		const applyComputed = (items: object[]): object[] => {
			if (!computedFn) return items
			return items.map((item) => {
				const computed = computedFn(item, { schemas: flowFieldSchemas })
				return { ...item, ...computed }
			})
		}

		flowFieldSchemas[tableName] = {
			toArray: () => applyComputed(table.toArray()),
			findMany: (options?: { where?: (item: object) => boolean }) => {
				let items: object[] = table.toArray()
				if (options?.where) {
					items = items.filter(options.where)
				}
				return applyComputed(items)
			},
		}
	}

	const flowFieldContext: FlowFieldContext = {
		schemas: flowFieldSchemas,
	}

	// Extract autoIncrement configs from schema metadata
	// Map: tableName -> { fieldName -> initialValue }
	type AutoIncrementConfig = { fieldName: string; initialValue: number }
	const tableAutoIncrementConfigs = new Map<string, AutoIncrementConfig[]>()
	// Track current autoIncrement values: `tableName:fieldName` -> currentValue
	const autoIncrementState = new Map<string, number>()

	for (const [tableName, builder] of Object.entries(tables)) {
		const schemaInput = builder._definition.schemaInput
		const shape =
			typeof schemaInput === 'function'
				? schemaInput(typedOneHelper)
				: schemaInput

		const configs: AutoIncrementConfig[] = []
		for (const [fieldName, fieldSchema] of Object.entries(shape)) {
			const meta = getZodMeta(fieldSchema as z.ZodType)
			if (meta?.autoIncrement !== undefined) {
				const initialValue =
					typeof meta.autoIncrement === 'number' ? meta.autoIncrement : 1
				configs.push({ fieldName, initialValue })
				// Initialize the state to initialValue - 1 so first insert gets initialValue
				autoIncrementState.set(`${tableName}:${fieldName}`, initialValue - 1)
			}
		}
		if (configs.length > 0) {
			tableAutoIncrementConfigs.set(tableName, configs)
		}
	}

	// Helper to apply autoIncrement to an insert item
	function applyAutoIncrement(
		tableName: string,
		item: Record<string, unknown>,
	): Record<string, unknown> {
		const configs = tableAutoIncrementConfigs.get(tableName)
		if (!configs || configs.length === 0) return item

		const result = { ...item }
		for (const { fieldName } of configs) {
			// Only apply if field is not provided or is undefined
			if (result[fieldName] === undefined) {
				const key = `${tableName}:${fieldName}`
				const currentValue = autoIncrementState.get(key) ?? 0
				const nextValue = currentValue + 1
				autoIncrementState.set(key, nextValue)
				result[fieldName] = nextValue
			}
		}
		return result
	}

	// Process explicit relations if provided, and infer inverse relations
	if (options.relations) {
		const relationsContext = createRelationsContext(tables)
		const definedRelations = options.relations(relationsContext)
		// Infer inverse relations (e.g., posts.author -> users.posts)
		explicitRelations = inferInverseRelations(
			definedRelations as Record<string, TableRelations | undefined>,
		) as Relations
	}

	// Generation context for seeding
	const generationContext: GenerationContext = {
		tableIds: new Map<string, string[]>(),
	}

	// Helper to create query helpers bound to a specific item
	function typedCreateQueryHelpers<T extends object>(item: T): QueryHelpers<T> {
		const rec = item as Record<string, unknown>
		return {
			eq: (field, value) => rec[field as string] === value,
			ne: (field, value) => rec[field as string] !== value,
			gt: (field, value) =>
				(rec[field as string] as number) > (value as number),
			gte: (field, value) =>
				(rec[field as string] as number) >= (value as number),
			lt: (field, value) =>
				(rec[field as string] as number) < (value as number),
			lte: (field, value) =>
				(rec[field as string] as number) <= (value as number),
			like: (field, pattern) => {
				const value = rec[field as string]
				if (typeof value !== 'string') return false
				const regex = new RegExp(
					pattern.replace(/%/g, '.*').replace(/_/g, '.'),
					'i',
				)
				return regex.test(value)
			},
			inArray: (field, values) =>
				(values as unknown[]).includes(rec[field as string]),
			isNull: (field) => rec[field as string] == null,
			isNotNull: (field) => rec[field as string] != null,
			and: (...conditions) => conditions.every(Boolean),
			or: (...conditions) => conditions.some(Boolean),
			not: (condition) => !condition,
		}
	}

	// Cache computed field results per record to avoid recomputation on every property access
	const computedCache = new WeakMap<object, Record<string, unknown>>()

	// Wrap a document with flowField computation and computed fields
	function wrapWithFlowFields<D extends object>(doc: D, tableName: string): D {
		const fieldDefs = flowFieldDefs.get(tableName)
		const computedFn = computedFns.get(tableName)

		if (!fieldDefs && !computedFn) return doc

		// Helper to get a flowField value from the raw document
		const getFlowFieldValue = (target: object, fieldName: string): unknown => {
			const def = fieldDefs?.get(fieldName)
			if (def) {
				return computeFlowField(target, def, flowFieldContext)
			}
			return (target as Record<string, unknown>)[fieldName]
		}

		// Create a wrapper that provides flowField access for computed functions
		const createRowWithFlowFields = (target: object): object => {
			if (!fieldDefs) return target
			return new Proxy(target, {
				get(t, prop) {
					if (typeof prop === 'string' && fieldDefs.has(prop)) {
						return getFlowFieldValue(t, prop)
					}
					return (t as Record<string | symbol, unknown>)[prop]
				},
			})
		}

		// Get or compute cached computed fields for a target
		const getComputedFields = (target: object): Record<string, unknown> => {
			if (!computedFn) return {}
			let cached = computedCache.get(target)
			if (!cached) {
				const rowWithFlowFields = createRowWithFlowFields(target)
				cached = computedFn(rowWithFlowFields, flowFieldContext) as Record<
					string,
					unknown
				>
				computedCache.set(target, cached)
			}
			return cached
		}

		return new Proxy(doc, {
			get(target, prop) {
				if (typeof prop === 'string') {
					// Check computed fields first (cached per-record)
					if (computedFn) {
						const computed = getComputedFields(target)
						if (prop in computed) {
							return computed[prop as keyof typeof computed]
						}
					}

					// Check flowFields
					const def = fieldDefs?.get(prop)
					if (def) {
						return computeFlowField(target, def, flowFieldContext)
					}
				}
				return (target as Record<string | symbol, unknown>)[prop]
			},
			ownKeys(target) {
				const baseKeys = Reflect.ownKeys(target)
				const flowKeys = fieldDefs ? Array.from(fieldDefs.keys()) : []
				const computedKeys = computedFn
					? Object.keys(getComputedFields(target))
					: []
				return [...new Set([...baseKeys, ...flowKeys, ...computedKeys])]
			},
			getOwnPropertyDescriptor(target, prop) {
				// If the property exists on target, always return its original descriptor
				// to avoid conflicts when the same property is both stored and computed/flowField
				const targetDescriptor = Object.getOwnPropertyDescriptor(target, prop)
				if (targetDescriptor) {
					return targetDescriptor
				}

				if (typeof prop === 'string') {
					if (
						fieldDefs?.has(prop) ||
						(computedFn && prop in getComputedFields(target))
					) {
						return { enumerable: true, configurable: true, writable: false }
					}
				}
				return undefined
			},
		}) as D
	}

	// Resolve relations for a document based on `with` configuration
	// Supports both auto-detected relations (from one() helper) and explicit relations
	function resolveRelations<T extends object>(
		doc: T,
		tableName: string,
		withConfig: WithConfig | undefined,
	): T {
		if (!withConfig) return doc

		const result = { ...doc } as Record<string, unknown>

		// First, check explicit relations (take precedence)
		const tableExplicitRelations = (
			explicitRelations as Record<string, TableRelations | undefined>
		)[tableName]
		if (tableExplicitRelations) {
			for (const [relationName, relationDef] of Object.entries(
				tableExplicitRelations,
			)) {
				const configValue = withConfig[relationName]
				if (!configValue) continue

				const targetTable = relationDef.__target
				const fromColumn = relationDef.config.from.__column
				const toColumn = relationDef.config.to.__column
				const fromValue = (doc as Record<string, unknown>)[fromColumn]

				const targetTableInstance = tableInstances.get(targetTable)
				if (!targetTableInstance) continue

				if (relationDef.__type === 'one') {
					// One-to-one/many-to-one: find single matching record
					const targetDocs = targetTableInstance.toArray()
					let match = targetDocs.find(
						(d) => (d as Record<string, unknown>)[toColumn] === fromValue,
					)

					if (match) {
						const targetHasFlowFields =
							flowFieldDefs.has(targetTable) || computedFns.has(targetTable)
						if (targetHasFlowFields) {
							match = wrapWithFlowFields(match, targetTable)
						}

						if (typeof configValue === 'object' && configValue.with) {
							match = resolveRelations(match, targetTable, configValue.with)
						}
					}

					result[relationName] = match ?? null
				} else {
					// One-to-many: find all matching records
					const targetDocs = targetTableInstance.toArray()
					let matches = targetDocs.filter(
						(d) => (d as Record<string, unknown>)[toColumn] === fromValue,
					)

					const targetHasFlowFields =
						flowFieldDefs.has(targetTable) || computedFns.has(targetTable)
					if (targetHasFlowFields) {
						matches = matches.map((m) => wrapWithFlowFields(m, targetTable))
					}

					if (typeof configValue === 'object' && configValue.with) {
						matches = matches.map((m) =>
							resolveRelations(m, targetTable, configValue.with),
						)
					}

					result[relationName] = matches
				}
			}
		}

		// Fall back to auto-detected relations (for backward compatibility)
		const autoRelations = relationMeta.get(tableName)
		if (autoRelations && autoRelations.length > 0) {
			for (const { fieldName, relatedTable, relationName } of autoRelations) {
				// Skip if already resolved by explicit relations
				if (result[relationName] !== undefined) continue

				const configValue = withConfig[relationName]
				if (!configValue) continue

				const foreignKeyValue = (doc as Record<string, unknown>)[fieldName] as
					| string
					| undefined
				if (!foreignKeyValue) continue

				const relatedTableInstance = tableInstances.get(relatedTable)
				if (!relatedTableInstance) continue

				let relatedRecord = relatedTableInstance.get(foreignKeyValue)
				if (!relatedRecord) continue

				const relatedHasFlowFields =
					flowFieldDefs.has(relatedTable) || computedFns.has(relatedTable)
				if (relatedHasFlowFields) {
					relatedRecord = wrapWithFlowFields(relatedRecord, relatedTable)
				}

				if (typeof configValue === 'object' && configValue.with) {
					relatedRecord = resolveRelations(
						relatedRecord,
						relatedTable,
						configValue.with,
					)
				}

				result[relationName] = relatedRecord
			}
		}

		return result as T
	}

	// Create wrapped table that applies flowField proxies to returned documents
	function createWrappedTable(tableName: string, table: ReactiveTable<object>) {
		const hasFlowFields =
			flowFieldDefs.has(tableName) || computedFns.has(tableName)
		const noSeriesConfigs = tableNoSeriesConfigs.get(tableName)
		const hasNoSeries = noSeriesConfigs && noSeriesConfigs.length > 0
		const hasAutoIncrement = tableAutoIncrementConfigs.has(tableName)

		return {
			get size() {
				return table.size
			},
			insert: (item: object) => {
				const startTime = Date.now()
				try {
					// Execute beforeInsert plugin hooks
					let processedItem = item as Record<string, unknown>
					const hookResult = pluginManager.executeBeforeInsert(
						tableName,
						processedItem,
					)
					processedItem = hookResult.value

					// Apply autoIncrement for fields not provided
					processedItem = hasAutoIncrement
						? applyAutoIncrement(tableName, processedItem)
						: processedItem
					// Apply No Series auto-generation for fields not provided
					processedItem = hasNoSeries
						? noSeriesManager.applyToInsert(noSeriesConfigs, processedItem)
						: processedItem
					const result = table.insert(processedItem)
					const wrappedResult = hasFlowFields
						? wrapWithFlowFields(result, tableName)
						: result

					// Execute afterInsert plugin hooks
					pluginManager.executeAfterInsert(tableName, result)

					// Track observability
					if (
						observabilityState.enabled &&
						observabilityState.hooks.onMutation
					) {
						observabilityState.hooks.onMutation({
							tableName,
							operation: 'insert',
							documentId: result._id,
							durationMs: Date.now() - startTime,
							success: true,
						})
					}

					return wrappedResult
				} catch (error) {
					// Track error in observability
					if (observabilityState.enabled && observabilityState.hooks.onError) {
						observabilityState.hooks.onError({
							tableName,
							operation: 'insert',
							error: error as Error,
						})
					}
					throw error
				}
			},
			update: (id: string, updates: Partial<object>) => {
				const startTime = Date.now()
				try {
					// Execute beforeUpdate plugin hooks
					const hookResult = pluginManager.executeBeforeUpdate(
						tableName,
						id,
						updates,
					)
					const processedUpdates = hookResult.value

					const result = table.update(id, processedUpdates)
					const wrappedResult =
						result && hasFlowFields
							? wrapWithFlowFields(result, tableName)
							: result

					// Execute afterUpdate plugin hooks
					if (result) {
						pluginManager.executeAfterUpdate(tableName, result)
					}

					// Track observability
					if (
						observabilityState.enabled &&
						observabilityState.hooks.onMutation
					) {
						observabilityState.hooks.onMutation({
							tableName,
							operation: 'update',
							documentId: id,
							durationMs: Date.now() - startTime,
							success: result !== undefined,
						})
					}

					return wrappedResult
				} catch (error) {
					// Track error in observability
					if (observabilityState.enabled && observabilityState.hooks.onError) {
						observabilityState.hooks.onError({
							tableName,
							operation: 'update',
							error: error as Error,
							documentId: id,
						})
					}
					throw error
				}
			},
			delete: (id: string) => {
				const startTime = Date.now()
				try {
					// Execute beforeDelete plugin hooks (can throw to prevent deletion)
					pluginManager.executeBeforeDelete(tableName, id)

					// Check for restrict constraints
					const reverseRels = reverseRelations.get(tableName)
					if (reverseRels) {
						for (const { childTable, fieldName, onDelete } of reverseRels) {
							if (onDelete === 'restrict') {
								const childTableInstance = tableInstances.get(childTable)
								if (childTableInstance) {
									// Check if any records reference this ID
									const hasReferences = childTableInstance
										.toArray()
										.some(
											(doc) =>
												(doc as Record<string, unknown>)[fieldName] === id,
										)
									if (hasReferences) {
										throw new Error(
											`Cannot delete ${tableName} with id ${id}: referenced by ${childTable}.${fieldName} with restrict constraint`,
										)
									}
								}
							}
						}
					}

					// Perform the delete
					const result = table.delete(id)

					// Handle cascade and setNull after successful delete
					if (result && reverseRels) {
						for (const { childTable, fieldName, onDelete } of reverseRels) {
							const childTableInstance = tableInstances.get(childTable)
							if (!childTableInstance) continue

							if (onDelete === 'cascade') {
								// Find all child records that reference this ID and delete them recursively
								const childWrapper = createWrappedTable(
									childTable,
									childTableInstance,
								)
								const childRecords = childTableInstance
									.toArray()
									.filter(
										(doc) => (doc as Record<string, unknown>)[fieldName] === id,
									)
								// Delete each record individually to trigger cascades recursively
								for (const childRecord of childRecords) {
									childWrapper.delete(childRecord._id)
								}
							} else if (onDelete === 'setNull') {
								// Set the foreign key to null for all child records
								childTableInstance.updateMany(
									(doc) => (doc as Record<string, unknown>)[fieldName] === id,
									{ [fieldName]: null } as Partial<object>,
								)
							}
						}
					}

					// Execute afterDelete plugin hooks
					if (result) {
						pluginManager.executeAfterDelete(tableName, id)
					}

					// Track observability
					if (
						observabilityState.enabled &&
						observabilityState.hooks.onMutation
					) {
						observabilityState.hooks.onMutation({
							tableName,
							operation: 'delete',
							documentId: id,
							durationMs: Date.now() - startTime,
							success: result,
						})
					}

					return result
				} catch (error) {
					// Track error in observability
					if (observabilityState.enabled && observabilityState.hooks.onError) {
						observabilityState.hooks.onError({
							tableName,
							operation: 'delete',
							error: error as Error,
							documentId: id,
						})
					}
					throw error
				}
			},
			get: (id: string) => {
				const result = table.get(id)
				return result && hasFlowFields
					? wrapWithFlowFields(result, tableName)
					: result
			},
			toArray: () => {
				const results = table.toArray()
				return hasFlowFields
					? results.map((doc) => wrapWithFlowFields(doc, tableName))
					: results
			},
			query: (indexName: string, ...values: unknown[]) => {
				const results = table.query(indexName, ...values)
				return hasFlowFields
					? results.map((doc) => wrapWithFlowFields(doc, tableName))
					: results
			},
			filter: (predicate: (item: object) => boolean) => {
				if (hasFlowFields) {
					return table
						.toArray()
						.map((doc) => wrapWithFlowFields(doc, tableName))
						.filter(predicate)
				}
				return table.filter(predicate)
			},
			find: (predicate: (item: object) => boolean) => {
				if (hasFlowFields) {
					return table
						.toArray()
						.map((doc) => wrapWithFlowFields(doc, tableName))
						.find(predicate)
				}
				return table.find(predicate)
			},
			batch: {
				insertMany: (items: object[]) => {
					// Apply autoIncrement and No Series auto-generation for each item
					const processedItems = items.map((item) => {
						let processed = hasAutoIncrement
							? applyAutoIncrement(tableName, item as Record<string, unknown>)
							: item
						processed = hasNoSeries
							? noSeriesManager.applyToInsert(
									noSeriesConfigs,
									processed as Record<string, unknown>,
								)
							: processed
						return processed
					})
					const results = table.insertMany(processedItems)
					return hasFlowFields
						? results.map((doc) => wrapWithFlowFields(doc, tableName))
						: results
				},
				updateMany: (
					predicate: (item: object) => boolean,
					updates: Partial<object>,
				) => {
					const results = table.updateMany(predicate, updates)
					return hasFlowFields
						? results.map((doc) => wrapWithFlowFields(doc, tableName))
						: results
				},
				deleteMany: (predicate: (item: object) => boolean) => {
					return table.deleteMany(predicate)
				},
			},
			findMany: (options?: {
				where?: (item: object, helpers: QueryHelpers<object>) => boolean
				orderBy?:
					| { field: string; direction: 'asc' | 'desc' }
					| Array<{ field: string; direction: 'asc' | 'desc' }>
				limit?: number
				offset?: number
				columns?: Partial<Record<string, boolean>>
				with?: WithConfig
			}) => {
				let results = table.toArray()

				if (hasFlowFields) {
					results = results.map((doc) => wrapWithFlowFields(doc, tableName))
				}

				if (options?.where) {
					results = results.filter((item) =>
						options.where?.(
							item,
							typedCreateQueryHelpers(item) as QueryHelpers<object>,
						),
					)
				}

				if (options?.orderBy) {
					const orderClauses = Array.isArray(options.orderBy)
						? options.orderBy
						: [options.orderBy]
					results = [...results].sort((a, b) => {
						for (const clause of orderClauses) {
							const aVal = (a as Record<string, unknown>)[clause.field]
							const bVal = (b as Record<string, unknown>)[clause.field]

							let comparison = 0
							if (aVal == null && bVal == null) comparison = 0
							else if (aVal == null) comparison = 1
							else if (bVal == null) comparison = -1
							else if (aVal < bVal) comparison = -1
							else if (aVal > bVal) comparison = 1

							if (comparison !== 0) {
								return clause.direction === 'asc' ? comparison : -comparison
							}
						}
						return 0
					})
				}

				if (options?.offset) {
					results = results.slice(options.offset)
				}

				if (options?.limit) {
					results = results.slice(0, options.limit)
				}

				if (options?.columns) {
					const hasIncludes = Object.values(options.columns).some(
						(v) => v === true,
					)
					results = results.map((doc) => {
						const newDoc: Record<string, unknown> = {}
						for (const [key, value] of Object.entries(doc)) {
							const include = options.columns?.[key]
							if (hasIncludes) {
								if (include === true) newDoc[key] = value
							} else {
								if (include !== false) newDoc[key] = value
							}
						}
						return newDoc as typeof doc
					})
				}

				// Resolve relations (eager loading with `with`)
				if (options?.with) {
					results = results.map((doc) =>
						resolveRelations(doc, tableName, options.with),
					)
				}

				return results
			},
			findFirst: (options?: {
				where?: (item: object, helpers: QueryHelpers<object>) => boolean
				orderBy?:
					| { field: string; direction: 'asc' | 'desc' }
					| Array<{ field: string; direction: 'asc' | 'desc' }>
				columns?: Partial<Record<string, boolean>>
				with?: WithConfig
			}) => {
				const results = createWrappedTable(tableName, table).findMany({
					...options,
					limit: 1,
				})
				return results[0]
			},
			paginate: (options: {
				where?: (item: object, helpers: QueryHelpers<object>) => boolean
				orderBy?: { field: string; direction: 'asc' | 'desc' }
				pageSize: number
				cursor?: string | null
				columns?: Partial<Record<string, boolean>>
			}): PaginatedResult<WithSystemFields<object>> => {
				const { pageSize, cursor, orderBy, where, columns } = options

				const results = createWrappedTable(tableName, table).findMany({
					where,
					orderBy,
					columns,
				})

				let startIndex = 0
				if (cursor) {
					const decoded = decodeCursor(cursor)
					if (decoded) {
						const cursorIndex = results.findIndex(
							(item) => item._id === decoded.lastId,
						)
						if (cursorIndex !== -1) {
							startIndex =
								decoded.direction === 'forward'
									? cursorIndex + 1
									: Math.max(0, cursorIndex - pageSize)
						}
					}
				}

				const pageItems = results.slice(startIndex, startIndex + pageSize)
				const hasMore = startIndex + pageSize < results.length
				const hasPrev = startIndex > 0

				return {
					items: pageItems,
					nextCursor:
						hasMore && pageItems.length > 0
							? encodeCursor({
									lastId: pageItems[pageItems.length - 1]._id,
									direction: 'forward',
								})
							: null,
					prevCursor:
						hasPrev && pageItems.length > 0
							? encodeCursor({
									lastId: pageItems[0]._id,
									direction: 'backward',
								})
							: null,
					hasMore,
					totalCount: results.length,
				}
			},
			search: (query: string, fields?: (keyof object)[]) => {
				const startTime = Date.now()
				const results = table.search(query, fields)

				// Track observability for search
				if (observabilityState.enabled && observabilityState.hooks.onQuery) {
					observabilityState.hooks.onQuery({
						tableName,
						operation: 'search',
						durationMs: Date.now() - startTime,
						resultCount: results.length,
					})
				}

				return results
			},
			clear: () => {
				const startTime = Date.now()
				try {
					// Execute beforeClear plugin hooks
					pluginManager.executeBeforeClear(tableName)

					table.clear()

					// Execute afterClear plugin hooks
					pluginManager.executeAfterClear(tableName)

					// Track observability
					if (
						observabilityState.enabled &&
						observabilityState.hooks.onMutation
					) {
						observabilityState.hooks.onMutation({
							tableName,
							operation: 'clear',
							durationMs: Date.now() - startTime,
							success: true,
						})
					}
				} catch (error) {
					if (observabilityState.enabled && observabilityState.hooks.onError) {
						observabilityState.hooks.onError({
							tableName,
							operation: 'clear',
							error: error as Error,
						})
					}
					throw error
				}
			},
			subscribe: (callback: () => void) => table.subscribe(callback),
			history: {
				createSnapshot: () => table.createSnapshot(),
				restoreSnapshot: (snapshot: TableSnapshot<object>) =>
					table.restoreSnapshot(snapshot),
				undo: () => table.undo(),
				redo: () => table.redo(),
				canUndo: () => table.canUndo(),
				canRedo: () => table.canRedo(),
			},
		}
	}

	// Build parent-child relationship map from explicit relations
	// Structure: childTable -> [{ parentTable, parentField, childField }]
	type ParentChildRelation = {
		parentTable: string
		parentField: string
		childField: string
	}
	const childToParentMap = new Map<string, ParentChildRelation[]>()

	// Parse explicit relations to find many relations (parent -> children)
	if (explicitRelations) {
		for (const [parentTable, tableRels] of Object.entries(
			explicitRelations as Record<
				string,
				Record<
					string,
					{
						__type: string
						__target: string
						config: {
							from: { __table: string; __column: string }
							to: { __table: string; __column: string }
						}
					}
				>
			>,
		)) {
			if (!tableRels) continue
			for (const rel of Object.values(tableRels)) {
				if (rel.__type === 'many') {
					const childTable = rel.__target
					// ColumnRef has __table and __column properties
					const parentField = rel.config.from.__column
					const childField = rel.config.to.__column

					const existing = childToParentMap.get(childTable) ?? []
					existing.push({ parentTable, parentField, childField })
					childToParentMap.set(childTable, existing)
				}
			}
		}
	}

	// Seed tables with mock data - resolve table order based on relations
	function resolveTypedTableOrder(): string[] {
		const dependencies = new Map<string, Set<string>>()
		const allTables = new Set<string>()

		for (const [tableName, builder] of Object.entries(tables)) {
			allTables.add(tableName)
			const deps = new Set<string>()

			// Use explicit relations for dependencies (from childToParentMap)
			const parentRels = childToParentMap.get(tableName)
			if (parentRels) {
				for (const { parentTable } of parentRels) {
					if (parentTable !== tableName) {
						deps.add(parentTable)
					}
				}
			}

			// Also check schema for meta.related (backward compatibility)
			const schemaInput = builder._definition.schemaInput
			const shape =
				typeof schemaInput === 'function'
					? schemaInput(typedOneHelper)
					: schemaInput

			for (const fieldSchema of Object.values(shape)) {
				const meta = getZodMeta(fieldSchema as z.ZodType)
				if (meta?.related && meta.related !== tableName) {
					deps.add(meta.related)
				}
			}

			dependencies.set(tableName, deps)
		}

		const sorted: string[] = []
		const visited = new Set<string>()
		const visiting = new Set<string>()

		function visit(name: string) {
			if (visited.has(name)) return
			if (visiting.has(name)) return // Circular dependency, skip
			visiting.add(name)

			const deps = dependencies.get(name) ?? new Set()
			for (const dep of deps) {
				if (allTables.has(dep)) {
					visit(dep)
				}
			}

			visiting.delete(name)
			visited.add(name)
			sorted.push(name)
		}

		for (const name of allTables) {
			visit(name)
		}

		return sorted
	}

	// Build a map of foreign key fields from relations for seeding
	// Structure: tableName -> { fieldName: { targetTable, targetColumn } }
	type ForeignKeyInfo = { targetTable: string; targetColumn: string }
	const foreignKeyFields = new Map<string, Map<string, ForeignKeyInfo>>()

	if (explicitRelations) {
		for (const [tableName, tableRelations] of Object.entries(
			explicitRelations,
		)) {
			if (!tableRelations) continue
			const fieldMap = new Map<string, ForeignKeyInfo>()
			for (const [_relationName, relationDef] of Object.entries(
				tableRelations,
			)) {
				// Only process 'one' relations (many-to-one / one-to-one)
				if (relationDef.__type === 'one') {
					const fromColumn = relationDef.config.from.__column
					const targetTable = relationDef.__target
					const targetColumn = relationDef.config.to.__column
					// Only add if the from table matches (not inverse relations)
					if (relationDef.config.from.__table === tableName) {
						fieldMap.set(fromColumn, { targetTable, targetColumn })
					}
				}
			}
			if (fieldMap.size > 0) {
				foreignKeyFields.set(tableName, fieldMap)
			}
		}
	}

	// Helper to generate a single record for a table
	function generateRecord(
		tableName: string,
		shape: ZodShape,
		overrides: Record<string, unknown> = {},
		noSeriesFields: Set<string> = new Set(),
	): Record<string, unknown> {
		const item: Record<string, unknown> = {}
		const tableForeignKeys = foreignKeyFields.get(tableName)

		for (const [fieldName, fieldSchema] of Object.entries(shape)) {
			// Apply overrides first (for perParent seeding)
			if (fieldName in overrides) {
				item[fieldName] = overrides[fieldName]
				continue
			}

			const zodSchema = fieldSchema as z.ZodType
			const meta = getZodMeta(zodSchema)

			// Skip flowFields - they are computed, not stored
			if (meta?.flowField) continue

			// Skip autoIncrement fields - they are auto-generated by applyAutoIncrement
			if (meta?.autoIncrement !== undefined) continue

			// Skip noSeries fields - they are auto-generated by NoSeriesManager
			if (noSeriesFields.has(fieldName)) continue

			// Check if this field is a foreign key from relations
			const fkInfo = tableForeignKeys?.get(fieldName)
			if (fkInfo) {
				// Pick a random value from the related table's target column
				const relatedTable = tableInstances.get(fkInfo.targetTable)
				if (relatedTable) {
					const relatedData = relatedTable.toArray()
					if (relatedData.length > 0) {
						const randomItem = relatedData[
							Math.floor(Math.random() * relatedData.length)
						] as Record<string, unknown>
						item[fieldName] = randomItem[fkInfo.targetColumn]
						continue
					}
				}
			}

			// Handle legacy meta.related (for backwards compatibility)
			if (meta?.related) {
				const relatedIds = generationContext.tableIds.get(meta.related)
				if (relatedIds && relatedIds.length > 0) {
					item[fieldName] =
						relatedIds[Math.floor(Math.random() * relatedIds.length)]
				}
			} else {
				item[fieldName] = generateValueFromMeta(
					meta,
					zodSchema,
					generationContext,
				)
			}
		}
		return item
	}

	// Helper to get random count from seed config
	function getSeedCount(
		seedConfig: number | boolean | SeedConfig | undefined,
	): { count: number; isPerParent: boolean; parentTable?: string } {
		if (seedConfig === false) {
			return { count: 0, isPerParent: false }
		}
		if (seedConfig === true) {
			// true means use default seed count
			return { count: defaultSeed, isPerParent: false }
		}
		if (typeof seedConfig === 'number') {
			return { count: seedConfig, isPerParent: false }
		}
		if (seedConfig && typeof seedConfig === 'object') {
			const min = seedConfig.min ?? defaultSeed
			const max = seedConfig.max ?? min
			const count =
				min === max ? min : Math.floor(Math.random() * (max - min + 1)) + min
			return {
				count,
				isPerParent: seedConfig.perParent ?? false,
				parentTable: seedConfig.parentTable,
			}
		}
		return { count: defaultSeed, isPerParent: false }
	}

	const tableOrder = resolveTypedTableOrder()

	// Track used values for unique constraints during seeding
	// Key: `tableName:field1,field2` -> Set of stringified values
	const usedUniqueValues = new Map<string, Set<string>>()

	// Counter for generating unique suffixes when collision resolution is needed
	let uniqueSuffixCounter = 0

	// Helper to generate a guaranteed unique value for a field type
	function generateUniqueValue(
		fieldSchema: z.ZodType,
		meta: FieldMeta | undefined,
	): unknown {
		uniqueSuffixCounter++
		const suffix = `-${uniqueSuffixCounter}-${createId()}`

		// For strings, append unique suffix to a base value
		if (hasZodTrait(fieldSchema, 'ZodString')) {
			const baseValue = generateValueFromMeta(
				meta,
				fieldSchema,
				generationContext,
			)
			return `${String(baseValue)}${suffix}`
		}

		// For numbers (non-autoIncrement), add the counter
		if (hasZodTrait(fieldSchema, 'ZodNumber')) {
			return uniqueSuffixCounter * 1000 + Math.floor(Math.random() * 1000)
		}

		// Fallback: use createId for anything else
		return createId()
	}

	// Helper to check if a record violates unique constraints and regenerate if needed
	function ensureUniqueFields(
		tableName: string,
		item: Record<string, unknown>,
		shape: ZodShape,
		uniqueConstraints: Array<{ name: string; fields: string[] }>,
		maxRetries = 100,
	): Record<string, unknown> {
		if (uniqueConstraints.length === 0) return item

		const result = { ...item }
		let retries = 0

		for (const constraint of uniqueConstraints) {
			const key = `${tableName}:${constraint.fields.join(',')}`
			let usedSet = usedUniqueValues.get(key)
			if (!usedSet) {
				usedSet = new Set<string>()
				usedUniqueValues.set(key, usedSet)
			}

			// Generate unique value for this constraint
			let valueKey = constraint.fields
				.map((f) => String(result[f] ?? ''))
				.join('|')

			while (usedSet.has(valueKey) && retries < maxRetries) {
				retries++
				// Regenerate fields in this constraint with guaranteed unique values
				for (const fieldName of constraint.fields) {
					const fieldSchema = shape[fieldName]
					if (!fieldSchema) continue
					const meta = getZodMeta(fieldSchema as z.ZodType)
					// Skip if it's autoIncrement (handled separately)
					if (meta?.autoIncrement !== undefined) continue
					// Use guaranteed unique value generator for collision resolution
					result[fieldName] = generateUniqueValue(
						fieldSchema as z.ZodType,
						meta,
					)
				}
				valueKey = constraint.fields
					.map((f) => String(result[f] ?? ''))
					.join('|')
			}

			usedSet.add(valueKey)
		}

		return result
	}

	// Seed tables (extracted into reusable function for _reset support)
	function seedTables() {
		for (const tableName of tableOrder) {
			const builder = tables[tableName]
			if (!builder) continue

			const definition = builder._definition
			const table = tableInstances.get(tableName)
			if (!table) continue

			// Skip if table already has data
			if (table.toArray().length > 0) {
				generationContext.tableIds.set(
					tableName,
					table.toArray().map((doc) => doc._id),
				)
				continue
			}

			const seedConfig = definition.seedConfig
			const {
				count,
				isPerParent,
				parentTable: explicitParent,
			} = getSeedCount(seedConfig)

			if (count === 0) {
				generationContext.tableIds.set(tableName, [])
				continue
			}

			const schemaInput = definition.schemaInput
			const shape =
				typeof schemaInput === 'function'
					? schemaInput(typedOneHelper)
					: schemaInput

			// Get unique constraints for this table
			const uniqueConstraints = builder._uniqueConstraints ?? []

			// Get noSeries fields to skip during seed generation
			const noSeriesConfig = builder._noSeriesConfig
			const noSeriesFields = new Set<string>()
			if (noSeriesConfig) {
				const configs = Array.isArray(noSeriesConfig)
					? noSeriesConfig
					: [noSeriesConfig]
				for (const config of configs) {
					noSeriesFields.add(config.field)
				}
			}

			const ids: string[] = []

			// Check if this table should use perParent seeding
			const parentRels = childToParentMap.get(tableName)
			const parentRel = explicitParent
				? parentRels?.find((r) => r.parentTable === explicitParent)
				: parentRels?.[0]

			if (isPerParent && parentRel) {
				// Hierarchical seeding: create `count` records per parent
				const parentIds = generationContext.tableIds.get(parentRel.parentTable)
				if (parentIds && parentIds.length > 0) {
					const parentTable = tableInstances.get(parentRel.parentTable)

					for (const parentId of parentIds) {
						// Get parent record to access its field value
						const parentRecord = parentTable?.get(parentId) as
							| Record<string, unknown>
							| undefined
						const parentValue =
							parentRel.parentField === '_id'
								? parentId
								: parentRecord?.[parentRel.parentField]

						// Generate random count for this parent (re-randomize for each)
						const perParentCount =
							typeof seedConfig === 'object' && seedConfig.min !== undefined
								? Math.floor(
										Math.random() *
											((seedConfig.max ?? seedConfig.min) - seedConfig.min + 1),
									) + seedConfig.min
								: count

						for (let i = 0; i < perParentCount; i++) {
							const overrides = { [parentRel.childField]: parentValue }
							let item = generateRecord(
								tableName,
								shape,
								overrides,
								noSeriesFields,
							)
							// Apply autoIncrement for seeding
							item = applyAutoIncrement(tableName, item)
							// Apply noSeries for seeding
							if (noSeriesFields.size > 0) {
								const noSeriesConfigs = tableNoSeriesConfigs.get(tableName)
								if (noSeriesConfigs) {
									item = noSeriesManager.applyToInsert(noSeriesConfigs, item)
								}
							}
							// Ensure unique constraint fields have unique values
							item = ensureUniqueFields(
								tableName,
								item,
								shape,
								uniqueConstraints,
							)
							const doc = table.insert(item)
							ids.push(doc._id)
						}
					}
				}
			} else {
				// Standard seeding: create `count` records total
				for (let i = 0; i < count; i++) {
					let item = generateRecord(tableName, shape, {}, noSeriesFields)
					// Apply autoIncrement for seeding
					item = applyAutoIncrement(tableName, item)
					// Apply noSeries for seeding
					if (noSeriesFields.size > 0) {
						const noSeriesConfigs = tableNoSeriesConfigs.get(tableName)
						if (noSeriesConfigs) {
							item = noSeriesManager.applyToInsert(noSeriesConfigs, item)
						}
					}
					// Ensure unique constraint fields have unique values
					item = ensureUniqueFields(tableName, item, shape, uniqueConstraints)
					const doc = table.insert(item)
					ids.push(doc._id)
				}
			}

			generationContext.tableIds.set(tableName, ids)
		}
	}

	// Run initial seeding
	seedTables()

	// Reset helper: clears all data, resets counters, re-seeds
	async function resetDatabase() {
		// 1. Clear all tables
		clear()

		// 2. Reset noSeries counters to initial values
		for (const code of noSeriesManager.getAll().map((s) => s.code)) {
			noSeriesManager.reset(code)
		}

		// 3. Reset autoIncrement counters to initial values
		for (const [tableName] of Object.entries(tables)) {
			const configs = tableAutoIncrementConfigs.get(tableName)
			if (configs) {
				for (const { fieldName, initialValue } of configs) {
					autoIncrementState.set(`${tableName}:${fieldName}`, initialValue - 1)
				}
			}
		}

		// 4. Clear seeding state
		generationContext.tableIds.clear()
		usedUniqueValues.clear()
		uniqueSuffixCounter = 0

		// 5. Re-seed all tables
		seedTables()
	}

	// Create a setup table wrapper that provides get/edit/subscribe API for single-document tables
	function createSetupTableWrapper(
		tableName: string,
		table: ReactiveTable<object>,
		defaultValues: Partial<object>,
	): SetupTableApi<object, object> {
		const hasFlowFields =
			flowFieldDefs.has(tableName) || computedFns.has(tableName)
		const hasAutoIncrement = tableAutoIncrementConfigs.has(tableName)

		// Helper to get or create the single document
		const getOrCreate = (): WithSystemFields<object> => {
			const docs = table.toArray()
			if (docs.length > 0) {
				const doc = docs[0]
				return hasFlowFields
					? (wrapWithFlowFields(doc, tableName) as WithSystemFields<object>)
					: (doc as WithSystemFields<object>)
			}
			// Create with defaults
			let initialData = { ...defaultValues } as Record<string, unknown>
			if (hasAutoIncrement) {
				initialData = applyAutoIncrement(tableName, initialData)
			}
			const created = table.insert(initialData as object)
			return hasFlowFields
				? (wrapWithFlowFields(created, tableName) as WithSystemFields<object>)
				: (created as WithSystemFields<object>)
		}

		return {
			get: () => getOrCreate(),
			edit: (updates: Partial<object>) => {
				const docs = table.toArray()
				if (docs.length > 0) {
					const doc = docs[0] as WithSystemFields<object>
					const updated = table.update(doc._id, updates)
					if (!updated) return getOrCreate()
					return hasFlowFields
						? (wrapWithFlowFields(
								updated,
								tableName,
							) as WithSystemFields<object>)
						: (updated as WithSystemFields<object>)
				}
				// No document exists, create with defaults merged with updates
				let initialData = {
					...defaultValues,
					...updates,
				} as Record<string, unknown>
				if (hasAutoIncrement) {
					initialData = applyAutoIncrement(tableName, initialData)
				}
				const created = table.insert(initialData as object)
				return hasFlowFields
					? (wrapWithFlowFields(created, tableName) as WithSystemFields<object>)
					: (created as WithSystemFields<object>)
			},
			subscribe: (callback: () => void) => table.subscribe(callback),
		}
	}

	// Build the table map
	const tableMap = {} as TypedTableMap<Tables>

	for (const [tableName, builder] of Object.entries(tables)) {
		const table = tableInstances.get(tableName)
		if (!table) continue

		// Check if this is a setup table
		const isSetupTable = (builder as { _isSetupTable?: boolean })._isSetupTable
		const defaultValues = builder._defaultValues ?? {}

		if (isSetupTable) {
			// Use SetupTableApi for setup tables
			const setupApi = createSetupTableWrapper(tableName, table, defaultValues)
			;(tableMap as Record<string, unknown>)[tableName] = setupApi
		} else {
			// Regular transactional table
			const definition = builder._definition
			const schemaInput = definition.schemaInput
			const shape =
				typeof schemaInput === 'function'
					? schemaInput(typedOneHelper)
					: schemaInput
			const schemaObj = z.object(shape)

			const wrappedTable = createWrappedTable(tableName, table)

			// Use Object.defineProperty to preserve getters (like size)
			const tableWithSchemas = Object.create(null)
			Object.defineProperties(
				tableWithSchemas,
				Object.getOwnPropertyDescriptors(wrappedTable),
			)
			tableWithSchemas.insertSchema = schemaObj
			tableWithSchemas.updateSchema = schemaObj.partial()

			;(tableMap as Record<string, unknown>)[tableName] = tableWithSchemas
		}
	}

	// Global operations
	const clear = () => {
		for (const table of tableInstances.values()) {
			table.clear()
		}
	}

	const subscribe = (callback: () => void) => {
		globalListeners.add(callback)
		return () => globalListeners.delete(callback)
	}

	const transaction = (ops: TypedTransactionOp<Tables>) => {
		const snapshots = new Map<string, TableSnapshot<object>>()

		for (const tableName of Object.keys(ops)) {
			const table = tableInstances.get(tableName)
			if (table) {
				snapshots.set(tableName, table.createSnapshot())
			}
		}

		try {
			for (const [tableName, tableOps] of Object.entries(ops)) {
				const table = tableInstances.get(tableName)
				if (!table || !tableOps) continue

				if (tableOps.insert) {
					for (const item of tableOps.insert) {
						table.insert(item as object)
					}
				}

				if (tableOps.update) {
					for (const { id, data } of tableOps.update) {
						table.update(id, data as Partial<object>)
					}
				}

				if (tableOps.delete) {
					for (const id of tableOps.delete) {
						table.delete(id)
					}
				}
			}
		} catch (error) {
			// Rollback all tables
			for (const [tableName, snapshot] of snapshots) {
				const table = tableInstances.get(tableName)
				if (table) {
					table.restoreSnapshot(snapshot)
				}
			}
			throw error
		}
	}

	const createView = <T>(name: string, compute: () => T[]): DerivedView<T> => {
		let cache: T[] | null = null

		// Subscribe to invalidate cache on any change
		subscribe(() => {
			cache = null
		})

		return {
			toArray: () => {
				if (cache === null) {
					cache = compute()
				}
				return cache
			},
			get size() {
				return this.toArray().length
			},
			subscribe: (callback: () => void) => {
				const unsub = subscribe(() => {
					cache = null
					callback()
				})
				return unsub
			},
			name,
		}
	}

	// Cast tableMap to the relations-aware type (with inferred relations)
	// The runtime behavior is identical, only the type signature differs
	const schemasWithRelations =
		tableMap as unknown as TypedTableMapWithRelations<
			Tables,
			WithInferredRelations<Tables, Relations>
		>

	// Create the _internals API (noSeriesManager is already created and used for inserts)
	const internalsApi: InternalsApi<
		Tables,
		WithInferredRelations<Tables, Relations>
	> = {
		noSeries: createNoSeriesV2Api(noSeriesManager),
		reset: resetDatabase,
		relations: explicitRelations as unknown as WithInferredRelations<
			Tables,
			Relations
		>,
	}

	// Set the schemas reference for plugin context
	pluginManager.setSchemas(
		schemasWithRelations as unknown as Record<string, unknown>,
	)

	// Create the plugin API
	const pluginsApi: PluginApi = {
		registerGlobal: (plugin: TablePlugin) =>
			pluginManager.registerGlobal(plugin),
		registerForTable: (tableName: string, plugin: TablePlugin) =>
			pluginManager.registerForTable(tableName, plugin),
		unregister: (pluginName: string, tableName?: string) =>
			pluginManager.unregister(pluginName, tableName),
		getPluginsForTable: (tableName: string) =>
			pluginManager.getPluginsForTable(tableName),
	}

	// Create the observability API
	const observabilityApi: ObservabilityApi = {
		setHooks: (hooks: ObservabilityHooks) => {
			observabilityState.hooks = { ...hooks }
		},
		getHooks: () => ({ ...observabilityState.hooks }),
		enable: () => {
			observabilityState.enabled = true
		},
		disable: () => {
			observabilityState.enabled = false
		},
		isEnabled: () => observabilityState.enabled,
	}

	return {
		schemas: schemasWithRelations,
		clear,
		subscribe,
		transaction,
		createView,
		plugins: pluginsApi,
		observability: observabilityApi,
		_internals: internalsApi,
	}
}

// ============================================================================
// Async defineSchema Implementation
// ============================================================================

/**
 * Implementation for async adapter with optimistic updates.
 */
async function defineSchemaImplAsync<
	Tables extends Record<string, AnyTableBuilder>,
	Relations extends RelationsSchema<Tables> = Record<string, never>,
>(
	callback: (ctx: SchemaContext<string>) => Tables,
	options: SchemaOptions<AsyncStorageAdapter, Tables> & {
		relations?: (ctx: RelationsContext<Tables>) => Relations
	},
): Promise<TypedDatabaseSchema<Tables, Relations>> {
	const { defaultSeed = 10 } = options
	const asyncAdapter = options.adapter!
	const tableInstances = new Map<string, AsyncReactiveTable<object>>()
	const globalListeners = new Set<() => void>()

	// Initialize plugin hook manager
	const pluginManager = new PluginHookManager(options.plugins)

	// Initialize observability state
	const observabilityState = {
		enabled: options.observability?.enabled ?? false,
		hooks: { ...options.observability?.hooks } as ObservabilityHooks,
	}

	// Collect table builders created by the callback
	const tableBuilders: Record<string, AnyTableBuilder> = {}

	// Explicit relations schema (populated after tables are created)
	let explicitRelations: Relations = {} as Relations

	// Create the typed one helper that tracks relations with branding
	const typedOneHelper: TypedOneHelper<string> = (tableName) => {
		return z.string().meta({ related: tableName }) as RelationField<
			typeof tableName
		>
	}

	// Create the context-aware createTable function
	const contextCreateTable = <T extends ZodShape>(
		name: string,
		config: TypedTableConfig<T, string>,
	): TypedTableDef<T, z.infer<z.ZodObject<T>>> => {
		const shape =
			typeof config.schema === 'function'
				? config.schema(typedOneHelper)
				: config.schema
		const schema = z.object(shape)
		type TInferred = z.infer<typeof schema>

		const definition: TypedTableDef<T, TInferred> = {
			name,
			schema,
			schemaInput: config.schema,
			seedConfig: config.seed,
			noSeriesConfig: config.noSeries,
			table: () => createTypedTableBuilder(definition, shape),
			setupTable: () => createTypedSetupTableBuilder(definition, shape),
		}

		return definition
	}

	// Create a typed setup table builder (for single-document config tables)
	function createTypedSetupTableBuilder<
		T extends ZodShape,
		TInferred extends object,
		TComputed extends Record<string, unknown>,
	>(
		definition: TypedTableDef<T, TInferred>,
		shape: T,
	): TypedSetupTableBuilder<T, TInferred, TComputed> {
		const builder: TypedSetupTableBuilder<T, TInferred, TComputed> = {
			__tableType: 'setup' as const,
			_defaultValues: {},
			_definition: definition as TypedTableDef<T, TInferred>,
			_inferredType: {} as TInferred,
			_computedType: {} as TComputed,
			_shape: shape,
			_isSetupTable: true as const,
			// Setup tables don't use these but need them for compatibility with table creation
			_indexes: [],
			_uniqueConstraints: [],
			_historyEnabled: false,
			_noSeriesConfig: undefined,

			defaults(values) {
				this._defaultValues = values
				return this
			},

			computed<TNewComputed extends Record<string, unknown>>(
				fn: (row: TInferred, ctx: FlowFieldContext) => TNewComputed,
			): TypedSetupTableBuilder<T, TInferred, TNewComputed> {
				const newDefinition = {
					...definition,
					computedFn: fn,
				}
				const newBuilder = createTypedSetupTableBuilder<
					T,
					TInferred,
					TNewComputed
				>(newDefinition as TypedTableDef<T, TInferred>, shape)
				newBuilder._defaultValues = this._defaultValues as Partial<TInferred>
				;(
					newBuilder._definition as TypedTableDef<T, TInferred> & {
						computedFn?: unknown
					}
				).computedFn = fn
				return newBuilder
			},
		}

		return builder
	}

	// Create a typed table builder (reuse from sync version)
	function createTypedTableBuilder<
		T extends ZodShape,
		TInferred extends object,
		TComputed extends Record<string, unknown>,
	>(
		definition: TypedTableDef<T, TInferred>,
		shape: T,
	): TypedTableBuilder<T, TInferred, TComputed> {
		const builder: TypedTableBuilder<T, TInferred, TComputed> = {
			_indexes: [],
			_uniqueConstraints: [],
			_defaultValues: {},
			_historyEnabled: false,
			_noSeriesConfig: definition.noSeriesConfig,
			_definition: definition as TypedTableDef<T, TInferred>,
			_inferredType: {} as TInferred,
			_computedType: {} as TComputed,
			_shape: shape,

			index(indexName, fields) {
				this._indexes.push({ name: indexName, fields: fields as string[] })
				return this
			},

			unique(constraintName, fields) {
				this._uniqueConstraints.push({
					name: constraintName,
					fields: fields as string[],
				})
				return this
			},

			defaults(values) {
				this._defaultValues = values
				return this
			},

			enableHistory() {
				this._historyEnabled = true
				return this
			},

			computed<TNewComputed extends Record<string, unknown>>(
				fn: (row: TInferred, ctx: FlowFieldContext) => TNewComputed,
			): TypedTableBuilder<T, TInferred, TNewComputed> {
				const newDefinition = {
					...definition,
					computedFn: fn,
				}
				const newBuilder = createTypedTableBuilder<T, TInferred, TNewComputed>(
					newDefinition as TypedTableDef<T, TInferred>,
					shape,
				)
				newBuilder._indexes = this._indexes
				newBuilder._uniqueConstraints = this._uniqueConstraints
				newBuilder._defaultValues = this._defaultValues as Partial<TInferred>
				newBuilder._historyEnabled = this._historyEnabled
				newBuilder._noSeriesConfig = this._noSeriesConfig
				;(
					newBuilder._definition as TypedTableDef<T, TInferred> & {
						computedFn?: unknown
					}
				).computedFn = fn
				return newBuilder
			},
		}

		return builder
	}

	// Execute the callback to get the table definitions
	const ctx: SchemaContext<string> = { createTable: contextCreateTable }
	const tables = callback(ctx)

	// Store builders for later use
	Object.assign(tableBuilders, tables)

	// Create async reactive tables
	for (const [tableName, builder] of Object.entries(tables)) {
		const indexes: TableIndex<object>[] = builder._indexes.map((idx) => ({
			name: idx.name,
			fields: idx.fields as (keyof object)[],
		}))
		const uniqueConstraints =
			builder._uniqueConstraints?.map((uc) => ({
				name: uc.name,
				fields: uc.fields as (keyof object)[],
			})) ?? []
		const defaultValues = builder._defaultValues ?? {}
		const enableHistory = builder._historyEnabled ?? false

		const table = new AsyncReactiveTable<object>(tableName, {
			indexes,
			uniqueConstraints,
			defaultValues,
			enableHistory,
			adapter: asyncAdapter,
			onRollback: options.onRollback
				? (error, operation, id) =>
						options.onRollback?.(error, operation, tableName, id)
				: undefined,
		})

		// Initialize table by loading data from adapter
		await table.init()

		// Subscribe to table changes and notify global listeners
		table.subscribe(() => {
			for (const listener of globalListeners) {
				listener()
			}
		})

		tableInstances.set(tableName, table)
	}

	// Create V2 NoSeriesManager and register configs
	const noSeriesManager = new NoSeriesV2Manager()
	// Map of tableName -> array of V2 configs for that table (for applyToInsert)
	const tableNoSeriesConfigs = new Map<
		string,
		Array<{ code: string; field: string }>
	>()
	for (const [tableName, builder] of Object.entries(tables)) {
		const noSeriesConfig = builder._noSeriesConfig
		if (noSeriesConfig) {
			const configs = Array.isArray(noSeriesConfig)
				? noSeriesConfig
				: [noSeriesConfig]
			const v2Configs: Array<{ code: string; field: string }> = []
			for (const config of configs) {
				const seriesCode = `${tableName}:${config.field}`
				noSeriesManager.register({
					code: seriesCode,
					pattern: config.pattern,
					initialValue: config.initialValue,
					incrementBy: config.incrementBy,
				})
				v2Configs.push({ code: seriesCode, field: config.field })
			}
			tableNoSeriesConfigs.set(tableName, v2Configs)
		}
	}

	// Extract autoIncrement configs from schema metadata
	// Map: tableName -> { fieldName -> initialValue }
	type AutoIncrementConfig = { fieldName: string; initialValue: number }
	const tableAutoIncrementConfigs = new Map<string, AutoIncrementConfig[]>()
	// Track current autoIncrement values: `tableName:fieldName` -> currentValue
	const autoIncrementState = new Map<string, number>()

	for (const [tableName, builder] of Object.entries(tables)) {
		const schemaInput = builder._definition.schemaInput
		const shape =
			typeof schemaInput === 'function'
				? schemaInput(typedOneHelper)
				: schemaInput

		const configs: AutoIncrementConfig[] = []
		for (const [fieldName, fieldSchema] of Object.entries(shape)) {
			const meta = getZodMeta(fieldSchema as z.ZodType)
			if (meta?.autoIncrement !== undefined) {
				const initialValue =
					typeof meta.autoIncrement === 'number' ? meta.autoIncrement : 1
				configs.push({ fieldName, initialValue })
				// Initialize the state to initialValue - 1 so first insert gets initialValue
				autoIncrementState.set(`${tableName}:${fieldName}`, initialValue - 1)
			}
		}
		if (configs.length > 0) {
			tableAutoIncrementConfigs.set(tableName, configs)
		}
	}

	// Helper to apply autoIncrement to an insert item
	function applyAutoIncrement(
		tableName: string,
		item: Record<string, unknown>,
	): Record<string, unknown> {
		const configs = tableAutoIncrementConfigs.get(tableName)
		if (!configs || configs.length === 0) return item

		const result = { ...item }
		for (const { fieldName } of configs) {
			// Only apply if field is not provided or is undefined
			if (result[fieldName] === undefined) {
				const key = `${tableName}:${fieldName}`
				const currentValue = autoIncrementState.get(key) ?? 0
				const nextValue = currentValue + 1
				autoIncrementState.set(key, nextValue)
				result[fieldName] = nextValue
			}
		}
		return result
	}

	// ========================================================================
	// SEEDING LOGIC (for async adapters - runs on server only)
	// ========================================================================

	// Build parent-child relationship map from explicit relations
	type ParentChildRelation = {
		parentTable: string
		parentField: string
		childField: string
	}
	const childToParentMap = new Map<string, ParentChildRelation[]>()

	// Build foreign key field map for each table
	// Structure: tableName -> Map<fieldName, { targetTable, targetColumn }>
	const foreignKeyFields = new Map<
		string,
		Map<string, { targetTable: string; targetColumn: string }>
	>()

	// Process explicit relations if provided
	if (options.relations) {
		const relationsContext = createRelationsContext(tables)
		const definedRelations = options.relations(relationsContext)

		// Parse explicit relations to find many relations (parent -> children)
		for (const [parentTable, tableRels] of Object.entries(
			definedRelations as Record<
				string,
				Record<
					string,
					{
						__type: string
						__target: string
						config: {
							from: { __table: string; __column: string }
							to: { __table: string; __column: string }
						}
					}
				>
			>,
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

		// Build foreign key fields map
		for (const [tableName, tableRels] of Object.entries(
			definedRelations as Record<
				string,
				Record<
					string,
					{
						__type: string
						__target: string
						config: {
							from: { __table: string; __column: string }
							to: { __table: string; __column: string }
						}
					}
				>
			>,
		)) {
			if (!tableRels) continue
			const fieldMap = new Map<
				string,
				{ targetTable: string; targetColumn: string }
			>()
			for (const rel of Object.values(tableRels)) {
				if (rel.__type === 'one') {
					const targetTable = rel.__target
					const fromColumn = rel.config.from.__column
					const targetColumn = rel.config.to.__column
					if (fromColumn !== '_id') {
						fieldMap.set(fromColumn, { targetTable, targetColumn })
					}
				}
			}
			if (fieldMap.size > 0) {
				foreignKeyFields.set(tableName, fieldMap)
			}
		}
	}

	// Resolve table order for seeding (respects dependencies)
	function resolveTypedTableOrder(): string[] {
		const dependencies = new Map<string, Set<string>>()
		const allTables = new Set<string>()

		for (const [tableName, builder] of Object.entries(tables)) {
			allTables.add(tableName)
			const deps = new Set<string>()

			// Use explicit relations for dependencies
			const parentRels = childToParentMap.get(tableName)
			if (parentRels) {
				for (const rel of parentRels) {
					deps.add(rel.parentTable)
				}
			}

			// Also check schema for related fields
			const schemaInput = builder._definition.schemaInput
			const shape =
				typeof schemaInput === 'function'
					? schemaInput(typedOneHelper)
					: schemaInput

			for (const [, fieldSchema] of Object.entries(shape)) {
				const meta = getZodMeta(fieldSchema as z.ZodType)
				if (meta?.related && allTables.has(meta.related)) {
					deps.add(meta.related)
				}
			}

			dependencies.set(tableName, deps)
		}

		// Topological sort
		const ordered: string[] = []
		const visited = new Set<string>()
		const visiting = new Set<string>()

		function visit(tableName: string): void {
			if (visited.has(tableName)) return
			if (visiting.has(tableName)) {
				// Circular dependency - just continue
				return
			}

			visiting.add(tableName)
			const deps = dependencies.get(tableName) ?? new Set()
			for (const dep of deps) {
				if (allTables.has(dep)) {
					visit(dep)
				}
			}
			visiting.delete(tableName)
			visited.add(tableName)
			ordered.push(tableName)
		}

		for (const tableName of allTables) {
			visit(tableName)
		}

		return ordered
	}

	// Generation context for seeding
	const generationContext: GenerationContext = {
		tableIds: new Map(),
	}

	// Helper to get a random ID from a related table
	const getRelatedId = (targetTable: string): string | undefined => {
		const ids = generationContext.tableIds.get(targetTable) ?? []
		if (ids.length === 0) return undefined
		return ids[Math.floor(Math.random() * ids.length)]
	}

	// Helper to generate a single record
	function generateRecord(
		tableName: string,
		shape: ZodShape,
		overrides: Record<string, unknown> = {},
		noSeriesFields: Set<string> = new Set(),
	): Record<string, unknown> {
		const item: Record<string, unknown> = {}
		const tableForeignKeys = foreignKeyFields.get(tableName)

		for (const [fieldName, fieldSchema] of Object.entries(shape)) {
			if (fieldName in overrides) {
				item[fieldName] = overrides[fieldName]
				continue
			}

			const zodSchema = fieldSchema as z.ZodType
			const meta = getZodMeta(zodSchema)

			// Skip flowFields, autoIncrement, and noSeries fields
			if (meta?.flowField) continue
			if (meta?.autoIncrement !== undefined) continue
			if (noSeriesFields.has(fieldName)) continue

			// Check if this field is a foreign key
			const fkInfo = tableForeignKeys?.get(fieldName)
			if (fkInfo) {
				const relatedTable = tableInstances.get(fkInfo.targetTable)
				if (relatedTable) {
					const relatedData = relatedTable.toArray()
					if (relatedData.length > 0) {
						const randomItem = relatedData[
							Math.floor(Math.random() * relatedData.length)
						] as Record<string, unknown>
						item[fieldName] = randomItem[fkInfo.targetColumn]
						continue
					}
				}
			}

			// Check if field references another table via meta.related
			if (meta?.related) {
				const relatedId = getRelatedId(meta.related)
				if (relatedId) {
					item[fieldName] = relatedId
					continue
				}
			}

			// Generate value from meta
			item[fieldName] = generateValueFromMeta(
				meta,
				zodSchema,
				generationContext,
			)
		}

		return item
	}

	// Helper to get seed count from config
	function getSeedCount(
		seedConfig: number | boolean | SeedConfig | undefined,
	): { count: number; isPerParent: boolean; parentTable?: string } {
		if (seedConfig === false) {
			return { count: 0, isPerParent: false }
		}
		if (seedConfig === true) {
			return { count: defaultSeed, isPerParent: false }
		}
		if (typeof seedConfig === 'number') {
			return { count: seedConfig, isPerParent: false }
		}
		if (seedConfig && typeof seedConfig === 'object') {
			const min = seedConfig.min ?? defaultSeed
			const max = seedConfig.max ?? min
			const count =
				min === max ? min : Math.floor(Math.random() * (max - min + 1)) + min
			return {
				count,
				isPerParent: seedConfig.perParent ?? false,
				parentTable: seedConfig.parentTable,
			}
		}
		return { count: defaultSeed, isPerParent: false }
	}

	// Track used values for unique constraints
	const usedUniqueValues = new Map<string, Set<string>>()
	let uniqueSuffixCounter = 0

	// Helper to ensure unique constraint fields have unique values
	function ensureUniqueFields(
		tableName: string,
		item: Record<string, unknown>,
		shape: ZodShape,
		uniqueConstraints: Array<{ name: string; fields: string[] }>,
		maxRetries = 100,
	): Record<string, unknown> {
		if (uniqueConstraints.length === 0) return item

		const result = { ...item }
		let retries = 0

		for (const constraint of uniqueConstraints) {
			const key = `${tableName}:${constraint.fields.join(',')}`
			let usedSet = usedUniqueValues.get(key)
			if (!usedSet) {
				usedSet = new Set<string>()
				usedUniqueValues.set(key, usedSet)
			}

			let valueKey = constraint.fields
				.map((f) => String(result[f] ?? ''))
				.join('|')

			while (usedSet.has(valueKey) && retries < maxRetries) {
				retries++
				for (const fieldName of constraint.fields) {
					const fieldSchema = shape[fieldName]
					if (!fieldSchema) continue
					const meta = getZodMeta(fieldSchema as z.ZodType)
					if (meta?.autoIncrement !== undefined) continue

					// Generate unique value
					uniqueSuffixCounter++
					const suffix = `-${uniqueSuffixCounter}-${createId()}`
					if (hasZodTrait(fieldSchema as z.ZodType, 'ZodString')) {
						const baseValue = generateValueFromMeta(
							meta,
							fieldSchema as z.ZodType,
							generationContext,
						)
						result[fieldName] = `${String(baseValue)}${suffix}`
					} else if (hasZodTrait(fieldSchema as z.ZodType, 'ZodNumber')) {
						result[fieldName] =
							uniqueSuffixCounter * 1000 + Math.floor(Math.random() * 1000)
					} else {
						result[fieldName] = createId()
					}
				}
				valueKey = constraint.fields
					.map((f) => String(result[f] ?? ''))
					.join('|')
			}

			usedSet.add(valueKey)
		}

		return result
	}

	// Seed tables (extracted into reusable function for _reset support)
	const tableOrder = resolveTypedTableOrder()

	async function seedTables() {
		for (const tableName of tableOrder) {
			const builder = tables[tableName]
			if (!builder) continue

			const table = tableInstances.get(tableName)
			if (!table) continue

			// Skip if table already has data (e.g., from persistent storage)
			if (table.toArray().length > 0) {
				// Populate generationContext.tableIds with existing IDs
				generationContext.tableIds.set(
					tableName,
					table.toArray().map((doc) => doc._id),
				)
				continue
			}

			const definition = builder._definition
			const seedConfig = definition.seedConfig
			const {
				count,
				isPerParent,
				parentTable: explicitParent,
			} = getSeedCount(seedConfig)

			if (count === 0) {
				generationContext.tableIds.set(tableName, [])
				continue
			}

			const schemaInput = definition.schemaInput
			const shape =
				typeof schemaInput === 'function'
					? schemaInput(typedOneHelper)
					: schemaInput

			const uniqueConstraints = builder._uniqueConstraints ?? []

			// Get noSeries fields to skip during seed generation
			const noSeriesConfig = builder._noSeriesConfig
			const noSeriesFields = new Set<string>()
			if (noSeriesConfig) {
				const configs = Array.isArray(noSeriesConfig)
					? noSeriesConfig
					: [noSeriesConfig]
				for (const config of configs) {
					noSeriesFields.add(config.field)
				}
			}

			const ids: string[] = []

			// Check if this table should use perParent seeding
			const parentRels = childToParentMap.get(tableName)
			const parentRel = explicitParent
				? parentRels?.find((r) => r.parentTable === explicitParent)
				: parentRels?.[0]

			if (isPerParent && parentRel) {
				// Hierarchical seeding: create `count` records per parent
				const parentIds = generationContext.tableIds.get(parentRel.parentTable)
				if (parentIds && parentIds.length > 0) {
					const parentTable = tableInstances.get(parentRel.parentTable)

					for (const parentId of parentIds) {
						const parentRecord = parentTable
							?.toArray()
							.find((d) => d._id === parentId) as
							| Record<string, unknown>
							| undefined
						const parentValue =
							parentRel.parentField === '_id'
								? parentId
								: parentRecord?.[parentRel.parentField]

						// Generate random count for this parent
						const perParentCount =
							typeof seedConfig === 'object' && seedConfig.min !== undefined
								? Math.floor(
										Math.random() *
											((seedConfig.max ?? seedConfig.min) - seedConfig.min + 1),
									) + seedConfig.min
								: count

						for (let i = 0; i < perParentCount; i++) {
							const overrides = { [parentRel.childField]: parentValue }
							let item = generateRecord(
								tableName,
								shape,
								overrides,
								noSeriesFields,
							)
							item = applyAutoIncrement(tableName, item)
							if (noSeriesFields.size > 0) {
								const noSeriesConfigs = tableNoSeriesConfigs.get(tableName)
								if (noSeriesConfigs) {
									item = noSeriesManager.applyToInsert(noSeriesConfigs, item)
								}
							}
							item = ensureUniqueFields(
								tableName,
								item,
								shape,
								uniqueConstraints,
							)
							const doc = await table.insert(item)
							ids.push(doc._id)
						}
					}
				}
			} else {
				// Standard seeding: create `count` records total
				for (let i = 0; i < count; i++) {
					let item = generateRecord(tableName, shape, {}, noSeriesFields)
					item = applyAutoIncrement(tableName, item)
					if (noSeriesFields.size > 0) {
						const noSeriesConfigs = tableNoSeriesConfigs.get(tableName)
						if (noSeriesConfigs) {
							item = noSeriesManager.applyToInsert(noSeriesConfigs, item)
						}
					}
					item = ensureUniqueFields(tableName, item, shape, uniqueConstraints)
					const doc = await table.insert(item)
					ids.push(doc._id)
				}
			}

			generationContext.tableIds.set(tableName, ids)
		}
	}

	// Run initial seeding
	await seedTables()

	// Reset helper: clears all data (adapter + in-memory), resets counters, re-seeds
	async function resetDatabase() {
		// 1. Clear all tables (clears adapter storage like Redis + in-memory state)
		await clear()

		// 2. Reset noSeries counters to initial values
		for (const code of noSeriesManager.getAll().map((s) => s.code)) {
			noSeriesManager.reset(code)
		}

		// 3. Reset autoIncrement counters to initial values
		for (const tableName of Object.keys(tables)) {
			const configs = tableAutoIncrementConfigs.get(tableName)
			if (configs) {
				for (const { fieldName, initialValue } of configs) {
					autoIncrementState.set(`${tableName}:${fieldName}`, initialValue - 1)
				}
			}
		}

		// 4. Clear seeding state
		generationContext.tableIds.clear()
		usedUniqueValues.clear()
		uniqueSuffixCounter = 0

		// 5. Re-seed all tables
		await seedTables()
	}

	// ========================================================================
	// END SEEDING LOGIC
	// ========================================================================

	// ========================================================================
	// FLOW FIELDS AND COMPUTED FIELDS SUPPORT
	// ========================================================================

	// Extract flowField definitions and computed functions for each table
	const flowFieldDefs = new Map<string, Map<string, FlowFieldDef>>()
	const computedFns = new Map<
		string,
		ComputedFn<object, Record<string, unknown>>
	>()

	for (const [tableName, builder] of Object.entries(tables)) {
		const schemaInput = builder._definition.schemaInput
		const shape =
			typeof schemaInput === 'function'
				? schemaInput(typedOneHelper)
				: schemaInput

		const fieldDefs = new Map<string, FlowFieldDef>()
		for (const [fieldName, fieldSchema] of Object.entries(shape)) {
			const meta = getZodMeta(fieldSchema as z.ZodType)
			if (meta?.flowField) {
				fieldDefs.set(fieldName, meta.flowField)
			}
		}
		if (fieldDefs.size > 0) {
			flowFieldDefs.set(tableName, fieldDefs)
		}

		// Extract computed function if defined
		const computedFn = (
			builder._definition as TypedTableDef<ZodShape, object> & {
				computedFn?: ComputedFn<object, Record<string, unknown>>
			}
		).computedFn
		if (computedFn) {
			computedFns.set(tableName, computedFn)
		}
	}

	// Context for flowField functions - create wrapper objects that apply computed fields
	const flowFieldSchemas: Record<
		string,
		{
			toArray: () => object[]
			findMany: (options?: { where?: (item: object) => boolean }) => object[]
		}
	> = {}

	// Helper to apply computed fields to items (defined before flowFieldSchemas population)
	const applyComputedToItems = (
		tableName: string,
		items: object[],
	): object[] => {
		const computedFn = computedFns.get(tableName)
		if (!computedFn) return items
		return items.map((item) => {
			const computed = computedFn(item, { schemas: flowFieldSchemas })
			return { ...item, ...computed }
		})
	}

	for (const [tableName, table] of tableInstances) {
		flowFieldSchemas[tableName] = {
			toArray: () => applyComputedToItems(tableName, table.toArray()),
			findMany: (options?: { where?: (item: object) => boolean }) => {
				let items: object[] = table.toArray()
				if (options?.where) {
					items = items.filter(options.where)
				}
				return applyComputedToItems(tableName, items)
			},
		}
	}

	const flowFieldContext: FlowFieldContext = {
		schemas: flowFieldSchemas,
	}

	// Cache computed field results per record (async variant)
	const computedCacheAsync = new WeakMap<object, Record<string, unknown>>()

	// Wrap a document with flowField computation and computed fields
	function wrapWithFlowFieldsAsync<D extends object>(
		doc: D,
		tableName: string,
	): D {
		const fieldDefs = flowFieldDefs.get(tableName)
		const computedFn = computedFns.get(tableName)

		if (!fieldDefs && !computedFn) return doc

		// Helper to get a flowField value from the raw document
		const getFlowFieldValue = (target: object, fieldName: string): unknown => {
			const def = fieldDefs?.get(fieldName)
			if (def) {
				return computeFlowField(target, def, flowFieldContext)
			}
			return (target as Record<string, unknown>)[fieldName]
		}

		// Create a wrapper that provides flowField access for computed functions
		const createRowWithFlowFields = (target: object): object => {
			if (!fieldDefs) return target
			return new Proxy(target, {
				get(t, prop) {
					if (typeof prop === 'string' && fieldDefs.has(prop)) {
						return getFlowFieldValue(t, prop)
					}
					return (t as Record<string | symbol, unknown>)[prop]
				},
			})
		}

		// Get or compute cached computed fields for a target
		const getComputedFields = (target: object): Record<string, unknown> => {
			if (!computedFn) return {}
			let cached = computedCacheAsync.get(target)
			if (!cached) {
				const rowWithFlowFields = createRowWithFlowFields(target)
				cached = computedFn(rowWithFlowFields, flowFieldContext) as Record<
					string,
					unknown
				>
				computedCacheAsync.set(target, cached)
			}
			return cached
		}

		return new Proxy(doc, {
			get(target, prop) {
				if (typeof prop === 'string') {
					// Check computed fields first (cached per-record)
					if (computedFn) {
						const computed = getComputedFields(target)
						if (prop in computed) {
							return computed[prop as keyof typeof computed]
						}
					}

					// Check flowFields
					const def = fieldDefs?.get(prop)
					if (def) {
						return computeFlowField(target, def, flowFieldContext)
					}
				}
				return (target as Record<string | symbol, unknown>)[prop]
			},
			ownKeys(target) {
				const baseKeys = Reflect.ownKeys(target)
				const flowKeys = fieldDefs ? Array.from(fieldDefs.keys()) : []
				const computedKeys = computedFn
					? Object.keys(getComputedFields(target))
					: []
				return [...new Set([...baseKeys, ...flowKeys, ...computedKeys])]
			},
			getOwnPropertyDescriptor(target, prop) {
				const targetDescriptor = Object.getOwnPropertyDescriptor(target, prop)
				if (targetDescriptor) {
					return targetDescriptor
				}

				if (typeof prop === 'string') {
					if (
						fieldDefs?.has(prop) ||
						(computedFn && prop in getComputedFields(target))
					) {
						return { enumerable: true, configurable: true, writable: false }
					}
				}
				return undefined
			},
		}) as D
	}

	// Helper to check if a table has flow fields
	const hasFlowFieldsForTable = (tableName: string): boolean =>
		flowFieldDefs.has(tableName) || computedFns.has(tableName)

	// Resolve relations for a document based on `with` configuration (async version)
	function resolveRelationsAsync<T extends object>(
		doc: T,
		tableName: string,
		withConfig: WithConfig | undefined,
	): T {
		if (!withConfig) return doc

		const result = { ...doc } as Record<string, unknown>

		const tableExplicitRelations = (
			explicitRelations as Record<string, TableRelations | undefined>
		)[tableName]
		if (tableExplicitRelations) {
			for (const [relationName, relationDef] of Object.entries(
				tableExplicitRelations,
			)) {
				const configValue = withConfig[relationName]
				if (!configValue) continue

				const targetTable = relationDef.__target
				const fromColumn = relationDef.config.from.__column
				const toColumn = relationDef.config.to.__column
				const fromValue = (doc as Record<string, unknown>)[fromColumn]

				const targetTableInstance = tableInstances.get(targetTable)
				if (!targetTableInstance) continue

				if (relationDef.__type === 'one') {
					const targetDocs = targetTableInstance.toArray()
					let match = targetDocs.find(
						(d) => (d as Record<string, unknown>)[toColumn] === fromValue,
					)

					if (match) {
						if (hasFlowFieldsForTable(targetTable)) {
							match = wrapWithFlowFieldsAsync(match, targetTable)
						}

						if (typeof configValue === 'object' && configValue.with) {
							match = resolveRelationsAsync(
								match,
								targetTable,
								configValue.with,
							)
						}
					}

					result[relationName] = match ?? null
				} else {
					const targetDocs = targetTableInstance.toArray()
					let matches = targetDocs.filter(
						(d) => (d as Record<string, unknown>)[toColumn] === fromValue,
					)

					if (hasFlowFieldsForTable(targetTable)) {
						matches = matches.map((m) =>
							wrapWithFlowFieldsAsync(m, targetTable),
						)
					}

					if (typeof configValue === 'object' && configValue.with) {
						matches = matches.map((m) =>
							resolveRelationsAsync(m, targetTable, configValue.with),
						)
					}

					result[relationName] = matches
				}
			}
		}

		return result as T
	}

	// ========================================================================
	// END FLOW FIELDS AND COMPUTED FIELDS SUPPORT
	// ========================================================================

	// Build reverse relation map for cascade/setNull/restrict
	type ReverseRelation = {
		childTable: string
		fieldName: string
		onDelete: 'cascade' | 'setNull' | 'restrict'
	}
	const reverseRelations = new Map<string, ReverseRelation[]>()

	for (const [tableName, builder] of Object.entries(tables)) {
		const schemaInput = builder._definition.schemaInput
		const shape =
			typeof schemaInput === 'function'
				? schemaInput(typedOneHelper)
				: schemaInput

		for (const [fieldName, fieldSchema] of Object.entries(shape)) {
			const meta = getZodMeta(fieldSchema as z.ZodType)
			if (meta?.related && meta?.onDelete) {
				const reverseList = reverseRelations.get(meta.related) ?? []
				reverseList.push({
					childTable: tableName,
					fieldName,
					onDelete: meta.onDelete,
				})
				reverseRelations.set(meta.related, reverseList)
			}
		}
	}

	// Create a setup table wrapper that provides get/edit/subscribe API for single-document tables
	function createSetupTableWrapper(
		tableName: string,
		table: AsyncReactiveTable<object>,
		defaultValues: Partial<object>,
	): SetupTableApi<object, object> {
		const hasAutoIncrement = tableAutoIncrementConfigs.has(tableName)

		// Helper to get or create the single document
		const getOrCreate = async (): Promise<WithSystemFields<object>> => {
			const docs = table.toArray()
			if (docs.length > 0) {
				return docs[0] as WithSystemFields<object>
			}
			// Create with defaults
			let initialData = { ...defaultValues } as Record<string, unknown>
			if (hasAutoIncrement) {
				initialData = applyAutoIncrement(tableName, initialData)
			}
			const created = await table.insert(initialData as object)
			return created as WithSystemFields<object>
		}

		return {
			get: () => getOrCreate() as unknown as WithSystemFields<object>,
			edit: (updates: Partial<object>) => {
				const docs = table.toArray()
				if (docs.length > 0) {
					const doc = docs[0] as WithSystemFields<object>
					return table.update(
						doc._id,
						updates,
					) as unknown as WithSystemFields<object>
				}
				// No document exists, create with defaults merged with updates
				let initialData = {
					...defaultValues,
					...updates,
				} as Record<string, unknown>
				if (hasAutoIncrement) {
					initialData = applyAutoIncrement(tableName, initialData)
				}
				return table.insert(
					initialData as object,
				) as unknown as WithSystemFields<object>
			},
			subscribe: (callback: () => void) => table.subscribe(callback),
		}
	}

	// Build the table map with proper typing and async operations
	const tableMap = {} as TypedTableMap<Tables>

	for (const [tableName, builder] of Object.entries(tables)) {
		const table = tableInstances.get(tableName)!
		const schema = builder._definition.schema

		// Check if this is a setup table
		const isSetupTable = (builder as { _isSetupTable?: boolean })._isSetupTable
		const defaultValues = builder._defaultValues ?? {}

		if (isSetupTable) {
			// Use SetupTableApi for setup tables
			const setupApi = createSetupTableWrapper(tableName, table, defaultValues)
			;(tableMap as Record<string, unknown>)[tableName] = setupApi
			continue
		}

		// Create async wrapped table
		// Note: Cannot spread table.proxy because Proxy getters are not enumerable
		// Must explicitly reference methods from the proxy or table instance
		const noSeriesConfigs = tableNoSeriesConfigs.get(tableName)
		const hasNoSeries = noSeriesConfigs && noSeriesConfigs.length > 0
		const hasAutoIncrement = tableAutoIncrementConfigs.has(tableName)
		const hasFlowFields = hasFlowFieldsForTable(tableName)

		// Helper to wrap a single document with flow fields
		const wrapDoc = <D extends object>(
			doc: D | undefined | null,
		): D | undefined => {
			if (!doc) return undefined
			return hasFlowFields ? wrapWithFlowFieldsAsync(doc, tableName) : doc
		}

		// Helper to wrap an array of documents with flow fields
		const wrapDocs = <D extends object>(docs: D[]): D[] => {
			if (!hasFlowFields) return docs
			return docs.map((doc) => wrapWithFlowFieldsAsync(doc, tableName))
		}

		const wrappedTable = {
			// Explicitly reference proxy methods (these return correct values through the proxy getter)
			get toArray() {
				// Return a function that wraps results with flow fields
				return () => wrapDocs(table.proxy.toArray())
			},
			get size() {
				return table.proxy.size
			},
			get subscribe() {
				return table.proxy.subscribe
			},
			insert: async (item: object) => {
				// Apply autoIncrement for fields not provided
				let processedItem = hasAutoIncrement
					? applyAutoIncrement(tableName, item as Record<string, unknown>)
					: item
				// Apply No Series auto-generation for fields not provided
				processedItem = hasNoSeries
					? noSeriesManager.applyToInsert(
							noSeriesConfigs,
							processedItem as Record<string, unknown>,
						)
					: processedItem
				const result = await table.insert(processedItem)
				return wrapDoc(result)!
			},
			update: async (id: string, updates: object) => {
				const result = await table.update(id, updates as Partial<object>)
				return wrapDoc(result)
			},
			get: (id: string) => {
				const result = table.get(id)
				return wrapDoc(result)
			},
			has: (id: string) => table.has(id),
			query: (indexName: string, value: unknown) => {
				const results = table.query(indexName, value)
				return wrapDocs(results)
			},
			filter: (predicate: (item: object) => boolean) => {
				return wrapDocs(table.proxy.toArray()).filter(predicate)
			},
			find: (predicate: (item: object) => boolean) => {
				return wrapDocs(table.proxy.toArray()).find(predicate)
			},
			findMany: (options?: {
				where?: (item: object, helpers: QueryHelpers<object>) => boolean
				orderBy?:
					| { field: string; direction: 'asc' | 'desc' }
					| Array<{ field: string; direction: 'asc' | 'desc' }>
				limit?: number
				offset?: number
				columns?: Partial<Record<string, boolean>>
				with?: WithConfig
			}): WithSystemFields<object>[] => {
				if (options?.where) {
					// Where may access computed/flow fields, so wrap first
					let results: WithSystemFields<object>[] = wrapDocs(
						table.proxy.toArray(),
					)
					results = applyWhereFilter(
						results,
						options.where,
					) as WithSystemFields<object>[]
					if (options.orderBy) {
						results = applyOrdering(results, options.orderBy)
					}
					results = applyPagination(results, options.offset, options.limit)
					if (options.columns) {
						results = applyColumnSelection(
							results,
							options.columns,
						) as WithSystemFields<object>[]
					}
					if (options.with) {
						results = results.map((doc) =>
							resolveRelationsAsync(doc, tableName, options.with),
						)
					}
					return results
				}
				// Fast path: sort/paginate on raw data, then wrap only the page
				let rawResults = table.proxy.toArray() as object[]
				if (options?.orderBy) {
					rawResults = applyOrdering(rawResults, options.orderBy)
				}
				rawResults = applyPagination(
					rawResults,
					options?.offset,
					options?.limit,
				)
				let results = wrapDocs(rawResults) as WithSystemFields<object>[]
				if (options?.columns) {
					results = applyColumnSelection(
						results,
						options.columns,
					) as WithSystemFields<object>[]
				}
				if (options?.with) {
					results = results.map((doc) =>
						resolveRelationsAsync(doc, tableName, options.with),
					)
				}
				return results
			},
			findFirst: (options?: {
				where?: (item: object, helpers: QueryHelpers<object>) => boolean
				orderBy?:
					| { field: string; direction: 'asc' | 'desc' }
					| Array<{ field: string; direction: 'asc' | 'desc' }>
				columns?: Partial<Record<string, boolean>>
				with?: WithConfig
			}): WithSystemFields<object> | undefined => {
				if (options?.where) {
					let results: WithSystemFields<object>[] = wrapDocs(
						table.proxy.toArray(),
					)
					results = applyWhereFilter(
						results,
						options.where,
					) as WithSystemFields<object>[]
					if (options.orderBy) {
						results = applyOrdering(results, options.orderBy)
					}
					const first = results[0]
					if (!first) return undefined
					let doc: WithSystemFields<object> = first
					if (options.columns) {
						doc = applyColumnSelection(
							[doc],
							options.columns,
						)[0] as WithSystemFields<object>
					}
					if (options.with) {
						doc = resolveRelationsAsync(doc, tableName, options.with)
					}
					return doc
				}
				// Fast path: sort on raw data, take first, then wrap
				let rawResults = table.proxy.toArray() as object[]
				if (options?.orderBy) {
					rawResults = applyOrdering(rawResults, options.orderBy)
				}
				const first = rawResults[0]
				if (!first) return undefined
				let doc = wrapDoc(first)! as WithSystemFields<object>
				if (options?.columns) {
					doc = applyColumnSelection(
						[doc],
						options.columns,
					)[0] as WithSystemFields<object>
				}
				if (options?.with) {
					doc = resolveRelationsAsync(doc, tableName, options.with)
				}
				return doc
			},
			clear: () => table.clear(),
			batch: {
				insertMany: async (items: object[]) => {
					// Apply autoIncrement and No Series auto-generation for each item
					const processedItems = items.map((item) => {
						let processed = hasAutoIncrement
							? applyAutoIncrement(tableName, item as Record<string, unknown>)
							: item
						processed = hasNoSeries
							? noSeriesManager.applyToInsert(
									noSeriesConfigs,
									processed as Record<string, unknown>,
								)
							: processed
						return processed
					})
					const results: WithSystemFields<object>[] = []
					for (const item of processedItems) {
						const result = await table.insert(item)
						results.push(wrapDoc(result)!)
					}
					return results
				},
				updateMany: async (
					predicate: (item: object) => boolean,
					updates: Partial<object>,
				) => {
					const toUpdate = table.toArray().filter(predicate)
					const results: WithSystemFields<object>[] = []
					for (const doc of toUpdate) {
						const result = await table.update(doc._id, updates)
						if (result) results.push(wrapDoc(result)!)
					}
					return results
				},
				deleteMany: async (predicate: (item: object) => boolean) => {
					const toDelete = table.toArray().filter(predicate)
					let count = 0
					for (const doc of toDelete) {
						if (await table.delete(doc._id)) count++
					}
					return count
				},
			},
			history: {
				createSnapshot: () => table.createSnapshot(),
				restoreSnapshot: async (snapshot: TableSnapshot<object>) => {
					await table.restoreSnapshot(snapshot)
				},
			},
			insertSchema: schema.omit({
				_id: true,
				_createdAt: true,
				_updatedAt: true,
			}) as z.ZodType,
			updateSchema: schema
				.omit({ _id: true, _createdAt: true, _updatedAt: true })
				.partial() as z.ZodType,
			schema: schema,
			// Override delete to handle cascade/setNull/restrict
			delete: async (id: string) => {
				const reverseRels = reverseRelations.get(tableName)
				if (reverseRels) {
					for (const { childTable, fieldName, onDelete } of reverseRels) {
						if (onDelete === 'restrict') {
							const childTableInstance = tableInstances.get(childTable)
							if (childTableInstance) {
								const hasReferences = childTableInstance
									.toArray()
									.some(
										(doc) => (doc as Record<string, unknown>)[fieldName] === id,
									)
								if (hasReferences) {
									throw new Error(
										`Cannot delete ${tableName} with id ${id}: referenced by ${childTable}.${fieldName} with restrict constraint`,
									)
								}
							}
						}
					}
				}

				const result = await table.delete(id)

				if (result && reverseRels) {
					for (const { childTable, fieldName, onDelete } of reverseRels) {
						const childTableInstance = tableInstances.get(childTable)
						if (!childTableInstance) continue

						if (onDelete === 'cascade') {
							const toDelete = childTableInstance
								.toArray()
								.filter(
									(doc) => (doc as Record<string, unknown>)[fieldName] === id,
								)
							for (const doc of toDelete) {
								await childTableInstance.delete(doc._id)
							}
						} else if (onDelete === 'setNull') {
							const toUpdate = childTableInstance
								.toArray()
								.filter(
									(doc) => (doc as Record<string, unknown>)[fieldName] === id,
								)
							for (const doc of toUpdate) {
								await childTableInstance.update(doc._id, {
									[fieldName]: null,
								} as Partial<object>)
							}
						}
					}
				}

				return result
			},
		}

		;(tableMap as Record<string, unknown>)[tableName] = wrappedTable
	}

	// Global operations (async versions)
	const clear = async () => {
		for (const table of tableInstances.values()) {
			await table.clear()
		}
	}

	const subscribe = (callback: () => void) => {
		globalListeners.add(callback)
		return () => globalListeners.delete(callback)
	}

	// Transaction for async not implemented, return sync-like interface
	const transaction = (_ops: TypedTransactionOp<Tables>) => {
		throw new Error('Transactions not yet implemented for async adapters')
	}

	const createView = <T>(
		_name: string,
		_compute: () => T[],
	): DerivedView<T> => {
		throw new Error('Views not yet implemented for async adapters')
	}

	// Process explicit relations if provided, and infer inverse relations
	if (options.relations) {
		const relationsContext = createRelationsContext(tables)
		const definedRelations = options.relations(relationsContext)
		// Infer inverse relations (e.g., posts.author -> users.posts)
		explicitRelations = inferInverseRelations(
			definedRelations as Record<string, TableRelations | undefined>,
		) as Relations
	}

	// Cast tableMap to the relations-aware type (with inferred relations)
	const schemasWithRelations =
		tableMap as unknown as TypedTableMapWithRelations<
			Tables,
			WithInferredRelations<Tables, Relations>
		>

	// Create the _internals API (noSeriesManager is already created and used for inserts)
	const internalsApi: InternalsApi<
		Tables,
		WithInferredRelations<Tables, Relations>
	> = {
		noSeries: createNoSeriesV2Api(noSeriesManager),
		relations: explicitRelations as unknown as WithInferredRelations<
			Tables,
			Relations
		>,
		reset: resetDatabase,
	}

	// Set the schemas reference for plugin context
	pluginManager.setSchemas(
		schemasWithRelations as unknown as Record<string, unknown>,
	)

	// Create the plugin API
	const pluginsApi: PluginApi = {
		registerGlobal: (plugin: TablePlugin) =>
			pluginManager.registerGlobal(plugin),
		registerForTable: (tableName: string, plugin: TablePlugin) =>
			pluginManager.registerForTable(tableName, plugin),
		unregister: (pluginName: string, tableName?: string) =>
			pluginManager.unregister(pluginName, tableName),
		getPluginsForTable: (tableName: string) =>
			pluginManager.getPluginsForTable(tableName),
	}

	// Create the observability API
	const observabilityApi: ObservabilityApi = {
		setHooks: (hooks: ObservabilityHooks) => {
			observabilityState.hooks = { ...hooks }
		},
		getHooks: () => ({ ...observabilityState.hooks }),
		enable: () => {
			observabilityState.enabled = true
		},
		disable: () => {
			observabilityState.enabled = false
		},
		isEnabled: () => observabilityState.enabled,
	}

	return {
		schemas: schemasWithRelations,
		clear,
		subscribe,
		transaction,
		createView,
		plugins: pluginsApi,
		observability: observabilityApi,
		_internals: internalsApi,
	}
}

export type {
	AsyncDatabaseSchema,
	DatabaseSchema,
	FlowFieldConfig,
	FlowFieldContext,
	FlowFieldDef,
	FlowFieldType,
	SchemaOptions,
	SeedConfig,
	TableBuilder,
	TableDefinition,
}
