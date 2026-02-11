import type { QueryHelpers } from '../types/query.types'

/**
 * Create query helper functions bound to a specific item.
 * These helpers provide SQL-like query operations for filtering.
 *
 * @param item - The item to create helpers for
 * @returns QueryHelpers object with comparison functions
 *
 * @example
 * ```ts
 * const helpers = createQueryHelpers(user)
 * const isAdult = helpers.gt('age', 18)
 * const isAdmin = helpers.eq('role', 'admin')
 * const result = helpers.and(isAdult, isAdmin)
 * ```
 */
export function createQueryHelpers<T extends object>(item: T): QueryHelpers<T> {
	const rec = item as Record<string, unknown>
	return {
		eq: (field, value) => rec[field as string] === value,
		ne: (field, value) => rec[field as string] !== value,
		gt: (field, value) => (rec[field as string] as number) > (value as number),
		gte: (field, value) =>
			(rec[field as string] as number) >= (value as number),
		lt: (field, value) => (rec[field as string] as number) < (value as number),
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

/**
 * Apply ordering to an array of items based on orderBy clauses.
 *
 * @param items - The items to sort
 * @param orderBy - Single or multiple order clauses
 * @returns Sorted array (new array, doesn't mutate input)
 */
export function applyOrdering<T extends object>(
	items: T[],
	orderBy?:
		| { field: string; direction: 'asc' | 'desc' }
		| Array<{ field: string; direction: 'asc' | 'desc' }>,
): T[] {
	if (!orderBy) return items

	const orderClauses = Array.isArray(orderBy) ? orderBy : [orderBy]

	return [...items].sort((a, b) => {
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

/**
 * Apply column selection/projection to items.
 *
 * @param items - The items to project
 * @param columns - Column selection (true = include, false = exclude)
 * @returns Projected items
 */
export function applyColumnSelection<T extends object>(
	items: T[],
	columns?: Partial<Record<string, boolean>>,
): T[] {
	if (!columns) return items

	const hasIncludes = Object.values(columns).some((v) => v === true)

	return items.map((doc) => {
		const newDoc: Record<string, unknown> = {}
		for (const [key, value] of Object.entries(doc)) {
			const include = columns[key]
			if (hasIncludes) {
				if (include === true) newDoc[key] = value
			} else {
				if (include !== false) newDoc[key] = value
			}
		}
		return newDoc as T
	})
}

/**
 * Apply offset and limit to an array of items.
 *
 * @param items - The items to slice
 * @param offset - Number of items to skip
 * @param limit - Maximum number of items to return
 * @returns Sliced array
 */
export function applyPagination<T>(
	items: T[],
	offset?: number,
	limit?: number,
): T[] {
	let result = items

	if (offset) {
		result = result.slice(offset)
	}

	if (limit) {
		result = result.slice(0, limit)
	}

	return result
}

/**
 * Apply where filter to items using query helpers.
 *
 * @param items - The items to filter
 * @param where - Filter predicate function
 * @returns Filtered items
 */
export function applyWhereFilter<T extends object>(
	items: T[],
	where?: (item: T, helpers: QueryHelpers<T>) => boolean,
): T[] {
	if (!where) return items

	return items.filter((item) => where(item, createQueryHelpers(item)))
}

/**
 * Full query execution pipeline: filter -> order -> paginate -> project.
 *
 * @param items - Source items
 * @param options - Query options
 * @returns Filtered, sorted, paginated, and projected items
 */
export function executeQuery<T extends object>(
	items: T[],
	options?: {
		where?: (item: T, helpers: QueryHelpers<T>) => boolean
		orderBy?:
			| { field: string; direction: 'asc' | 'desc' }
			| Array<{ field: string; direction: 'asc' | 'desc' }>
		limit?: number
		offset?: number
		columns?: Partial<Record<string, boolean>>
	},
): T[] {
	if (!options) return items

	let result = items

	// Apply where filter
	result = applyWhereFilter(result, options.where)

	// Apply ordering
	result = applyOrdering(result, options.orderBy)

	// Apply pagination
	result = applyPagination(result, options.offset, options.limit)

	// Apply column selection
	result = applyColumnSelection(result, options.columns)

	return result
}
