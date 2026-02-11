import type { z } from 'zod'
import type { WithSystemFields } from './table'

// ============================================================================
// Column Reference Types
// ============================================================================

/**
 * Branded column reference that carries table and column name information.
 * Used for type-safe `from` and `to` in relation definitions.
 *
 * @example
 * ```ts
 * r.users.id    // ColumnRef<'users', 'id'>
 * r.posts.authorId  // ColumnRef<'posts', 'authorId'>
 * ```
 */
export type ColumnRef<
	TableName extends string = string,
	ColumnName extends string = string,
> = {
	readonly __brand: 'ColumnRef'
	readonly __table: TableName
	readonly __column: ColumnName
}

/**
 * Creates a column reference at runtime.
 */
export function createColumnRef<T extends string, C extends string>(
	table: T,
	column: C,
): ColumnRef<T, C> {
	return {
		__brand: 'ColumnRef',
		__table: table,
		__column: column,
	} as ColumnRef<T, C>
}

// ============================================================================
// Table Schema Extraction Types
// ============================================================================

type ZodShape = Record<string, z.ZodType>

/**
 * Extract the Zod shape from a table builder.
 */
export type ExtractTableShape<B> = B extends { _shape: infer S } ? S : ZodShape

/**
 * Extract column names from a Zod shape (including system fields).
 */
export type ExtractColumnNames<Shape extends ZodShape> =
	| keyof Shape
	| '_id'
	| '_createdAt'
	| '_updatedAt'

/**
 * Extract the inferred output type from a table builder.
 */
export type ExtractTableOutput<B> = B extends {
	_inferredType: infer T
	_computedType: infer C
}
	? T extends object
		? C extends Record<string, unknown>
			? keyof C extends never
				? T
				: T & C
			: T
		: object
	: object

// ============================================================================
// Relation Definition Types
// ============================================================================

/**
 * Configuration for a one-to-one or many-to-one relation.
 *
 * @example
 * ```ts
 * author: r.one.users({
 *   from: r.posts.authorId,  // Foreign key in source table
 *   to: r.users.id,          // Primary key in target table
 *   optional: true,          // Makes the relation nullable
 * })
 * ```
 */
export interface OneRelationConfig<
	FromTable extends string = string,
	FromColumn extends string = string,
	ToTable extends string = string,
	ToColumn extends string = string,
> {
	from: ColumnRef<FromTable, FromColumn>
	to: ColumnRef<ToTable, ToColumn>
	/** If true, the relation can be null (no matching record) */
	optional?: boolean
	/** Alias for disambiguating multiple relations to the same table */
	alias?: string
}

/**
 * Configuration for a one-to-many relation.
 *
 * @example
 * ```ts
 * posts: r.many.posts({
 *   from: r.users.id,        // Primary key in source table
 *   to: r.posts.authorId,    // Foreign key in target table
 * })
 * ```
 */
export interface ManyRelationConfig<
	FromTable extends string = string,
	FromColumn extends string = string,
	ToTable extends string = string,
	ToColumn extends string = string,
> {
	from: ColumnRef<FromTable, FromColumn>
	to: ColumnRef<ToTable, ToColumn>
	/** Alias for disambiguating multiple relations to the same table */
	alias?: string
}

/**
 * A defined one relation with metadata.
 */
export interface OneRelationDef<TargetTable extends string = string> {
	readonly __type: 'one'
	readonly __target: TargetTable
	readonly config: OneRelationConfig
}

/**
 * A defined many relation with metadata.
 */
export interface ManyRelationDef<TargetTable extends string = string> {
	readonly __type: 'many'
	readonly __target: TargetTable
	readonly config: ManyRelationConfig
}

/**
 * Union of all relation definition types.
 */
export type RelationDef<TargetTable extends string = string> =
	| OneRelationDef<TargetTable>
	| ManyRelationDef<TargetTable>

// ============================================================================
// Relations Context Types (the `r` parameter)
// ============================================================================

/**
 * Column accessor for a specific table.
 * Provides access to all columns as ColumnRef objects.
 *
 * @example
 * ```ts
 * r.users.id        // ColumnRef<'users', 'id'>
 * r.users.name      // ColumnRef<'users', 'name'>
 * r.posts.authorId  // ColumnRef<'posts', 'authorId'>
 * ```
 */
export type TableColumnAccessor<
	TableName extends string,
	Shape extends ZodShape,
> = {
	[K in ExtractColumnNames<Shape> & string]: ColumnRef<TableName, K>
}

/**
 * Factory function for creating a one-to-one/many-to-one relation.
 * The target table is specified via the accessor (e.g., r.one.users).
 */
export type OneRelationFactory<
	SourceTable extends string,
	SourceShape extends ZodShape,
	TargetTable extends string,
	TargetShape extends ZodShape,
> = <
	FromCol extends ExtractColumnNames<SourceShape> & string,
	ToCol extends ExtractColumnNames<TargetShape> & string,
>(config: {
	from: ColumnRef<SourceTable, FromCol>
	to: ColumnRef<TargetTable, ToCol>
	optional?: boolean
	alias?: string
}) => OneRelationDef<TargetTable>

/**
 * Factory function for creating a one-to-many relation.
 */
export type ManyRelationFactory<
	SourceTable extends string,
	SourceShape extends ZodShape,
	TargetTable extends string,
	TargetShape extends ZodShape,
> = <
	FromCol extends ExtractColumnNames<SourceShape> & string,
	ToCol extends ExtractColumnNames<TargetShape> & string,
>(config: {
	from: ColumnRef<SourceTable, FromCol>
	to: ColumnRef<TargetTable, ToCol>
	alias?: string
}) => ManyRelationDef<TargetTable>

/**
 * The `r.one` accessor - provides relation factories for each table.
 *
 * @example
 * ```ts
 * r.one.users({
 *   from: r.posts.authorId,
 *   to: r.users.id,
 * })
 * ```
 */
export type OneAccessor<
	Tables extends Record<string, { _shape: ZodShape }>,
	SourceTable extends string,
	SourceShape extends ZodShape,
> = {
	[K in keyof Tables & string]: OneRelationFactory<
		SourceTable,
		SourceShape,
		K,
		ExtractTableShape<Tables[K]>
	>
}

/**
 * The `r.many` accessor - provides relation factories for each table.
 *
 * @example
 * ```ts
 * r.many.posts({
 *   from: r.users.id,
 *   to: r.posts.authorId,
 * })
 * ```
 */
export type ManyAccessor<
	Tables extends Record<string, { _shape: ZodShape }>,
	SourceTable extends string,
	SourceShape extends ZodShape,
> = {
	[K in keyof Tables & string]: ManyRelationFactory<
		SourceTable,
		SourceShape,
		K,
		ExtractTableShape<Tables[K]>
	>
}

/**
 * Relations context for a specific source table.
 * This is what you get inside the relations callback for each table.
 *
 * @example
 * ```ts
 * relations: (r) => ({
 *   posts: {
 *     // r here has access to r.one, r.many, and all table columns
 *     author: r.one.users({
 *       from: r.posts.authorId,
 *       to: r.users.id,
 *     })
 *   }
 * })
 * ```
 */
export type RelationsContext<
	Tables extends Record<string, { _shape: ZodShape }>,
> = {
	/** Create a one-to-one or many-to-one relation */
	one: {
		[K in keyof Tables & string]: <
			FromTable extends keyof Tables & string,
			FromCol extends ExtractColumnNames<ExtractTableShape<Tables[FromTable]>> &
				string,
			ToCol extends ExtractColumnNames<ExtractTableShape<Tables[K]>> & string,
		>(config: {
			from: ColumnRef<FromTable, FromCol>
			to: ColumnRef<K, ToCol>
			optional?: boolean
			alias?: string
		}) => OneRelationDef<K>
	}
	/** Create a one-to-many relation */
	many: {
		[K in keyof Tables & string]: <
			FromTable extends keyof Tables & string,
			FromCol extends ExtractColumnNames<ExtractTableShape<Tables[FromTable]>> &
				string,
			ToCol extends ExtractColumnNames<ExtractTableShape<Tables[K]>> & string,
		>(config: {
			from: ColumnRef<FromTable, FromCol>
			to: ColumnRef<K, ToCol>
			alias?: string
		}) => ManyRelationDef<K>
	}
} & {
	/** Column accessors for each table */
	[K in keyof Tables & string]: TableColumnAccessor<
		K,
		ExtractTableShape<Tables[K]>
	>
}

// ============================================================================
// Relations Schema Types
// ============================================================================

/**
 * Relations definition for a single table.
 * Maps relation names to relation definitions.
 *
 * @example
 * ```ts
 * {
 *   author: OneRelationDef<'users'>,
 *   comments: ManyRelationDef<'comments'>
 * }
 * ```
 */
export type TableRelations = Record<string, RelationDef>

/**
 * Full relations schema for all tables.
 * Maps table names to their relations.
 *
 * @example
 * ```ts
 * {
 *   posts: {
 *     author: r.one.users({...}),
 *     comments: r.many.comments({...})
 *   },
 *   users: {
 *     posts: r.many.posts({...})
 *   }
 * }
 * ```
 */
export type RelationsSchema<
	Tables extends Record<string, { _shape: ZodShape }>,
> = {
	[K in keyof Tables]?: TableRelations
}

/**
 * Relations callback function type.
 */
export type RelationsCallback<
	Tables extends Record<string, { _shape: ZodShape }>,
> = (ctx: RelationsContext<Tables>) => RelationsSchema<Tables>

// ============================================================================
// Type-Level Relation Inference
// ============================================================================

/**
 * Singularize a table name (remove trailing 's').
 * Used for inferring one relation names from many relations.
 */
type Singularize<T extends string> = T extends `${infer Base}s` ? Base : T

/**
 * Extract all one relations from a relations schema for a specific source table.
 * Returns a map of { targetTable: { relationName, fromColumn, toColumn } }
 */
type ExtractOneRelationsForInference<
	SourceTable extends string,
	Relations extends Record<string, TableRelations | undefined>,
> = SourceTable extends keyof Relations
	? Relations[SourceTable] extends TableRelations
		? {
				[K in keyof Relations[SourceTable]]: Relations[SourceTable][K] extends OneRelationDef<
					infer Target
				>
					? {
							target: Target
							relationName: K
							sourceTable: SourceTable
							fromColumn: Relations[SourceTable][K]['config']['from']['__column']
							toColumn: Relations[SourceTable][K]['config']['to']['__column']
						}
					: never
			}[keyof Relations[SourceTable]]
		: never
	: never

/**
 * Extract all many relations from a relations schema for a specific source table.
 */
type ExtractManyRelationsForInference<
	SourceTable extends string,
	Relations extends Record<string, TableRelations | undefined>,
> = SourceTable extends keyof Relations
	? Relations[SourceTable] extends TableRelations
		? {
				[K in keyof Relations[SourceTable]]: Relations[SourceTable][K] extends ManyRelationDef<
					infer Target
				>
					? {
							target: Target
							relationName: K
							sourceTable: SourceTable
							fromColumn: Relations[SourceTable][K]['config']['from']['__column']
							toColumn: Relations[SourceTable][K]['config']['to']['__column']
						}
					: never
			}[keyof Relations[SourceTable]]
		: never
	: never

/**
 * Extract all one relations across all tables.
 */
type AllOneRelations<
	Tables extends Record<string, { _shape: ZodShape }>,
	Relations extends Record<string, TableRelations | undefined>,
> = {
	[K in keyof Tables & string]: ExtractOneRelationsForInference<K, Relations>
}[keyof Tables & string]

/**
 * Extract all many relations across all tables.
 */
type AllManyRelations<
	Tables extends Record<string, { _shape: ZodShape }>,
	Relations extends Record<string, TableRelations | undefined>,
> = {
	[K in keyof Tables & string]: ExtractManyRelationsForInference<K, Relations>
}[keyof Tables & string]

/**
 * Infer many relations for a target table from one relations pointing to it.
 * For `posts.author -> users`, infers `users.posts -> posts` (many).
 */
type InferredManyRelationsForTable<
	TargetTable extends string,
	Tables extends Record<string, { _shape: ZodShape }>,
	Relations extends Record<string, TableRelations | undefined>,
> =
	AllOneRelations<Tables, Relations> extends infer OneRels
		? OneRels extends {
				target: TargetTable
				sourceTable: infer Source
				fromColumn: infer FromCol
				toColumn: infer ToCol
			}
			? Source extends string
				? FromCol extends string
					? ToCol extends string
						? {
								[K in Source]: ManyRelationDef<Source> & {
									config: {
										from: ColumnRef<TargetTable, ToCol>
										to: ColumnRef<Source, FromCol>
									}
								}
							}
						: never
					: never
				: never
			: never
		: never

/**
 * Infer one relations for a target table from many relations pointing to it.
 * For `users.posts -> posts` (many), infers `posts.user -> users` (one).
 */
type InferredOneRelationsForTable<
	TargetTable extends string,
	Tables extends Record<string, { _shape: ZodShape }>,
	Relations extends Record<string, TableRelations | undefined>,
> =
	AllManyRelations<Tables, Relations> extends infer ManyRels
		? ManyRels extends {
				target: TargetTable
				sourceTable: infer Source
				fromColumn: infer FromCol
				toColumn: infer ToCol
			}
			? Source extends string
				? FromCol extends string
					? ToCol extends string
						? {
								[K in Singularize<Source>]: OneRelationDef<Source> & {
									config: {
										from: ColumnRef<TargetTable, ToCol>
										to: ColumnRef<Source, FromCol>
									}
								}
							}
						: never
					: never
				: never
			: never
		: never

/**
 * Merge inferred relations into the explicit relations for a table.
 */
type MergeInferredRelations<
	TargetTable extends string,
	Tables extends Record<string, { _shape: ZodShape }>,
	Relations extends Record<string, TableRelations | undefined>,
> = (TargetTable extends keyof Relations
	? Relations[TargetTable] extends TableRelations
		? Relations[TargetTable]
		: {}
	: {}) &
	UnionToIntersection<
		InferredManyRelationsForTable<TargetTable, Tables, Relations>
	> &
	UnionToIntersection<
		InferredOneRelationsForTable<TargetTable, Tables, Relations>
	>

/**
 * Helper type to convert union to intersection.
 */
type UnionToIntersection<U> = (
	U extends unknown
		? (k: U) => void
		: never
) extends (k: infer I) => void
	? I
	: never

/**
 * Full relations schema with inferred inverse relations.
 */
export type WithInferredRelations<
	Tables extends Record<string, { _shape: ZodShape }>,
	Relations extends Record<string, TableRelations | undefined>,
> = {
	[K in keyof Tables & string]: MergeInferredRelations<K, Tables, Relations>
}

// ============================================================================
// Type-Safe With Config (for eager loading)
// ============================================================================

/**
 * Extract relation names from a table's relations.
 */
export type ExtractRelationNames<
	TableName extends string,
	Relations extends Record<string, TableRelations | undefined>,
> = TableName extends keyof Relations
	? Relations[TableName] extends TableRelations
		? keyof Relations[TableName]
		: never
	: never

/**
 * Get the target table of a relation.
 */
export type GetRelationTarget<R extends RelationDef> =
	R extends RelationDef<infer T> ? T : never

/**
 * Type-safe `with` configuration based on defined and inferred relations.
 *
 * @example
 * ```ts
 * // Only allows defined relations
 * findMany({
 *   with: {
 *     author: true,  // Valid if author relation is defined
 *     foo: true,     // Error: 'foo' is not a defined relation
 *   }
 * })
 * ```
 */
export type TypedWithConfigFromRelations<
	TableName extends string,
	Tables extends Record<string, { _shape: ZodShape }>,
	Relations extends Record<string, TableRelations | undefined>,
	InferredRelations = WithInferredRelations<Tables, Relations>,
> = TableName extends keyof InferredRelations
	? InferredRelations[TableName] extends TableRelations
		? {
				[K in keyof InferredRelations[TableName]]?:
					| true
					| {
							with?: InferredRelations[TableName][K] extends RelationDef<
								infer Target
							>
								? Target extends keyof Tables & string
									? TypedWithConfigFromRelations<
											Target,
											Tables,
											Relations,
											InferredRelations
										>
									: never
								: never
					  }
			}
		: Record<string, never>
	: Record<string, never>

// ============================================================================
// Resolved Types (with loaded relations)
// ============================================================================

/**
 * Resolve a single relation to its output type.
 * Includes system fields (_id, _createdAt, _updatedAt) in the resolved type.
 */
export type ResolveRelationType<
	R extends RelationDef,
	Tables extends Record<string, { _shape: ZodShape }>,
> =
	R extends OneRelationDef<infer Target>
		? Target extends keyof Tables
			? R['config']['optional'] extends true
				? WithSystemFields<ExtractTableOutput<Tables[Target]>> | null
				: WithSystemFields<ExtractTableOutput<Tables[Target]>>
			: never
		: R extends ManyRelationDef<infer Target>
			? Target extends keyof Tables
				? WithSystemFields<ExtractTableOutput<Tables[Target]>>[]
				: never
			: never

/**
 * Output type with eagerly loaded relations.
 * Uses inferred relations so both explicit and inverse relations are available.
 *
 * @example
 * ```ts
 * // Original: { _id: string, title: string, authorId: string }
 * // With { author: true }: { _id: string, title: string, authorId: string, author: User }
 * ```
 */
export type WithLoadedRelationsFromSchema<
	Output extends object,
	With,
	TableName extends string,
	Tables extends Record<string, { _shape: ZodShape }>,
	Relations extends Record<string, TableRelations | undefined>,
	InferredRelations = WithInferredRelations<Tables, Relations>,
> = With extends undefined | never | Record<string, never>
	? Output
	: TableName extends keyof InferredRelations
		? InferredRelations[TableName] extends TableRelations
			? Output & {
					[K in keyof With &
						keyof InferredRelations[TableName]]: InferredRelations[TableName][K] extends RelationDef
						? ResolveRelationType<InferredRelations[TableName][K], Tables>
						: never
				}
			: Output
		: Output

// ============================================================================
// Runtime Helpers
// ============================================================================

/**
 * Creates the relations context object at runtime.
 * This is used internally by defineSchema.
 */
export function createRelationsContext<
	Tables extends Record<string, { _shape: ZodShape }>,
>(tableBuilders: Tables): RelationsContext<Tables> {
	const tableNames = Object.keys(tableBuilders) as (keyof Tables & string)[]

	// Create column accessors for each table
	const columnAccessors: Record<string, Record<string, ColumnRef>> = {}

	for (const tableName of tableNames) {
		const builder = tableBuilders[tableName]
		const shape = builder._shape as ZodShape
		const columns: Record<string, ColumnRef> = {}

		// Add user-defined columns
		for (const colName of Object.keys(shape)) {
			columns[colName] = createColumnRef(tableName, colName)
		}

		// Add system columns
		columns._id = createColumnRef(tableName, '_id')
		columns._createdAt = createColumnRef(tableName, '_createdAt')
		columns._updatedAt = createColumnRef(tableName, '_updatedAt')

		columnAccessors[tableName] = columns
	}

	// Create one relation factory
	const oneFactories: Record<
		string,
		(config: OneRelationConfig) => OneRelationDef
	> = {}
	for (const tableName of tableNames) {
		oneFactories[tableName] = (config: OneRelationConfig): OneRelationDef => ({
			__type: 'one',
			__target: tableName,
			config,
		})
	}

	// Create many relation factory
	const manyFactories: Record<
		string,
		(config: ManyRelationConfig) => ManyRelationDef
	> = {}
	for (const tableName of tableNames) {
		manyFactories[tableName] = (
			config: ManyRelationConfig,
		): ManyRelationDef => ({
			__type: 'many',
			__target: tableName,
			config,
		})
	}

	// Combine into the relations context
	// Note: We use unknown here because TypeScript can't verify the runtime object
	// matches the complex mapped type. The types are verified at usage site.
	const context = {
		one: oneFactories,
		many: manyFactories,
		...columnAccessors,
	}

	return context as unknown as RelationsContext<Tables>
}

/**
 * Resolves relations for a document at runtime.
 * This is used by findMany/findFirst when `with` is specified.
 */
export function resolveRelations<T extends object>(
	doc: T,
	withConfig: Record<string, true | { with?: unknown }>,
	tableName: string,
	relations: Record<string, TableRelations | undefined>,
	getTable: (name: string) => {
		get: (id: string) => unknown
		toArray: () => unknown[]
	},
): T {
	const tableRelations = relations[tableName]
	if (!tableRelations) return doc

	const result = { ...doc } as Record<string, unknown>

	for (const [relationName, config] of Object.entries(withConfig)) {
		const relationDef = tableRelations[relationName]
		if (!relationDef) continue

		const targetTable = getTable(relationDef.__target)
		if (!targetTable) continue

		const fromColumn = relationDef.config.from.__column
		const toColumn = relationDef.config.to.__column
		const fromValue = (doc as Record<string, unknown>)[fromColumn]

		if (relationDef.__type === 'one') {
			// One-to-one/many-to-one: find single matching record
			const targetDocs = targetTable.toArray() as Record<string, unknown>[]
			const match = targetDocs.find((d) => d[toColumn] === fromValue)

			if (match && typeof config === 'object' && config.with) {
				// Nested relation loading
				result[relationName] = resolveRelations(
					match as object,
					config.with as Record<string, true | { with?: unknown }>,
					relationDef.__target,
					relations,
					getTable,
				)
			} else {
				result[relationName] = match ?? null
			}
		} else {
			// One-to-many: find all matching records
			const targetDocs = targetTable.toArray() as Record<string, unknown>[]
			const matches = targetDocs.filter((d) => d[toColumn] === fromValue)

			if (typeof config === 'object' && config.with) {
				// Nested relation loading for each match
				result[relationName] = matches.map((m) =>
					resolveRelations(
						m as object,
						config.with as Record<string, true | { with?: unknown }>,
						relationDef.__target,
						relations,
						getTable,
					),
				)
			} else {
				result[relationName] = matches
			}
		}
	}

	return result as T
}

/**
 * Infers inverse relations from defined relations.
 *
 * For each `one` relation, creates the inverse `many` relation on the target table.
 * For each `many` relation, creates the inverse `one` relation on the target table.
 *
 * @example
 * ```ts
 * // Input:
 * { posts: { author: r.one.users({ from: r.posts.authorId, to: r.users._id }) } }
 *
 * // Output (with inferred):
 * {
 *   posts: { author: r.one.users({ from: r.posts.authorId, to: r.users._id }) },
 *   users: { posts: r.many.posts({ from: r.users._id, to: r.posts.authorId }) }  // Inferred!
 * }
 * ```
 */
export function inferInverseRelations(
	relations: Record<string, TableRelations | undefined>,
): Record<string, TableRelations> {
	const result: Record<string, TableRelations> = {}

	// Copy existing relations
	for (const [tableName, tableRelations] of Object.entries(relations)) {
		if (tableRelations) {
			result[tableName] = { ...tableRelations }
		}
	}

	// Infer inverse relations
	for (const [sourceTable, tableRelations] of Object.entries(relations)) {
		if (!tableRelations) continue

		for (const [_relationName, relationDef] of Object.entries(tableRelations)) {
			const targetTable = relationDef.__target
			const fromColumn = relationDef.config.from.__column
			const toColumn = relationDef.config.to.__column
			const fromTableName = relationDef.config.from.__table

			// Determine the inverse relation name
			// For `posts.author` (one -> users), infer `users.posts` (many -> posts)
			// Use the source table name as the relation name (pluralized if needed)
			const inverseRelationName = sourceTable

			// Check if inverse relation already exists
			if (!result[targetTable]) {
				result[targetTable] = {}
			}

			// Skip if the inverse relation is already explicitly defined
			if (result[targetTable][inverseRelationName]) {
				continue
			}

			// Create the inverse relation
			if (relationDef.__type === 'one') {
				// Inverse of `one` is `many`
				// posts.author (one -> users) => users.posts (many -> posts)
				result[targetTable][inverseRelationName] = {
					__type: 'many',
					__target: fromTableName,
					config: {
						from: createColumnRef(targetTable, toColumn),
						to: createColumnRef(fromTableName, fromColumn),
					},
				} as ManyRelationDef
			} else {
				// Inverse of `many` is `one`
				// users.posts (many -> posts) => posts.user (one -> users)
				// Use singular form for the relation name
				const singularName = sourceTable.endsWith('s')
					? sourceTable.slice(0, -1)
					: sourceTable

				// Skip if already defined
				if (result[targetTable][singularName]) {
					continue
				}

				result[targetTable][singularName] = {
					__type: 'one',
					__target: fromTableName,
					config: {
						from: createColumnRef(targetTable, toColumn),
						to: createColumnRef(fromTableName, fromColumn),
					},
				} as OneRelationDef
			}
		}
	}

	return result
}
