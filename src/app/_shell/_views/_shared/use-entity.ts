import { $rpc, useMutation, useQuery, useQueryClient } from '@lib/rpc'
import { useOptimistic } from 'react'
import type { ToastModuleId } from '@/lib/toast'
import {
	type MutationOperation,
	type MutationToastPolicy,
	notifyMutationError,
	notifyMutationSuccess,
	resolveMutationToastPolicy,
} from './use-mutation-feedback'

/** Uplink module keys (excludes health + ORPC internals) */
export type UplinkModule = Exclude<keyof typeof $rpc, 'key' | 'health'>

/** Entity sub-router keys within a given module */
export type EntityOf<M extends UplinkModule> = Exclude<
	keyof (typeof $rpc)[M],
	'key'
>

/** Client-side entity RPC utils shape produced by createTenantScopedCrudRouter */
type EntityRpc = (typeof $rpc)['hub']['operationTasks']

function getRpc<M extends UplinkModule>(
	moduleId: M,
	entityId: EntityOf<M> & string,
): EntityRpc {
	return ($rpc[moduleId] as unknown as Record<string, EntityRpc>)[entityId]
}

function applyToItems(
	items: Record<string, unknown>[],
	operation: MutationOperation,
	variables: Record<string, unknown>,
): Record<string, unknown>[] {
	switch (operation) {
		case 'create':
			return [
				{ ...variables, _id: crypto.randomUUID(), _optimistic: true },
				...items,
			]
		case 'update':
		case 'transitionStatus':
			return items.map((item) =>
				item._id === variables.id ? { ...item, ...variables } : item,
			)
		case 'delete':
			return items.filter((item) => item._id !== variables.id)
	}
}

function applyOptimisticUpdate(
	queryClient: ReturnType<typeof useQueryClient>,
	queryKeyPrefix: unknown[],
	operation: MutationOperation,
	variables: Record<string, unknown>,
) {
	queryClient.setQueriesData(
		{ queryKey: queryKeyPrefix },
		(oldData: unknown) => {
			const data = oldData as
				| { pages?: { items: Record<string, unknown>[] }[] }
				| undefined
			if (!data?.pages) return oldData
			return {
				...data,
				pages: data.pages.map((page) => ({
					...page,
					items: applyToItems(page.items, operation, variables),
				})),
			}
		},
	)
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useEntityRecord<M extends UplinkModule>(
	moduleId: M,
	entityId: EntityOf<M> & string,
	id: string | null,
	opts?: { enabled?: boolean },
) {
	const rpc = getRpc(moduleId, entityId)
	const query = useQuery({
		...rpc.getById.queryOptions({ input: { id: id ?? '' } }),
		enabled: (opts?.enabled ?? true) && !!id && id !== 'new',
	})

	const [optimisticData, setOptimisticData] = useOptimistic(
		query.data,
		(
			current: typeof query.data,
			update: Partial<NonNullable<typeof query.data>>,
		) => (current ? { ...current, ...update } : current),
	)

	return { ...query, data: optimisticData, setOptimisticData }
}

export function useEntityMutations<M extends UplinkModule>(
	moduleId: M,
	entityId: EntityOf<M> & string,
	opts?: { enableOptimistic?: boolean; toastPolicy?: MutationToastPolicy },
) {
	const rpc = getRpc(moduleId, entityId)
	const queryClient = useQueryClient()
	const optimistic = opts?.enableOptimistic ?? true
	const toastModuleId = moduleId as ToastModuleId
	const mutationToastPolicy = resolveMutationToastPolicy(
		toastModuleId,
		opts?.toastPolicy,
	)

	const invalidate = () => {
		queryClient.invalidateQueries({ queryKey: rpc.key() })
	}

	function createOptimisticCallbacks(operation: MutationOperation) {
		const handleError = (
			error: unknown,
			context:
				| {
						snapshot?: readonly [readonly unknown[], unknown][]
				  }
				| undefined,
		) => {
			if (context?.snapshot) {
				for (const [key, data] of context.snapshot) {
					queryClient.setQueryData(key, data)
				}
			}
			notifyMutationError({
				moduleId: toastModuleId,
				operation,
				error,
			})
		}
		const handleSuccess = () => {
			notifyMutationSuccess({
				moduleId: toastModuleId,
				operation,
				policy: mutationToastPolicy,
			})
		}

		if (!optimistic) {
			return {
				onError: (error: unknown) => {
					handleError(error, undefined)
				},
				onSuccess: handleSuccess,
				onSettled: invalidate,
			}
		}
		return {
			onMutate: async (variables: Record<string, unknown>) => {
				await queryClient.cancelQueries({ queryKey: rpc.key() })
				const snapshot = queryClient.getQueriesData({
					queryKey: rpc.key(),
				})
				applyOptimisticUpdate(queryClient, rpc.key(), operation, variables)
				return { snapshot } as const
			},
			onError: (
				error: unknown,
				_variables: unknown,
				context:
					| {
							snapshot?: readonly [readonly unknown[], unknown][]
					  }
					| undefined,
			) => {
				handleError(error, context)
			},
			onSuccess: handleSuccess,
			onSettled: invalidate,
		}
	}

	const create = useMutation({
		...rpc.create.mutationOptions(createOptimisticCallbacks('create')),
	})

	const update = useMutation({
		...rpc.update.mutationOptions(createOptimisticCallbacks('update')),
	})

	const remove = useMutation({
		...rpc.delete.mutationOptions(createOptimisticCallbacks('delete')),
	})

	const transitionStatus = useMutation({
		...rpc.transitionStatus.mutationOptions(
			createOptimisticCallbacks('transitionStatus'),
		),
	})

	const isMutating =
		create.isPending ||
		update.isPending ||
		remove.isPending ||
		transitionStatus.isPending

	return { create, update, remove, transitionStatus, isMutating }
}

export function useEntityKpis<M extends UplinkModule>(
	moduleId: M,
	entityId: EntityOf<M> & string,
) {
	const rpc = getRpc(moduleId, entityId)
	return useQuery(rpc.kpis.queryOptions({ input: {} }))
}
