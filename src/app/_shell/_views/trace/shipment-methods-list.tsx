import { $rpc, useMutation, useQueryClient } from '@lib/rpc'
import { CheckCircle, Plus, XCircle } from 'lucide-react'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { useModuleData } from '../../hooks/use-data'
import { PageHeader } from '../_shared/page-header'
import { ReportActionItems } from '../_shared/report-action-items'
import {
	resolveSelectedIds,
	resolveSelectedRecords,
} from '../_shared/resolve-selected-ids'
import { SpecBulkActionItems } from '../_shared/spec-bulk-actions'
import { extractSpecCardProps } from '../_shared/spec-card-helpers'
import {
	renderSpecColumns,
	type SpecListProps,
} from '../_shared/spec-list-helpers'
import { useRecordSearchState } from '../_shared/use-record-search-state'
import { ShipmentMethodCard } from './components/shipment-method-card'

interface ShipmentMethod {
	_id: string
	code: string
	description: string
	active: boolean
}

interface ShipmentMethodsListProps {
	specProps?: SpecListProps
}

export default function ShipmentMethodsList({
	specProps,
}: ShipmentMethodsListProps = {}) {
	const { close, openCreate, openDetail, selectedId } = useRecordSearchState()
	const queryClient = useQueryClient()
	const specCardProps = extractSpecCardProps(specProps)
	const { DataGrid, windowSize } = useModuleData<'trace', ShipmentMethod>(
		'trace',
		'shipmentMethods',
		'all',
	)

	const invalidate = React.useCallback(() => {
		void queryClient.invalidateQueries({
			queryKey: $rpc.trace.shipmentMethods.key(),
		})
	}, [queryClient])

	const updateMethod = useMutation({
		...$rpc.trace.shipmentMethods.update.mutationOptions({
			onSuccess: invalidate,
		}),
	})

	const handleBulkActive = React.useCallback(
		async (ids: string[], active: boolean) => {
			for (const id of ids) {
				await updateMethod.mutateAsync({ id, data: { active } })
			}
		},
		[updateMethod],
	)

	const handleBulkTransition = React.useCallback(
		async (ids: string[], toStatus: string) => {
			const active = toStatus === 'ACTIVE'
			await handleBulkActive(ids, active)
		},
		[handleBulkActive],
	)

	const handleEdit = React.useCallback(
		(row: ShipmentMethod) => openDetail(row._id),
		[openDetail],
	)

	if (selectedId !== null) {
		return (
			<div className='space-y-8 pb-8'>
				<ShipmentMethodCard
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
				title={specProps?.title ?? 'Shipment Methods'}
				description={
					specProps?.description ??
					'Available shipment methods and carrier configurations'
				}
				actions={
					specProps?.enableNew !== false ? (
						<Button
							size='sm'
							onClick={openCreate}
							className='shadow-sm transition-all hover:shadow-md'
						>
							<Plus className='mr-1.5 size-4' aria-hidden='true' />
							{specProps?.newLabel ?? 'New Method'}
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
							renderSpecColumns<ShipmentMethod>(
								DataGrid.Column,
								specProps.columns,
								handleEdit,
							)
						) : (
							<>
								<DataGrid.Column<ShipmentMethod>
									accessorKey='code'
									title='Code'
									handleEdit={handleEdit}
								/>
								<DataGrid.Column<ShipmentMethod>
									accessorKey='description'
									title='Description'
								/>
								<DataGrid.Column<ShipmentMethod>
									accessorKey='active'
									title='Active'
									cellVariant='checkbox'
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
								const isBusy = updateMethod.isPending
								const hasInactive = records.some((r) => !r.active)
								const hasActive = records.some((r) => r.active)

								return (
									<SpecBulkActionItems
										specBulkActions={specProps?.bulkActions}
										table={table}
										selectionState={state.selectionState}
										onTransition={handleBulkTransition}
										isBusy={isBusy}
									>
										<DataGrid.ActionBar.Item
											disabled={!hasSelection || isBusy || !hasInactive}
											onClick={() => {
												void handleBulkActive(ids, true)
											}}
										>
											<CheckCircle className='size-3.5' aria-hidden='true' />
											Activate
										</DataGrid.ActionBar.Item>
										<DataGrid.ActionBar.Item
											disabled={!hasSelection || isBusy || !hasActive}
											onClick={() => {
												void handleBulkActive(ids, false)
											}}
										>
											<XCircle className='size-3.5' aria-hidden='true' />
											Deactivate
										</DataGrid.ActionBar.Item>
										<ReportActionItems
											table={table}
											selectionState={state.selectionState}
											moduleId='trace'
											entityId='shipmentMethods'
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
