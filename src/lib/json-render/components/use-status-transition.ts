import * as React from 'react'
import { useTransitionWithReason } from '@/lib/json-render/components/transition-reason'
import {
	type EntityOf,
	type UplinkModule,
	useEntityMutations,
} from '@/lib/json-render/components/use-entity'

interface TransitionPayload {
	toStatus: string
	reason?: string
}

interface UseStatusTransitionOptions<M extends UplinkModule = UplinkModule> {
	/** Module identifier (e.g. 'market', 'replenishment') */
	moduleId: M
	/** Entity identifier (e.g. 'salesOrders', 'purchaseOrders') */
	entityId: EntityOf<M> & string
	/** Record id for the current entity; null when no record is selected */
	recordId: string | null
	/** True when the card is in "create new" mode */
	isNew: boolean
	/** Additional disabled flag (e.g. when a custom mutation is pending) */
	disabled?: boolean
	/** Optional human-readable label resolver for status codes */
	getStatusLabel?: (status: string) => string
	/**
	 * Override the default transitionStatus mutation.
	 * Use this for entities that have custom transition logic
	 * (e.g. sales orders with submitForApproval/cancelWithRelease,
	 *  invoices with postInvoice, shipments with transitionWithNotification).
	 *
	 * When provided, the hook will call this instead of the generic
	 * `transitionStatus.mutateAsync`. The default handleTransition
	 * is skipped entirely.
	 */
	onTransition?: (payload: TransitionPayload) => Promise<void>
	/**
	 * Called after a successful transition (default or custom).
	 * Common use case: closing the dialog after a status change.
	 */
	onSuccess?: () => void
}

/**
 * Encapsulates the status transition boilerplate shared across card components:
 *
 * 1. `useEntityMutations` for the generic `transitionStatus` mutation
 * 2. A `handleTransition` callback (default or custom via `onTransition`)
 * 3. `useTransitionWithReason` for reason-dialog gating
 *
 * Returns everything the card needs to wire up transition buttons and
 * render the reason dialog.
 */
export function useStatusTransition<M extends UplinkModule>({
	moduleId,
	entityId,
	recordId,
	isNew,
	disabled = false,
	getStatusLabel,
	onTransition,
	onSuccess,
}: UseStatusTransitionOptions<M>) {
	const { transitionStatus, isMutating } = useEntityMutations(
		moduleId,
		entityId,
	)

	const handleTransition = React.useCallback(
		async ({ toStatus, reason }: TransitionPayload) => {
			if (!recordId || isNew) return
			if (onTransition) {
				await onTransition({ toStatus, reason })
			} else {
				await transitionStatus.mutateAsync({
					id: recordId,
					toStatus,
					reason,
				})
			}
			onSuccess?.()
		},
		[recordId, isNew, onTransition, transitionStatus, onSuccess],
	)

	const { requestTransition, reasonDialog } = useTransitionWithReason({
		moduleId,
		entityId,
		disabled: disabled || transitionStatus.isPending,
		...(getStatusLabel ? { getStatusLabel } : {}),
		onTransition: handleTransition,
	})

	return {
		/** Initiates a transition; shows the reason dialog when required. */
		requestTransition,
		/** The reason dialog element -- render at the end of the card's return. */
		reasonDialog,
		/** The underlying transitionStatus mutation (for disabling buttons, etc.) */
		transitionStatus,
		/** True when any mutation from the underlying useEntityMutations is pending */
		isMutating,
	}
}
