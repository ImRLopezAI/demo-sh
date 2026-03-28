import { $rpc, useMutation, useQueryClient } from '@lib/rpc'
import { Plus } from 'lucide-react'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { useModuleData } from '../../hooks/use-data'
import { PageHeader } from '../_shared/page-header'
import { ReportActionItems } from '../_shared/report-action-items'
import { resolveSelectedIds } from '../_shared/resolve-selected-ids'
import { SpecBulkActionItems } from '../_shared/spec-bulk-actions'
import { extractSpecCardProps } from '../_shared/spec-card-helpers'
import {
	renderSpecColumns,
	type SpecListProps,
	useSpecFilters,
} from '../_shared/spec-list-helpers'
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

interface ShipmentsListProps {
	specProps?: SpecListProps
}

export default function ShipmentsList({ specProps }: ShipmentsListProps = {}) {
	const { close, openCreate, openDetail, selectedId } = useRecordSearchState()
	const queryClient = useQueryClient()

	const specFilters = useSpecFilters(specProps)
	const specCardProps = extractSpecCardProps(specProps)

	const { DataGrid, windowSize } = useModuleData<'trace', Shipment>(
		'trace',
		'shipments',
		'all',
		{ filters: specFilters },
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
		async (ids: string[], toStatus: string) => {
			for (const id of ids) {
				await transitionWithNotification.mutateAsync({
					id,
					toStatus: toStatus as
						| 'DISPATCHED'
						| 'IN_TRANSIT'
						| 'DELIVERED'
						| 'EXCEPTION',
				})
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
					specCardProps={specCardProps}
					presentation='page'
				/>
			</div>
		)
	}

	return (
		<div className='space-y-8 pb-8'>
			<PageHeader
				title={specProps?.title ?? 'Shipments'}
				description={
					specProps?.description ??
					'Track and manage shipment records and delivery status'
				}
				actions={
					specProps?.enableNew !== false ? (
						<Button
							size='sm'
							onClick={handleNew}
							className='shadow-sm transition-all hover:shadow-md'
						>
							<Plus className='mr-1.5 size-3.5' aria-hidden='true' />
							{specProps?.newLabel ?? 'New Shipment'}
						</Button>
					) : undefined
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
							renderSpecColumns<Shipment>(
								DataGrid.Column,
								specProps.columns,
								handleEdit,
							)
						) : (
							<>
								<DataGrid.Column
									accessorKey='shipmentNo'
									title='Shipment No.'
									handleEdit={handleEdit}
								/>
								<DataGrid.Column
									accessorKey='status'
									title='Status'
									cell={({ row }) => (
										<StatusBadge status={row.original.status} />
									)}
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
									cell={({ row }) => (
										<StatusBadge status={row.original.priority} />
									)}
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
								<DataGrid.Column
									accessorKey='trackingNo'
									title='Tracking No.'
								/>
								<DataGrid.Column
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
							{(table, state) => (
								<SpecBulkActionItems
									specBulkActions={specProps?.bulkActions}
									table={table}
									selectionState={state.selectionState}
									onTransition={handleBulkTransition}
									isBusy={transitionWithNotification.isPending}
								>
									<ReportActionItems
										table={table}
										selectionState={state.selectionState}
										moduleId='trace'
										entityId='shipments'
										isBusy={transitionWithNotification.isPending}
									/>
								</SpecBulkActionItems>
							)}
						</DataGrid.ActionBar.Group>
					</DataGrid.ActionBar>
				</DataGrid>
			</div>
		</div>
	)
}
