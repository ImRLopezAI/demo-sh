import { Plus } from 'lucide-react'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { useModuleData } from '../../hooks/use-data'
import { PageHeader } from '../_shared/page-header'
import { StatusBadge } from '../_shared/status-badge'
import { InvoiceCard } from './components/invoice-card'

interface SalesInvoiceHeader {
	_id: string
	invoiceNo: string
	status: 'DRAFT' | 'POSTED' | 'REVERSED'
	customerId: string
	customerName: string
	salesOrderNo: string
	postingDate: string
	dueDate: string
	currency: string
	lineCount: number
	totalAmount: number
}

export default function InvoicesList() {
	const [selectedId, setSelectedId] = React.useState<string | null>(null)

	const { DataGrid, windowSize } = useModuleData<'ledger', SalesInvoiceHeader>(
		'ledger',
		'invoices',
		'all',
	)

	const handleEdit = React.useCallback(
		(row: SalesInvoiceHeader) => setSelectedId(row._id),
		[],
	)
	const handleNew = () => setSelectedId('new')

	return (
		<div className='space-y-6'>
			<PageHeader
				title='Sales Invoices'
				description='Manage electronic invoices and financial documents'
				actions={
					<Button size='sm' onClick={handleNew}>
						<Plus className='mr-1.5 size-3.5' aria-hidden='true' />
						New Invoice
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
					<DataGrid.Column<SalesInvoiceHeader>
						accessorKey='invoiceNo'
						title='Invoice No.'
						handleEdit={handleEdit}
					/>
					<DataGrid.Column<SalesInvoiceHeader>
						accessorKey='status'
						title='Status'
						cell={({ row }) => <StatusBadge status={row.original.status} />}
					/>
					<DataGrid.Column<SalesInvoiceHeader>
						accessorKey='customerName'
						title='Customer'
					/>
					<DataGrid.Column<SalesInvoiceHeader>
						accessorKey='salesOrderNo'
						title='Sales Order No.'
					/>
					<DataGrid.Column<SalesInvoiceHeader>
						accessorKey='postingDate'
						title='Posting Date'
						cellVariant='date'
						formatter={(v, f) => f.date(v.postingDate, { format: 'P' })}
					/>
					<DataGrid.Column<SalesInvoiceHeader>
						accessorKey='dueDate'
						title='Due Date'
						cellVariant='date'
						formatter={(v, f) => f.date(v.dueDate, { format: 'P' })}
					/>
					<DataGrid.Column<SalesInvoiceHeader>
						accessorKey='currency'
						title='Currency'
					/>
					<DataGrid.Column<SalesInvoiceHeader>
						accessorKey='lineCount'
						title='Lines'
						cellVariant='number'
					/>
					<DataGrid.Column<SalesInvoiceHeader>
						accessorKey='totalAmount'
						title='Total Amount'
						cellVariant='number'
						formatter={(v, f) => f.currency(v.totalAmount)}
					/>
				</DataGrid.Columns>
			</DataGrid>

			<InvoiceCard
				selectedId={selectedId}
				onClose={() => setSelectedId(null)}
			/>
		</div>
	)
}
