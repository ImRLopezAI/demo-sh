import * as React from 'react'
import { useModuleData } from '../../hooks/use-data'
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
	const [selectedId, setSelectedId] = React.useState<string | null>(null)

	const { DataGrid, windowSize } = useModuleData<'replenishment', Vendor>(
		'replenishment',
		'vendors',
		'all',
	)

	const handleEdit = React.useCallback((row: Vendor) => {
		setSelectedId(row._id)
	}, [])

	return (
		<>
			<DataGrid variant='lined' height={Math.max(windowSize.height - 200, 380)}>
				<DataGrid.Header>
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

			<VendorCard recordId={selectedId} onClose={() => setSelectedId(null)} />
		</>
	)
}
