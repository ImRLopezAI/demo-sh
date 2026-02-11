import type {
	FlowFieldConfig,
	FlowFieldContext,
	FlowFieldDef,
} from '../types/field.types'

/**
 * Type-safe helper for creating computed flowFields.
 * Use this to get autocomplete and type checking on the row parameter.
 *
 * @example
 * ```ts
 * type User = { firstName: string; lastName: string }
 *
 * const users = createTable('users', {
 *   schema: () => ({
 *     firstName: z.string(),
 *     lastName: z.string(),
 *     fullName: z.string().meta({
 *       flowField: flowField<User>((row) => `${row.firstName} ${row.lastName}`)
 *     }),
 *   }),
 * })
 * ```
 */
export function flowField<TRow extends object>(
	fn: (row: TRow, ctx: FlowFieldContext) => unknown,
): FlowFieldDef<TRow>

/**
 * Type-safe helper for creating aggregation flowFields.
 *
 * @example
 * ```ts
 * orderCount: z.number().meta({
 *   flowField: flowField({ type: 'count', source: 'orders', key: 'customerId' })
 * })
 * ```
 */
export function flowField(config: FlowFieldConfig): FlowFieldConfig

export function flowField<TRow extends object>(
	fnOrConfig: ((row: TRow, ctx: FlowFieldContext) => unknown) | FlowFieldConfig,
): FlowFieldDef<TRow> | FlowFieldConfig {
	return fnOrConfig
}

/**
 * Compute a flowField value for a document.
 *
 * @param row - The document row to compute the field for
 * @param flowFieldDef - The flowField definition (function or config)
 * @param ctx - The flowField context with access to other tables
 * @returns The computed value
 */
export function computeFlowField(
	row: object,
	flowFieldDef: FlowFieldDef,
	ctx: FlowFieldContext,
): unknown {
	// Function form - simple computed field
	if (typeof flowFieldDef === 'function') {
		return flowFieldDef(row, ctx)
	}

	// Object form - aggregation from related table
	const { type, source, field, key, from, where } = flowFieldDef
	const sourceTable = ctx.schemas[source]
	if (!sourceTable) {
		console.warn(`FlowField source table "${source}" not found`)
		return type === 'count' ? 0 : type === 'exist' ? false : undefined
	}

	// Use 'from' field if specified, otherwise default to _id
	const rowAny = row as Record<string, unknown>
	const lookupValue = from ? rowAny[from] : rowAny._id

	// Get related records using findMany for better performance and future extensibility
	const relatedRecords = sourceTable.findMany({
		where: (record) => {
			const recordAny = record as Record<string, unknown>
			if (recordAny[key] !== lookupValue) return false

			// Apply where filters if specified
			if (where) {
				for (const [filterKey, filterValue] of Object.entries(where)) {
					if (recordAny[filterKey] !== filterValue) return false
				}
			}
			return true
		},
	})

	switch (type) {
		case 'count':
			return relatedRecords.length

		case 'sum': {
			if (!field) return 0
			return relatedRecords.reduce((sum, record) => {
				const value = (record as Record<string, unknown>)[field]
				return sum + (typeof value === 'number' ? value : 0)
			}, 0)
		}

		case 'average': {
			if (!field || relatedRecords.length === 0) return 0
			const sum = relatedRecords.reduce((acc, record) => {
				const value = (record as Record<string, unknown>)[field]
				return acc + (typeof value === 'number' ? value : 0)
			}, 0)
			return sum / relatedRecords.length
		}

		case 'min': {
			if (!field || relatedRecords.length === 0) return undefined
			const values = relatedRecords
				.map((record) => (record as Record<string, unknown>)[field])
				.filter((v): v is number => typeof v === 'number')
			return values.length > 0 ? Math.min(...values) : undefined
		}

		case 'max': {
			if (!field || relatedRecords.length === 0) return undefined
			const values = relatedRecords
				.map((record) => (record as Record<string, unknown>)[field])
				.filter((v): v is number => typeof v === 'number')
			return values.length > 0 ? Math.max(...values) : undefined
		}

		case 'lookup': {
			if (!field || relatedRecords.length === 0) return undefined
			return (relatedRecords[0] as Record<string, unknown>)[field]
		}

		case 'exist':
			return relatedRecords.length > 0

		default:
			return undefined
	}
}

/**
 * Create a flow field context from table schemas.
 * This wraps the table instances to provide the expected interface for flow field computation.
 *
 * @param tableSchemas - Object mapping table names to their schema instances
 * @returns A FlowFieldContext that can be passed to computeFlowField
 */
export function createFlowFieldContext(
	tableSchemas: Record<
		string,
		{
			toArray: () => object[]
			findMany?: (options?: { where?: (item: object) => boolean }) => object[]
		}
	>,
): FlowFieldContext {
	// Wrap tables to ensure they have the findMany method
	const schemas: FlowFieldContext['schemas'] = {}

	for (const [tableName, table] of Object.entries(tableSchemas)) {
		schemas[tableName] = {
			toArray: () => table.toArray(),
			findMany: (options?: { where?: (item: object) => boolean }) => {
				if (table.findMany) {
					return table.findMany(options)
				}
				// Fallback implementation if findMany is not available
				let items = table.toArray()
				if (options?.where) {
					items = items.filter(options.where)
				}
				return items
			},
		}
	}

	return { schemas }
}
