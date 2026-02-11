import * as React from 'react'
import { useModuleData } from '../../hooks/use-data'
import { StatusBadge } from '../_shared/status-badge'
import { PurchaseOrderCard } from './components/purchase-order-card'

interface PurchaseOrder {
	_id: string
	documentNo: string
	documentType: 'ORDER' | 'RETURN_ORDER' | 'QUOTE'
	status:
		| 'DRAFT'
		| 'PENDING_APPROVAL'
		| 'APPROVED'
		| 'REJECTED'
		| 'COMPLETED'
		| 'CANCELED'
	vendorId: string
	vendorName: string
	orderDate: string
	expectedReceiptDate: string
	currency: string
	lineCount: number
	totalAmount: number
}

export default function PurchaseOrdersList() {
	const [selectedId, setSelectedId] = React.useState<string | null>(null)

	const { DataGrid, windowSize } = useModuleData<
		'replenishment',
		PurchaseOrder
	>('replenishment', 'purchaseOrders', 'all')

	const handleEdit = React.useCallback((row: PurchaseOrder) => {
		setSelectedId(row._id)
	}, [])

	return (
		<>
			<DataGrid
				variant='relaxed'
				height={Math.max(windowSize.height - 190, 390)}
			>
				<DataGrid.Header>
					<DataGrid.Toolbar filter sort search export />
				</DataGrid.Header>
				<DataGrid.Columns>
					<DataGrid.Column<PurchaseOrder>
						accessorKey='documentNo'
						title='Document No.'
						handleEdit={handleEdit}
					/>
					<DataGrid.Column<PurchaseOrder>
						accessorKey='documentType'
						title='Type'
						cellVariant='select'
					/>
					<DataGrid.Column<PurchaseOrder>
						accessorKey='status'
						title='Status'
						cell={({ row }) => <StatusBadge status={row.original.status} />}
					/>
					<DataGrid.Column<PurchaseOrder>
						accessorKey='vendorName'
						title='Vendor'
					/>
					<DataGrid.Column<PurchaseOrder>
						accessorKey='orderDate'
						title='Order Date'
						cellVariant='date'
						formatter={(v, f) => f.date(v.orderDate, { format: 'P' })}
					/>
					<DataGrid.Column<PurchaseOrder>
						accessorKey='expectedReceiptDate'
						title='Expected Receipt'
						cellVariant='date'
						formatter={(v, f) => f.date(v.expectedReceiptDate, { format: 'P' })}
					/>
					<DataGrid.Column<PurchaseOrder>
						accessorKey='currency'
						title='Currency'
					/>
					<DataGrid.Column<PurchaseOrder>
						accessorKey='lineCount'
						title='Lines'
						cellVariant='number'
					/>
					<DataGrid.Column<PurchaseOrder>
						accessorKey='totalAmount'
						title='Total Amount'
						cellVariant='number'
						formatter={(v, f) => f.currency(v.totalAmount)}
					/>
				</DataGrid.Columns>
			</DataGrid>

			<PurchaseOrderCard
				recordId={selectedId}
				onClose={() => setSelectedId(null)}
			/>
		</>
	)
}
