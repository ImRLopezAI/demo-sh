import { Send } from 'lucide-react'
import { useGrid } from '@/components/data-grid/compound'
import { useWindowSize } from '@/components/data-grid/hooks/use-window-size'
import { Button } from '@/components/ui/button'
import { useModuleData } from '../../hooks/use-data'
import { PageHeader } from '../_shared/page-header'
import { StatusBadge } from '../_shared/status-badge'

interface GenJournalLine {
	id: string
	journalTemplate: string
	journalBatch: string
	lineNo: number
	postingDate: string
	documentType:
		| 'PAYMENT'
		| 'INVOICE'
		| 'REFUND'
		| 'TRANSFER'
		| 'PAYROLL'
		| 'ADJUSTMENT'
	documentNo: string
	accountType:
		| 'GL_ACCOUNT'
		| 'BANK_ACCOUNT'
		| 'CUSTOMER'
		| 'VENDOR'
		| 'EMPLOYEE'
	accountNo: string
	balancingAccountType: string
	balancingAccountNo: string
	description: string
	debitAmount: number
	creditAmount: number
	status: 'OPEN' | 'APPROVED' | 'POSTED' | 'VOIDED'
	sourceModule: string
}

export default function PaymentJournal() {
	const windowSize = useWindowSize({ defaultHeight: 900, defaultWidth: 1280 })

	const { items, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
		useModuleData<'flow', GenJournalLine>('flow', 'journalLines', 'overview')

	const DataGrid = useGrid(
		() => ({
			data: items,
			isLoading,
			readOnly: false,
			enableSearch: true,
			infiniteScroll: {
				loadMore: fetchNextPage,
				hasMore: hasNextPage,
				isLoading: isFetchingNextPage,
			},
		}),
		[items, isLoading, hasNextPage, isFetchingNextPage],
	)

	return (
		<div className='space-y-6'>
			<PageHeader
				title='Payment Journal'
				description='Create and manage payment journal entries for posting.'
				actions={
					<Button size='sm'>
						<Send className='mr-1.5 size-3.5' aria-hidden='true' />
						Post All
					</Button>
				}
			/>

			<DataGrid variant='card' height={Math.max(windowSize.height - 240, 420)}>
				<DataGrid.Header>
					<DataGrid.Toolbar filter sort search />
				</DataGrid.Header>
				<DataGrid.Columns>
					<DataGrid.Column
						accessorKey='postingDate'
						title='Posting Date'
						cellVariant='date'
					/>
					<DataGrid.Column
						accessorKey='documentType'
						title='Document Type'
						cellVariant='select'
					/>
					<DataGrid.Column accessorKey='documentNo' title='Document No.' />
					<DataGrid.Column
						accessorKey='accountType'
						title='Account Type'
						cellVariant='select'
					/>
					<DataGrid.Column accessorKey='accountNo' title='Account No.' />
					<DataGrid.Column
						accessorKey='balancingAccountType'
						title='Bal. Account Type'
						cellVariant='select'
					/>
					<DataGrid.Column
						accessorKey='balancingAccountNo'
						title='Bal. Account No.'
					/>
					<DataGrid.Column accessorKey='description' title='Description' />
					<DataGrid.Column
						accessorKey='debitAmount'
						title='Debit Amount'
						cellVariant='number'
					/>
					<DataGrid.Column
						accessorKey='creditAmount'
						title='Credit Amount'
						cellVariant='number'
					/>
					<DataGrid.Column
						accessorKey='status'
						title='Status'
						cell={({ row }) => <StatusBadge status={row.original.status} />}
					/>
				</DataGrid.Columns>
			</DataGrid>
		</div>
	)
}
