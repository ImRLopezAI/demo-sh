import { useModuleData } from '../../hooks/use-data'
import { PageHeader } from '../_shared/page-header'
import { ReportActionItems } from '../_shared/report-action-items'
import { resolveSelectedIds } from '../_shared/resolve-selected-ids'

interface EmployeeLedgerEntry {
	_id: string
	entryNo: number
	employeeId: string
	employeeName: string
	postingDate?: string | null
	documentType: 'PAYROLL' | 'ADJUSTMENT' | 'PAYMENT' | 'BENEFIT'
	documentNo?: string | null
	description?: string | null
	amount: number
	remainingAmount: number
	open: boolean
	payrollPeriod?: string | null
}

export default function EmployeeLedgerList() {
	const { DataGrid, windowSize } = useModuleData<
		'payroll',
		EmployeeLedgerEntry
	>('payroll', 'employeeLedger', 'overview')

	return (
		<div className='space-y-8 pb-8'>
			<PageHeader
				title='Employee Ledger Entries'
				description='Track all payroll postings, adjustments, payments, and benefits per employee.'
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
						<DataGrid.Column accessorKey='employeeName' title='Employee' />
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
									{ label: 'Payroll', value: 'PAYROLL' },
									{ label: 'Adjustment', value: 'ADJUSTMENT' },
									{ label: 'Payment', value: 'PAYMENT' },
									{ label: 'Benefit', value: 'BENEFIT' },
								],
							}}
						/>
						<DataGrid.Column accessorKey='documentNo' title='Document No.' />
						<DataGrid.Column accessorKey='description' title='Description' />
						<DataGrid.Column
							accessorKey='amount'
							title='Amount'
							cellVariant='number'
							formatter={(v, f) => f.currency(v.amount)}
						/>
						<DataGrid.Column
							accessorKey='remainingAmount'
							title='Remaining Amount'
							cellVariant='number'
							formatter={(v, f) => f.currency(v.remainingAmount)}
						/>
						<DataGrid.Column
							accessorKey='open'
							title='Open'
							cellVariant='checkbox'
						/>
						<DataGrid.Column
							accessorKey='payrollPeriod'
							title='Payroll Period'
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
						<DataGrid.ActionBar.Separator />
						<DataGrid.ActionBar.Group>
							{(table, state) => (
								<ReportActionItems
									table={table}
									selectionState={state.selectionState}
									moduleId="payroll"
									entityId="employeeLedger"
								/>
							)}
						</DataGrid.ActionBar.Group>
					</DataGrid.ActionBar>
				</DataGrid>
			</div>
		</div>
	)
}
