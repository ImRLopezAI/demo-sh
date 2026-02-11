import type { z } from 'zod'
import type { NoSeriesDefinition } from '../no-series'
import type { FlowFieldContext, ZodShape } from './field.types'
import type { SeedConfig } from './schema.types'

/**
 * Helper function to create a foreign key reference to another table.
 * Returns a z.string() with relation metadata for cascade operations.
 *
 * @example
 * ```ts
 * const posts = createTable('posts', {
 *   schema: (id) => ({
 *     title: z.string(),
 *     authorId: id('users'), // Creates string field referencing users table
 *   }),
 * })
 * ```
 */
export type IdHelper = <T extends string>(tableName: T) => z.ZodString

/**
 * Schema definition - either a plain object or a function that receives the id helper.
 *
 * @example
 * ```ts
 * // Simple schema (no relations)
 * schema: { name: z.string(), email: z.string() }
 *
 * // Schema with relations
 * schema: (id) => ({ title: z.string(), authorId: id('users') })
 * ```
 */
export type SchemaInput<T extends ZodShape> = T | ((id: IdHelper) => T)

/**
 * Branded Zod string that carries relation type information.
 * The `_tableRef` brand allows TypeScript to track which table this field references.
 */
export type RelationField<TableName extends string> = z.ZodString & {
	readonly _tableRef: TableName
}

/**
 * Type-safe relation helper. Creates a branded string field that references another table.
 * @template TableNames - Union of valid table names in the schema
 */
export type TypedOneHelper<TableNames extends string> = <T extends TableNames>(
	tableName: T,
) => RelationField<T>

/**
 * Schema definition - either a plain object or a function that receives the `one` helper.
 */
export type TypedSchemaFn<T extends ZodShape, TableNames extends string> =
	| T
	| ((one: TypedOneHelper<TableNames>) => T)

/**
 * Table configuration for defineSchema callback API.
 */
export interface TypedTableConfig<
	T extends ZodShape,
	TableNames extends string,
> {
	schema: TypedSchemaFn<T, TableNames>
	seed?: number | boolean | SeedConfig
	/**
	 * No Series configuration for automatic sequential code generation.
	 * Can be a single config or array for multiple series per table.
	 *
	 * @example
	 * ```ts
	 * noSeries: {
	 *   pattern: 'USER0000000001',
	 *   field: 'code',
	 * }
	 * // or for multiple series:
	 * noSeries: [
	 *   { pattern: 'USER0000000001', field: 'code' },
	 *   { pattern: 'CONF-00001', field: 'configNo' },
	 * ]
	 * ```
	 */
	noSeries?: NoSeriesDefinition
}

/**
 * Internal table definition.
 */
export interface TypedTableDef<T extends ZodShape, TInferred extends object> {
	name: string
	schema: z.ZodObject<T>
	schemaInput: TypedSchemaFn<T, string>
	seedConfig?: number | boolean | SeedConfig
	noSeriesConfig?: NoSeriesDefinition
	/**
	 * Create a standard transactional table with full CRUD operations.
	 */
	table: () => TypedTableBuilder<T, TInferred, {}>
	/**
	 * Create a setup/config table with only get() and edit() methods.
	 * Setup tables contain exactly one document and are auto-seeded with defaults.
	 *
	 * @example
	 * ```ts
	 * appConfig: createTable('appConfig', {
	 *   schema: { theme: z.string(), locale: z.string() },
	 * }).setupTable().defaults({ theme: 'light', locale: 'en' })
	 * ```
	 */
	setupTable: () => TypedSetupTableBuilder<T, TInferred, {}>
}

/**
 * Index definition for a table.
 */
export interface IndexDefinition {
	name: string
	fields: string[]
}

/**
 * Unique constraint definition.
 */
export interface UniqueConstraintDefinition {
	name: string
	fields: string[]
}

/**
 * Table builder for chaining configuration.
 */
export interface TypedTableBuilder<
	T extends ZodShape,
	TInferred extends object,
	TComputed extends Record<string, unknown>,
> {
	index: <K extends keyof TInferred>(
		name: string,
		fields: K[],
	) => TypedTableBuilder<T, TInferred, TComputed>
	unique: <K extends keyof TInferred>(
		name: string,
		fields: K[],
	) => TypedTableBuilder<T, TInferred, TComputed>
	defaults: (
		values: Partial<TInferred>,
	) => TypedTableBuilder<T, TInferred, TComputed>
	enableHistory: () => TypedTableBuilder<T, TInferred, TComputed>
	computed: <TNewComputed extends Record<string, unknown>>(
		fn: (row: TInferred, ctx: FlowFieldContext) => TNewComputed,
	) => TypedTableBuilder<T, TInferred, TNewComputed>
	_indexes: IndexDefinition[]
	_uniqueConstraints: UniqueConstraintDefinition[]
	_defaultValues: Partial<TInferred>
	_historyEnabled: boolean
	_noSeriesConfig?: NoSeriesDefinition
	_definition: TypedTableDef<T, TInferred>
	_inferredType: TInferred
	_computedType: TComputed
	_shape: T
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyTypedTableBuilder = TypedTableBuilder<any, any, any>

/**
 * Setup table builder for single-document configuration tables.
 * These tables contain exactly one document (like app config, settings).
 */
export interface TypedSetupTableBuilder<
	T extends ZodShape,
	TInferred extends object,
	TComputed extends Record<string, unknown>,
> {
	/** Mark this as a setup table type */
	readonly __tableType: 'setup'
	defaults: (
		values: Partial<TInferred>,
	) => TypedSetupTableBuilder<T, TInferred, TComputed>
	computed: <TNewComputed extends Record<string, unknown>>(
		fn: (row: TInferred, ctx: FlowFieldContext) => TNewComputed,
	) => TypedSetupTableBuilder<T, TInferred, TNewComputed>
	_defaultValues: Partial<TInferred>
	_definition: TypedTableDef<T, TInferred>
	_inferredType: TInferred
	_computedType: TComputed
	_shape: T
	_isSetupTable: true
	// Required properties for table creation (setup tables don't use these but need them for compatibility)
	_indexes: Array<{ name: string; fields: string[] }>
	_uniqueConstraints: Array<{ name: string; fields: string[] }>
	_historyEnabled: boolean
	_noSeriesConfig?: NoSeriesDefinition
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyTypedSetupTableBuilder = TypedSetupTableBuilder<any, any, any>

/**
 * Union type for any table builder (regular or setup).
 */
export type AnyTableBuilder = AnyTypedTableBuilder | AnyTypedSetupTableBuilder

/**
 * Legacy table definition interface (for backward compatibility).
 */
export interface TableDefinition<
	T extends ZodShape = ZodShape,
	TInferred = z.infer<z.ZodObject<T>>,
	// eslint-disable-next-line @typescript-eslint/no-empty-object-type
	TComputed extends Record<string, unknown> = {},
> {
	name: string
	schemaInput: SchemaInput<T>
	computedFn?: (row: TInferred, ctx: FlowFieldContext) => TComputed
	seedConfig?: number | SeedConfig
	schema: z.ZodObject<T>
	insertSchema: z.ZodObject<T>
	updateSchema: z.ZodType
	table: () => TableBuilder<T, TInferred, TComputed>
	_inferredType: TInferred
	_computedType: TComputed
}

/**
 * Legacy table builder interface (for backward compatibility).
 */
export interface TableBuilder<
	T extends ZodShape = ZodShape,
	TInferred = z.infer<z.ZodObject<T>>,
	// eslint-disable-next-line @typescript-eslint/no-empty-object-type
	TComputed extends Record<string, unknown> = {},
> {
	/**
	 * Add an index to the table.
	 */
	index: <K extends keyof TInferred>(
		name: string,
		fields: K[],
	) => TableBuilder<T, TInferred, TComputed>
	/**
	 * Add a unique constraint to enforce uniqueness on field(s).
	 * @example
	 * ```ts
	 * createTable('users', { schema: () => ({ email: z.string() }) })
	 *   .table()
	 *   .unique('email_unique', ['email'])
	 * ```
	 */
	unique: <K extends keyof TInferred>(
		name: string,
		fields: K[],
	) => TableBuilder<T, TInferred, TComputed>
	/**
	 * Set default values applied to all inserts.
	 * @example
	 * ```ts
	 * createTable('posts', { schema: () => ({ status: z.string(), views: z.number() }) })
	 *   .table()
	 *   .defaults({ status: 'draft', views: 0 })
	 * ```
	 */
	defaults: (
		values: Partial<TInferred>,
	) => TableBuilder<T, TInferred, TComputed>
	/**
	 * Enable history tracking for undo/redo operations.
	 */
	enableHistory: () => TableBuilder<T, TInferred, TComputed>
	/**
	 * Add type-safe computed fields. The row parameter is fully typed based on the schema.
	 *
	 * @example
	 * ```ts
	 * const users = createTable('users', {
	 *   schema: () => ({
	 *     firstName: z.string(),
	 *     lastName: z.string(),
	 *     price: z.number(),
	 *     quantity: z.number(),
	 *   }),
	 * }).table()
	 *   .computed((row) => ({
	 *     // row is fully typed here!
	 *     fullName: `${row.firstName} ${row.lastName}`,
	 *     total: row.price * row.quantity,
	 *   }))
	 * ```
	 */
	computed: <TNewComputed extends Record<string, unknown>>(
		fn: (row: TInferred, ctx: FlowFieldContext) => TNewComputed,
	) => TableBuilder<T, TInferred, TNewComputed>
	_indexes: IndexDefinition[]
	_uniqueConstraints: UniqueConstraintDefinition[]
	_defaultValues: Partial<TInferred>
	_historyEnabled: boolean
	_noSeriesConfig?: NoSeriesDefinition
	_definition: TableDefinition<T, TInferred, TComputed>
	_inferredType: TInferred
	_computedType: TComputed
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyLegacyTableBuilder = TableBuilder<any, any, any>
