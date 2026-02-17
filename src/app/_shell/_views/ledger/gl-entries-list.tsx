import { useModuleData } from '../../hooks/use-data'
import { PageHeader } from '../_shared/page-header'

interface GlEntry {
	_id: string
	entryNo: number
	postingDate: string
	accountNo: string
	accountName: string
	documentType: string
	documentNo: string
	description: string
	debitAmount: number
	creditAmount: number
}

export default function GlEntriesList() {
	const { DataGrid, windowSize } = useModuleData('ledger', 'glEntries')

	return (
		<div className='space-y-4'>
			<PageHeader
				title='General Ledger Entries'
				description='View all general ledger postings for financial transparency and audit trails.'
			/>

			<DataGrid variant='lined' height={Math.max(windowSize.height - 190, 390)}>
				<DataGrid.Header>
					<DataGrid.Toolbar filter sort search export />
				</DataGrid.Header>

				<DataGrid.Columns>
					<DataGrid.Column<GlEntry>
						accessorKey='entryNo'
						title='Entry No.'
						cellVariant='number'
					/>
					<DataGrid.Column<GlEntry>
						accessorKey='postingDate'
						title='Posting Date'
						cellVariant='date'
						formatter={(v, f) => f.date(v.postingDate, { format: 'P' })}
					/>
					<DataGrid.Column<GlEntry>
						accessorKey='accountNo'
						title='Account No.'
					/>
					<DataGrid.Column<GlEntry>
						accessorKey='accountName'
						title='Account Name'
					/>
					<DataGrid.Column<GlEntry>
						accessorKey='documentType'
						title='Document Type'
					/>
					<DataGrid.Column<GlEntry>
						accessorKey='documentNo'
						title='Document No.'
					/>
					<DataGrid.Column<GlEntry>
						accessorKey='description'
						title='Description'
					/>
					<DataGrid.Column<GlEntry>
						accessorKey='debitAmount'
						title='Debit Amount'
						cellVariant='number'
						formatter={(v, f) => f.currency(v.debitAmount)}
					/>
					<DataGrid.Column<GlEntry>
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
