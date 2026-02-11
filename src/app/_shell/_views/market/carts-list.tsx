import { useModuleData } from '../../hooks/use-data'
import { PageHeader } from '../_shared/page-header'
import { StatusBadge } from '../_shared/status-badge'

interface Cart {
	_id: string
	customerId: string
	customerName: string
	status: string
	currency: string
	itemCount: number
	totalAmount: number
}

export default function CartsList() {
	const { DataGrid, windowSize } = useModuleData<'market', Cart>(
		'market',
		'carts',
		'all',
	)

	return (
		<div className='space-y-6'>
			<PageHeader
				title='Carts'
				description='Active and abandoned shopping carts'
			/>

			<DataGrid variant='flat' height={Math.max(windowSize.height - 200, 380)}>
				<DataGrid.Header>
					<DataGrid.Toolbar filter sort search export />
				</DataGrid.Header>
				<DataGrid.Columns>
					<DataGrid.Column accessorKey='customerName' title='Customer' />
					<DataGrid.Column
						accessorKey='status'
						title='Status'
						cell={({ row }) => <StatusBadge status={row.original.status} />}
					/>
					<DataGrid.Column accessorKey='currency' title='Currency' />
					<DataGrid.Column
						accessorKey='itemCount'
						title='Items'
						cellVariant='number'
					/>
					<DataGrid.Column
						accessorKey='totalAmount'
						title='Total Amount'
						cellVariant='number'
						formatter={(v, f) => f.currency(v.totalAmount)}
					/>
				</DataGrid.Columns>
			</DataGrid>
		</div>
	)
}
