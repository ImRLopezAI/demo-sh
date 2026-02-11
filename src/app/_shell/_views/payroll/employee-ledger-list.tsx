import { useModuleData } from '../../hooks/use-data'
import { PageHeader } from '../_shared/page-header'

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
		<div className='space-y-6'>
			<PageHeader
				title='Employee Ledger Entries'
				description='Track all payroll postings, adjustments, payments, and benefits per employee.'
			/>

			<DataGrid
				variant='minimal'
				height={Math.max(windowSize.height - 190, 390)}
			>
				<DataGrid.Header>
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
					<DataGrid.Column accessorKey='payrollPeriod' title='Payroll Period' />
				</DataGrid.Columns>
			</DataGrid>
		</div>
	)
}
