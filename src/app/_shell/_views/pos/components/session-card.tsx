import * as React from 'react'
import { useGrid } from '@/components/data-grid/compound'
import { useCreateForm } from '@/components/ui/form'
import { useRecordReportGroup } from '@/hooks/use-record-report-group'
import { useModuleData, useModuleList } from '../../../hooks/use-data'
import { FormSection } from '../../_shared/form-section'
import {
	RecordDialog,
	type RecordDialogActionGroup,
} from '../../_shared/record-dialog'
import { StatusBadge } from '../../_shared/status-badge'
import { useEntityRecord } from '../../_shared/use-entity'

interface PosSessionRecord {
	_id: string
	sessionNo: string
	terminalId: string
	cashierId: string
	status: 'OPEN' | 'PAUSED' | 'CLOSED'
	openedAt: string
	closedAt: string
	openingBalance: number
	closingBalance: number
	transactionCount: number
	totalSales: number
}

interface SessionTransaction {
	_id: string
	receiptNo: string
	posSessionId: string
	status: string
	customerId: string
	totalAmount: number
	paymentMethod: string
	transactionAt: string
}

export function SessionCard({
	selectedId,
	onClose,
	presentation = 'dialog',
}: {
	selectedId: string | null
	onClose: () => void
	presentation?: 'dialog' | 'page'
}) {
	const isOpen = selectedId !== null

	const { data: record, isLoading: recordLoading } = useEntityRecord(
		'pos',
		'sessions',
		selectedId,
		{ enabled: isOpen },
	)

	const { items: allTransactions, isLoading: txnLoading } = useModuleData<
		'pos',
		SessionTransaction
	>('pos', 'transactions', 'overview')

	const { data: terminalsList } = useModuleList('pos', 'terminals', {
		limit: 100,
	})

	const sessionTransactions = React.useMemo(
		() =>
			selectedId
				? allTransactions.filter((t) => t.posSessionId === selectedId)
				: [],
		[allTransactions, selectedId],
	)

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

	const TxnGrid = useGrid(
		() => ({
			data: sessionTransactions,
			isLoading: txnLoading,
			readOnly: true,
			enableSearch: false,
		}),
		[sessionTransactions, txnLoading],
	)

	const resolvedRecord = record as PosSessionRecord | undefined

	const reportGroup = useRecordReportGroup({
		moduleId: 'pos',
		entityId: 'sessions',
		recordId: selectedId,
		isNew: false,
	})

	const actionGroups = React.useMemo<RecordDialogActionGroup[]>(() => {
		if (!selectedId) return []
		const sessionStatus = resolvedRecord?.status ?? 'OPEN'
		return [
			{
				label: 'Actions',
				items: [
					{
						label: 'Close Session',
						onClick: () => {
							/* TODO: implement navigation */
						},
						disabled: sessionStatus === 'CLOSED',
						variant: 'destructive',
					},
					{
						label: 'Print Z-Report',
						onClick: () => {
							/* TODO: implement navigation */
						},
					},
				],
			},
			{
				label: 'Related',
				items: [
					{
						label: 'Terminal',
						onClick: () => {
							/* TODO: implement navigation */
						},
					},
					{
						label: 'Cashier',
						onClick: () => {
							/* TODO: implement navigation */
						},
					},
				],
			},
			{
				label: 'Navigate',
				items: [
					{
						label: 'Transactions',
						onClick: () => {
							/* TODO: implement navigation */
						},
					},
				],
			},
			...(reportGroup ? [reportGroup] : []),
		]
	}, [selectedId, resolvedRecord?.status, reportGroup])

	return (
		<RecordDialog
			open={isOpen}
			onOpenChange={(open) => !open && onClose()}
			presentation={presentation}
			actionGroups={actionGroups}
			title={`Session ${resolvedRecord?.sessionNo ?? ''}`}
			description='POS session details and transactions'
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
				<div className='space-y-8 pt-1'>
					<FormSection title='General'>
						<Form>
							{() => (
								<div className='grid grid-cols-2 gap-4 lg:grid-cols-3'>
									<Form.Field
										name='sessionNo'
										render={({ field }) => (
											<Form.Item>
												<Form.Label>Session No.</Form.Label>
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
										name='terminalId'
										render={({ field }) => (
											<Form.Item>
												<Form.Label>Terminal</Form.Label>
												<Form.Control>
													<Form.Combo
														value={field.value as string}
														onValueChange={field.onChange}
														itemToStringLabel={(id: string) => {
															const term = (terminalsList?.items ?? []).find(
																(t: Record<string, unknown>) => t._id === id,
															) as Record<string, unknown> | undefined
															return term
																? `${term.terminalCode as string} - ${term.name as string}`
																: id
														}}
													>
														<Form.Combo.Input
															showClear
															placeholder='Search terminals\u2026'
														/>
														<Form.Combo.Content>
															<Form.Combo.List>
																{(terminalsList?.items ?? []).map(
																	(t: Record<string, unknown>) => (
																		<Form.Combo.Item
																			key={t._id as string}
																			value={t._id as string}
																		>
																			{t.terminalCode as string} -{' '}
																			{t.name as string}
																		</Form.Combo.Item>
																	),
																)}
																<Form.Combo.Empty>
																	No terminals found
																</Form.Combo.Empty>
															</Form.Combo.List>
														</Form.Combo.Content>
													</Form.Combo>
												</Form.Control>
											</Form.Item>
										)}
									/>
									<Form.Field
										name='cashierId'
										render={({ field }) => (
											<Form.Item>
												<Form.Label>Cashier</Form.Label>
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
										name='openedAt'
										render={({ field }) => (
											<Form.Item>
												<Form.Label>Opened At</Form.Label>
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
										name='closedAt'
										render={({ field }) => (
											<Form.Item>
												<Form.Label>Closed At</Form.Label>
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
										name='openingBalance'
										render={({ field }) => (
											<Form.Item>
												<Form.Label>Opening Balance</Form.Label>
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
										name='closingBalance'
										render={({ field }) => (
											<Form.Item>
												<Form.Label>Closing Balance</Form.Label>
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
					</FormSection>

					<FormSection title='Transactions'>
						<div className='space-y-3'>
							{sessionTransactions.length === 0 && !txnLoading ? (
								<p className='text-muted-foreground text-sm'>
									No transactions found for this session.
								</p>
							) : (
								<TxnGrid variant='compact' height={300}>
									<TxnGrid.Columns>
										<TxnGrid.Column
											accessorKey='receiptNo'
											title='Receipt No.'
										/>
										<TxnGrid.Column
											accessorKey='status'
											title='Status'
											cell={({ row }) => (
												<StatusBadge status={row.original.status} />
											)}
										/>
										<TxnGrid.Column accessorKey='customerId' title='Customer' />
										<TxnGrid.Column
											accessorKey='totalAmount'
											title='Total Amount'
											cellVariant='number'
										/>
										<TxnGrid.Column
											accessorKey='paymentMethod'
											title='Payment Method'
										/>
										<TxnGrid.Column
											accessorKey='transactionAt'
											title='Date'
											cellVariant='date'
										/>
									</TxnGrid.Columns>
								</TxnGrid>
							)}
						</div>
					</FormSection>
				</div>
			)}
		</RecordDialog>
	)
}
