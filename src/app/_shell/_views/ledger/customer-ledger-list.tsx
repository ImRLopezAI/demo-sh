import { useModuleData } from '../../hooks/use-data'
import { PageHeader } from '../_shared/page-header'

interface CustLedgerEntry {
	_id: string
	entryNo: number
	customerId: string
	customerName: string
	postingDate: string
	documentType: 'INVOICE' | 'CREDIT_MEMO' | 'PAYMENT'
	documentNo: string
	description: string
	amount: number
	remainingAmount: number
	open: boolean
	currency: string
}

export default function CustomerLedgerList() {
	const { DataGrid, windowSize } = useModuleData<'ledger', CustLedgerEntry>(
		'ledger',
		'customerLedger',
		'all',
	)

	return (
		<div className='space-y-4'>
			<PageHeader
				title='Customer Ledger Entries'
				description='Track all customer receivable transactions including invoices, credit memos, and payments.'
			/>

			<DataGrid
				variant='minimal'
				height={Math.max(windowSize.height - 190, 390)}
			>
				<DataGrid.Header>
					<DataGrid.Toolbar filter sort search export />
				</DataGrid.Header>

				<DataGrid.Columns>
					<DataGrid.Column<CustLedgerEntry>
						accessorKey='entryNo'
						title='Entry No.'
						cellVariant='number'
					/>
					<DataGrid.Column<CustLedgerEntry>
						accessorKey='customerName'
						title='Customer'
					/>
					<DataGrid.Column<CustLedgerEntry>
						accessorKey='postingDate'
						title='Posting Date'
						cellVariant='date'
						formatter={(v, f) => f.date(v.postingDate, { format: 'P' })}
					/>
					<DataGrid.Column<CustLedgerEntry>
						accessorKey='documentType'
						title='Document Type'
						cellVariant='select'
						opts={{
							options: [
								{ label: 'Invoice', value: 'INVOICE' },
								{ label: 'Credit Memo', value: 'CREDIT_MEMO' },
								{ label: 'Payment', value: 'PAYMENT' },
							],
						}}
					/>
					<DataGrid.Column<CustLedgerEntry>
						accessorKey='documentNo'
						title='Document No.'
					/>
					<DataGrid.Column<CustLedgerEntry>
						accessorKey='description'
						title='Description'
					/>
					<DataGrid.Column<CustLedgerEntry>
						accessorKey='amount'
						title='Amount'
						cellVariant='number'
						formatter={(v, f) => f.currency(v.amount)}
					/>
					<DataGrid.Column<CustLedgerEntry>
						accessorKey='remainingAmount'
						title='Remaining Amount'
						cellVariant='number'
						formatter={(v, f) => f.currency(v.remainingAmount)}
					/>
					<DataGrid.Column<CustLedgerEntry>
						accessorKey='open'
						title='Open'
						cellVariant='checkbox'
					/>
					<DataGrid.Column<CustLedgerEntry>
						accessorKey='currency'
						title='Currency'
					/>
				</DataGrid.Columns>
			</DataGrid>
		</div>
	)
}
