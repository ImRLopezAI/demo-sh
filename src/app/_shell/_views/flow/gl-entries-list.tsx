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
	const { DataGrid, windowSize } = useModuleData<'flow', GlEntry>(
		'flow',
		'glEntries',
		'all',
	)

	return (
		<div className='space-y-8 pb-8'>
			<PageHeader
				title='G/L Entries'
				description='View general ledger entries posted from flow operations.'
			/>

			<div className='overflow-hidden rounded-xl border border-border/50 bg-background/50 shadow-sm backdrop-blur-xl'>
				<DataGrid
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
							accessorKey='postingDate'
							title='Posting Date'
							cellVariant='date'
							formatter={(v, f) => f.date(v.postingDate, { format: 'P' })}
						/>
						<DataGrid.Column accessorKey='accountNo' title='Account No.' />
						<DataGrid.Column accessorKey='accountName' title='Account Name' />
						<DataGrid.Column
							accessorKey='documentType'
							title='Document Type'
							cellVariant='select'
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
					</DataGrid.Columns>
				</DataGrid>
			</div>
		</div>
	)
}
