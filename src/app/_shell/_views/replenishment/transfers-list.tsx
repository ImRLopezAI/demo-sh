import * as React from 'react'
import { useModuleData } from '../../hooks/use-data'
import { StatusBadge } from '../_shared/status-badge'
import { TransferCard } from './components/transfer-card'

interface Transfer {
	_id: string
	transferNo: string
	status: 'DRAFT' | 'RELEASED' | 'IN_TRANSIT' | 'RECEIVED' | 'CANCELED'
	fromLocationCode: string
	toLocationCode: string
	shipmentDate: string
	receiptDate: string
	lineCount: number
}

export default function TransfersList() {
	const [selectedId, setSelectedId] = React.useState<string | null>(null)

	const { DataGrid, windowSize } = useModuleData<'replenishment', Transfer>(
		'replenishment',
		'transfers',
		'all',
	)

	const handleEdit = React.useCallback((row: Transfer) => {
		setSelectedId(row._id)
	}, [])

	return (
		<>
			<DataGrid variant='card' height={Math.max(windowSize.height - 190, 390)}>
				<DataGrid.Header>
					<DataGrid.Toolbar filter sort search export />
				</DataGrid.Header>
				<DataGrid.Columns>
					<DataGrid.Column<Transfer>
						accessorKey='transferNo'
						title='Transfer No.'
						handleEdit={handleEdit}
					/>
					<DataGrid.Column<Transfer>
						accessorKey='status'
						title='Status'
						cell={({ row }) => <StatusBadge status={row.original.status} />}
					/>
					<DataGrid.Column<Transfer>
						accessorKey='fromLocationCode'
						title='From Location'
					/>
					<DataGrid.Column<Transfer>
						accessorKey='toLocationCode'
						title='To Location'
					/>
					<DataGrid.Column<Transfer>
						accessorKey='shipmentDate'
						title='Shipment Date'
						cellVariant='date'
						formatter={(v, f) => f.date(v.shipmentDate, { format: 'P' })}
					/>
					<DataGrid.Column<Transfer>
						accessorKey='receiptDate'
						title='Receipt Date'
						cellVariant='date'
						formatter={(v, f) => f.date(v.receiptDate, { format: 'P' })}
					/>
					<DataGrid.Column<Transfer>
						accessorKey='lineCount'
						title='Lines'
						cellVariant='number'
					/>
				</DataGrid.Columns>
			</DataGrid>

			<TransferCard recordId={selectedId} onClose={() => setSelectedId(null)} />
		</>
	)
}
