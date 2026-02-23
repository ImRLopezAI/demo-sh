import { $rpc, useMutation, useQuery, useQueryClient } from '@lib/rpc'

type UplinkModule = Exclude<keyof typeof $rpc, 'key' | 'health'>
type EntityRpc = (typeof $rpc)['hub']['operationTasks']

function getRpc(moduleId: string, entityId: string): EntityRpc {
	return (
		$rpc[moduleId as UplinkModule] as unknown as Record<string, EntityRpc>
	)[entityId]
}

export function useEntityRecord(
	moduleId: string,
	entityId: string,
	id: string | null,
	opts?: { enabled?: boolean },
) {
	const rpc = getRpc(moduleId, entityId)
	return useQuery({
		...rpc.getById.queryOptions({ input: { id: id ?? '' } }),
		enabled: (opts?.enabled ?? true) && !!id && id !== 'new',
	})
}

export function useEntityMutations(moduleId: string, entityId: string) {
	const rpc = getRpc(moduleId, entityId)
	const queryClient = useQueryClient()

	const invalidate = () => {
		queryClient.invalidateQueries({
			queryKey: rpc.key(),
		})
	}

	const create = useMutation({
		...rpc.create.mutationOptions({ onSuccess: invalidate }),
	})

	const update = useMutation({
		...rpc.update.mutationOptions({ onSuccess: invalidate }),
	})

	const remove = useMutation({
		...rpc.delete.mutationOptions({ onSuccess: invalidate }),
	})

	const transitionStatus = useMutation({
		...rpc.transitionStatus.mutationOptions({ onSuccess: invalidate }),
	})

	return { create, update, remove, transitionStatus }
}

export function useEntityKpis(moduleId: string, entityId: string) {
	const rpc = getRpc(moduleId, entityId)
	return useQuery(rpc.kpis.queryOptions({ input: {} }))
}
