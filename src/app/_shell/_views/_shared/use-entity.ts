import { cvx, useMutation, useQuery } from '@lib/rpc'
import type {
	FunctionArgs,
	FunctionReference,
	FunctionReturnType,
} from 'convex/server'
import { useCallback, useState } from 'react'

// ---------------------------------------------------------------------------
// Convex API type helpers (mirrors use-data.ts)
// ---------------------------------------------------------------------------

type CvxModules = (typeof cvx)['api']
type UplinkModule = keyof CvxModules
type EntityOf<M extends UplinkModule> = keyof CvxModules[M] & string

export type { UplinkModule, EntityOf }

/** Bridge: runtime accessor. Types flow via conditional types at call sites. */
function entity<M extends UplinkModule, E extends EntityOf<M>>(m: M, e: E) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return (cvx.api[m] as Record<string, any>)[e as string]
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useEntityRecord<M extends UplinkModule, E extends EntityOf<M>>(
	moduleId: M,
	entityId: E,
	id: string | null,
	opts?: { enabled?: boolean; with?: Record<string, boolean> },
) {
	const e = entity(moduleId, entityId)
	const enabled = (opts?.enabled ?? true) && !!id && id !== 'new'
	const result = useQuery(
		e.getById,
		...(enabled
			? [{ id, ...(opts?.with ? { with: opts.with } : {}) }]
			: ['skip' as const]),
	)

	return { ...result, isLoading: result.isPending }
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

export function useEntityMutations<
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

export function useEntityKpis<M extends UplinkModule, E extends EntityOf<M>>(
	moduleId: M,
	entityId: E,
) {
	const e = entity(moduleId, entityId)
	const result = useQuery(e.kpis, {})

	return { ...result, isLoading: result.isPending }
}
