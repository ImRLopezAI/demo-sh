import { useRouter } from 'next/navigation'
import * as React from 'react'
import { useGrid } from '@/components/data-grid/compound'
import { useCreateForm } from '@/components/ui/form'
import { useRecordReportGroup } from '@/hooks/use-record-report-group'
import { useModuleData } from '@/app/_shell/hooks/use-data'
import {
	RecordDialog,
	type RecordDialogActionGroup,
} from '@/lib/json-render/components/record-dialog'
import {
	resolveCardTitle,
	type SpecCardProps,
} from '@/lib/json-render/components/spec-card-helpers'
import { StatusBadge } from '@/components/ui/json-render/status-badge'
import { useEntityRecord } from '@/lib/json-render/components/use-entity'

interface PosTransactionHeader {
	_id: string
	receiptNo: string
	posSessionId: string
	status: 'OPEN' | 'COMPLETED' | 'VOIDED' | 'REFUNDED'
	customerId: string
	totalAmount: number
	taxAmount: number
	discountAmount: number
	paidAmount: number
	paymentMethod: 'CASH' | 'CARD' | 'MOBILE' | 'MIXED'
	transactionAt: string
	lineCount: number
}

interface TransactionLine {
	_id: string
	transactionId: string
	lineNo: number
	itemId: string
	description: string
	quantity: number
	unitPrice: number
	lineAmount: number
	discountPercent: number
}

export function TransactionCard({
	selectedId,
	onClose,
	presentation = 'dialog',
	specCardProps,
}: {
	selectedId: string | null
	onClose: () => void
	presentation?: 'dialog' | 'page'
	specCardProps?: SpecCardProps
}) {
	const router = useRouter()
	const isOpen = selectedId !== null

	const { data: record, isLoading: recordLoading } = useEntityRecord(
		'pos',
		'transactions',
		selectedId,
		{ enabled: isOpen },
	)

	const { items: allLines, isLoading: linesLoading } = useModuleData<
		'pos',
		TransactionLine
	>('pos', 'transactionLines', 'overview')

	const [Form, form] = useCreateForm(
		() => ({
			defaultValues: (record ?? {}) as Record<string, unknown>,
			onSubmit: async () => {
				onClose()
			},
		}),
		[record],
	)

	React.useEffect(() => {
		form.reset((record ?? {}) as Record<string, unknown>)
	}, [record, form])

	const lines = React.useMemo(
		() =>
			selectedId
				? allLines.filter((line) => line.transactionId === selectedId)
				: [],
		[allLines, selectedId],
	)

	const LinesGrid = useGrid(
		() => ({
			data: lines,
			isLoading: linesLoading,
			readOnly: true,
			enableSearch: false,
		}),
		[lines, linesLoading],
	)

	const resolvedRecord = record as PosTransactionHeader | undefined

	const reportGroup = useRecordReportGroup({
		moduleId: 'pos',
		entityId: 'transactions',
		recordId: selectedId,
		isNew: false,
	})

	const isVoided = resolvedRecord?.status === 'VOIDED'
	const isRefunded = resolvedRecord?.status === 'REFUNDED'
	const isTerminal = isVoided || isRefunded

	const actionGroups = React.useMemo<RecordDialogActionGroup[]>(() => {
		if (!selectedId) return []
		return [
			{
				label: 'Actions',
				items: [
					{
						label: 'Void Transaction',
						variant: 'destructive',
						disabled: isTerminal,
						onClick: () => {
							/* TODO: implement void action */
						},
					},
					{
						label: 'Issue Refund',
						disabled: isTerminal,
						onClick: () => {
							/* TODO: implement refund action */
						},
					},
				],
			},
			{
				label: 'Related',
				items: [
					{
						label: 'Session',
						onClick: () => router.push('/pos/sessions'),
					},
					{
						label: 'Customer',
						disabled: !resolvedRecord?.customerId,
						onClick: () => router.push('/market/customers'),
					},
				],
			},
			{
				label: 'Navigate',
				items: [
					{
						label: 'Terminal',
						onClick: () => router.push('/pos/terminals'),
					},
					{
						label: 'Transactions',
						onClick: () => router.push('/pos/transactions'),
					},
				],
			},
			...(reportGroup ? [reportGroup] : []),
		]
	}, [selectedId, isTerminal, resolvedRecord?.customerId, router, reportGroup])

	return (
		<RecordDialog
			open={isOpen}
			onOpenChange={(open) => !open && onClose()}
			presentation={presentation}
			title={resolveCardTitle(
				specCardProps?.title,
				resolvedRecord as any,
				`Transaction ${resolvedRecord?.receiptNo ?? ''}`,
			)}
			description={
				specCardProps?.description ?? 'POS transaction details and line items'
			}
			actionGroups={actionGroups}
		>
			{recordLoading ? (
				<div className='space-y-3'>
					{Array.from({ length: 4 }).map((_, i) => (
						<div
							key={`skeleton-${i}`}
							className='h-8 rounded bg-muted motion-safe:animate-pulse'
						/>
					))}
				</div>
			) : (
				<div className='space-y-6'>
					<Form>
						{() => (
							<div className='grid grid-cols-2 gap-4 lg:grid-cols-3'>
								<Form.Field
									name='receiptNo'
									render={({ field }) => (
										<Form.Item>
											<Form.Label>Receipt No.</Form.Label>
											<Form.Control>
												<Form.Input
													{...field}
													value={(field.value as string) ?? ''}
													readOnly
													className='bg-muted'
												/>
											</Form.Control>
										</Form.Item>
									)}
								/>
								<Form.Field
									name='status'
									render={({ field }) => (
										<Form.Item>
											<Form.Label>Status</Form.Label>
											<Form.Control>
												<StatusBadge status={field.value as string} />
											</Form.Control>
										</Form.Item>
									)}
								/>
								<Form.Field
									name='customerId'
									render={({ field }) => (
										<Form.Item>
											<Form.Label>Customer ID</Form.Label>
											<Form.Control>
												<Form.Input
													{...field}
													value={(field.value as string) ?? ''}
													readOnly
													className='bg-muted'
												/>
											</Form.Control>
										</Form.Item>
									)}
								/>
								<Form.Field
									name='paymentMethod'
									render={({ field }) => (
										<Form.Item>
											<Form.Label>Payment Method</Form.Label>
											<Form.Control>
												<Form.Input
													{...field}
													value={(field.value as string) ?? ''}
													readOnly
													className='bg-muted'
												/>
											</Form.Control>
										</Form.Item>
									)}
								/>
								<Form.Field
									name='totalAmount'
									render={({ field }) => (
										<Form.Item>
											<Form.Label>Total Amount</Form.Label>
											<Form.Control>
												<Form.Input
													{...field}
													value={(field.value as number) ?? ''}
													readOnly
													className='bg-muted'
												/>
											</Form.Control>
										</Form.Item>
									)}
								/>
								<Form.Field
									name='taxAmount'
									render={({ field }) => (
										<Form.Item>
											<Form.Label>Tax Amount</Form.Label>
											<Form.Control>
												<Form.Input
													{...field}
													value={(field.value as number) ?? ''}
													readOnly
													className='bg-muted'
												/>
											</Form.Control>
										</Form.Item>
									)}
								/>
								<Form.Field
									name='discountAmount'
									render={({ field }) => (
										<Form.Item>
											<Form.Label>Discount Amount</Form.Label>
											<Form.Control>
												<Form.Input
													{...field}
													value={(field.value as number) ?? ''}
													readOnly
													className='bg-muted'
												/>
											</Form.Control>
										</Form.Item>
									)}
								/>
								<Form.Field
									name='paidAmount'
									render={({ field }) => (
										<Form.Item>
											<Form.Label>Paid Amount</Form.Label>
											<Form.Control>
												<Form.Input
													{...field}
													value={(field.value as number) ?? ''}
													readOnly
													className='bg-muted'
												/>
											</Form.Control>
										</Form.Item>
									)}
								/>
							</div>
						)}
					</Form>

					<div className='space-y-3'>
						<h3 className='font-medium text-sm'>Transaction Lines</h3>
						<LinesGrid variant='dense' height={320}>
							<LinesGrid.Columns>
								<LinesGrid.Column
									accessorKey='lineNo'
									title='Line No.'
									cellVariant='number'
								/>
								<LinesGrid.Column accessorKey='itemId' title='Item' />
								<LinesGrid.Column
									accessorKey='description'
									title='Description'
								/>
								<LinesGrid.Column
									accessorKey='quantity'
									title='Quantity'
									cellVariant='number'
								/>
								<LinesGrid.Column
									accessorKey='unitPrice'
									title='Unit Price'
									cellVariant='number'
								/>
								<LinesGrid.Column
									accessorKey='discountPercent'
									title='Discount %'
									cellVariant='number'
								/>
								<LinesGrid.Column
									accessorKey='lineAmount'
									title='Line Amount'
									cellVariant='number'
								/>
							</LinesGrid.Columns>
						</LinesGrid>
					</div>
				</div>
			)}
		</RecordDialog>
	)
}
