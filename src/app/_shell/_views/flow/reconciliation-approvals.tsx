import { $rpc, useMutation, useQuery, useQueryClient } from '@lib/rpc'
import { CheckCircle2, ShieldCheck, TrendingUp, Workflow } from 'lucide-react'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useModuleData } from '../../hooks/use-data'
import { PageHeader } from '../_shared/page-header'
import type { SpecWorkbenchProps } from '../_shared/spec-workbench-helpers'
import { StatusBadge } from '../_shared/status-badge'
import { useEntityMutations } from '../_shared/use-entity'

type BankLedgerEntry = {
	_id: string
	entryNo: number
	postingDate?: string | null
	documentType: string
	documentNo?: string | null
	amount: number
	reconciliationStatus: 'OPEN' | 'MATCHED' | 'RECONCILED' | 'EXCEPTION'
	statusReason?: string | null
}

type JournalLine = {
	_id: string
	journalTemplate: string
	journalBatch: string
	lineNo: number
	documentNo?: string | null
	accountNo: string
	debitAmount: number
	creditAmount: number
	status: 'OPEN' | 'APPROVED' | 'POSTED' | 'VOIDED'
}

interface ReconciliationApprovalsViewProps {
	specProps?: SpecWorkbenchProps
}

export default function ReconciliationApprovalsView({
	specProps,
}: ReconciliationApprovalsViewProps = {}) {
	const queryClient = useQueryClient()
	const [transitionReason, setTransitionReason] = React.useState(
		'Reviewed in reconciliation console',
	)
	const [horizonDays, setHorizonDays] = React.useState('30')
	const [lookbackDays, setLookbackDays] = React.useState('60')
	const [adverseThreshold, setAdverseThreshold] = React.useState('15')
	const [bestMultiplier, setBestMultiplier] = React.useState('1.1')
	const [worstMultiplier, setWorstMultiplier] = React.useState('0.8')

	const bankLedgerMutations = useEntityMutations('flow', 'bankLedgerEntries')
	const journalMutations = useEntityMutations('flow', 'journalLines')

	const postJournalBatch = useMutation({
		...$rpc.flow.journalLines.postJournalBatch.mutationOptions({
			onSuccess: () => {
				void queryClient.invalidateQueries({
					queryKey: $rpc.flow.journalLines.key(),
				})
				void queryClient.invalidateQueries({
					queryKey: $rpc.flow.bankLedgerEntries.key(),
				})
				void queryClient.invalidateQueries({
					queryKey: $rpc.flow.glEntries.key(),
				})
			},
		}),
	})

	const { DataGrid: BankGrid, windowSize } = useModuleData<
		'flow',
		BankLedgerEntry
	>('flow', 'bankLedgerEntries', 'overview')
	const { DataGrid: JournalGrid } = useModuleData<'flow', JournalLine>(
		'flow',
		'journalLines',
		'overview',
	)

	const forecastQuery = useQuery(
		$rpc.flow.analytics.cashForecast.queryOptions({
			input: {
				horizonDays: Math.min(
					90,
					Math.max(7, Number.parseInt(horizonDays, 10) || 30),
				),
				lookbackDays: Math.min(
					180,
					Math.max(14, Number.parseInt(lookbackDays, 10) || 60),
				),
				adverseVarianceThresholdPct: Math.min(
					75,
					Math.max(5, Number.parseInt(adverseThreshold, 10) || 15),
				),
			},
		}),
	)

	const forecast = forecastQuery.data
	const bestFactor = Number.parseFloat(bestMultiplier) || 1
	const worstFactor = Number.parseFloat(worstMultiplier) || 1

	const scenarioRows = React.useMemo(() => {
		const points = forecast?.forecast ?? []
		return points.slice(0, 10).map((point) => ({
			date: point.date,
			base: point.forecastBalance,
			best: Number((point.forecastBalance * bestFactor).toFixed(2)),
			worst: Number((point.forecastBalance * worstFactor).toFixed(2)),
		}))
	}, [bestFactor, forecast?.forecast, worstFactor])

	const handleBankTransition = React.useCallback(
		async (id: string, toStatus: 'MATCHED' | 'EXCEPTION' | 'RECONCILED') => {
			await bankLedgerMutations.transitionStatus.mutateAsync({
				id,
				toStatus,
				reason: transitionReason || undefined,
			})
		},
		[bankLedgerMutations.transitionStatus, transitionReason],
	)

	const handleJournalTransition = React.useCallback(
		async (id: string, toStatus: 'APPROVED' | 'POSTED' | 'VOIDED') => {
			await journalMutations.transitionStatus.mutateAsync({
				id,
				toStatus,
				reason: transitionReason || undefined,
			})
		},
		[journalMutations.transitionStatus, transitionReason],
	)

	return (
		<div className='space-y-8 pb-8'>
			<PageHeader
				title={
					specProps?.title ?? 'Reconciliation, Approvals & Scenario Planner'
				}
				description={
					specProps?.description ??
					'Operate reconciliation transitions, enforce maker-checker workflow, and compare cash scenarios.'
				}
			/>

			<div className='grid gap-6 xl:grid-cols-2'>
				<Card className='border-lime-500/30 bg-gradient-to-br from-lime-500/10 via-background to-background'>
					<CardHeader>
						<CardTitle className='flex items-center gap-2'>
							<Workflow className='size-4' />
							Reconciliation Console
						</CardTitle>
						<CardDescription>
							Transition bank ledger entries through
							OPEN/MATCHED/EXCEPTION/RECONCILED.
						</CardDescription>
					</CardHeader>
					<CardContent className='space-y-3'>
						<Label>Reason / Comment</Label>
						<Input
							value={transitionReason}
							onChange={(event) => setTransitionReason(event.target.value)}
						/>
					</CardContent>
				</Card>

				<Card className='border-sky-500/30 bg-gradient-to-br from-sky-500/10 via-background to-background'>
					<CardHeader>
						<CardTitle className='flex items-center gap-2'>
							<ShieldCheck className='size-4' />
							Maker-Checker Journal Controls
						</CardTitle>
						<CardDescription>
							Approve lines before posting and use guarded batch posting for
							finalization.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Button
							variant='outline'
							onClick={() => {
								void postJournalBatch.mutateAsync({})
							}}
							disabled={postJournalBatch.isPending}
						>
							<CheckCircle2 className='mr-1.5 size-4' />
							Post Approved/Open Batch
						</Button>
					</CardContent>
				</Card>
			</div>

			<div className='grid gap-6 xl:grid-cols-2'>
				<Card>
					<CardHeader>
						<CardTitle>Bank Reconciliation Queue</CardTitle>
					</CardHeader>
					<CardContent>
						<div className='overflow-hidden rounded-xl border border-border/60'>
							<BankGrid
								variant='flat'
								height={Math.max(windowSize.height - 340, 280)}
							>
								<BankGrid.Header className='border-border/50 border-b bg-muted/20 px-4 py-3'>
									<BankGrid.Toolbar filter sort search export />
								</BankGrid.Header>
								<BankGrid.Columns>
									<BankGrid.Column
										accessorKey='entryNo'
										title='Entry'
										cellVariant='number'
									/>
									<BankGrid.Column accessorKey='documentNo' title='Document' />
									<BankGrid.Column
										accessorKey='postingDate'
										title='Posting Date'
										cellVariant='date'
									/>
									<BankGrid.Column
										accessorKey='amount'
										title='Amount'
										cellVariant='number'
										formatter={(value, formatter) =>
											formatter.currency(value.amount)
										}
									/>
									<BankGrid.Column
										accessorKey='reconciliationStatus'
										title='Status'
										cell={({ row }) => (
											<StatusBadge status={row.original.reconciliationStatus} />
										)}
									/>
									<BankGrid.Column
										id='actions'
										title='Actions'
										cell={({ row }) => (
											<div className='flex flex-wrap gap-1'>
												<Button
													size='sm'
													variant='outline'
													onClick={() => {
														void handleBankTransition(
															row.original._id,
															'MATCHED',
														)
													}}
													disabled={
														row.original.reconciliationStatus !== 'OPEN'
													}
												>
													Match
												</Button>
												<Button
													size='sm'
													variant='outline'
													onClick={() => {
														void handleBankTransition(
															row.original._id,
															'EXCEPTION',
														)
													}}
													disabled={
														row.original.reconciliationStatus === 'RECONCILED'
													}
												>
													Exception
												</Button>
												<Button
													size='sm'
													variant='outline'
													onClick={() => {
														void handleBankTransition(
															row.original._id,
															'RECONCILED',
														)
													}}
													disabled={
														row.original.reconciliationStatus !== 'MATCHED'
													}
												>
													Reconcile
												</Button>
											</div>
										)}
									/>
								</BankGrid.Columns>
							</BankGrid>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Journal Approval Queue</CardTitle>
					</CardHeader>
					<CardContent>
						<div className='overflow-hidden rounded-xl border border-border/60'>
							<JournalGrid
								variant='flat'
								height={Math.max(windowSize.height - 340, 280)}
							>
								<JournalGrid.Header className='border-border/50 border-b bg-muted/20 px-4 py-3'>
									<JournalGrid.Toolbar filter sort search export />
								</JournalGrid.Header>
								<JournalGrid.Columns>
									<JournalGrid.Column
										accessorKey='journalTemplate'
										title='Template'
									/>
									<JournalGrid.Column
										accessorKey='journalBatch'
										title='Batch'
									/>
									<JournalGrid.Column
										accessorKey='lineNo'
										title='Line'
										cellVariant='number'
									/>
									<JournalGrid.Column
										accessorKey='documentNo'
										title='Document'
									/>
									<JournalGrid.Column accessorKey='accountNo' title='Account' />
									<JournalGrid.Column
										accessorKey='status'
										title='Status'
										cell={({ row }) => (
											<StatusBadge status={row.original.status} />
										)}
									/>
									<JournalGrid.Column
										id='actions'
										title='Actions'
										cell={({ row }) => (
											<div className='flex flex-wrap gap-1'>
												<Button
													size='sm'
													variant='outline'
													onClick={() => {
														void handleJournalTransition(
															row.original._id,
															'APPROVED',
														)
													}}
													disabled={row.original.status !== 'OPEN'}
												>
													Approve
												</Button>
												<Button
													size='sm'
													variant='outline'
													onClick={() => {
														void handleJournalTransition(
															row.original._id,
															'POSTED',
														)
													}}
													disabled={
														!['OPEN', 'APPROVED'].includes(row.original.status)
													}
												>
													Post
												</Button>
											</div>
										)}
									/>
								</JournalGrid.Columns>
							</JournalGrid>
						</div>
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className='flex items-center gap-2'>
						<TrendingUp className='size-4' />
						Scenario Cash Planner
					</CardTitle>
					<CardDescription>
						Compare base forecast with non-destructive best/worst overlays.
					</CardDescription>
				</CardHeader>
				<CardContent className='space-y-4'>
					<div className='grid gap-3 md:grid-cols-5'>
						<div className='space-y-2'>
							<Label>Horizon</Label>
							<Input
								value={horizonDays}
								onChange={(event) => setHorizonDays(event.target.value)}
							/>
						</div>
						<div className='space-y-2'>
							<Label>Lookback</Label>
							<Input
								value={lookbackDays}
								onChange={(event) => setLookbackDays(event.target.value)}
							/>
						</div>
						<div className='space-y-2'>
							<Label>Adverse %</Label>
							<Input
								value={adverseThreshold}
								onChange={(event) => setAdverseThreshold(event.target.value)}
							/>
						</div>
						<div className='space-y-2'>
							<Label>Best Multiplier</Label>
							<Input
								value={bestMultiplier}
								onChange={(event) => setBestMultiplier(event.target.value)}
							/>
						</div>
						<div className='space-y-2'>
							<Label>Worst Multiplier</Label>
							<Input
								value={worstMultiplier}
								onChange={(event) => setWorstMultiplier(event.target.value)}
							/>
						</div>
					</div>

					<div className='overflow-hidden rounded-xl border border-border/60'>
						<table className='w-full text-sm'>
							<thead className='bg-muted/30 text-left'>
								<tr>
									<th className='px-3 py-2'>Date</th>
									<th className='px-3 py-2'>Base</th>
									<th className='px-3 py-2'>Best</th>
									<th className='px-3 py-2'>Worst</th>
								</tr>
							</thead>
							<tbody>
								{scenarioRows.map((row) => (
									<tr key={row.date} className='border-border/40 border-t'>
										<td className='px-3 py-2'>{row.date}</td>
										<td className='px-3 py-2'>{row.base.toFixed(2)}</td>
										<td className='px-3 py-2 text-emerald-600'>
											{row.best.toFixed(2)}
										</td>
										<td className='px-3 py-2 text-rose-600'>
											{row.worst.toFixed(2)}
										</td>
									</tr>
								))}
								{scenarioRows.length === 0 ? (
									<tr>
										<td className='px-3 py-2 text-muted-foreground' colSpan={4}>
											No forecast points yet.
										</td>
									</tr>
								) : null}
							</tbody>
						</table>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
