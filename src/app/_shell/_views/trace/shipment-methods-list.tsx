import { useModuleData } from '../../hooks/use-data'
import { PageHeader } from '../_shared/page-header'

interface ShipmentMethod {
	_id: string
	code: string
	description: string
	active: boolean
}

export default function ShipmentMethodsList() {
	const { DataGrid, windowSize } = useModuleData<'trace', ShipmentMethod>(
		'trace',
		'shipmentMethods',
		'all',
	)

	return (
		<div className='space-y-6'>
			<PageHeader
				title='Shipment Methods'
				description='Available shipment methods and carrier configurations'
			/>

			<DataGrid
				variant='compact'
				height={Math.max(windowSize.height - 210, 360)}
			>
				<DataGrid.Header>
					<DataGrid.Toolbar filter sort search export />
				</DataGrid.Header>
				<DataGrid.Columns>
					<DataGrid.Column accessorKey='code' title='Code' />
					<DataGrid.Column accessorKey='description' title='Description' />
					<DataGrid.Column
						accessorKey='active'
						title='Active'
						cellVariant='checkbox'
					/>
				</DataGrid.Columns>
			</DataGrid>
		</div>
	)
}
