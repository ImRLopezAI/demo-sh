import { Plus } from 'lucide-react'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { useModuleData } from '../../hooks/use-data'
import { PageHeader } from '../_shared/page-header'
import { StatusBadge } from '../_shared/status-badge'
import { ShipmentCard } from './components/shipment-card'

export default function ShipmentsList() {
	const [selectedId, setSelectedId] = React.useState<string | null>(null)

	const { DataGrid, windowSize } = useModuleData('trace', 'shipments')

	const handleEdit = React.useCallback((row) => {
		setSelectedId(row._id)
	}, [])

	const handleNew = () => setSelectedId('new')

	return (
		<div className='space-y-6'>
			<PageHeader
				title='Shipments'
				description='Track and manage shipment records and delivery status'
				actions={
					<Button size='sm' onClick={handleNew}>
						<Plus className='mr-1.5 size-3.5' aria-hidden='true' />
						New Shipment
					</Button>
				}
			/>

			<DataGrid
				variant='relaxed'
				height={Math.max(windowSize.height - 190, 390)}
			>
				<DataGrid.Header>
					<DataGrid.Toolbar filter sort search export />
				</DataGrid.Header>
				<DataGrid.Columns>
					<DataGrid.Column
						accessorKey='shipmentNo'
						title='Shipment No.'
						handleEdit={handleEdit}
					/>
					<DataGrid.Column
						accessorKey='status'
						title='Status'
						cell={({ row }) => <StatusBadge status={row.original.status} />}
					/>
					<DataGrid.Column
						accessorKey='sourceDocumentType'
						title='Source Doc. Type'
					/>
					<DataGrid.Column
						accessorKey='sourceDocumentNo'
						title='Source Doc. No.'
					/>
					<DataGrid.Column
						accessorKey='shipmentMethodCode'
						title='Shipment Method'
					/>
					<DataGrid.Column
						accessorKey='priority'
						title='Priority'
						cell={({ row }) => <StatusBadge status={row.original.priority} />}
					/>
					<DataGrid.Column
						accessorKey='plannedDispatchDate'
						title='Planned Dispatch'
						cellVariant='date'
						formatter={(v, f) => f.date(v.plannedDispatchDate, { format: 'P' })}
					/>
					<DataGrid.Column
						accessorKey='plannedDeliveryDate'
						title='Planned Delivery'
						cellVariant='date'
						formatter={(v, f) => f.date(v.plannedDeliveryDate, { format: 'P' })}
					/>
					<DataGrid.Column
						accessorKey='actualDeliveryDate'
						title='Actual Delivery'
						cellVariant='date'
						formatter={(v, f) => f.date(v.actualDeliveryDate, { format: 'P' })}
					/>
					<DataGrid.Column accessorKey='courierName' title='Courier' />
					<DataGrid.Column accessorKey='trackingNo' title='Tracking No.' />
					<DataGrid.Column
						accessorKey='lineCount'
						title='Lines'
						cellVariant='number'
					/>
				</DataGrid.Columns>
			</DataGrid>

			<ShipmentCard
				selectedId={selectedId}
				onClose={() => setSelectedId(null)}
			/>
		</div>
	)
}
