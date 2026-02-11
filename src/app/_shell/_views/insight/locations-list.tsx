import * as React from 'react'
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
		<div className='space-y-4'>
			<PageHeader
				title='Locations'
				description='Manage warehouse, store, and distribution center locations.'
			/>

			<DataGrid variant='card' height={Math.max(windowSize.height - 200, 380)}>
				<DataGrid.Header>
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
								{ label: 'Distribution Center', value: 'DISTRIBUTION_CENTER' },
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
