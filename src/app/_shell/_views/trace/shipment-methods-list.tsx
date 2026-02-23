import { Plus } from 'lucide-react'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { useModuleData } from '../../hooks/use-data'
import { PageHeader } from '../_shared/page-header'
import { ShipmentMethodCard } from './components/shipment-method-card'

interface ShipmentMethod {
	_id: string
	code: string
	description: string
	active: boolean
}

export default function ShipmentMethodsList() {
	const [selectedId, setSelectedId] = React.useState<string | null>(null)
	const { DataGrid, windowSize } = useModuleData<'trace', ShipmentMethod>(
		'trace',
		'shipmentMethods',
		'all',
	)

	const handleEdit = React.useCallback(
		(row: ShipmentMethod) => setSelectedId(row._id),
		[],
	)

	return (
		<div className='space-y-8 pb-8'>
			<PageHeader
				title='Shipment Methods'
				description='Available shipment methods and carrier configurations'
				actions={
					<Button
						size='sm'
						onClick={() => setSelectedId('new')}
						className='shadow-sm transition-all hover:shadow-md'
					>
						<Plus className='mr-1.5 size-4' aria-hidden='true' />
						New Method
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
						<DataGrid.Column<ShipmentMethod>
							accessorKey='code'
							title='Code'
							handleEdit={handleEdit}
						/>
						<DataGrid.Column<ShipmentMethod>
							accessorKey='description'
							title='Description'
						/>
						<DataGrid.Column<ShipmentMethod>
							accessorKey='active'
							title='Active'
							cellVariant='checkbox'
						/>
					</DataGrid.Columns>
				</DataGrid>
			</div>

			<ShipmentMethodCard
				selectedId={selectedId}
				onClose={() => setSelectedId(null)}
			/>
		</div>
	)
}
