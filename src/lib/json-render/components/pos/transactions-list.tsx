import { $rpc, useMutation, useQueryClient } from '@lib/rpc'
import { Ban, Printer, RotateCcw } from 'lucide-react'
import * as React from 'react'
import { toast } from 'sonner'
import { downloadBinaryPayload } from '@/lib/download-file'
import { useModuleData } from '@/app/_shell/hooks/use-data'
import { PageHeader } from '@/components/ui/json-render/dashboard-sections'
import { ReportActionItems } from '@/lib/json-render/components/report-action-items'
import {
	resolveSelectedIds,
	resolveSelectedRecords,
} from '@/lib/json-render/components/resolve-selected-ids'
import { SpecBulkActionItems } from '@/lib/json-render/components/spec-bulk-actions'
import { extractSpecCardProps } from '@/lib/json-render/components/spec-card-helpers'
import {
	renderSpecColumns,
	type SpecListProps,
	useSpecFilters,
} from '@/lib/json-render/components/spec-list-helpers'
import { StatusBadge } from '@/components/ui/json-render/status-badge'
import { useRecordSearchState } from '@/lib/json-render/components/use-record-search-state'
import { TransactionCard } from './transaction-card'

interface PosTransaction {
	_id: string
	receiptNo: string
	posSessionId: string
	status: 'OPEN' | 'COMPLETED' | 'VOIDED' | 'REFUNDED'
	customerId: string
	customerName: string
	totalAmount: number
	taxAmount: number
	discountAmount: number
	paidAmount: number
	paymentMethod: 'CASH' | 'CARD' | 'MOBILE' | 'MIXED'
	transactionAt: string
	lineCount: number
}

interface TransactionsListProps {
	specProps?: SpecListProps
}

export default function TransactionsList({
	specProps,
}: TransactionsListProps = {}) {
	const { close, openDetail, selectedId } = useRecordSearchState()
	const queryClient = useQueryClient()

	const specFilters = useSpecFilters(specProps)
	const specCardProps = extractSpecCardProps(specProps)

	const { DataGrid, windowSize } = useModuleData<'pos', PosTransaction>(
		'pos',
		'transactions',
		'all',
		{ filters: specFilters },
	)

	const invalidate = React.useCallback(() => {
		void queryClient.invalidateQueries({
			queryKey: $rpc.pos.transactions.key(),
		})
	}, [queryClient])

	const transitionStatus = useMutation({
		...$rpc.pos.transactions.transitionStatus.mutationOptions({
			onSuccess: invalidate,
		}),
	})
	const generateReceipt = useMutation(
		$rpc.pos.transactions.generateReceipt.mutationOptions(),
	)

	const handleBulkTransition = React.useCallback(
		async (ids: string[], toStatus: string) => {
			for (const id of ids) {
				await transitionStatus.mutateAsync({ id, toStatus })
			}
		},
		[transitionStatus],
	)

	const handleEdit = React.useCallback(
		(row: PosTransaction) => {
			openDetail(row._id)
		},
		[openDetail],
	)

	const handleBulkReprintReceipt = React.useCallback(
		async (records: PosTransaction[]) => {
			let successCount = 0
			for (const record of records) {
				const receipt = await generateReceipt.mutateAsync({
					transactionId: record._id,
					builtInLayout: 'THERMAL_RECEIPT',
				})
				await downloadBinaryPayload(receipt, `ticket-${record.receiptNo}.pdf`)
				successCount += 1
			}
			if (successCount > 0) {
				toast.success(
					`${successCount} receipt${successCount === 1 ? '' : 's'} downloaded`,
				)
			}
		},
		[generateReceipt],
	)

	if (selectedId !== null) {
		return (
			<div className='space-y-8 pb-8'>
				<TransactionCard
					selectedId={selectedId}
					onClose={close}
					specCardProps={specCardProps}
					presentation='page'
				/>
			</div>
		)
	}

	return (
		<div className='space-y-8 pb-8'>
			<PageHeader
				title={specProps?.title ?? 'Transactions'}
				description={
					specProps?.description ?? 'View POS transaction history and details.'
				}
			/>

			<div className='overflow-hidden rounded-xl border border-border/50 bg-background/50 shadow-sm backdrop-blur-xl'>
				<DataGrid
					variant='flat'
					height={Math.max(windowSize.height - 150, 400)}
					withSelect
				>
					<DataGrid.Header className='border-border/50 border-b bg-muted/20 px-6 py-4'>
						<DataGrid.Toolbar filter sort search export />
					</DataGrid.Header>
					<DataGrid.Columns>
						{specProps?.columns ? (
							renderSpecColumns<PosTransaction>(
								DataGrid.Column as unknown as React.ComponentType<{
							accessorKey: string
							title: string
							cellVariant?: string
							handleEdit?: ((row: any) => void) | undefined
							[key: string]: unknown
						}>,
								specProps.columns,
								handleEdit,
							)
						) : (
							<>
								<DataGrid.Column<PosTransaction>
									accessorKey='receiptNo'
									title='Receipt No.'
									handleEdit={handleEdit}
								/>
								<DataGrid.Column<PosTransaction>
									accessorKey='status'
									title='Status'
									cell={({ row }) => (
										<StatusBadge status={row.original.status} />
									)}
								/>
								<DataGrid.Column<PosTransaction>
									accessorKey='customerName'
									title='Customer'
								/>
								<DataGrid.Column<PosTransaction>
									accessorKey='totalAmount'
									title='Total'
									cellVariant='number'
									formatter={(v, f) => f.currency(v.totalAmount)}
								/>
								<DataGrid.Column<PosTransaction>
									accessorKey='taxAmount'
									title='Tax'
									cellVariant='number'
									formatter={(v, f) => f.currency(v.taxAmount)}
								/>
								<DataGrid.Column<PosTransaction>
									accessorKey='discountAmount'
									title='Discount'
									cellVariant='number'
									formatter={(v, f) => f.currency(v.discountAmount)}
								/>
								<DataGrid.Column<PosTransaction>
									accessorKey='paidAmount'
									title='Paid'
									cellVariant='number'
									formatter={(v, f) => f.currency(v.paidAmount)}
								/>
								<DataGrid.Column<PosTransaction>
									accessorKey='paymentMethod'
									title='Payment'
									cellVariant='select'
									opts={{
										options: [
											{ label: 'Cash', value: 'CASH' },
											{ label: 'Card', value: 'CARD' },
											{ label: 'Mobile', value: 'MOBILE' },
											{ label: 'Mixed', value: 'MIXED' },
										],
									}}
								/>
								<DataGrid.Column<PosTransaction>
									accessorKey='transactionAt'
									title='Date'
									cellVariant='date'
									formatter={(v, f) =>
										f.date(v.transactionAt, { format: 'Pp' })
									}
								/>
								<DataGrid.Column<PosTransaction>
									accessorKey='lineCount'
									title='Lines'
									cellVariant='number'
								/>
							</>
						)}
					</DataGrid.Columns>
					<DataGrid.ActionBar>
						<DataGrid.ActionBar.Selection>
							{(table, state) => (
								<span>
									{resolveSelectedIds(table, state.selectionState).length}{' '}
									selected
								</span>
							)}
						</DataGrid.ActionBar.Selection>
						<DataGrid.ActionBar.Separator />
						<DataGrid.ActionBar.Group>
							{(table, state) => {
								const records = resolveSelectedRecords(
									table,
									state.selectionState,
								)
								const ids = records.map((r) => r._id)
								const hasSelection = ids.length > 0
								const isBusy =
									transitionStatus.isPending || generateReceipt.isPending
								const allOpen = records.every((r) => r.status === 'OPEN')
								const allCompleted = records.every(
									(r) => r.status === 'COMPLETED',
								)

								return (
									<SpecBulkActionItems
										specBulkActions={specProps?.bulkActions}
										table={table}
										selectionState={state.selectionState}
										onTransition={handleBulkTransition}
										isBusy={isBusy}
									>
										<DataGrid.ActionBar.Item
											disabled={!hasSelection || isBusy || !allOpen}
											onClick={() => {
												void handleBulkTransition(ids, 'VOIDED')
											}}
										>
											<Ban className='size-3.5' aria-hidden='true' />
											Void
										</DataGrid.ActionBar.Item>
										<DataGrid.ActionBar.Item
											disabled={!hasSelection || isBusy || !allCompleted}
											onClick={() => {
												void handleBulkTransition(ids, 'REFUNDED')
											}}
										>
											<RotateCcw className='size-3.5' aria-hidden='true' />
											Refund
										</DataGrid.ActionBar.Item>
										<DataGrid.ActionBar.Item
											disabled={!hasSelection || isBusy}
											onClick={() => {
												void handleBulkReprintReceipt(records).catch(
													(error) => {
														toast.error('Receipt download failed', {
															description:
																error instanceof Error
																	? error.message
																	: 'Unable to download selected receipts',
														})
													},
												)
											}}
										>
											<Printer className='size-3.5' aria-hidden='true' />
											Reprint
										</DataGrid.ActionBar.Item>
										<ReportActionItems
											table={table}
											selectionState={state.selectionState}
											moduleId='pos'
											entityId='transactions'
											isBusy={isBusy}
										/>
									</SpecBulkActionItems>
								)
							}}
						</DataGrid.ActionBar.Group>
					</DataGrid.ActionBar>
				</DataGrid>
			</div>
		</div>
	)
}
