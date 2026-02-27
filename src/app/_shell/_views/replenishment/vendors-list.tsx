import { Plus } from 'lucide-react'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { useModuleData } from '../../hooks/use-data'
import { PageHeader } from '../_shared/page-header'
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

	const { DataGrid, windowSize } = useModuleData<'replenishment', Vendor>(
		'replenishment',
		'vendors',
		'all',
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
				</DataGrid>
			</div>
		</div>
	)
}
