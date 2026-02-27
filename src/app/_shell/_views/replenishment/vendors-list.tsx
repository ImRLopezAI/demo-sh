import { $rpc, useMutation, useQueryClient } from '@lib/rpc'
import { Ban, Plus, ShieldCheck } from 'lucide-react'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { useModuleData } from '../../hooks/use-data'
import { PageHeader } from '../_shared/page-header'
import {
	resolveSelectedIds,
	resolveSelectedRecords,
} from '../_shared/resolve-selected-ids'
import { useRecordSearchState } from '../_shared/use-record-search-state'
import { VendorCard } from './components/vendor-card'

interface Vendor {
	_id: string
	vendorNo: string
	name: string
	contactName: string
	email: string
	phone: string
	address: string
	city: string
	country: string
	currency: string
	blocked: boolean
	purchaseOrderCount: number
	totalBalance: number
}

export default function VendorsList() {
	const { close, openCreate, openDetail, selectedId } = useRecordSearchState()
	const queryClient = useQueryClient()

	const { DataGrid, windowSize } = useModuleData<'replenishment', Vendor>(
		'replenishment',
		'vendors',
		'all',
	)

	const invalidate = React.useCallback(() => {
		void queryClient.invalidateQueries({
			queryKey: $rpc.replenishment.vendors.key(),
		})
	}, [queryClient])

	const updateVendor = useMutation({
		...$rpc.replenishment.vendors.update.mutationOptions({
			onSuccess: invalidate,
		}),
	})

	const handleBulkBlock = React.useCallback(
		async (ids: string[], blocked: boolean) => {
			for (const id of ids) {
				await updateVendor.mutateAsync({ id, data: { blocked } })
			}
		},
		[updateVendor],
	)

	const handleEdit = React.useCallback(
		(row: Vendor) => {
			openDetail(row._id)
		},
		[openDetail],
	)
	const handleNew = openCreate

	if (selectedId !== null) {
		return (
			<div className='space-y-8 pb-8'>
				<VendorCard
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
				title='Vendors'
				description='Manage vendor master records and purchasing details'
				actions={
					<Button
						size='sm'
						onClick={handleNew}
						className='shadow-sm transition-all hover:shadow-md'
					>
						<Plus className='mr-1.5 size-4' aria-hidden='true' />
						New Vendor
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
						<DataGrid.Column<Vendor>
							accessorKey='vendorNo'
							title='Vendor No.'
							handleEdit={handleEdit}
						/>
						<DataGrid.Column<Vendor> accessorKey='name' title='Name' />
						<DataGrid.Column<Vendor>
							accessorKey='contactName'
							title='Contact Name'
						/>
						<DataGrid.Column<Vendor> accessorKey='email' title='Email' />
						<DataGrid.Column<Vendor> accessorKey='phone' title='Phone' />
						<DataGrid.Column<Vendor> accessorKey='city' title='City' />
						<DataGrid.Column<Vendor> accessorKey='country' title='Country' />
						<DataGrid.Column<Vendor> accessorKey='currency' title='Currency' />
						<DataGrid.Column<Vendor>
							accessorKey='blocked'
							title='Blocked'
							cellVariant='checkbox'
						/>
						<DataGrid.Column<Vendor>
							accessorKey='purchaseOrderCount'
							title='PO Count'
							cellVariant='number'
						/>
						<DataGrid.Column<Vendor>
							accessorKey='totalBalance'
							title='Total Balance'
							cellVariant='number'
							formatter={(v, f) => f.currency(v.totalBalance)}
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
								const isBusy = updateVendor.isPending
								const hasUnblocked = records.some((r) => !r.blocked)
								const hasBlocked = records.some((r) => r.blocked)

								return (
									<>
										<DataGrid.ActionBar.Item
											disabled={!hasSelection || isBusy || !hasUnblocked}
											onClick={() => {
												void handleBulkBlock(ids, true)
											}}
										>
											<Ban className='size-3.5' aria-hidden='true' />
											Block
										</DataGrid.ActionBar.Item>
										<DataGrid.ActionBar.Item
											disabled={!hasSelection || isBusy || !hasBlocked}
											onClick={() => {
												void handleBulkBlock(ids, false)
											}}
										>
											<ShieldCheck className='size-3.5' aria-hidden='true' />
											Unblock
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
