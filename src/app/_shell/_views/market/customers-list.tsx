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
		<div className='space-y-8 pb-8'>
			<PageHeader
				title='Customers'
				description='Customer profiles, contacts, and order history'
				actions={
					<Button
						size='sm'
						onClick={handleNew}
						className='shadow-sm transition-all hover:shadow-md'
					>
						<Plus className='mr-1.5 size-4' aria-hidden='true' />
						New Customer
					</Button>
				}
			/>

			<div className='overflow-hidden rounded-xl border border-border/50 bg-background/50 shadow-sm backdrop-blur-xl'>
				<DataGrid
					variant='relaxed'
					height={Math.max(windowSize.height - 240, 400)}
				>
					<DataGrid.Header className='border-border/50 border-b bg-muted/20 px-6 py-4'>
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
			</div>

			<CustomerCard
				selectedId={selectedId}
				onClose={() => setSelectedId(null)}
			/>
		</div>
	)
}
