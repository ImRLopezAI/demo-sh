import { Plus } from 'lucide-react'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { useModuleData } from '../../hooks/use-data'
import { PageHeader } from '../_shared/page-header'
import { StatusBadge } from '../_shared/status-badge'
import { SalesOrderCard } from './components/sales-order-card'

interface SalesOrder {
	_id: string
	documentNo: string
	documentType: string
	status: string
	customerId: string
	customerName: string
	orderDate: string
	currency: string
	lineCount: number
	totalAmount: number
}

export default function SalesOrdersList() {
	const [selectedId, setSelectedId] = React.useState<string | null>(null)

	const { DataGrid, windowSize } = useModuleData<'market', SalesOrder>(
		'market',
		'salesOrders',
		'all',
	)

	const handleEdit = React.useCallback(
		(row: SalesOrder) => setSelectedId(row._id),
		[],
	)
	const handleNew = () => setSelectedId('new')

	return (
		<div className='space-y-6'>
			<PageHeader
				title='Sales Orders'
				description='Manage customer orders, quotes, and returns'
				actions={
					<Button size='sm' onClick={handleNew}>
						<Plus className='mr-1.5 size-3.5' aria-hidden='true' />
						New Order
					</Button>
				}
			/>

			<DataGrid variant='lined' height={Math.max(windowSize.height - 190, 390)}>
				<DataGrid.Header>
					<DataGrid.Toolbar filter sort search export />
				</DataGrid.Header>
				<DataGrid.Columns>
					<DataGrid.Column
						accessorKey='documentNo'
						title='Document No.'
						handleEdit={handleEdit}
					/>
					<DataGrid.Column
						accessorKey='documentType'
						title='Type'
						cellVariant='select'
					/>
					<DataGrid.Column
						accessorKey='status'
						title='Status'
						cell={({ row }) => <StatusBadge status={row.original.status} />}
					/>
					<DataGrid.Column accessorKey='customerName' title='Customer' />
					<DataGrid.Column
						accessorKey='orderDate'
						title='Order Date'
						cellVariant='date'
						formatter={(v, f) => f.date(v.orderDate, { format: 'P' })}
					/>
					<DataGrid.Column accessorKey='currency' title='Currency' />
					<DataGrid.Column
						accessorKey='lineCount'
						title='Lines'
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

			<SalesOrderCard
				selectedId={selectedId}
				onClose={() => setSelectedId(null)}
			/>
		</div>
	)
}
