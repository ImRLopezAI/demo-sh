import type { z } from 'zod'

/**
 * Supported shorthand field types for mock data generation.
 * Use these in `.meta({ type: 'email' })` for cleaner schema definitions.
 *
 * @example
 * ```ts
 * z.string().meta({ type: 'email' })    // generates fake email
 * z.string().meta({ type: 'fullname' }) // generates fake full name
 * z.number().meta({ type: 'number', min: 0, max: 100 }) // with range
 * ```
 */
export const FIELD_TYPES = [
	'string',
	'number',
	'boolean',
	'date',
	'datetime',
	'enum',
	'email',
	'phone',
	'uuid',
	'url',
	'image',
	'address',
	'city',
	'country',
	'zipcode',
	'firstname',
	'lastname',
	'fullname',
	'username',
	'password',
	'hexcolor',
	'credit_card',
	'company',
	'job_title',
	'ipv4',
	'ipv6',
	'latitude',
	'longitude',
	'sentence',
	'paragraph',
	'word',
] as const

/** Shorthand field type for mock data generation */
export type FieldType = (typeof FIELD_TYPES)[number]

/**
 * FlowField aggregation types for computed fields from related tables.
 */
export type FlowFieldType =
	| 'sum'
	| 'count'
	| 'average'
	| 'min'
	| 'max'
	| 'lookup'
	| 'exist'

/**
 * FlowField configuration for aggregations from related tables.
 */
export interface FlowFieldConfig {
	/** Aggregation type */
	type: FlowFieldType
	/** Source table name to aggregate from */
	source: string
	/** Field to aggregate (required for sum, average, min, max, lookup) */
	field?: string
	/** Foreign key field in source table that references this table's _id or `from` field */
	key: string
	/** Field on the current row to use for lookup (defaults to _id). Use this for reverse lookups. */
	from?: string
	/** Optional filter conditions */
	where?: Record<string, unknown>
}

/**
 * Context passed to flowField functions.
 */
export interface FlowFieldContext {
	schemas: Record<
		string,
		{
			toArray: () => object[]
			findMany: (options?: { where?: (item: object) => boolean }) => object[]
		}
	>
}

/**
 * FlowField definition - either a function or aggregation config.
 */
export type FlowFieldDef<T = unknown> =
	| ((row: T, ctx: FlowFieldContext) => unknown)
	| FlowFieldConfig

/**
 * Metadata options for field generation.
 * Attach to Zod schemas using `.meta({ ... })`.
 *
 * @example
 * ```ts
 * // Shorthand type (preferred)
 * z.string().meta({ type: 'email' })
 *
 * // Foreign key relation
 * z.string().meta({ related: 'users' })
 *
 * // Faker path (fallback)
 * z.string().meta({ field: 'internet.email' })
 *
 * // Custom generator function
 * z.string().meta({ field: () => createId() })
 *
 * // Number with range
 * z.number().meta({ type: 'number', min: 0, max: 100 })
 *
 * // FlowField - computed from same row
 * z.string().meta({ flowField: (row) => `${row.firstName} ${row.lastName}` })
 *
 * // FlowField - aggregation from related table
 * z.number().meta({ flowField: { type: 'sum', source: 'orders', field: 'amount', key: 'customerId' } })
 * ```
 */
export interface FieldMeta {
	/** Shorthand type for generation (preferred over `field`) */
	type?: FieldType
	/** Faker path like 'internet.email' or custom generator function */
	field?: string | (() => unknown)
	/** Foreign key reference to another table */
	related?: string
	/** Action when referenced record is deleted: 'cascade' deletes this record, 'setNull' sets field to null */
	onDelete?: 'cascade' | 'setNull' | 'restrict'
	/** Minimum value for number generation */
	min?: number
	/** Maximum value for number generation */
	max?: number
	/** FlowField - computed/calculated field */
	flowField?: FlowFieldDef
	/**
	 * Auto-increment for number fields.
	 * - `true`: auto-increment starting from 1
	 * - `number`: auto-increment starting from specified value
	 *
	 * @example
	 * ```ts
	 * entryNo: z.number().meta({ autoIncrement: true })      // starts at 1
	 * lineNo: z.number().meta({ autoIncrement: 1000 })       // starts at 1000
	 * ```
	 */
	autoIncrement?: boolean | number
}

/**
 * Zod shape type alias.
 */
export type ZodShape = Record<string, z.ZodType>

/**
 * Computed fields definition - receives typed row and returns computed values.
 */
export type ComputedFn<TRow, TComputed extends Record<string, unknown>> = (
	row: TRow,
	ctx: FlowFieldContext,
) => TComputed
