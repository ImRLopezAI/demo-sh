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
import { useRecordSearchState } from '../_shared/use-record-search-state'
import { LocationCard } from './components/location-card'

interface Location {
	_id: string
	code: string
	name: string
	type: 'WAREHOUSE' | 'STORE' | 'DISTRIBUTION_CENTER'
	address: string
	city: string
	country: string
	active: boolean
	itemCount: number
}

export default function LocationsList() {
	const { close, openCreate, openDetail, selectedId } = useRecordSearchState()
	const queryClient = useQueryClient()

	const { DataGrid, windowSize } = useModuleData<'insight', Location>(
		'insight',
		'locations',
		'all',
	)

	const invalidate = React.useCallback(() => {
		void queryClient.invalidateQueries({
			queryKey: $rpc.insight.locations.key(),
		})
	}, [queryClient])

	const updateLocation = useMutation({
		...$rpc.insight.locations.update.mutationOptions({
			onSuccess: invalidate,
		}),
	})

	const handleBulkActive = React.useCallback(
		async (ids: string[], active: boolean) => {
			for (const id of ids) {
				await updateLocation.mutateAsync({ id, data: { active } })
			}
		},
		[updateLocation],
	)

	if (selectedId !== null) {
		return (
			<div className='space-y-8 pb-8'>
				<LocationCard
					locationId={selectedId}
					open
					onOpenChange={(open) => {
						if (!open) close()
					}}
					presentation='page'
				/>
			</div>
		)
	}

	return (
		<div className='space-y-8 pb-8'>
			<PageHeader
				title='Locations'
				description='Manage warehouse, store, and distribution center locations.'
				actions={
					<Button
						size='sm'
						onClick={openCreate}
						className='shadow-sm transition-all hover:shadow-md'
					>
						<Plus className='mr-1.5 size-4' aria-hidden='true' />
						New Location
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
							accessorKey='code'
							title='Code'
							handleEdit={(row) => openDetail(row._id)}
						/>
						<DataGrid.Column accessorKey='name' title='Name' />
						<DataGrid.Column
							accessorKey='type'
							title='Type'
							cellVariant='select'
							opts={{
								options: [
									{ label: 'Warehouse', value: 'WAREHOUSE' },
									{ label: 'Store', value: 'STORE' },
									{
										label: 'Distribution Center',
										value: 'DISTRIBUTION_CENTER',
									},
								],
							}}
						/>
						<DataGrid.Column accessorKey='address' title='Address' />
						<DataGrid.Column accessorKey='city' title='City' />
						<DataGrid.Column accessorKey='country' title='Country' />
						<DataGrid.Column
							accessorKey='active'
							title='Active'
							cellVariant='checkbox'
						/>
						<DataGrid.Column
							accessorKey='itemCount'
							title='Item Count'
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
								const isBusy = updateLocation.isPending
								const hasInactive = records.some((r) => !r.active)
								const hasActive = records.some((r) => r.active)

								return (
									<>
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
											moduleId="insight"
											entityId="locations"
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
