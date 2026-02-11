import type { z } from 'zod'
import type { FlowFieldContext, ZodShape } from '../types/field.types'
import type {
	IndexDefinition,
	TypedOneHelper,
	TypedSetupTableBuilder,
	TypedTableBuilder,
	TypedTableConfig,
	TypedTableDef,
	UniqueConstraintDefinition,
} from '../types/table.types'

/**
 * Create a typed table builder for chaining configuration.
 *
 * @param definition - The table definition
 * @param shape - The Zod shape of the table schema
 * @returns A TypedTableBuilder instance
 */
export function createTypedTableBuilder<
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

/**
 * Create a typed setup table builder for single-document configuration tables.
 *
 * @param definition - The table definition
 * @param shape - The Zod shape of the table schema
 * @returns A TypedSetupTableBuilder instance
 */
export function createTypedSetupTableBuilder<
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

/**
 * Create a typed one helper that creates branded relation fields.
 * The helper validates table names at compile time and runtime.
 *
 * @returns A TypedOneHelper function
 */
export function createTypedOneHelper(
	z: typeof import('zod').z,
): TypedOneHelper<string> {
	return (tableName) => {
		return z.string().meta({ related: tableName }) as ReturnType<
			TypedOneHelper<typeof tableName>
		>
	}
}

/**
 * Create a table definition from config.
 * This is the context-aware createTable function used within defineSchema.
 *
 * @param z - Zod instance
 * @param typedOneHelper - The one helper for creating relations
 * @param name - Table name
 * @param config - Table configuration
 * @returns A TypedTableDef instance
 */
export function createTableDefinition<T extends ZodShape>(
	z: typeof import('zod').z,
	typedOneHelper: TypedOneHelper<string>,
	name: string,
	config: TypedTableConfig<T, string>,
): TypedTableDef<T, z.infer<z.ZodObject<T>>> {
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

/**
 * Extract index definitions from a table builder.
 *
 * @param builder - The table builder
 * @returns Array of index definitions
 */
export function extractIndexes<T extends object>(builder: {
	_indexes: IndexDefinition[]
}): Array<{ name: string; fields: (keyof T)[] }> {
	return builder._indexes.map((idx) => ({
		name: idx.name,
		fields: idx.fields as (keyof T)[],
	}))
}

/**
 * Extract unique constraint definitions from a table builder.
 *
 * @param builder - The table builder
 * @returns Array of unique constraint definitions
 */
export function extractUniqueConstraints<T extends object>(builder: {
	_uniqueConstraints?: UniqueConstraintDefinition[]
}): Array<{ name: string; fields: (keyof T)[] }> {
	return (builder._uniqueConstraints ?? []).map((uc) => ({
		name: uc.name,
		fields: uc.fields as (keyof T)[],
	}))
}
