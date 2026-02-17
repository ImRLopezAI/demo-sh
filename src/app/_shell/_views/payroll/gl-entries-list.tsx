import { useModuleData } from '../../hooks/use-data'
import { PageHeader } from '../_shared/page-header'

export default function GlEntriesList() {
	const { DataGrid, windowSize } = useModuleData('payroll', 'glEntries')

	return (
		<div className='space-y-6'>
			<PageHeader
				title='G/L Entries'
				description='General ledger entries generated from payroll postings.'
			/>

			<DataGrid variant='dense' height={Math.max(windowSize.height - 200, 380)}>
				<DataGrid.Header>
					<DataGrid.Toolbar filter sort search export />
				</DataGrid.Header>

				<DataGrid.Columns>
					<DataGrid.Column
						accessorKey='entryNo'
						title='Entry No.'
						cellVariant='number'
					/>
					<DataGrid.Column
						accessorKey='postingDate'
						title='Posting Date'
						cellVariant='date'
						formatter={(v, f) => f.date(v.postingDate, { format: 'P' })}
					/>
					<DataGrid.Column accessorKey='accountNo' title='Account No.' />
					<DataGrid.Column accessorKey='accountName' title='Account Name' />
					<DataGrid.Column accessorKey='documentType' title='Document Type' />
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
				</DataGrid.Columns>
			</DataGrid>
		</div>
	)
}
