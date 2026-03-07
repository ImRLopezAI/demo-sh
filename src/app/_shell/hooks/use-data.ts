import { $rpc, useInfiniteQuery, useQuery } from '@lib/rpc'
import { keepPreviousData } from '@tanstack/react-query'
import type { ColumnFiltersState } from '@tanstack/react-table'
import { createParser, parseAsString, useQueryState } from 'nuqs'
import * as React from 'react'
import { useGrid } from '@/components/data-grid/compound'
import { useWindowSize } from '@/components/data-grid/hooks/use-window-size'

const PAGE_SIZE = 50
const DEFAULT_WINDOW_SIZE = { defaultWidth: 1200, defaultHeight: 760 }

// Compact operator shortcodes for URL-friendly filter serialization
// URL: ?filters=totalAmount.bt.10000.12000~type.anyof.ORDER,QUOTE
const OP_TO_SHORT: Record<string, string> = {
	contains: 'co',
	notContains: 'nco',
	equals: 'eq',
	notEquals: 'neq',
	startsWith: 'sw',
	endsWith: 'ew',
	isEmpty: 'empty',
	isNotEmpty: 'nempty',
	lessThan: 'lt',
	lessThanOrEqual: 'lte',
	greaterThan: 'gt',
	greaterThanOrEqual: 'gte',
	isBetween: 'bt',
	before: 'bef',
	after: 'aft',
	onOrBefore: 'obef',
	onOrAfter: 'oaft',
	is: 'is',
	isNot: 'not',
	isAnyOf: 'anyof',
	isNoneOf: 'noneof',
	isTrue: 'true',
	isFalse: 'false',
}
const SHORT_TO_OP = Object.fromEntries(
	Object.entries(OP_TO_SHORT).map(([k, v]) => [v, k]),
)

function serializeFilterValue(v: unknown): string {
	if (Array.isArray(v)) return v.map(String).join(',')
	return String(v ?? '')
}

function parseFilterValue(
	s: string,
	op: string,
): string | number | string[] | undefined {
	if (!s) return undefined
	if (op === 'anyof' || op === 'noneof') return s.split(',')
	const num = Number(s)
	if (!Number.isNaN(num) && s !== '') return num
	return s
}

const parseAsFilters = createParser<ColumnFiltersState>({
	parse: (raw) => {
		if (!raw) return []
		const filters: ColumnFiltersState = []
		for (const segment of raw.split('~')) {
			// Format: field.op[.value[.endValue]]
			const dotIdx = segment.indexOf('.')
			if (dotIdx === -1) continue
			const field = segment.slice(0, dotIdx)
			const rest = segment.slice(dotIdx + 1)
			const opIdx = rest.indexOf('.')
			const shortOp = opIdx === -1 ? rest : rest.slice(0, opIdx)
			const operator = SHORT_TO_OP[shortOp]
			if (!operator) continue

			const valPart = opIdx === -1 ? '' : rest.slice(opIdx + 1)
			// For isBetween, split on last dot for endValue (but be careful with dates)
			if (operator === 'isBetween' && valPart) {
				const lastDot = valPart.lastIndexOf('.')
				if (lastDot > 0) {
					const value = parseFilterValue(valPart.slice(0, lastDot), shortOp)
					const endValue = parseFilterValue(valPart.slice(lastDot + 1), shortOp)
					filters.push({ id: field, value: { operator, value, endValue } })
					continue
				}
			}
			const value = valPart ? parseFilterValue(valPart, shortOp) : undefined
			filters.push({ id: field, value: { operator, value } })
		}
		return filters
	},
	serialize: (filters) => {
		if (!filters || filters.length === 0) return ''
		return filters
			.map((f) => {
				const fv = f.value as {
					operator: string
					value?: unknown
					endValue?: unknown
				}
				const short = OP_TO_SHORT[fv.operator] ?? fv.operator
				let s = `${f.id}.${short}`
				if (fv.value !== undefined && fv.value !== null && fv.value !== '') {
					s += `.${serializeFilterValue(fv.value)}`
				}
				if (
					fv.endValue !== undefined &&
					fv.endValue !== null &&
					fv.endValue !== ''
				) {
					s += `.${serializeFilterValue(fv.endValue)}`
				}
				return s
			})
			.join('~')
	},
	eq: (a, b) => JSON.stringify(a) === JSON.stringify(b),
})
/** Uplink module keys (excludes health + ORPC internals) */
type UplinkModule = Exclude<keyof typeof $rpc, 'key' | 'health'>

/** Entity sub-router keys within a given module */
type EntityOf<M extends UplinkModule> = Exclude<keyof (typeof $rpc)[M], 'key'>

/** Client-side entity RPC utils shape produced by createTenantScopedCrudRouter */
type EntityRpc = (typeof $rpc)['hub']['operationTasks']

export function useModuleData<
	M extends UplinkModule,
	T extends object = object,
>(
	moduleId: M,
	entityId: EntityOf<M> & string,
	viewSlug: string,
	options?: {
		pageSize?: number
		filters?: Record<string, string | number | boolean | null>
	},
) {
	const pageSize = options?.pageSize ?? PAGE_SIZE
	const rpc = ($rpc[moduleId] as unknown as Record<string, EntityRpc>)[entityId]
	const windowSize = useWindowSize(DEFAULT_WINDOW_SIZE)

	// URL-synced search and filter state via nuqs
	const [search, setSearch] = useQueryState(
		'q',
		parseAsString.withDefault('').withOptions({ throttleMs: 350 }),
	)
	const [columnFilters, setColumnFilters] = useQueryState(
		'filters',
		parseAsFilters.withDefault([]).withOptions({ throttleMs: 350 }),
	)

	// Map TanStack ColumnFiltersState to server's structuredFilters format
	const structuredFilters = React.useMemo(() => {
		if (columnFilters.length === 0) return undefined
		return columnFilters.map((f) => ({
			id: f.id,
			value: f.value as { operator: string; value?: any; endValue?: any },
		}))
	}, [columnFilters])

	const { data, fetchNextPage, ...query } = useInfiniteQuery({
		...rpc.listViewRecords.infiniteOptions({
			input: (context: number) => ({
				viewId: viewSlug,
				limit: pageSize,
				offset: context,
				filters: options?.filters,
				structuredFilters,
				search: search || undefined,
			}),
			initialPageParam: 0,
			getNextPageParam: (lastPage) => lastPage.nextOffset ?? undefined,
		}),
		maxPages: 10,
		placeholderData: keepPreviousData,
	})

	const items = React.useMemo(
		() => (data?.pages.flatMap((p) => p.items) ?? []) as T[],
		[data?.pages],
	)
	const DataGrid = useGrid<T>(
		() => ({
			data: items ?? [],
			isLoading: query.isLoading,
			readOnly: true,
			enableSearch: true,
			manualFiltering: true,
			// Hydrate table state from URL for shared links
			globalFilter: search || '',
			state: { columnFilters },
			// Bridge search bar → URL → server
			onGlobalFilterChange: (updater) => {
				const value =
					typeof updater === 'function' ? updater(search ?? '') : updater
				setSearch(value || null)
			},
			// Bridge column filters → URL → server
			onColumnFiltersChange: (updater) => {
				const value =
					typeof updater === 'function' ? updater(columnFilters) : updater
				setColumnFilters(value.length > 0 ? value : null)
			},
			infiniteScroll: {
				loadMore: () => {
					if (!query.isFetching) fetchNextPage()
				},
				hasMore: Boolean(data?.pages[data.pages.length - 1].nextOffset),
				isLoading: query.isFetchingNextPage,
			},
		}),
		[items, query.isLoading, query.isFetching, data, search, columnFilters],
	)
	return {
		items,
		fetchNextPage: () => {
			fetchNextPage()
		},
		DataGrid,
		windowSize,
		...query,
	}
}

export function useModuleList<M extends UplinkModule>(
	moduleId: M,
	entityId: EntityOf<M> & string,
	options?: { limit?: number; search?: string },
) {
	const rpc = ($rpc[moduleId] as unknown as Record<string, EntityRpc>)[entityId]
	const normalizedLimitRaw =
		typeof options?.limit === 'number' && Number.isFinite(options.limit)
			? options.limit
			: 50
	const normalizedLimit = Math.max(1, Math.min(200, normalizedLimitRaw))
	const normalizedSearch =
		typeof options?.search === 'string'
			? options.search.trim() || undefined
			: undefined

	return useQuery(
		rpc.list.queryOptions({
			input: {
				limit: normalizedLimit,
				offset: 0,
				search: normalizedSearch,
			},
		}),
	)
}
