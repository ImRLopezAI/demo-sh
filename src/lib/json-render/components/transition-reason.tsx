import {
	BANK_ACCOUNT_REASON_REQUIRED,
	DOCUMENT_APPROVAL_REASON_REQUIRED,
	EMPLOYEE_REASON_REQUIRED,
	JOURNAL_LINE_REASON_REQUIRED,
	OPERATION_TASK_REASON_REQUIRED,
	POS_TRANSACTION_REASON_REQUIRED,
	RECONCILIATION_REASON_REQUIRED,
	SALES_INVOICE_REASON_REQUIRED,
	SHIPMENT_REASON_REQUIRED,
	TRANSFER_REASON_REQUIRED,
} from '@server/db/constants'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import type { UplinkModule } from '@/lib/json-render/components/use-entity'

const REASON_REQUIRED_STATUSES: Record<string, readonly string[]> = {
	'market.salesOrders': DOCUMENT_APPROVAL_REASON_REQUIRED,
	'replenishment.purchaseOrders': DOCUMENT_APPROVAL_REASON_REQUIRED,
	'replenishment.transfers': TRANSFER_REASON_REQUIRED,
	'ledger.invoices': SALES_INVOICE_REASON_REQUIRED,
	'pos.transactions': POS_TRANSACTION_REASON_REQUIRED,
	'trace.shipments': SHIPMENT_REASON_REQUIRED,
	'flow.bankAccounts': BANK_ACCOUNT_REASON_REQUIRED,
	'flow.bankLedgerEntries': RECONCILIATION_REASON_REQUIRED,
	'flow.journalLines': JOURNAL_LINE_REASON_REQUIRED,
	'payroll.employees': EMPLOYEE_REASON_REQUIRED,
	'payroll.journalLines': JOURNAL_LINE_REASON_REQUIRED,
	'payroll.bankLedgerEntries': RECONCILIATION_REASON_REQUIRED,
	'hub.operationTasks': OPERATION_TASK_REASON_REQUIRED,
}

function transitionKey(moduleId: string, entityId: string): string {
	return `${moduleId}.${entityId}`
}

export function isReasonRequiredForTransition(
	moduleId: string,
	entityId: string,
	toStatus: string,
): boolean {
	const requiredStatuses =
		REASON_REQUIRED_STATUSES[transitionKey(moduleId, entityId)] ?? []
	return requiredStatuses.includes(toStatus)
}

interface TransitionPayload {
	toStatus: string
	reason?: string
}

interface UseTransitionWithReasonOptions {
	moduleId: UplinkModule
	entityId: string
	disabled?: boolean
	getStatusLabel?: (status: string) => string
	onTransition: (payload: TransitionPayload) => Promise<void>
}

export function useTransitionWithReason({
	moduleId,
	entityId,
	disabled = false,
	getStatusLabel = (status) => status.replace(/_/g, ' '),
	onTransition,
}: UseTransitionWithReasonOptions) {
	const [pendingStatus, setPendingStatus] = React.useState<string | null>(null)
	const [reason, setReason] = React.useState('')
	const [showRequiredError, setShowRequiredError] = React.useState(false)
	const [isSubmitting, setIsSubmitting] = React.useState(false)

	const requiresReasonForStatus = React.useCallback(
		(toStatus: string) =>
			isReasonRequiredForTransition(moduleId, entityId, toStatus),
		[moduleId, entityId],
	)

	const requestTransition = React.useCallback(
		async (toStatus: string) => {
			if (disabled || isSubmitting) return
			if (requiresReasonForStatus(toStatus)) {
				setPendingStatus(toStatus)
				setReason('')
				setShowRequiredError(false)
				return
			}
			await onTransition({ toStatus })
		},
		[disabled, isSubmitting, requiresReasonForStatus, onTransition],
	)

	const closeDialog = React.useCallback(() => {
		if (disabled || isSubmitting) return
		setPendingStatus(null)
		setReason('')
		setShowRequiredError(false)
	}, [disabled, isSubmitting])

	const confirmTransition = React.useCallback(async () => {
		if (!pendingStatus || disabled || isSubmitting) return
		const trimmedReason = reason.trim()
		const reasonRequired = requiresReasonForStatus(pendingStatus)
		if (reasonRequired && trimmedReason.length === 0) {
			setShowRequiredError(true)
			return
		}

		setIsSubmitting(true)
		try {
			await onTransition({
				toStatus: pendingStatus,
				reason: trimmedReason || undefined,
			})
			setPendingStatus(null)
			setReason('')
			setShowRequiredError(false)
		} finally {
			setIsSubmitting(false)
		}
	}, [
		pendingStatus,
		disabled,
		isSubmitting,
		reason,
		requiresReasonForStatus,
		onTransition,
	])

	const reasonRequired = pendingStatus
		? requiresReasonForStatus(pendingStatus)
		: false
	const isBusy = disabled || isSubmitting

	const reasonDialog = (
		<Dialog
			open={pendingStatus !== null}
			onOpenChange={(nextOpen) => {
				if (!nextOpen) closeDialog()
			}}
		>
			<DialogContent showCloseButton={!isBusy} className='sm:max-w-md'>
				<DialogHeader>
					<DialogTitle>
						Transition to {getStatusLabel(pendingStatus ?? '')}
					</DialogTitle>
					<DialogDescription>
						{reasonRequired
							? 'A reason is required for this transition.'
							: 'Add an optional reason for this transition.'}
					</DialogDescription>
				</DialogHeader>

				<div className='space-y-2'>
					<Textarea
						value={reason}
						onChange={(event) => {
							setReason(event.target.value)
							if (showRequiredError && event.target.value.trim().length > 0) {
								setShowRequiredError(false)
							}
						}}
						rows={4}
						placeholder={
							reasonRequired
								? 'Explain why this status is changing...'
								: 'Optional transition note...'
						}
						disabled={isBusy}
					/>
					{showRequiredError && reasonRequired && (
						<p className='text-destructive text-sm'>
							Reason is required for this status.
						</p>
					)}
				</div>

				<DialogFooter>
					<Button variant='outline' onClick={closeDialog} disabled={isBusy}>
						Cancel
					</Button>
					<Button
						onClick={() => {
							void confirmTransition()
						}}
						disabled={isBusy}
					>
						{isBusy ? 'Applying...' : 'Apply Transition'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)

	return {
		requestTransition,
		reasonDialog,
	}
}
