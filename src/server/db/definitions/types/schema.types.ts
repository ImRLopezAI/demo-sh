import type { z } from 'zod'
import type {
	AsyncStorageAdapter,
	PaginatedResult,
	SyncStorageAdapter,
} from '../adapters'
import type { InternalsApi } from '../no-series'
import type {
	ObservabilityConfig,
	ObservabilityHooks,
} from '../observability/types'
import type { SchemaPluginConfig, TablePlugin } from '../plugins/types'
import type {
	RelationsCallback,
	TableRelations,
	TypedWithConfigFromRelations,
	WithInferredRelations,
	WithLoadedRelationsFromSchema,
} from '../relations'
import type { WithSystemFields } from '../table'
import type { ZodShape } from './field.types'
import type {
	BatchOperations,
	ExtractShape,
	HistoryOperations,
	InferSetupInputType,
	InferSetupOutputType,
	InferTypedInputType,
	InferTypedInsertSchema,
	InferTypedOutputType,
	InferTypedUpdateSchema,
	SetupTableApi,
	TypedQueryOptionsWithRelations,
	TypedWithConfig,
	WithLoadedRelations,
} from './query.types'
import type {
	AnyTableBuilder,
	AnyTypedSetupTableBuilder,
	AnyTypedTableBuilder,
	TypedTableConfig,
	TypedTableDef,
} from './table.types'

/**
 * Configuration for seeding a table with mock data.
 * Can be a fixed number, a range, or hierarchical (per-parent) seeding.
 *
 * @example
 * ```ts
 * // Fixed count
 * seed: 10
 *
 * // Random range
 * seed: { min: 5, max: 15 }
 *
 * // Hierarchical - create records per parent (inferred from relations)
 * // If salesHeaders has `lines: r.many.salesLines(...)`, salesLines can use:
 * seed: { min: 3, max: 8, perParent: true }
 * // This creates 3-8 salesLines for EACH salesHeader
 *
 * // Disable seeding
 * seed: false
 * ```
 */
export interface SeedConfig {
	/** Minimum number of records to generate (default: uses defaultSeed) */
	min?: number
	/** Maximum number of records to generate (default: same as min) */
	max?: number
	/**
	 * Enable hierarchical seeding - creates min-max records per parent.
	 * Parent relationship is inferred from relations config.
	 * If multiple parents exist, uses the first one found.
	 */
	perParent?: boolean
	/**
	 * Explicitly specify which parent table to use for perParent seeding.
	 * Use when a table has multiple foreign keys and you want to control
	 * which one drives the hierarchical seeding.
	 */
	parentTable?: string
}

/**
 * Context for the defineSchema callback.
 * @template TableNames - Union of table names (inferred from callback return)
 */
export interface SchemaContext<TableNames extends string> {
	/**
	 * Create a table definition with type-safe relations.
	 * The `one` helper only accepts valid table names from this schema.
	 */
	createTable: <T extends ZodShape>(
		name: TableNames,
		config: TypedTableConfig<T, TableNames>,
	) => TypedTableDef<T, z.infer<z.ZodObject<T>>>
}

/**
 * Options for defining a database schema.
 */
export interface SchemaOptions<
	TAdapter extends
		| SyncStorageAdapter
		| AsyncStorageAdapter
		| undefined = undefined,
	Tables extends Record<string, AnyTableBuilder> = Record<
		string,
		AnyTypedTableBuilder
	>,
> {
	/** Default number of records to seed per table (default: 10) */
	defaultSeed?: number
	/** Faker seed for reproducible data generation */
	seed?: number
	/** Storage adapter (default: internal memory adapter) */
	adapter?: TAdapter
	/** Callback when optimistic update fails and rollback occurs (async adapters only) */
	onRollback?: (
		error: Error,
		operation: string,
		tableName: string,
		id: string,
	) => void
	/**
	 * Define explicit relations between tables using Drizzle-like syntax.
	 * This allows defining both sides of relations (one and many) with type-safe column references.
	 *
	 * @example
	 * ```ts
	 * defineSchema(({ createTable }) => ({
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
	 * ```
	 */
	relations?: RelationsCallback<Tables>
	/**
	 * Plugin configuration for extending table functionality.
	 * Plugins can hook into insert, update, delete, and clear operations.
	 *
	 * @example
	 * ```ts
	 * defineSchema(({ createTable }) => ({ ... }), {
	 *   plugins: {
	 *     globalPlugins: [auditPlugin, validationPlugin],
	 *     tablePlugins: {
	 *       users: { plugins: [userSpecificPlugin] },
	 *     },
	 *   },
	 * })
	 * ```
	 */
	plugins?: SchemaPluginConfig
	/**
	 * Observability configuration for monitoring database operations.
	 * Use hooks to track queries, mutations, and errors.
	 *
	 * @example
	 * ```ts
	 * defineSchema(({ createTable }) => ({ ... }), {
	 *   observability: {
	 *     enabled: true,
	 *     hooks: {
	 *       onQuery: (event) => console.log('Query:', event),
	 *       onMutation: (event) => console.log('Mutation:', event),
	 *       onError: (event) => console.error('Error:', event),
	 *     },
	 *   },
	 * })
	 * ```
	 */
	observability?: ObservabilityConfig
}

/**
 * A derived view - a computed collection that auto-updates when source data changes.
 */
export interface DerivedView<T> {
	/** Get all items in the view */
	toArray: () => T[]
	/** Number of items in the view */
	readonly size: number
	/** Subscribe to view changes */
	subscribe: (callback: () => void) => () => void
	/** Get view name */
	readonly name: string
}

/**
 * Transaction operation for typed schema.
 */
export type TypedTransactionOp<Tables extends Record<string, AnyTableBuilder>> =
	{
		[K in keyof Tables]?: {
			insert?: InferTypedInputType<Tables[K]>[]
			update?: Array<{
				id: string
				data: Partial<InferTypedInputType<Tables[K]>>
			}>
			delete?: string[]
		}
	}

/**
 * Type-safe table with relation-aware queries.
 */
export type TypedTableWithSchemas<
	TInput extends object,
	TOutput extends object,
	TShape extends ZodShape,
	TInsert extends z.ZodType,
	TUpdate extends z.ZodType,
	Tables extends Record<string, AnyTableBuilder>,
> = {
	readonly size: number
	insert: (item: TInput) => WithSystemFields<TOutput>
	update: (
		id: string,
		updates: Partial<TInput>,
	) => WithSystemFields<TOutput> | undefined
	delete: (id: string) => boolean
	get: (id: string) => WithSystemFields<TOutput> | undefined
	toArray: () => WithSystemFields<TOutput>[]
	query: (
		indexName: string,
		...values: unknown[]
	) => WithSystemFields<TOutput>[]
	filter: (
		predicate: (item: WithSystemFields<TOutput>) => boolean,
	) => WithSystemFields<TOutput>[]
	find: (
		predicate: (item: WithSystemFields<TOutput>) => boolean,
	) => WithSystemFields<TOutput> | undefined

	/** Batch operations for multiple documents */
	batch: BatchOperations<TInput, TOutput>

	/**
	 * Find multiple documents with type-safe relation loading.
	 */
	findMany: <
		TWith extends TypedWithConfig<TShape, Tables> | undefined = undefined,
	>(
		options?: Omit<
			import('./query.types').TypedQueryOptions<TOutput, TShape, Tables>,
			'with'
		> & {
			with?: TWith
		},
	) => WithSystemFields<WithLoadedRelations<TOutput, TWith, TShape, Tables>>[]

	/**
	 * Find first matching document with type-safe relation loading.
	 */
	findFirst: <
		TWith extends TypedWithConfig<TShape, Tables> | undefined = undefined,
	>(
		options?: Omit<
			import('./query.types').TypedQueryOptions<TOutput, TShape, Tables>,
			'with'
		> & {
			with?: TWith
		},
	) =>
		| WithSystemFields<WithLoadedRelations<TOutput, TWith, TShape, Tables>>
		| undefined

	paginate: (
		options: import('./query.types').CursorPaginationOptions<TOutput>,
	) => PaginatedResult<WithSystemFields<TOutput>>
	search: (
		query: string,
		fields?: (keyof TOutput)[],
	) => WithSystemFields<TOutput>[]
	clear: () => void
	subscribe: (callback: () => void) => () => void
	/** History operations for undo/redo and snapshots */
	history: HistoryOperations<TOutput>
	insertSchema: TInsert
	updateSchema: TUpdate
}

/**
 * Type-safe table with explicit relation-aware queries.
 * Extends the base table with relation-aware findMany/findFirst.
 */
export type TypedTableWithRelations<
	TableName extends string,
	TInput extends object,
	TOutput extends object,
	TShape extends ZodShape,
	TInsert extends z.ZodType,
	TUpdate extends z.ZodType,
	Tables extends Record<string, AnyTableBuilder>,
	Relations extends Record<string, TableRelations | undefined>,
> = Omit<
	TypedTableWithSchemas<TInput, TOutput, TShape, TInsert, TUpdate, Tables>,
	'findMany' | 'findFirst'
> & {
	/**
	 * Find multiple documents with type-safe relation loading.
	 * When relations are defined, the `with` config only accepts valid relation names.
	 */
	findMany: <
		TWith extends
			| TypedWithConfigFromRelations<TableName, Tables, Relations>
			| undefined = undefined,
	>(
		options?: TypedQueryOptionsWithRelations<
			TOutput,
			TableName,
			Tables,
			Relations
		> & { with?: TWith },
	) => WithSystemFields<
		WithLoadedRelationsFromSchema<TOutput, TWith, TableName, Tables, Relations>
	>[]

	/**
	 * Find first matching document with type-safe relation loading.
	 */
	findFirst: <
		TWith extends
			| TypedWithConfigFromRelations<TableName, Tables, Relations>
			| undefined = undefined,
	>(
		options?: TypedQueryOptionsWithRelations<
			TOutput,
			TableName,
			Tables,
			Relations
		> & { with?: TWith },
	) =>
		| WithSystemFields<
				WithLoadedRelationsFromSchema<
					TOutput,
					TWith,
					TableName,
					Tables,
					Relations
				>
		  >
		| undefined
}

/**
 * Map tables to their typed interfaces.
 * Returns SetupTableApi for setup tables, TypedTableWithSchemas for regular tables.
 */
export type TypedTableMap<Tables extends Record<string, AnyTableBuilder>> = {
	[K in keyof Tables]: Tables[K] extends AnyTypedSetupTableBuilder
		? SetupTableApi<
				InferSetupInputType<Tables[K]>,
				InferSetupOutputType<Tables[K]>
			>
		: Tables[K] extends AnyTypedTableBuilder
			? TypedTableWithSchemas<
					InferTypedInputType<Tables[K]>,
					InferTypedOutputType<Tables[K]>,
					ExtractShape<Tables[K]>,
					InferTypedInsertSchema<Tables[K]>,
					InferTypedUpdateSchema<Tables[K]>,
					Tables
				>
			: never
}

/**
 * Map tables to their typed interfaces with explicit relation support.
 * When relations are provided, the `with` config in queries is type-safe.
 * Relations can include inferred inverse relations.
 * Returns SetupTableApi for setup tables.
 */
export type TypedTableMapWithRelations<
	Tables extends Record<string, AnyTableBuilder>,
	Relations,
> = {
	[K in keyof Tables & string]: Tables[K] extends AnyTypedSetupTableBuilder
		? SetupTableApi<
				InferSetupInputType<Tables[K]>,
				InferSetupOutputType<Tables[K]>
			>
		: Tables[K] extends AnyTypedTableBuilder
			? TypedTableWithRelations<
					K,
					InferTypedInputType<Tables[K]>,
					InferTypedOutputType<Tables[K]>,
					ExtractShape<Tables[K]>,
					InferTypedInsertSchema<Tables[K]>,
					InferTypedUpdateSchema<Tables[K]>,
					Tables,
					Relations extends Record<string, TableRelations | undefined>
						? Relations
						: Record<string, never>
				>
			: never
}

/**
 * Plugin management API exposed on the database schema.
 */
export interface PluginApi {
	/**
	 * Register a global plugin that applies to all tables.
	 * @param plugin - The plugin to register
	 */
	registerGlobal: (plugin: TablePlugin) => void
	/**
	 * Register a plugin for a specific table.
	 * @param tableName - The table to apply the plugin to
	 * @param plugin - The plugin to register
	 */
	registerForTable: (tableName: string, plugin: TablePlugin) => void
	/**
	 * Unregister a plugin.
	 * @param pluginName - The name of the plugin to remove
	 * @param tableName - Optional table name (if table-specific)
	 */
	unregister: (pluginName: string, tableName?: string) => void
	/**
	 * Get all plugins for a table.
	 * @param tableName - The table name
	 */
	getPluginsForTable: (tableName: string) => TablePlugin[]
}

/**
 * Observability API exposed on the database schema.
 */
export interface ObservabilityApi {
	/**
	 * Set observability hooks dynamically.
	 * @param hooks - The hooks to set
	 */
	setHooks: (hooks: ObservabilityHooks) => void
	/**
	 * Get current observability hooks.
	 */
	getHooks: () => ObservabilityHooks
	/**
	 * Enable observability.
	 */
	enable: () => void
	/**
	 * Disable observability.
	 */
	disable: () => void
	/**
	 * Check if observability is enabled.
	 */
	isEnabled: () => boolean
}

/**
 * Database schema returned by callback-based `defineSchema`.
 * When relations are provided, the `with` config in queries becomes type-safe.
 * Includes inferred inverse relations for both type checking and runtime.
 */
export type TypedDatabaseSchema<
	Tables extends Record<string, AnyTableBuilder>,
	Relations extends Record<string, TableRelations | undefined> = Record<
		string,
		never
	>,
	InferredRelations = WithInferredRelations<Tables, Relations>,
> = {
	schemas: TypedTableMapWithRelations<Tables, InferredRelations>
	clear: () => void
	subscribe: (callback: () => void) => () => void
	transaction: (ops: TypedTransactionOp<Tables>) => void
	createView: <T>(name: string, compute: () => T[]) => DerivedView<T>
	/**
	 * Plugin management API.
	 * Use to register/unregister plugins at runtime.
	 */
	plugins: PluginApi
	/**
	 * Observability API.
	 * Use to configure monitoring hooks at runtime.
	 */
	observability: ObservabilityApi
	/**
	 * Internal utilities API.
	 * Contains noSeries and relations.
	 */
	_internals: InternalsApi<Tables, InferredRelations>
}

/**
 * Database schema returned by `defineSchema` (sync adapter) - legacy.
 */
export type DatabaseSchema<
	Tables extends Record<string, import('./table.types').AnyLegacyTableBuilder>,
> = {
	/** Access to all tables with CRUD operations and Zod schemas */
	schemas: {
		[K in keyof Tables]: import('./query.types').TableWithSchemas<
			InferTypedInputType<Tables[K]>,
			InferTypedOutputType<Tables[K]>,
			InferTypedInsertSchema<Tables[K]>,
			InferTypedUpdateSchema<Tables[K]>
		>
	}
	/** Clear all data from all tables */
	clear: () => void
	/** Subscribe to changes across all tables */
	subscribe: (callback: () => void) => () => void
	/**
	 * Execute multiple operations atomically.
	 * If any operation fails, all changes are rolled back.
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	transaction: (ops: TypedTransactionOp<any>) => void
	/**
	 * Create a derived view - a computed collection that auto-updates when source data changes.
	 */
	createView: <T>(name: string, compute: () => T[]) => DerivedView<T>
}

/**
 * Database schema returned by `defineSchemaAsync` (async adapter with optimistic updates).
 */
export type AsyncDatabaseSchema<
	Tables extends Record<string, import('./table.types').AnyLegacyTableBuilder>,
> = {
	/** Access to all tables with async CRUD operations and Zod schemas */
	schemas: {
		[K in keyof Tables]: import('./query.types').AsyncTableWithSchemas<
			InferTypedInputType<Tables[K]>,
			InferTypedOutputType<Tables[K]>,
			InferTypedInsertSchema<Tables[K]>,
			InferTypedUpdateSchema<Tables[K]>
		>
	}
	/** Clear all data from all tables */
	clear: () => Promise<void>
	/** Subscribe to changes across all tables */
	subscribe: (callback: () => void) => () => void
	/** Initialize the database - loads data from adapter */
	init: () => Promise<void>
	/**
	 * Create a derived view - a computed collection that auto-updates when source data changes.
	 */
	createView: <T>(name: string, compute: () => T[]) => DerivedView<T>
}
