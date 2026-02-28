import { $rpc, useMutation, useQueryClient } from '@lib/rpc'
import { AlertTriangle, PackageCheck, Plus, Truck } from 'lucide-react'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { useModuleData } from '../../hooks/use-data'
import { PageHeader } from '../_shared/page-header'
import {
	resolveSelectedIds,
	resolveSelectedRecords,
} from '../_shared/resolve-selected-ids'
import { ReportActionItems } from '../_shared/report-action-items'
import { StatusBadge } from '../_shared/status-badge'
import { useRecordSearchState } from '../_shared/use-record-search-state'
import { ShipmentCard } from './components/shipment-card'

interface Shipment {
	_id: string
	shipmentNo: string
	status: 'PLANNED' | 'DISPATCHED' | 'IN_TRANSIT' | 'DELIVERED' | 'EXCEPTION'
	sourceDocumentType: string
	sourceDocumentNo: string
	shipmentMethodCode: string
	priority: 'LOW' | 'NORMAL' | 'HIGH' | 'EXPRESS'
	plannedDispatchDate: string
	plannedDeliveryDate: string
	actualDispatchDate: string
	actualDeliveryDate: string
	courierName: string
	trackingNo: string
	lineCount: number
}

export default function ShipmentsList() {
	const { close, openCreate, openDetail, selectedId } = useRecordSearchState()
	const queryClient = useQueryClient()

	const { DataGrid, windowSize } = useModuleData<'trace', Shipment>(
		'trace',
		'shipments',
		'all',
	)

	const invalidate = React.useCallback(() => {
		void queryClient.invalidateQueries({
			queryKey: $rpc.trace.shipments.key(),
		})
	}, [queryClient])

	const transitionWithNotification = useMutation({
		...$rpc.trace.shipments.transitionWithNotification.mutationOptions({
			onSuccess: invalidate,
		}),
	})

	const handleBulkTransition = React.useCallback(
		async (
			ids: string[],
			toStatus: 'DISPATCHED' | 'IN_TRANSIT' | 'DELIVERED' | 'EXCEPTION',
		) => {
			for (const id of ids) {
				await transitionWithNotification.mutateAsync({ id, toStatus })
			}
		},
		[transitionWithNotification],
	)

	const handleEdit = React.useCallback(
		(row: Shipment) => {
			openDetail(row._id)
		},
		[openDetail],
	)

	const handleNew = openCreate

	if (selectedId !== null) {
		return (
			<div className='space-y-8 pb-8'>
				<ShipmentCard
					selectedId={selectedId}
					onClose={close}
					presentation='page'
				/>
			</div>
		)
	}

	return (
		<div className='space-y-8 pb-8'>
			<PageHeader
				title='Shipments'
				description='Track and manage shipment records and delivery status'
				actions={
					<Button
						size='sm'
						onClick={handleNew}
						className='shadow-sm transition-all hover:shadow-md'
					>
						<Plus className='mr-1.5 size-3.5' aria-hidden='true' />
						New Shipment
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
						<DataGrid.Column
							accessorKey='shipmentNo'
							title='Shipment No.'
							handleEdit={handleEdit}
						/>
						<DataGrid.Column
							accessorKey='status'
							title='Status'
							cell={({ row }) => <StatusBadge status={row.original.status} />}
						/>
						<DataGrid.Column
							accessorKey='sourceDocumentType'
							title='Source Doc. Type'
						/>
						<DataGrid.Column
							accessorKey='sourceDocumentNo'
							title='Source Doc. No.'
						/>
						<DataGrid.Column
							accessorKey='shipmentMethodCode'
							title='Shipment Method'
						/>
						<DataGrid.Column
							accessorKey='priority'
							title='Priority'
							cell={({ row }) => <StatusBadge status={row.original.priority} />}
						/>
						<DataGrid.Column
							accessorKey='plannedDispatchDate'
							title='Planned Dispatch'
							cellVariant='date'
							formatter={(v, f) =>
								f.date(v.plannedDispatchDate, { format: 'P' })
							}
						/>
						<DataGrid.Column
							accessorKey='plannedDeliveryDate'
							title='Planned Delivery'
							cellVariant='date'
							formatter={(v, f) =>
								f.date(v.plannedDeliveryDate, { format: 'P' })
							}
						/>
						<DataGrid.Column
							accessorKey='actualDeliveryDate'
							title='Actual Delivery'
							cellVariant='date'
							formatter={(v, f) =>
								f.date(v.actualDeliveryDate, { format: 'P' })
							}
						/>
						<DataGrid.Column accessorKey='courierName' title='Courier' />
						<DataGrid.Column accessorKey='trackingNo' title='Tracking No.' />
						<DataGrid.Column
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
								const isBusy = transitionWithNotification.isPending
								const allPlanned = records.every((r) => r.status === 'PLANNED')
								const allInTransit = records.every(
									(r) => r.status === 'IN_TRANSIT',
								)
								const allNotDelivered = records.every(
									(r) => r.status !== 'DELIVERED',
								)

								return (
									<>
										<DataGrid.ActionBar.Item
											disabled={!hasSelection || isBusy || !allPlanned}
											onClick={() => {
												void handleBulkTransition(ids, 'DISPATCHED')
											}}
										>
											<Truck className='size-3.5' aria-hidden='true' />
											Dispatch
										</DataGrid.ActionBar.Item>
										<DataGrid.ActionBar.Item
											disabled={!hasSelection || isBusy || !allInTransit}
											onClick={() => {
												void handleBulkTransition(ids, 'DELIVERED')
											}}
										>
											<PackageCheck className='size-3.5' aria-hidden='true' />
											Mark Delivered
										</DataGrid.ActionBar.Item>
										<DataGrid.ActionBar.Item
											disabled={!hasSelection || isBusy || !allNotDelivered}
											onClick={() => {
												void handleBulkTransition(ids, 'EXCEPTION')
											}}
										>
											<AlertTriangle className='size-3.5' aria-hidden='true' />
											Flag Exception
										</DataGrid.ActionBar.Item>
										<ReportActionItems
											table={table}
											selectionState={state.selectionState}
											moduleId="trace"
											entityId="shipments"
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
