import { $rpc, useMutation, useQueryClient } from '@lib/rpc'
import { Play, Send } from 'lucide-react'
import * as React from 'react'
import { useGrid } from '@/components/data-grid/compound'
import { useWindowSize } from '@/components/data-grid/hooks/use-window-size'
import { Button } from '@/components/ui/button'
import { useModuleData } from '../../hooks/use-data'
import { PageHeader } from '../_shared/page-header'
import { StatusBadge } from '../_shared/status-badge'
import { useEntityMutations } from '../_shared/use-entity'

interface GenJournalLine {
	_id: string
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

interface PayrollRun {
	_id: string
	runNo: string
	status: 'DRAFT' | 'CALCULATED' | 'POSTED' | 'PAID' | 'CANCELED'
	periodStart?: string | null
	periodEnd?: string | null
	employeeCount: number
	grossAmount: number
	deductionAmount: number
	netAmount: number
}

interface RunExecutionResult {
	runId: string
	runNo: string
	status: string
	employeeCount: number
	netAmount: number
}

export default function PayrollJournal() {
	const windowSize = useWindowSize({ defaultHeight: 900, defaultWidth: 1280 })
	const queryClient = useQueryClient()
	const [runResult, setRunResult] = React.useState<RunExecutionResult | null>(
		null,
	)

	const { items, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
		useModuleData<'payroll', GenJournalLine>(
			'payroll',
			'journalLines',
			'overview',
		)

	const { items: payrollRuns } = useModuleData<'payroll', PayrollRun>(
		'payroll',
		'payrollRuns',
		'overview',
		{ pageSize: 25 },
	)

	const { create: createRun } = useEntityMutations('payroll', 'payrollRuns')

	const invalidatePayrollQueries = React.useCallback(() => {
		queryClient.invalidateQueries({ queryKey: $rpc.payroll.payrollRuns.key() })
		queryClient.invalidateQueries({ queryKey: $rpc.payroll.journalLines.key() })
		queryClient.invalidateQueries({
			queryKey: $rpc.payroll.employeeLedger.key(),
		})
		queryClient.invalidateQueries({ queryKey: $rpc.payroll.glEntries.key() })
		queryClient.invalidateQueries({
			queryKey: $rpc.payroll.bankLedgerEntries.key(),
		})
	}, [queryClient])

	const calculateRun = useMutation({
		...$rpc.payroll.payrollRuns.calculateRun.mutationOptions({
			onSuccess: invalidatePayrollQueries,
		}),
	})
	const postRun = useMutation({
		...$rpc.payroll.payrollRuns.postRun.mutationOptions({
			onSuccess: invalidatePayrollQueries,
		}),
	})
	const markRunPaid = useMutation({
		...$rpc.payroll.payrollRuns.markRunPaid.mutationOptions({
			onSuccess: invalidatePayrollQueries,
		}),
	})

	const latestRun = payrollRuns[0]

	const handleRunCurrentPayroll = async () => {
		const now = new Date()
		const periodStart = new Date(
			now.getFullYear(),
			now.getMonth(),
			1,
		).toISOString()
		const periodEnd = new Date(
			now.getFullYear(),
			now.getMonth() + 1,
			0,
			23,
			59,
			59,
		).toISOString()

		const created = await createRun.mutateAsync({
			runNo: '',
			status: 'DRAFT',
			periodStart,
			periodEnd,
			scopeType: 'ALL_ACTIVE',
			currency: 'USD',
			employeeCount: 0,
			grossAmount: 0,
			deductionAmount: 0,
			netAmount: 0,
			postedJournalCount: 0,
			disbursementCount: 0,
		})
		const calculated = await calculateRun.mutateAsync({ runId: created._id })
		const posted = await postRun.mutateAsync({ runId: created._id })

		setRunResult({
			runId: created._id,
			runNo: created.runNo,
			status: posted.status,
			employeeCount: calculated.employeeCount,
			netAmount: calculated.netAmount,
		})
	}

	const handleMarkLatestRunPaid = async () => {
		if (!latestRun || latestRun.status !== 'POSTED') return
		const paid = await markRunPaid.mutateAsync({ runId: latestRun._id })
		setRunResult({
			runId: latestRun._id,
			runNo: latestRun.runNo,
			status: paid.status,
			employeeCount: latestRun.employeeCount,
			netAmount: latestRun.netAmount,
		})
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

	const isRunBusy =
		createRun.isPending || calculateRun.isPending || postRun.isPending

	return (
		<div className='space-y-8 pb-8'>
			<PageHeader
				title='Payroll Journal'
				description='Review payroll journal entries and execute payroll cycles.'
				actions={
					<div className='flex flex-wrap items-center gap-2'>
						<Button
							size='sm'
							onClick={() => {
								void handleRunCurrentPayroll()
							}}
							disabled={isRunBusy}
							className='shadow-sm transition-all hover:shadow-md'
						>
							<Play className='mr-1.5 size-3.5' aria-hidden='true' />
							{isRunBusy ? 'Running...' : 'Run Current Payroll'}
						</Button>
						<Button
							size='sm'
							variant='outline'
							onClick={() => {
								void handleMarkLatestRunPaid()
							}}
							disabled={
								markRunPaid.isPending ||
								!latestRun ||
								latestRun.status !== 'POSTED'
							}
							className='shadow-sm transition-all hover:shadow-md'
						>
							<Send className='mr-1.5 size-3.5' aria-hidden='true' />
							Mark Latest Run Paid
						</Button>
					</div>
				}
			/>

			{(runResult || latestRun) && (
				<div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
					{runResult && (
						<div className='rounded-xl border border-border/50 bg-muted/20 p-4'>
							<p className='font-medium text-sm'>Last Execution</p>
							<p className='mt-1 text-muted-foreground text-sm'>
								Run {runResult.runNo} is {runResult.status.toLowerCase()} for{' '}
								{runResult.employeeCount} employees. Net amount:{' '}
								{runResult.netAmount.toLocaleString('en-US', {
									style: 'currency',
									currency: 'USD',
								})}
							</p>
						</div>
					)}
					{latestRun && (
						<div className='rounded-xl border border-border/50 bg-background/60 p-4'>
							<p className='font-medium text-sm'>Latest Payroll Run</p>
							<div className='mt-2 flex items-center gap-2'>
								<StatusBadge status={latestRun.status} />
								<span className='text-muted-foreground text-xs'>
									{latestRun.runNo}
								</span>
							</div>
							<p className='mt-1 text-muted-foreground text-xs'>
								{latestRun.employeeCount} employees, net{' '}
								{latestRun.netAmount.toLocaleString('en-US', {
									style: 'currency',
									currency: 'USD',
								})}
							</p>
						</div>
					)}
				</div>
			)}

			<div className='overflow-hidden rounded-xl border border-border/50 bg-background/50 shadow-sm backdrop-blur-xl'>
				<DataGrid
					variant='flat'
					height={Math.max(windowSize.height - 240, 400)}
				>
					<DataGrid.Header className='border-border/50 border-b bg-muted/20 px-6 py-4'>
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
		</div>
	)
}
