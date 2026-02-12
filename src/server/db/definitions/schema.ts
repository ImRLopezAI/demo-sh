import { z } from 'zod'
import {
	type AsyncStorageAdapter,
	createMemoryAdapter,
	type SyncStorageAdapter,
} from './adapters'
import {
	applyColumnSelection,
	applyOrdering,
	applyPagination,
	applyWhereFilter,
} from './core/query-helpers'
import { flowField } from './fields'
import {
	createNoSeriesV2Api,
	type InternalsApi,
} from './no-series'
import {
	type RelationsContext,
	type RelationsSchema,
	type TableRelations,
	type WithInferredRelations,
} from './relations'
import {
	AsyncReactiveTable,
	ReactiveTable,
	type TableIndex,
	type TableSnapshot,
	type WithSystemFields,
} from './table'
import {
	type AnyTableBuilder,
	type AsyncDatabaseSchema,
	type DatabaseSchema,
	type DerivedView,
	FIELD_TYPES,
	type FieldType,
	type FlowFieldConfig,
	type FlowFieldContext,
	type FlowFieldDef,
	type FlowFieldType,
	type QueryHelpers,
	type SchemaContext,
	type SchemaOptions,
	type SeedConfig,
	type SetupTableApi,
	type TableBuilder,
	type TableDefinition,
	type TypedDatabaseSchema,
	type TypedOneHelper,
	type TypedTableMap,
	type TypedTableMapWithRelations,
	type TypedTransactionOp,
	type WithConfig,
	type ZodShape,
} from './types'
import {
	applyAutoIncrementToItem,
	createPluginApi,
	createObservabilityApi,
} from './core/schema-helpers'
import {
	buildFlowFieldContext,
	createFlowFieldWrapper,
} from './fields/flow-field-wiring'
import { createRelationResolver } from './core/relation-resolver'
import { createInstrumentedTable } from './core/instrumented-table'
import { createSchemaSeeder } from './seeding/schema-seeder'
import { prepareSchema } from './core/schema-setup'
import { FlowFieldCache } from './fields/flow-field-cache'

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
 *     schema: (one) => ({
 *       title: z.string(),
 *       authorId: one('users'),
 *     }),
 *   }).table(),
 * }))
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
// Sync defineSchema Implementation
// ============================================================================

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
	// Use shared preparation
	const prep = prepareSchema(callback, options)
	const {
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
	} = prep

	const { flowFieldDefs, computedFns, relationMeta, reverseRelations } = fieldExtraction

	const syncAdapter =
		(options.adapter as SyncStorageAdapter | undefined) ?? createMemoryAdapter()
	const tableInstances = new Map<string, ReactiveTable<object>>()
	const globalListeners = new Set<() => void>()

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

		table.subscribe(() => {
			for (const listener of globalListeners) {
				listener()
			}
		})

		tableInstances.set(tableName, table)
	}

	// Build flow field context, cache, and wrapper
	const { flowFieldContext } = buildFlowFieldContext(tableInstances, computedFns)
	const computedCache = new WeakMap<object, Record<string, unknown>>()
	const flowFieldCache = new FlowFieldCache()
	const wrapWithFlowFields = createFlowFieldWrapper(
		flowFieldDefs,
		computedFns,
		flowFieldContext,
		computedCache,
		flowFieldCache,
	)

	// Create the relation resolver
	const resolveRelations = createRelationResolver({
		explicitRelations: explicitRelations as Record<string, TableRelations | undefined>,
		relationMeta,
		getTableData: (tableName: string) => {
			const table = tableInstances.get(tableName)
			return table ? table.toArray() : []
		},
		getTableDoc: (tableName: string, id: string) => {
			const table = tableInstances.get(tableName)
			return table ? table.get(id) : undefined
		},
		hasFlowFields: (tableName: string) =>
			flowFieldDefs.has(tableName) || computedFns.has(tableName),
		wrapWithFlowFields,
	})

	// Create seeder and run initial seeding
	const seeder = createSchemaSeeder({
		tables: tables as Record<string, {
			_definition: { schemaInput: unknown; seedConfig?: number | boolean | SeedConfig }
			_noSeriesConfig?: unknown
			_uniqueConstraints?: Array<{ name: string; fields: string[] }>
		}>,
		typedOneHelper,
		tableOrder,
		defaultSeed,
		noSeriesManager,
		tableNoSeriesConfigs,
		tableAutoIncrementConfigs,
		autoIncrementState,
		childToParentMap,
		foreignKeyFields,
		getTableInstance: (name: string) => {
			const table = tableInstances.get(name)
			if (!table) return undefined
			return {
				toArray: () => table.toArray() as Array<{ _id: string } & Record<string, unknown>>,
				get: (id: string) => table.get(id) as ({ _id: string } & Record<string, unknown>) | undefined,
				insert: (item: object) => table.insert(item),
			}
		},
	})

	seeder.seedTables()

	// Reset helper
	async function resetDatabase() {
		clear()

		for (const code of noSeriesManager.getAll().map((s) => s.code)) {
			noSeriesManager.reset(code)
		}

		for (const [tableName] of Object.entries(tables)) {
			const configs = tableAutoIncrementConfigs.get(tableName)
			if (configs) {
				for (const { fieldName, initialValue } of configs) {
					autoIncrementState.set(`${tableName}:${fieldName}`, initialValue - 1)
				}
			}
		}

		seeder.resetState()
		seeder.seedTables()
	}

	// Create setup table wrapper for single-document config tables
	function createSetupTableWrapper(
		tableName: string,
		table: ReactiveTable<object>,
		defaultValues: Partial<object>,
	): SetupTableApi<object, object> {
		const hasFlowFieldsFlag =
			flowFieldDefs.has(tableName) || computedFns.has(tableName)
		const hasAutoIncrement = tableAutoIncrementConfigs.has(tableName)

		const getOrCreate = (): WithSystemFields<object> => {
			const docs = table.toArray()
			if (docs.length > 0) {
				const doc = docs[0]
				return hasFlowFieldsFlag
					? (wrapWithFlowFields(doc, tableName) as WithSystemFields<object>)
					: (doc as WithSystemFields<object>)
			}
			let initialData = { ...defaultValues } as Record<string, unknown>
			if (hasAutoIncrement) {
				initialData = applyAutoIncrementToItem(tableName, initialData, tableAutoIncrementConfigs, autoIncrementState)
			}
			const created = table.insert(initialData as object)
			return hasFlowFieldsFlag
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
					return hasFlowFieldsFlag
						? (wrapWithFlowFields(updated, tableName) as WithSystemFields<object>)
						: (updated as WithSystemFields<object>)
				}
				let initialData = { ...defaultValues, ...updates } as Record<string, unknown>
				if (hasAutoIncrement) {
					initialData = applyAutoIncrementToItem(tableName, initialData, tableAutoIncrementConfigs, autoIncrementState)
				}
				const created = table.insert(initialData as object)
				return hasFlowFieldsFlag
					? (wrapWithFlowFields(created, tableName) as WithSystemFields<object>)
					: (created as WithSystemFields<object>)
			},
			subscribe: (callback: () => void) => table.subscribe(callback),
		}
	}

	// Build the table map
	const tableMap = {} as TypedTableMap<Tables>
	const instrumentedTables = new Map<string, ReturnType<typeof createInstrumentedTable>>()

	for (const [tableName, builder] of Object.entries(tables)) {
		const table = tableInstances.get(tableName)
		if (!table) continue

		const isSetupTable = (builder as { _isSetupTable?: boolean })._isSetupTable
		const defaultValues = builder._defaultValues ?? {}

		if (isSetupTable) {
			const setupApi = createSetupTableWrapper(tableName, table, defaultValues)
			;(tableMap as Record<string, unknown>)[tableName] = setupApi
		} else {
			const definition = builder._definition
			const schemaInput = definition.schemaInput
			const shape =
				typeof schemaInput === 'function'
					? (schemaInput as (one: TypedOneHelper<string>) => ZodShape)(typedOneHelper)
					: (schemaInput as ZodShape)
			const schemaObj = z.object(shape)

			const instrumentedTable = createInstrumentedTable({
				tableName,
				table,
				pluginManager,
				observabilityState,
				hasFlowFields: flowFieldDefs.has(tableName) || computedFns.has(tableName),
				wrapWithFlowFields,
				noSeriesConfigs: tableNoSeriesConfigs.get(tableName),
				noSeriesManager,
				tableAutoIncrementConfigs,
				autoIncrementState,
				reverseRelations: reverseRelations.get(tableName),
				tableInstances,
				getInstrumentedTable: (name: string) => instrumentedTables.get(name),
				resolveRelations,
				flowFieldCache,
			})

			instrumentedTables.set(tableName, instrumentedTable)

			const tableWithSchemas = Object.create(null)
			Object.defineProperties(
				tableWithSchemas,
				Object.getOwnPropertyDescriptors(instrumentedTable),
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

	const schemasWithRelations =
		tableMap as unknown as TypedTableMapWithRelations<
			Tables,
			WithInferredRelations<Tables, Relations>
		>

	const internalsApi: InternalsApi<
		Tables,
		WithInferredRelations<Tables, Relations>
	> = {
		noSeries: createNoSeriesV2Api(noSeriesManager),
		reset: resetDatabase,
		relations: explicitRelations as unknown as WithInferredRelations<Tables, Relations>,
	}

	pluginManager.setSchemas(
		schemasWithRelations as unknown as Record<string, unknown>,
	)

	const pluginsApi = createPluginApi(pluginManager)
	const observabilityApi = createObservabilityApi(observabilityState)

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

async function defineSchemaImplAsync<
	Tables extends Record<string, AnyTableBuilder>,
	Relations extends RelationsSchema<Tables> = Record<string, never>,
>(
	callback: (ctx: SchemaContext<string>) => Tables,
	options: SchemaOptions<AsyncStorageAdapter, Tables> & {
		relations?: (ctx: RelationsContext<Tables>) => Relations
	},
): Promise<TypedDatabaseSchema<Tables, Relations>> {
	// Use shared preparation
	const prep = prepareSchema(callback, options)
	const {
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
	} = prep

	const asyncAdapter = options.adapter!
	const tableInstances = new Map<string, AsyncReactiveTable<object>>()
	const globalListeners = new Set<() => void>()

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

		await table.init()

		table.subscribe(() => {
			for (const listener of globalListeners) {
				listener()
			}
		})

		tableInstances.set(tableName, table)
	}

	// Create seeder and run async seeding
	const seeder = createSchemaSeeder({
		tables: tables as Record<string, {
			_definition: { schemaInput: unknown; seedConfig?: number | boolean | SeedConfig }
			_noSeriesConfig?: unknown
			_uniqueConstraints?: Array<{ name: string; fields: string[] }>
		}>,
		typedOneHelper,
		tableOrder,
		defaultSeed,
		noSeriesManager,
		tableNoSeriesConfigs,
		tableAutoIncrementConfigs,
		autoIncrementState,
		childToParentMap,
		foreignKeyFields,
		getTableInstance: (name: string) => {
			const table = tableInstances.get(name)
			if (!table) return undefined
			return {
				toArray: () => table.toArray() as Array<{ _id: string } & Record<string, unknown>>,
				get: (id: string) => {
					const doc = table.get(id)
					return doc as ({ _id: string } & Record<string, unknown>) | undefined
				},
				insert: (item: object) => table.insert(item),
			}
		},
	})

	await seeder.seedTablesAsync()

	// Reset helper
	async function resetDatabase() {
		await clear()

		for (const code of noSeriesManager.getAll().map((s) => s.code)) {
			noSeriesManager.reset(code)
		}

		for (const tableName of Object.keys(tables)) {
			const configs = tableAutoIncrementConfigs.get(tableName)
			if (configs) {
				for (const { fieldName, initialValue } of configs) {
					autoIncrementState.set(`${tableName}:${fieldName}`, initialValue - 1)
				}
			}
		}

		seeder.resetState()
		await seeder.seedTablesAsync()
	}

	// Extract flow fields and build wrapper (after seeding so data is present)
	const { flowFieldDefs, computedFns } = fieldExtraction

	const { flowFieldContext } = buildFlowFieldContext(tableInstances, computedFns)
	const computedCacheAsync = new WeakMap<object, Record<string, unknown>>()
	const flowFieldCacheAsync = new FlowFieldCache()
	const wrapWithFlowFieldsAsync = createFlowFieldWrapper(
		flowFieldDefs,
		computedFns,
		flowFieldContext,
		computedCacheAsync,
		flowFieldCacheAsync,
	)

	const hasFlowFieldsForTable = (tableName: string): boolean =>
		flowFieldDefs.has(tableName) || computedFns.has(tableName)

	// Create relation resolver for async path
	const resolveRelationsAsync = createRelationResolver({
		explicitRelations: explicitRelations as Record<string, TableRelations | undefined>,
		relationMeta: new Map(), // Async path only uses explicit relations
		getTableData: (tableName: string) => {
			const table = tableInstances.get(tableName)
			return table ? table.toArray() : []
		},
		getTableDoc: (tableName: string, id: string) => {
			const table = tableInstances.get(tableName)
			return table ? table.get(id) : undefined
		},
		hasFlowFields: hasFlowFieldsForTable,
		wrapWithFlowFields: wrapWithFlowFieldsAsync,
	})

	// Build reverse relation map for cascade/setNull/restrict
	const reverseRelations = fieldExtraction.reverseRelations

	// Create setup table wrapper for async
	function createSetupTableWrapper(
		tableName: string,
		table: AsyncReactiveTable<object>,
		defaultValues: Partial<object>,
	): SetupTableApi<object, object> {
		const hasAutoIncrement = tableAutoIncrementConfigs.has(tableName)

		const getOrCreate = async (): Promise<WithSystemFields<object>> => {
			const docs = table.toArray()
			if (docs.length > 0) {
				return docs[0] as WithSystemFields<object>
			}
			let initialData = { ...defaultValues } as Record<string, unknown>
			if (hasAutoIncrement) {
				initialData = applyAutoIncrementToItem(tableName, initialData, tableAutoIncrementConfigs, autoIncrementState)
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
					return table.update(doc._id, updates) as unknown as WithSystemFields<object>
				}
				let initialData = { ...defaultValues, ...updates } as Record<string, unknown>
				if (hasAutoIncrement) {
					initialData = applyAutoIncrementToItem(tableName, initialData, tableAutoIncrementConfigs, autoIncrementState)
				}
				return table.insert(initialData as object) as unknown as WithSystemFields<object>
			},
			subscribe: (callback: () => void) => table.subscribe(callback),
		}
	}

	// Build the table map
	const tableMap = {} as TypedTableMap<Tables>

	for (const [tableName, builder] of Object.entries(tables)) {
		const table = tableInstances.get(tableName)!
		const schema = builder._definition.schema

		const isSetupTable = (builder as { _isSetupTable?: boolean })._isSetupTable
		const defaultValues = builder._defaultValues ?? {}

		if (isSetupTable) {
			const setupApi = createSetupTableWrapper(tableName, table, defaultValues)
			;(tableMap as Record<string, unknown>)[tableName] = setupApi
			continue
		}

		const noSeriesConfigs = tableNoSeriesConfigs.get(tableName)
		const hasNoSeries = noSeriesConfigs && noSeriesConfigs.length > 0
		const hasAutoIncrement = tableAutoIncrementConfigs.has(tableName)
		const hasFlowFields = hasFlowFieldsForTable(tableName)

		const wrapDoc = <D extends object>(
			doc: D | undefined | null,
		): D | undefined => {
			if (!doc) return undefined
			return hasFlowFields ? wrapWithFlowFieldsAsync(doc, tableName) : doc
		}

		const wrapDocs = <D extends object>(docs: D[]): D[] => {
			if (!hasFlowFields) return docs
			return docs.map((doc) => wrapWithFlowFieldsAsync(doc, tableName))
		}

		const wrappedTable = {
			get toArray() {
				return () => wrapDocs(table.proxy.toArray())
			},
			get size() {
				return table.proxy.size
			},
			get subscribe() {
				return table.proxy.subscribe
			},
			insert: async (item: object) => {
				let processedItem = hasAutoIncrement
					? applyAutoIncrementToItem(tableName, item as Record<string, unknown>, tableAutoIncrementConfigs, autoIncrementState)
					: item
				processedItem = hasNoSeries
					? noSeriesManager.applyToInsert(noSeriesConfigs!, processedItem as Record<string, unknown>)
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
					let results: WithSystemFields<object>[] = wrapDocs(table.proxy.toArray())
					results = applyWhereFilter(results, options.where) as WithSystemFields<object>[]
					if (options.orderBy) {
						results = applyOrdering(results, options.orderBy)
					}
					results = applyPagination(results, options.offset, options.limit)
					if (options.columns) {
						results = applyColumnSelection(results, options.columns) as WithSystemFields<object>[]
					}
					if (options.with) {
						results = results.map((doc) =>
							resolveRelationsAsync(doc, tableName, options.with),
						)
					}
					return results
				}
				let rawResults = table.proxy.toArray() as object[]
				if (options?.orderBy) {
					rawResults = applyOrdering(rawResults, options.orderBy)
				}
				rawResults = applyPagination(rawResults, options?.offset, options?.limit)
				let results = wrapDocs(rawResults) as WithSystemFields<object>[]
				if (options?.columns) {
					results = applyColumnSelection(results, options.columns) as WithSystemFields<object>[]
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
					let results: WithSystemFields<object>[] = wrapDocs(table.proxy.toArray())
					results = applyWhereFilter(results, options.where) as WithSystemFields<object>[]
					if (options.orderBy) {
						results = applyOrdering(results, options.orderBy)
					}
					const first = results[0]
					if (!first) return undefined
					let doc: WithSystemFields<object> = first
					if (options.columns) {
						doc = applyColumnSelection([doc], options.columns)[0] as WithSystemFields<object>
					}
					if (options.with) {
						doc = resolveRelationsAsync(doc, tableName, options.with)
					}
					return doc
				}
				let rawResults = table.proxy.toArray() as object[]
				if (options?.orderBy) {
					rawResults = applyOrdering(rawResults, options.orderBy)
				}
				const first = rawResults[0]
				if (!first) return undefined
				let doc = wrapDoc(first)! as WithSystemFields<object>
				if (options?.columns) {
					doc = applyColumnSelection([doc], options.columns)[0] as WithSystemFields<object>
				}
				if (options?.with) {
					doc = resolveRelationsAsync(doc, tableName, options.with)
				}
				return doc
			},
			clear: () => table.clear(),
			batch: {
				insertMany: async (items: object[]) => {
					const processedItems = items.map((item) => {
						let processed = hasAutoIncrement
							? applyAutoIncrementToItem(tableName, item as Record<string, unknown>, tableAutoIncrementConfigs, autoIncrementState)
							: item
						processed = hasNoSeries
							? noSeriesManager.applyToInsert(noSeriesConfigs!, processed as Record<string, unknown>)
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
			delete: async (id: string) => {
				const reverseRels = reverseRelations.get(tableName)
				if (reverseRels) {
					for (const { childTable, fieldName, onDelete } of reverseRels) {
						if (onDelete === 'restrict') {
							const childTableInstance = tableInstances.get(childTable)
							if (childTableInstance) {
								const hasReferences = childTableInstance
									.toArray()
									.some((doc) => (doc as Record<string, unknown>)[fieldName] === id)
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
								.filter((doc) => (doc as Record<string, unknown>)[fieldName] === id)
							for (const doc of toDelete) {
								await childTableInstance.delete(doc._id)
							}
						} else if (onDelete === 'setNull') {
							const toUpdate = childTableInstance
								.toArray()
								.filter((doc) => (doc as Record<string, unknown>)[fieldName] === id)
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

	// Global operations
	const clear = async () => {
		for (const table of tableInstances.values()) {
			await table.clear()
		}
	}

	const subscribe = (callback: () => void) => {
		globalListeners.add(callback)
		return () => globalListeners.delete(callback)
	}

	const transaction = async (ops: TypedTransactionOp<Tables>) => {
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
						await table.insert(item as object)
					}
				}

				if (tableOps.update) {
					for (const { id, data } of tableOps.update) {
						await table.update(id, data as Partial<object>)
					}
				}

				if (tableOps.delete) {
					for (const id of tableOps.delete) {
						await table.delete(id)
					}
				}
			}
		} catch (error) {
			for (const [tableName, snapshot] of snapshots) {
				const table = tableInstances.get(tableName)
				if (table) {
					table.restoreSnapshot(snapshot)
				}
			}
			throw error
		}
	}

	const createView = <T>(
		_name: string,
		_compute: () => T[],
	): DerivedView<T> => {
		throw new Error('Views not yet implemented for async adapters')
	}

	const schemasWithRelations =
		tableMap as unknown as TypedTableMapWithRelations<
			Tables,
			WithInferredRelations<Tables, Relations>
		>

	const internalsApi: InternalsApi<
		Tables,
		WithInferredRelations<Tables, Relations>
	> = {
		noSeries: createNoSeriesV2Api(noSeriesManager),
		relations: explicitRelations as unknown as WithInferredRelations<Tables, Relations>,
		reset: resetDatabase,
	}

	pluginManager.setSchemas(
		schemasWithRelations as unknown as Record<string, unknown>,
	)

	const pluginsApi = createPluginApi(pluginManager)
	const observabilityApi = createObservabilityApi(observabilityState)

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
