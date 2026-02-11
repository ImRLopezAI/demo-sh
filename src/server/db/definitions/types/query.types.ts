import type { z } from 'zod'
import type { PaginatedResult } from '../adapters'
import type { TableRelations, TypedWithConfigFromRelations } from '../relations'
import type { TableSnapshot, WithSystemFields } from '../table'
import type { ZodShape } from './field.types'
import type {
	AnyTableBuilder,
	AnyTypedSetupTableBuilder,
	RelationField,
} from './table.types'

/** Sort direction for orderBy */
export type OrderDirection = 'asc' | 'desc'

/** OrderBy configuration - field and direction */
export type OrderByClause<T> =
	| {
			field: keyof T | '_id' | '_createdAt' | '_updatedAt'
			direction: OrderDirection
	  }
	| ((
			item: T,
			helpers: {
				asc: <K extends keyof T>(f: K) => { field: K; direction: 'asc' }
				desc: <K extends keyof T>(f: K) => { field: K; direction: 'desc' }
			},
	  ) => { field: keyof T; direction: OrderDirection })

/**
 * Configuration for eager loading relations.
 * Keys are the relation field names (without 'Id' suffix), values are true or nested config.
 *
 * @example
 * ```ts
 * // Load author for posts
 * db.schemas.posts.findMany({ with: { author: true } })
 *
 * // Nested relations
 * db.schemas.comments.findMany({
 *   with: {
 *     post: {
 *       with: { author: true }
 *     }
 *   }
 * })
 * ```
 */
export type WithConfig = Record<string, boolean | { with?: WithConfig }>

/**
 * Query helper functions passed to where callbacks.
 */
export interface QueryHelpers<T> {
	eq: <K extends keyof T>(field: K, value: T[K]) => boolean
	ne: <K extends keyof T>(field: K, value: T[K]) => boolean
	gt: <K extends keyof T>(field: K, value: T[K]) => boolean
	gte: <K extends keyof T>(field: K, value: T[K]) => boolean
	lt: <K extends keyof T>(field: K, value: T[K]) => boolean
	lte: <K extends keyof T>(field: K, value: T[K]) => boolean
	like: <K extends keyof T>(field: K, pattern: string) => boolean
	inArray: <K extends keyof T>(field: K, values: T[K][]) => boolean
	isNull: <K extends keyof T>(field: K) => boolean
	isNotNull: <K extends keyof T>(field: K) => boolean
	and: (...conditions: boolean[]) => boolean
	or: (...conditions: boolean[]) => boolean
	not: (condition: boolean) => boolean
}

/**
 * Drizzle-like query options for findMany/findFirst.
 */
export interface QueryOptions<TOutput extends object> {
	/** Filter predicate or callback */
	where?: (
		item: WithSystemFields<TOutput>,
		helpers: QueryHelpers<TOutput>,
	) => boolean
	/** Sort configuration */
	orderBy?: OrderByClause<TOutput> | OrderByClause<TOutput>[]
	/** Maximum number of results */
	limit?: number
	/** Number of results to skip (use cursor for better performance on large datasets) */
	offset?: number
	/** Select specific columns (true = include, false = exclude) */
	columns?: Partial<
		Record<keyof TOutput | '_id' | '_createdAt' | '_updatedAt', boolean>
	>
	/**
	 * Eager load relations.
	 * Specify relation names (field name without 'Id' suffix) to include related records.
	 *
	 * @example
	 * ```ts
	 * // Load author for each post
	 * db.schemas.posts.findMany({ with: { author: true } })
	 * // Returns: [{ title: '...', authorId: 'abc', author: { _id: 'abc', name: 'John' } }]
	 * ```
	 */
	with?: WithConfig
}

/**
 * Options for cursor-based pagination.
 */
export interface CursorPaginationOptions<TOutput extends object> {
	/** Filter predicate or callback */
	where?: (
		item: WithSystemFields<TOutput>,
		helpers: QueryHelpers<TOutput>,
	) => boolean
	/** Sort configuration (required for consistent cursor pagination) */
	orderBy?: OrderByClause<TOutput>
	/** Number of items per page */
	pageSize: number
	/** Cursor from previous page (null for first page) */
	cursor?: string | null
	/** Select specific columns */
	columns?: Partial<
		Record<keyof TOutput | '_id' | '_createdAt' | '_updatedAt', boolean>
	>
	/** Eager load relations */
	with?: WithConfig
}

/**
 * Extract relation name from field key (removes 'Id' suffix).
 * authorId -> author, userId -> user
 */
export type RelationName<K> = K extends `${infer R}Id` ? R : never

/**
 * Extract the target table from a relation field.
 */
export type RelationTarget<Field> =
	Field extends RelationField<infer T> ? T : never

/**
 * Extract all relations from a table's schema shape.
 * Maps relation names (without Id) to their target table names.
 */
export type ExtractRelations<T extends ZodShape> = {
	[K in keyof T as RelationName<K>]: RelationTarget<T[K]>
}

/**
 * Get valid relation names for a table (keys that end in 'Id' and have RelationField type).
 */
export type ValidRelationNames<T extends ZodShape> = keyof ExtractRelations<T>

/**
 * Extract the shape from a table builder.
 */
export type ExtractShape<B> = B extends { _shape: infer T } ? T : ZodShape

/**
 * Type-safe with configuration for a specific table.
 * Only allows relation names that actually exist on the table.
 */
export type TypedWithConfig<
	T extends ZodShape,
	Tables extends Record<string, AnyTableBuilder>,
> = {
	[K in ValidRelationNames<T>]?:
		| true
		| {
				with?: ExtractRelations<T>[K] extends keyof Tables
					? TypedWithConfig<
							ExtractShape<Tables[ExtractRelations<T>[K]]>,
							Tables
						>
					: never
		  }
}

/**
 * Infer input type from typed table builder.
 */
export type InferTypedInputType<B> = B extends {
	_inferredType: infer TInferred
}
	? TInferred extends object
		? TInferred
		: object
	: object

/**
 * Infer output type from typed table builder (includes computed fields).
 */
export type InferTypedOutputType<B> = B extends {
	_inferredType: infer TInferred
	_computedType: infer TComputed
}
	? TInferred extends object
		? TComputed extends Record<string, unknown>
			? keyof TComputed extends never
				? TInferred
				: TInferred & TComputed
			: TInferred
		: object
	: object

/**
 * Infer insert schema from typed table builder.
 */
export type InferTypedInsertSchema<B> = B extends {
	_definition: { schema: infer S }
}
	? S extends z.ZodObject<infer T>
		? z.ZodObject<T>
		: z.ZodObject<ZodShape>
	: z.ZodObject<ZodShape>

/**
 * Infer update schema from typed table builder.
 */
export type InferTypedUpdateSchema<B> = B extends {
	_definition: { schema: z.ZodObject<infer T> }
}
	? z.ZodObject<{ [K in keyof T]: z.ZodOptional<T[K]> }>
	: z.ZodType

/**
 * Compute result type with loaded relations.
 */
export type WithLoadedRelations<
	TOutput extends object,
	TWith,
	TShape extends ZodShape,
	Tables extends Record<string, AnyTableBuilder>,
> = TWith extends undefined | never
	? TOutput
	: TOutput & {
			[K in keyof TWith as K extends ValidRelationNames<TShape>
				? K
				: never]: K extends ValidRelationNames<TShape>
				? ExtractRelations<TShape>[K] extends keyof Tables
					? TWith[K] extends true | { with?: unknown }
						? WithSystemFields<
								InferTypedOutputType<Tables[ExtractRelations<TShape>[K]]>
							>
						: never
					: never
				: never
		}

/**
 * Query options with type-safe `with` for eager loading.
 */
export interface TypedQueryOptions<
	TOutput extends object,
	TShape extends ZodShape,
	Tables extends Record<string, AnyTableBuilder>,
> {
	where?: (
		item: WithSystemFields<TOutput>,
		helpers: QueryHelpers<TOutput>,
	) => boolean
	orderBy?:
		| {
				field: keyof TOutput | '_id' | '_createdAt' | '_updatedAt'
				direction: 'asc' | 'desc'
		  }
		| Array<{
				field: keyof TOutput | '_id' | '_createdAt' | '_updatedAt'
				direction: 'asc' | 'desc'
		  }>
	limit?: number
	offset?: number
	columns?: Partial<
		Record<keyof TOutput | '_id' | '_createdAt' | '_updatedAt', boolean>
	>
	with?: TypedWithConfig<TShape, Tables>
}

/**
 * Query options with type-safe `with` for explicit relations.
 */
export interface TypedQueryOptionsWithRelations<
	TOutput extends object,
	TableName extends string,
	Tables extends Record<string, AnyTableBuilder>,
	Relations extends Record<string, TableRelations | undefined>,
> {
	where?: (
		item: WithSystemFields<TOutput>,
		helpers: QueryHelpers<TOutput>,
	) => boolean
	orderBy?:
		| {
				field: keyof TOutput | '_id' | '_createdAt' | '_updatedAt'
				direction: 'asc' | 'desc'
		  }
		| Array<{
				field: keyof TOutput | '_id' | '_createdAt' | '_updatedAt'
				direction: 'asc' | 'desc'
		  }>
	limit?: number
	offset?: number
	columns?: Partial<
		Record<keyof TOutput | '_id' | '_createdAt' | '_updatedAt', boolean>
	>
	with?: TypedWithConfigFromRelations<TableName, Tables, Relations>
}

/**
 * Batch operations for multiple document operations.
 */
export interface BatchOperations<
	TInput extends object,
	TOutput extends object,
> {
	/** Insert multiple documents */
	insertMany: (items: TInput[]) => WithSystemFields<TOutput>[]
	/** Update multiple documents matching a predicate */
	updateMany: (
		predicate: (item: WithSystemFields<TOutput>) => boolean,
		updates: Partial<TInput>,
	) => WithSystemFields<TOutput>[]
	/** Delete multiple documents matching a predicate */
	deleteMany: (
		predicate: (item: WithSystemFields<TOutput>) => boolean,
	) => number
}

/**
 * History operations for undo/redo and snapshots.
 */
export interface HistoryOperations<TOutput extends object> {
	/** Create a snapshot of current table state */
	createSnapshot: () => TableSnapshot<TOutput>
	/** Restore table from a snapshot */
	restoreSnapshot: (snapshot: TableSnapshot<TOutput>) => void
	/** Undo the last operation (requires enableHistory option) */
	undo: () => boolean
	/** Redo the last undone operation */
	redo: () => boolean
	/** Check if undo is available */
	canUndo: () => boolean
	/** Check if redo is available */
	canRedo: () => boolean
}

/**
 * Async batch operations for multiple document operations.
 */
export interface AsyncBatchOperations<
	TInput extends object,
	TOutput extends object,
> {
	/** Insert multiple documents */
	insertMany: (items: TInput[]) => Promise<WithSystemFields<TOutput>[]>
	/** Update multiple documents matching a predicate */
	updateMany: (
		predicate: (item: WithSystemFields<TOutput>) => boolean,
		updates: Partial<TInput>,
	) => Promise<WithSystemFields<TOutput>[]>
	/** Delete multiple documents matching a predicate */
	deleteMany: (
		predicate: (item: WithSystemFields<TOutput>) => boolean,
	) => Promise<number>
}

/**
 * Async history operations for snapshots.
 */
export interface AsyncHistoryOperations<TOutput extends object> {
	/** Create a snapshot of current table state */
	createSnapshot: () => TableSnapshot<TOutput>
	/** Restore table from a snapshot */
	restoreSnapshot: (snapshot: TableSnapshot<TOutput>) => Promise<void>
}

/**
 * Setup table API - single document tables with only get/edit/subscribe.
 * Used for configuration tables where exactly one record exists.
 *
 * @example
 * ```ts
 * // Get the config (always returns a value, never null)
 * const config = db.schemas.appConfig.get()
 *
 * // Edit the config (partial update, returns updated value)
 * const updated = db.schemas.appConfig.edit({ theme: 'dark' })
 * ```
 */
export interface SetupTableApi<TInput extends object, TOutput extends object> {
	/**
	 * Get the single document. Always returns a value (never null).
	 * If no document exists, returns the default values.
	 */
	get: () => WithSystemFields<TOutput>
	/**
	 * Edit the single document with partial updates.
	 * Creates the document if it doesn't exist.
	 * @returns The updated document (never null)
	 */
	edit: (updates: Partial<TInput>) => WithSystemFields<TOutput>
	/**
	 * Subscribe to changes on this document.
	 */
	subscribe: (callback: () => void) => () => void
}

/**
 * A reactive table with Zod schemas for validation.
 * Separates input types (for insert/update) from output types (for get/query).
 * The output type includes both base fields and computed fields.
 */
export type TableWithSchemas<
	TInput extends object,
	TOutput extends object,
	TInsert extends z.ZodType,
	TUpdate extends z.ZodType,
> = {
	readonly size: number
	/** Insert - returns full document with system fields */
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
	 * Drizzle-like query API - find multiple documents.
	 * @example
	 * ```ts
	 * // Find all users over 18, sorted by name
	 * db.schemas.users.findMany({
	 *   where: (user, { gt }) => gt('age', 18),
	 *   orderBy: { field: 'name', direction: 'asc' },
	 *   limit: 10,
	 * })
	 * ```
	 */
	findMany: (options?: QueryOptions<TOutput>) => WithSystemFields<TOutput>[]
	/**
	 * Drizzle-like query API - find first matching document.
	 */
	findFirst: (
		options?: QueryOptions<TOutput>,
	) => WithSystemFields<TOutput> | undefined
	/**
	 * Cursor-based pagination - efficient for large datasets.
	 * @example
	 * ```ts
	 * // First page
	 * const page1 = db.schemas.users.paginate({ pageSize: 10 })
	 *
	 * // Next page using cursor
	 * const page2 = db.schemas.users.paginate({
	 *   pageSize: 10,
	 *   cursor: page1.nextCursor
	 * })
	 * ```
	 */
	paginate: (
		options: CursorPaginationOptions<TOutput>,
	) => PaginatedResult<WithSystemFields<TOutput>>
	/** Full-text search across string fields */
	search: (
		query: string,
		fields?: (keyof TOutput)[],
	) => WithSystemFields<TOutput>[]
	clear: () => void
	subscribe: (callback: () => void) => () => void
	/** History operations for undo/redo and snapshots */
	history: HistoryOperations<TOutput>
	/** Zod schema for inserting new documents (all required fields) */
	insertSchema: TInsert
	/** Zod schema for updating documents (all fields optional) */
	updateSchema: TUpdate
}

/**
 * Async reactive table with optimistic updates.
 * Write operations return Promises but update UI immediately.
 * On adapter failure, changes are rolled back and subscribers notified.
 */
export type AsyncTableWithSchemas<
	TInput extends object,
	TOutput extends object,
	TInsert extends z.ZodType,
	TUpdate extends z.ZodType,
> = {
	readonly size: number
	/** Insert - optimistic update, returns Promise with full document */
	insert: (item: TInput) => Promise<WithSystemFields<TOutput>>
	/** Update - optimistic update, returns Promise */
	update: (
		id: string,
		updates: Partial<TInput>,
	) => Promise<WithSystemFields<TOutput> | undefined>
	/** Delete - optimistic update, returns Promise */
	delete: (id: string) => Promise<boolean>
	/** Get - sync, reads from optimistic state */
	get: (id: string) => WithSystemFields<TOutput> | undefined
	/** ToArray - sync, reads from optimistic state */
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
	batch: AsyncBatchOperations<TInput, TOutput>
	findMany: (options?: QueryOptions<TOutput>) => WithSystemFields<TOutput>[]
	findFirst: (
		options?: QueryOptions<TOutput>,
	) => WithSystemFields<TOutput> | undefined
	paginate: (
		options: CursorPaginationOptions<TOutput>,
	) => PaginatedResult<WithSystemFields<TOutput>>
	search: (
		query: string,
		fields?: (keyof TOutput)[],
	) => WithSystemFields<TOutput>[]
	/** Clear - optimistic update, returns Promise */
	clear: () => Promise<void>
	subscribe: (callback: () => void) => () => void
	/** History operations for snapshots */
	history: AsyncHistoryOperations<TOutput>
	insertSchema: TInsert
	updateSchema: TUpdate
}

/**
 * Infer output type from setup table builder.
 */
export type InferSetupOutputType<B> = B extends AnyTypedSetupTableBuilder
	? B extends { _inferredType: infer TInferred; _computedType: infer TComputed }
		? TInferred extends object
			? TComputed extends Record<string, unknown>
				? keyof TComputed extends never
					? TInferred
					: TInferred & TComputed
				: TInferred
			: never
		: never
	: never

/**
 * Infer input type from setup table builder.
 */
export type InferSetupInputType<B> = B extends AnyTypedSetupTableBuilder
	? B extends { _inferredType: infer TInferred }
		? TInferred extends object
			? TInferred
			: never
		: never
	: never
