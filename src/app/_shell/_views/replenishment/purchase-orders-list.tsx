import { Plus } from 'lucide-react'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { useModuleData } from '../../hooks/use-data'
import { PageHeader } from '../_shared/page-header'
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
	const handleNew = () => setSelectedId('new')

	return (
		<div className='space-y-8 pb-8'>
			<PageHeader
				title='Purchase Orders'
				description='Manage vendor orders, quotes, and returns'
				actions={
					<Button
						size='sm'
						onClick={handleNew}
						data-testid='purchase-order-new-button'
						className='shadow-sm transition-all hover:shadow-md'
					>
						<Plus className='mr-1.5 size-4' aria-hidden='true' />
						New Order
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
							formatter={(v, f) =>
								f.date(v.expectedReceiptDate, { format: 'P' })
							}
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
			</div>

			<PurchaseOrderCard
				recordId={selectedId}
				onClose={() => setSelectedId(null)}
				onCreated={(id) => setSelectedId(id)}
			/>
		</div>
	)
}
