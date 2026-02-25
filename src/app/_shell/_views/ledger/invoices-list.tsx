import { Plus } from 'lucide-react'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { useModuleData } from '../../hooks/use-data'
import { PageHeader } from '../_shared/page-header'
import { StatusBadge } from '../_shared/status-badge'
import { useRecordSearchState } from '../_shared/use-record-search-state'
import { InvoiceCard } from './components/invoice-card'

interface SalesInvoiceHeader {
	_id: string
	invoiceNo: string
	status: 'DRAFT' | 'POSTED' | 'REVERSED'
	eInvoiceStatus:
		| 'DRAFT'
		| 'POSTED'
		| 'SUBMITTED'
		| 'ACCEPTED'
		| 'REJECTED'
		| 'CANCELED'
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
	const { close, openCreate, openDetail, selectedId } = useRecordSearchState()

	const { DataGrid, windowSize } = useModuleData<'ledger', SalesInvoiceHeader>(
		'ledger',
		'invoices',
		'all',
	)

	const handleEdit = React.useCallback(
		(row: SalesInvoiceHeader) => openDetail(row._id),
		[openDetail],
	)
	const handleNew = openCreate

	if (selectedId !== null) {
		return (
			<div className='space-y-8 pb-8'>
				<InvoiceCard
					selectedId={selectedId}
					onClose={close}
					presentation='page'
				/>
			</div>
		)
	}

	return (
		<div className='space-y-8 pb-8'>
			<PageHeader
				title='Sales Invoices'
				description='Manage electronic invoices and financial documents'
				actions={
					<Button
						size='sm'
						onClick={handleNew}
						className='shadow-sm transition-all hover:shadow-md'
					>
						<Plus className='mr-1.5 size-4' aria-hidden='true' />
						New Invoice
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
							accessorKey='eInvoiceStatus'
							title='E-Invoice'
							cell={({ row }) => (
								<StatusBadge status={row.original.eInvoiceStatus} />
							)}
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
			</div>
		</div>
	)
}
