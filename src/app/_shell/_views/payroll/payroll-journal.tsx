import { Send } from 'lucide-react'
import { useGrid } from '@/components/data-grid/compound'
import { useWindowSize } from '@/components/data-grid/hooks/use-window-size'
import { Button } from '@/components/ui/button'
import { useModuleData } from '../../hooks/use-data'
import { PageHeader } from '../_shared/page-header'
import { StatusBadge } from '../_shared/status-badge'
import { useEntityMutations } from '../_shared/use-entity'

interface GenJournalLine {
	id: string
	journalTemplate: string
	journalBatch: string
	lineNo: number
	postingDate?: string | null
	documentType:
		| 'PAYMENT'
		| 'INVOICE'
		| 'REFUND'
		| 'TRANSFER'
		| 'PAYROLL'
		| 'ADJUSTMENT'
	documentNo?: string | null
	accountType:
		| 'GL_ACCOUNT'
		| 'BANK_ACCOUNT'
		| 'CUSTOMER'
		| 'VENDOR'
		| 'EMPLOYEE'
	accountNo: string
	balancingAccountType?: string | null
	balancingAccountNo?: string | null
	description?: string | null
	debitAmount: number
	creditAmount: number
	status: 'OPEN' | 'APPROVED' | 'POSTED' | 'VOIDED'
	sourceModule: string
}

export default function PayrollJournal() {
	const windowSize = useWindowSize({ defaultHeight: 900, defaultWidth: 1280 })

	const { items, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
		useModuleData('payroll', 'genJournalLines')

	const { transitionStatus } = useEntityMutations('payroll', 'genJournalLines')

	const handlePostAll = async () => {
		const openLines = items.filter((line) => line.status === 'OPEN')
		for (const line of openLines) {
			await transitionStatus.mutateAsync({
				id: line.id,
				toStatus: 'POSTED',
			})
		}
	}

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
		<div className='space-y-4'>
			<PageHeader
				title='Payroll Journal'
				description='Review and post payroll journal entries.'
				actions={
					<Button
						size='sm'
						onClick={handlePostAll}
						disabled={transitionStatus.isPending}
					>
						<Send className='mr-1.5 size-3.5' aria-hidden='true' />
						Post All
					</Button>
				}
			/>

			<DataGrid variant='dense' height={Math.max(windowSize.height - 240, 420)}>
				<DataGrid.Header>
					<DataGrid.Toolbar filter sort search export />
				</DataGrid.Header>

				<DataGrid.Columns>
					<DataGrid.Column<GenJournalLine>
						accessorKey='journalTemplate'
						title='Template'
					/>
					<DataGrid.Column<GenJournalLine>
						accessorKey='journalBatch'
						title='Batch'
					/>
					<DataGrid.Column<GenJournalLine>
						accessorKey='lineNo'
						title='Line No.'
						cellVariant='number'
					/>
					<DataGrid.Column<GenJournalLine>
						accessorKey='postingDate'
						title='Posting Date'
						cellVariant='date'
					/>
					<DataGrid.Column<GenJournalLine>
						accessorKey='documentType'
						title='Document Type'
						cellVariant='select'
						opts={{
							options: [
								{ label: 'Payment', value: 'PAYMENT' },
								{ label: 'Invoice', value: 'INVOICE' },
								{ label: 'Refund', value: 'REFUND' },
								{ label: 'Transfer', value: 'TRANSFER' },
								{ label: 'Payroll', value: 'PAYROLL' },
								{ label: 'Adjustment', value: 'ADJUSTMENT' },
							],
						}}
					/>
					<DataGrid.Column<GenJournalLine>
						accessorKey='documentNo'
						title='Document No.'
					/>
					<DataGrid.Column<GenJournalLine>
						accessorKey='accountType'
						title='Account Type'
						cellVariant='select'
						opts={{
							options: [
								{ label: 'G/L Account', value: 'GL_ACCOUNT' },
								{ label: 'Bank Account', value: 'BANK_ACCOUNT' },
								{ label: 'Customer', value: 'CUSTOMER' },
								{ label: 'Vendor', value: 'VENDOR' },
								{ label: 'Employee', value: 'EMPLOYEE' },
							],
						}}
					/>
					<DataGrid.Column<GenJournalLine>
						accessorKey='accountNo'
						title='Account No.'
					/>
					<DataGrid.Column<GenJournalLine>
						accessorKey='balancingAccountType'
						title='Bal. Account Type'
					/>
					<DataGrid.Column<GenJournalLine>
						accessorKey='balancingAccountNo'
						title='Bal. Account No.'
					/>
					<DataGrid.Column<GenJournalLine>
						accessorKey='description'
						title='Description'
					/>
					<DataGrid.Column<GenJournalLine>
						accessorKey='debitAmount'
						title='Debit Amount'
						cellVariant='number'
					/>
					<DataGrid.Column<GenJournalLine>
						accessorKey='creditAmount'
						title='Credit Amount'
						cellVariant='number'
					/>
					<DataGrid.Column<GenJournalLine>
						accessorKey='status'
						title='Status'
						cell={({ row }) => <StatusBadge status={row.original.status} />}
					/>
					<DataGrid.Column<GenJournalLine>
						accessorKey='sourceModule'
						title='Source Module'
					/>
				</DataGrid.Columns>
			</DataGrid>
		</div>
	)
}
