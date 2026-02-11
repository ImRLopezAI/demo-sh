import { Plus } from 'lucide-react'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { useModuleData } from '../../hooks/use-data'
import { PageHeader } from '../_shared/page-header'
import { CustomerCard } from './components/customer-card'

interface Customer {
	_id: string
	customerNo: string
	name: string
	email: string
	phone: string
	address: string
	city: string
	country: string
	blocked: boolean
	orderCount: number
	totalBalance: number
}

export default function CustomersList() {
	const [selectedId, setSelectedId] = React.useState<string | null>(null)

	const { DataGrid, windowSize } = useModuleData<'market', Customer>(
		'market',
		'customers',
		'all',
	)

	const handleEdit = React.useCallback(
		(row: Customer) => setSelectedId(row._id),
		[],
	)
	const handleNew = () => setSelectedId('new')

	return (
		<div className='space-y-6'>
			<PageHeader
				title='Customers'
				description='Customer profiles, contacts, and order history'
				actions={
					<Button size='sm' onClick={handleNew}>
						<Plus className='mr-1.5 size-3.5' aria-hidden='true' />
						New Customer
					</Button>
				}
			/>

			<DataGrid
				variant='relaxed'
				height={Math.max(windowSize.height - 200, 380)}
			>
				<DataGrid.Header>
					<DataGrid.Toolbar filter sort search export />
				</DataGrid.Header>
				<DataGrid.Columns>
					<DataGrid.Column
						accessorKey='customerNo'
						title='Customer No.'
						handleEdit={handleEdit}
					/>
					<DataGrid.Column accessorKey='name' title='Name' />
					<DataGrid.Column accessorKey='email' title='Email' />
					<DataGrid.Column accessorKey='phone' title='Phone' />
					<DataGrid.Column accessorKey='city' title='City' />
					<DataGrid.Column accessorKey='country' title='Country' />
					<DataGrid.Column
						accessorKey='blocked'
						title='Blocked'
						cellVariant='checkbox'
					/>
					<DataGrid.Column
						accessorKey='orderCount'
						title='Orders'
						cellVariant='number'
					/>
					<DataGrid.Column
						accessorKey='totalBalance'
						title='Balance'
						cellVariant='number'
						formatter={(v, f) => f.currency(v.totalBalance)}
					/>
				</DataGrid.Columns>
			</DataGrid>

			<CustomerCard
				selectedId={selectedId}
				onClose={() => setSelectedId(null)}
			/>
		</div>
	)
}
