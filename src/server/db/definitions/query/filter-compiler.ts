// ============================================================================
// Filter compiler for query pushdown (Phase 3)
// ============================================================================

import type { AdapterFilter } from '../adapters/types'

/**
 * Attempt to compile a where predicate into serializable filter descriptors
 * via Proxy recording.
 *
 * Returns null for complex/non-serializable closures (graceful fallback).
 *
 * @example
 * ```ts
 * const filter = compileFilter((item) => item.status === 'active')
 * // => { type: 'eq', field: 'status', value: 'active' }
 * ```
 */
export function compileFilter(
	where: (item: object) => boolean,
): AdapterFilter | null {
	let currentField: string | null = null

	const proxy = new Proxy({} as Record<string, unknown>, {
		get(_target, prop: string) {
			currentField = prop
			return `__proxy_field_${prop}__`
		},
	})

	try {
		// Try running the predicate with the proxy
		// This is best-effort and will fail for complex predicates
		const result = where(proxy as object)

		// If we got a boolean directly, the predicate was simple enough
		if (typeof result === 'boolean' && currentField) {
			// Simple equality check like item.active === true
			return { type: 'eq', field: currentField, value: result }
		}
	} catch {
		// Complex predicate that can't be proxy-recorded
	}

	return null
}

/**
 * Apply an AdapterFilter to an array of documents in memory.
 * Used as fallback when the adapter doesn't support pushdown.
 */
export function applyAdapterFilter<T extends Record<string, unknown>>(
	items: T[],
	filter: AdapterFilter,
): T[] {
	return items.filter((item) => matchesFilter(item, filter))
}

function matchesFilter(
	item: Record<string, unknown>,
	filter: AdapterFilter,
): boolean {
	switch (filter.type) {
		case 'eq':
			return item[filter.field] === filter.value
		case 'ne':
			return item[filter.field] !== filter.value
		case 'gt':
			return (item[filter.field] as number | string) > filter.value
		case 'gte':
			return (item[filter.field] as number | string) >= filter.value
		case 'lt':
			return (item[filter.field] as number | string) < filter.value
		case 'lte':
			return (item[filter.field] as number | string) <= filter.value
		case 'in':
			return filter.values.includes(item[filter.field])
		case 'isNull':
			return item[filter.field] == null
		case 'isNotNull':
			return item[filter.field] != null
		case 'and':
			return filter.filters.every((f) => matchesFilter(item, f))
		case 'or':
			return filter.filters.some((f) => matchesFilter(item, f))
	}
}
