import { $rpc, useInfiniteQuery, useQuery } from '@lib/rpc'
import * as React from 'react'
import { useGrid } from '@/components/data-grid/compound'
import { useWindowSize } from '@/components/data-grid/hooks/use-window-size'

const PAGE_SIZE = 50
const DEFAULT_WINDOW_SIZE = { defaultWidth: 1200, defaultHeight: 760 }
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
	const { data, fetchNextPage, ...query } = useInfiniteQuery({
		...rpc.listViewRecords.infiniteOptions({
			input: (context: number) => ({
				viewId: viewSlug,
				limit: pageSize,
				offset: context,
				filters: options?.filters,
			}),
			initialPageParam: 0,
			getNextPageParam: (lastPage) => lastPage.nextOffset ?? undefined,
		}),
		maxPages: 10,
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
			infiniteScroll: {
				loadMore: () => {
					fetchNextPage()
				},
				hasMore: Boolean(data?.pages[data.pages.length - 1].nextOffset),
				isLoading: query.isFetchingNextPage,
			},
		}),
		[items, query.isLoading, data],
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
	const normalizedLimit =
		typeof options?.limit === 'number' && Number.isFinite(options.limit)
			? options.limit
			: 50
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
