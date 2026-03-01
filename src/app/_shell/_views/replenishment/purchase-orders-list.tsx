import { $rpc, useMutation, useQueryClient } from '@lib/rpc'
import { Ban, CheckCircle, Package, Plus } from 'lucide-react'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { useModuleData } from '../../hooks/use-data'
import { PageHeader } from '../_shared/page-header'
import { ReportActionItems } from '../_shared/report-action-items'
import {
	resolveSelectedIds,
	resolveSelectedRecords,
} from '../_shared/resolve-selected-ids'
import { StatusBadge } from '../_shared/status-badge'
import { useRecordSearchState } from '../_shared/use-record-search-state'
import { PurchaseOrderCard } from './components/purchase-order-card'

interface PurchaseOrder {
	_id: string
	documentNo: string
	documentType: 'ORDER' | 'RETURN_ORDER' | 'QUOTE'
	status:
		| 'DRAFT'
		| 'PENDING_APPROVAL'
		| 'APPROVED'
		| 'REJECTED'
		| 'COMPLETED'
		| 'CANCELED'
	vendorId: string
	vendorName: string
	orderDate: string
	expectedReceiptDate: string
	currency: string
	lineCount: number
	totalAmount: number
}

export default function PurchaseOrdersList() {
	const { close, openCreate, openDetail, selectedId } = useRecordSearchState()
	const queryClient = useQueryClient()

	const { DataGrid, windowSize } = useModuleData<
		'replenishment',
		PurchaseOrder
	>('replenishment', 'purchaseOrders', 'all')

	const invalidate = React.useCallback(() => {
		void queryClient.invalidateQueries({
			queryKey: $rpc.replenishment.purchaseOrders.key(),
		})
	}, [queryClient])

	const transitionStatus = useMutation({
		...$rpc.replenishment.purchaseOrders.transitionStatus.mutationOptions({
			onSuccess: invalidate,
		}),
	})

	const receivePO = useMutation({
		...$rpc.replenishment.purchaseOrders.receive.mutationOptions({
			onSuccess: invalidate,
		}),
	})

	const handleBulkTransition = React.useCallback(
		async (ids: string[], toStatus: string) => {
			for (const id of ids) {
				await transitionStatus.mutateAsync({ id, toStatus })
			}
		},
		[transitionStatus],
	)

	const handleBulkReceive = React.useCallback(
		async (ids: string[]) => {
			for (const id of ids) {
				await receivePO.mutateAsync({ purchaseOrderId: id })
			}
		},
		[receivePO],
	)

	const handleEdit = React.useCallback(
		(row: PurchaseOrder) => {
			openDetail(row._id)
		},
		[openDetail],
	)
	const handleNew = openCreate

	if (selectedId !== null) {
		return (
			<div className='space-y-8 pb-8'>
				<PurchaseOrderCard
					recordId={selectedId}
					onClose={close}
					onCreated={openDetail}
					presentation='page'
				/>
			</div>
		)
	}

	return (
		<div className='space-y-8 pb-8'>
			<PageHeader
				title='Purchase Orders'
				description='Manage vendor orders, quotes, and returns'
				actions={
					<Button
						size='sm'
						onClick={handleNew}
						data-testid='purchase-order-new-button'
						className='shadow-sm transition-all hover:shadow-md'
					>
						<Plus className='mr-1.5 size-4' aria-hidden='true' />
						New Order
					</Button>
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
						<DataGrid.Column<PurchaseOrder>
							accessorKey='documentNo'
							title='Document No.'
							handleEdit={handleEdit}
						/>
						<DataGrid.Column<PurchaseOrder>
							accessorKey='documentType'
							title='Type'
							cellVariant='select'
						/>
						<DataGrid.Column<PurchaseOrder>
							accessorKey='status'
							title='Status'
							cell={({ row }) => <StatusBadge status={row.original.status} />}
						/>
						<DataGrid.Column<PurchaseOrder>
							accessorKey='vendorName'
							title='Vendor'
						/>
						<DataGrid.Column<PurchaseOrder>
							accessorKey='orderDate'
							title='Order Date'
							cellVariant='date'
							formatter={(v, f) => f.date(v.orderDate, { format: 'P' })}
						/>
						<DataGrid.Column<PurchaseOrder>
							accessorKey='expectedReceiptDate'
							title='Expected Receipt'
							cellVariant='date'
							formatter={(v, f) =>
								f.date(v.expectedReceiptDate, { format: 'P' })
							}
						/>
						<DataGrid.Column<PurchaseOrder>
							accessorKey='currency'
							title='Currency'
						/>
						<DataGrid.Column<PurchaseOrder>
							accessorKey='lineCount'
							title='Lines'
							cellVariant='number'
						/>
						<DataGrid.Column<PurchaseOrder>
							accessorKey='totalAmount'
							title='Total Amount'
							cellVariant='number'
							formatter={(v, f) => f.currency(v.totalAmount)}
						/>
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
								const isBusy = transitionStatus.isPending || receivePO.isPending
								const allPending = records.every(
									(r) => r.status === 'PENDING_APPROVAL',
								)
								const allApproved = records.every(
									(r) => r.status === 'APPROVED',
								)
								const allCancellable = records.every(
									(r) =>
										r.status === 'DRAFT' || r.status === 'PENDING_APPROVAL',
								)

								return (
									<>
										<DataGrid.ActionBar.Item
											disabled={!hasSelection || isBusy || !allPending}
											onClick={() => {
												void handleBulkTransition(ids, 'APPROVED')
											}}
										>
											<CheckCircle className='size-3.5' aria-hidden='true' />
											Approve
										</DataGrid.ActionBar.Item>
										<DataGrid.ActionBar.Item
											disabled={!hasSelection || isBusy || !allApproved}
											onClick={() => {
												void handleBulkReceive(ids)
											}}
										>
											<Package className='size-3.5' aria-hidden='true' />
											Receive
										</DataGrid.ActionBar.Item>
										<DataGrid.ActionBar.Item
											disabled={!hasSelection || isBusy || !allCancellable}
											onClick={() => {
												void handleBulkTransition(ids, 'CANCELED')
											}}
										>
											<Ban className='size-3.5' aria-hidden='true' />
											Cancel
										</DataGrid.ActionBar.Item>
										<ReportActionItems
											table={table}
											selectionState={state.selectionState}
											moduleId='replenishment'
											entityId='purchaseOrders'
											isBusy={isBusy}
										/>
									</>
								)
							}}
						</DataGrid.ActionBar.Group>
					</DataGrid.ActionBar>
				</DataGrid>
			</div>
		</div>
	)
}
