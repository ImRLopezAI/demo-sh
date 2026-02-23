import { Plus } from 'lucide-react'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { useModuleData } from '../../hooks/use-data'
import { PageHeader } from '../_shared/page-header'
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
	const [selectedId, setSelectedId] = React.useState<string | null>(null)

	const { DataGrid, windowSize } = useModuleData<'insight', Location>(
		'insight',
		'locations',
		'all',
	)

	return (
		<div className='space-y-8 pb-8'>
			<PageHeader
				title='Locations'
				description='Manage warehouse, store, and distribution center locations.'
				actions={
					<Button
						size='sm'
						onClick={() => setSelectedId('new')}
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
					height={Math.max(windowSize.height - 240, 400)}
				>
					<DataGrid.Header className='border-border/50 border-b bg-muted/20 px-6 py-4'>
						<DataGrid.Toolbar filter sort search export />
					</DataGrid.Header>

					<DataGrid.Columns>
						<DataGrid.Column
							accessorKey='code'
							title='Code'
							handleEdit={(row) => setSelectedId(row._id)}
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
				</DataGrid>
			</div>

			<LocationCard
				locationId={selectedId}
				open={selectedId !== null}
				onOpenChange={(open) => {
					if (!open) setSelectedId(null)
				}}
			/>
		</div>
	)
}
