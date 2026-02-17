import { cvx, useMutation, usePaginatedQuery } from '@lib/rpc'
import type {
	FunctionArgs,
	FunctionReference,
	FunctionReturnType,
} from 'convex/server'
import { useCallback, useState } from 'react'
import { useGrid } from '@/components/data-grid/compound'
import { useWindowSize } from '@/components/data-grid/hooks/use-window-size'
import React from 'react'

const PAGE_SIZE = 25
const DEFAULT_WINDOW_SIZE = { defaultWidth: 1200, defaultHeight: 800 }

// ---------------------------------------------------------------------------
// Convex API type helpers
// ---------------------------------------------------------------------------

type CvxModules = (typeof cvx)['api']
type UplinkModule = keyof CvxModules
type EntityOf<M extends UplinkModule> = keyof CvxModules[M]

/** Extract a named property from a module type */
type Fn<Module, K extends string> =
	Module extends Record<K, infer F> ? F : never

/** Extract the page-item type from a list query's PaginationResult */
type PageItem<M extends UplinkModule, E extends EntityOf<M>> =
	Fn<CvxModules[M][E], 'list'> extends FunctionReference<any, any, any, infer R>
		? R extends { page: (infer D)[] }
			? D
			: Record<string, any>
		: Record<string, any>

/** Bridge: runtime accessor. Types flow via conditional types above. */
function entity<M extends UplinkModule, E extends EntityOf<M>>(m: M, e: E) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return cvx.api[m][e] 
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Paginated data hook backed by Convex `usePaginatedQuery`.
 * Types are inferred from the module + entity name.
 */
export function useModuleData<M extends UplinkModule, E extends EntityOf<M>>(
	moduleId: M,
	entityId: E,
	options?: { pageSize?: number; search?: string; orderBy?: 'asc' | 'desc' },
) {
	const pageSize = options?.pageSize ?? PAGE_SIZE
	const windowSize = useWindowSize(DEFAULT_WINDOW_SIZE)

	const { results, status, loadMore } = usePaginatedQuery(
		entity(moduleId, entityId).list,
		{ search: options?.search, orderBy: options?.orderBy },
		{ initialNumItems: pageSize },
	)

	const isLoading = React.useMemo(() => ['LoadingFirstPage', 'LoadingMore'].includes(status), [status])

	const DataGrid = useGrid<PageItem<M, E>>(
		() => ({
			data: results ?? [],
			isLoading,
			readOnly: true,
			enableSearch: true,
			infiniteScroll: {
				loadMore: () => loadMore(pageSize),
				hasMore: status === 'CanLoadMore',
				isLoading: status === 'LoadingMore',
			},
		}),
		[results, isLoading, status],
	)

	return {
		items: results ?? [],
		loadMore: () => loadMore(pageSize),
		fetchNextPage: () => loadMore(pageSize),
		hasNextPage: status === 'CanLoadMore',
		isFetchingNextPage: status === 'LoadingMore',
		DataGrid,
		windowSize,
		isLoading,
		status,
	}
}

/**
 * Simple list hook — loads a single page via Convex pagination.
 */
export function useModuleList<M extends UplinkModule, E extends EntityOf<M>>(
	moduleId: M,
	entityId: E,
	options?: { limit?: number; search?: string },
) {
	const limit = options?.limit ?? 50

	const { results, status } = usePaginatedQuery(
		entity(moduleId, entityId).list,
		{ search: options?.search },
		{ initialNumItems: limit },
	)

	return {
		data: (results ?? []) as PageItem<M, E>[],
		isLoading: status === 'LoadingFirstPage',
		status,
	}
}

/**
 * Wraps Convex `useMutation` with `.mutateAsync()` and `.isPending`.
 */
function useWrappedMutation<F extends FunctionReference<'mutation'>>(ref: F) {
	const rawMutate = useMutation(ref)
	const [isPending, setIsPending] = useState(false)

	const mutateAsync = useCallback(
		async (args: FunctionArgs<F>): Promise<FunctionReturnType<F>> => {
			setIsPending(true)
			try {
				return (await rawMutate(args)) as FunctionReturnType<F>
			} finally {
				setIsPending(false)
			}
		},
		[rawMutate],
	)

	return { mutateAsync, mutate: mutateAsync, isPending }
}

/**
 * Mutation hooks for create / update / remove / transitionStatus.
 */
export type { UplinkModule, EntityOf }

export function useModuleMutations<
	M extends UplinkModule,
	E extends EntityOf<M>,
>(moduleId: M, entityId: E) {
	const e = entity(moduleId, entityId)

	return {
		create: useWrappedMutation(e.create),
		update: useWrappedMutation(e.update),
		remove: useWrappedMutation(e.remove),
		transitionStatus: useWrappedMutation(e.transitionStatus),
	}
}
