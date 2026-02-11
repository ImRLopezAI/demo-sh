import { useModuleData } from '../../hooks/use-data'
import { PageHeader } from '../_shared/page-header'
import { StatusBadge } from '../_shared/status-badge'

interface BankAccountLedgerEntry {
	_id: string
	entryNo: number
	bankAccountId: string
	bankAccountName: string
	postingDate: string
	documentType: 'PAYMENT' | 'REFUND' | 'TRANSFER' | 'ADJUSTMENT' | 'PAYROLL'
	documentNo: string
	description: string
	debitAmount: number
	creditAmount: number
	amount: number
	reconciliationStatus: 'OPEN' | 'MATCHED' | 'RECONCILED' | 'EXCEPTION'
	open: boolean
}

export default function BankLedgerList() {
	const { DataGrid, windowSize } = useModuleData<
		'flow',
		BankAccountLedgerEntry
	>('flow', 'bankLedgerEntries', 'all')

	return (
		<div className='space-y-6'>
			<PageHeader
				title='Bank Ledger Entries'
				description='View bank account ledger entries and reconciliation status.'
			/>

			<DataGrid variant='lined' height={Math.max(windowSize.height - 190, 390)}>
				<DataGrid.Header>
					<DataGrid.Toolbar filter sort search export />
				</DataGrid.Header>
				<DataGrid.Columns>
					<DataGrid.Column
						accessorKey='entryNo'
						title='Entry No.'
						cellVariant='number'
					/>
					<DataGrid.Column accessorKey='bankAccountName' title='Bank Account' />
					<DataGrid.Column
						accessorKey='postingDate'
						title='Posting Date'
						cellVariant='date'
						formatter={(v, f) => f.date(v.postingDate, { format: 'P' })}
					/>
					<DataGrid.Column
						accessorKey='documentType'
						title='Document Type'
						cellVariant='select'
						opts={{
							options: [
								{ label: 'Payment', value: 'PAYMENT' },
								{ label: 'Refund', value: 'REFUND' },
								{ label: 'Transfer', value: 'TRANSFER' },
								{ label: 'Adjustment', value: 'ADJUSTMENT' },
								{ label: 'Payroll', value: 'PAYROLL' },
							],
						}}
					/>
					<DataGrid.Column accessorKey='documentNo' title='Document No.' />
					<DataGrid.Column accessorKey='description' title='Description' />
					<DataGrid.Column
						accessorKey='debitAmount'
						title='Debit Amount'
						cellVariant='number'
						formatter={(v, f) => f.currency(v.debitAmount)}
					/>
					<DataGrid.Column
						accessorKey='creditAmount'
						title='Credit Amount'
						cellVariant='number'
						formatter={(v, f) => f.currency(v.creditAmount)}
					/>
					<DataGrid.Column
						accessorKey='amount'
						title='Amount'
						cellVariant='number'
						formatter={(v, f) => f.currency(v.amount)}
					/>
					<DataGrid.Column
						accessorKey='reconciliationStatus'
						title='Reconciliation'
						cell={({ row }) => (
							<StatusBadge status={row.original.reconciliationStatus} />
						)}
					/>
					<DataGrid.Column
						accessorKey='open'
						title='Open'
						cellVariant='checkbox'
					/>
				</DataGrid.Columns>
			</DataGrid>
		</div>
	)
}
