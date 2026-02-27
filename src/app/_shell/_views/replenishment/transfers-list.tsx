import { $rpc, useMutation, useQueryClient } from '@lib/rpc'
import { Ban, PackageCheck, Plus, Send, Truck } from 'lucide-react'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { useModuleData } from '../../hooks/use-data'
import { PageHeader } from '../_shared/page-header'
import {
	resolveSelectedIds,
	resolveSelectedRecords,
} from '../_shared/resolve-selected-ids'
import { StatusBadge } from '../_shared/status-badge'
import { useRecordSearchState } from '../_shared/use-record-search-state'
import { TransferCard } from './components/transfer-card'

interface Transfer {
	_id: string
	transferNo: string
	status: 'DRAFT' | 'RELEASED' | 'IN_TRANSIT' | 'RECEIVED' | 'CANCELED'
	fromLocationCode: string
	toLocationCode: string
	shipmentDate: string
	receiptDate: string
	lineCount: number
}

export default function TransfersList() {
	const { close, openCreate, openDetail, selectedId } = useRecordSearchState()
	const queryClient = useQueryClient()

	const { DataGrid, windowSize } = useModuleData<'replenishment', Transfer>(
		'replenishment',
		'transfers',
		'all',
	)

	const invalidate = React.useCallback(() => {
		void queryClient.invalidateQueries({
			queryKey: $rpc.replenishment.transfers.key(),
		})
	}, [queryClient])

	const transitionStatus = useMutation({
		...$rpc.replenishment.transfers.transitionStatus.mutationOptions({
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

	const handleEdit = React.useCallback(
		(row: Transfer) => {
			openDetail(row._id)
		},
		[openDetail],
	)
	const handleNew = openCreate

	if (selectedId !== null) {
		return (
			<div className='space-y-8 pb-8'>
				<TransferCard
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
				title='Transfers'
				description='Manage internal inventory movement between locations'
				actions={
					<Button
						size='sm'
						onClick={handleNew}
						className='shadow-sm transition-all hover:shadow-md'
					>
						<Plus className='mr-1.5 size-4' aria-hidden='true' />
						New Transfer
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
						<DataGrid.Column<Transfer>
							accessorKey='transferNo'
							title='Transfer No.'
							handleEdit={handleEdit}
						/>
						<DataGrid.Column<Transfer>
							accessorKey='status'
							title='Status'
							cell={({ row }) => <StatusBadge status={row.original.status} />}
						/>
						<DataGrid.Column<Transfer>
							accessorKey='fromLocationCode'
							title='From Location'
						/>
						<DataGrid.Column<Transfer>
							accessorKey='toLocationCode'
							title='To Location'
						/>
						<DataGrid.Column<Transfer>
							accessorKey='shipmentDate'
							title='Shipment Date'
							cellVariant='date'
							formatter={(v, f) => f.date(v.shipmentDate, { format: 'P' })}
						/>
						<DataGrid.Column<Transfer>
							accessorKey='receiptDate'
							title='Receipt Date'
							cellVariant='date'
							formatter={(v, f) => f.date(v.receiptDate, { format: 'P' })}
						/>
						<DataGrid.Column<Transfer>
							accessorKey='lineCount'
							title='Lines'
							cellVariant='number'
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
								const isBusy = transitionStatus.isPending
								const allDraft = records.every((r) => r.status === 'DRAFT')
								const allReleased = records.every(
									(r) => r.status === 'RELEASED',
								)
								const allInTransit = records.every(
									(r) => r.status === 'IN_TRANSIT',
								)

								return (
									<>
										<DataGrid.ActionBar.Item
											disabled={!hasSelection || isBusy || !allDraft}
											onClick={() => {
												void handleBulkTransition(ids, 'RELEASED')
											}}
										>
											<Send className='size-3.5' aria-hidden='true' />
											Release
										</DataGrid.ActionBar.Item>
										<DataGrid.ActionBar.Item
											disabled={!hasSelection || isBusy || !allReleased}
											onClick={() => {
												void handleBulkTransition(ids, 'IN_TRANSIT')
											}}
										>
											<Truck className='size-3.5' aria-hidden='true' />
											Ship
										</DataGrid.ActionBar.Item>
										<DataGrid.ActionBar.Item
											disabled={!hasSelection || isBusy || !allInTransit}
											onClick={() => {
												void handleBulkTransition(ids, 'RECEIVED')
											}}
										>
											<PackageCheck className='size-3.5' aria-hidden='true' />
											Receive
										</DataGrid.ActionBar.Item>
										<DataGrid.ActionBar.Item
											disabled={!hasSelection || isBusy || !allDraft}
											onClick={() => {
												void handleBulkTransition(ids, 'CANCELED')
											}}
										>
											<Ban className='size-3.5' aria-hidden='true' />
											Cancel
										</DataGrid.ActionBar.Item>
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
