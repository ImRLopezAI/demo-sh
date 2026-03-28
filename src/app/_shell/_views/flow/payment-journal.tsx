import { $rpc, useMutation, useQueryClient } from '@lib/rpc'
import { Send } from 'lucide-react'
import * as React from 'react'
import { useGrid } from '@/components/data-grid/compound'
import { useWindowSize } from '@/components/data-grid/hooks/use-window-size'
import { Button } from '@/components/ui/button'
import { useModuleData } from '../../hooks/use-data'
import { PageHeader } from '../_shared/page-header'
import type { SpecWorkbenchProps } from '../_shared/spec-workbench-helpers'
import { StatusBadge } from '../_shared/status-badge'

interface GenJournalLine {
	_id: string
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

interface JournalBatchResult {
	processed: number
	posted: number
	skipped: number
	failed: number
	postedIds: string[]
	skippedEntries: Array<{ id: string; status: string; reason: string }>
	failedEntries: Array<{ id: string; status: string; reason: string }>
	postedAt: string
}

interface PaymentJournalProps {
	specProps?: SpecWorkbenchProps
}

export default function PaymentJournal({
	specProps,
}: PaymentJournalProps = {}) {
	const windowSize = useWindowSize({ defaultHeight: 900, defaultWidth: 1280 })
	const queryClient = useQueryClient()
	const [batchResult, setBatchResult] =
		React.useState<JournalBatchResult | null>(null)

	const { items, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
		useModuleData<'flow', GenJournalLine>('flow', 'journalLines', 'overview')

	const postableCount = React.useMemo(
		() =>
			items.filter(
				(line) => line.status === 'OPEN' || line.status === 'APPROVED',
			).length,
		[items],
	)

	const postJournalBatch = useMutation({
		...$rpc.flow.journalLines.postJournalBatch.mutationOptions({
			onSuccess: (result) => {
				setBatchResult(result as JournalBatchResult)
				queryClient.invalidateQueries({
					queryKey: $rpc.flow.journalLines.key(),
				})
				queryClient.invalidateQueries({
					queryKey: $rpc.flow.glEntries.key(),
				})
				queryClient.invalidateQueries({
					queryKey: $rpc.flow.bankLedgerEntries.key(),
				})
			},
		}),
	})

	const handlePostAll = async () => {
		const result = await postJournalBatch.mutateAsync({})
		setBatchResult(result as JournalBatchResult)
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
		[items, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage],
	)

	return (
		<div className='space-y-8 pb-8'>
			<PageHeader
				title={specProps?.title ?? 'Payment Journal'}
				description={
					specProps?.description ??
					'Create and manage payment journal entries for posting.'
				}
				actions={
					<Button
						size='sm'
						onClick={() => {
							void handlePostAll()
						}}
						disabled={postJournalBatch.isPending || postableCount === 0}
						className='shadow-sm transition-all hover:shadow-md'
					>
						<Send className='mr-1.5 size-3.5' aria-hidden='true' />
						{postJournalBatch.isPending ? 'Posting...' : 'Post All'}
					</Button>
				}
			/>

			{batchResult && (
				<div className='space-y-3 rounded-xl border border-border/50 bg-muted/20 p-4'>
					<p className='font-medium text-sm'>Batch Posting Result</p>
					<p className='text-muted-foreground text-sm'>
						{batchResult.posted} posted, {batchResult.skipped} skipped,{' '}
						{batchResult.failed} failed out of {batchResult.processed} journal
						lines.
					</p>
					{batchResult.failedEntries.length > 0 && (
						<div className='space-y-2'>
							<p className='font-medium text-xs'>Failures</p>
							<ul className='space-y-1 text-muted-foreground text-xs'>
								{batchResult.failedEntries.slice(0, 5).map((entry) => (
									<li key={entry.id}>
										{entry.id}: {entry.reason}
									</li>
								))}
							</ul>
							{batchResult.failedEntries.length > 5 && (
								<p className='text-muted-foreground text-xs'>
									+ {batchResult.failedEntries.length - 5} more failed lines
								</p>
							)}
						</div>
					)}
				</div>
			)}

			<div className='overflow-hidden rounded-xl border border-border/50 bg-background/50 shadow-sm backdrop-blur-xl'>
				<DataGrid
					variant='flat'
					height={Math.max(windowSize.height - 150, 400)}
				>
					<DataGrid.Header className='border-border/50 border-b bg-muted/20 px-6 py-4'>
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
		</div>
	)
}
