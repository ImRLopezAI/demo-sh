import { useModuleData } from '../../hooks/use-data'
import { PageHeader } from '../_shared/page-header'
import { resolveSelectedIds } from '../_shared/resolve-selected-ids'
import { StatusBadge } from '../_shared/status-badge'

interface BankAccountLedgerEntry {
	_id: string
	entryNo: number
	bankAccountId: string
	bankAccountName: string
	postingDate?: string | null
	documentType: 'PAYMENT' | 'REFUND' | 'TRANSFER' | 'ADJUSTMENT' | 'PAYROLL'
	documentNo?: string | null
	description?: string | null
	debitAmount: number
	creditAmount: number
	amount: number
	reconciliationStatus: 'OPEN' | 'MATCHED' | 'RECONCILED' | 'EXCEPTION'
	open: boolean
}

export default function BankLedgerList() {
	const { DataGrid, windowSize } = useModuleData<
		'payroll',
		BankAccountLedgerEntry
	>('payroll', 'bankLedgerEntries', 'overview')

	return (
		<div className='space-y-8 pb-8'>
			<PageHeader
				title='Bank Ledger Entries'
				description='Bank account ledger entries related to payroll disbursements.'
			/>

			<div className='overflow-hidden rounded-xl border border-border/50 bg-background/50 shadow-sm backdrop-blur-xl'>
				<DataGrid
					withSelect
					variant='flat'
					height={Math.max(windowSize.height - 150, 400)}
				>
					<DataGrid.Header className='border-border/50 border-b bg-muted/20 px-6 py-4'>
						<DataGrid.Toolbar filter sort search export />
					</DataGrid.Header>

					<DataGrid.Columns>
						<DataGrid.Column
							accessorKey='entryNo'
							title='Entry No.'
							cellVariant='number'
						/>
						<DataGrid.Column
							accessorKey='bankAccountName'
							title='Bank Account'
						/>
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
							title='Reconciliation Status'
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
					<DataGrid.ActionBar>
						<DataGrid.ActionBar.Selection>
							{(table, state) => (
								<span>
									{resolveSelectedIds(table, state.selectionState).length}{' '}
									selected
								</span>
							)}
						</DataGrid.ActionBar.Selection>
					</DataGrid.ActionBar>
				</DataGrid>
			</div>
		</div>
	)
}
