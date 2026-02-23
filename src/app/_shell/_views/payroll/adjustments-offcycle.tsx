import { $rpc, useMutation, useQueryClient } from '@lib/rpc'
import {
	ClipboardCheck,
	FileSpreadsheet,
	Repeat2,
	Sparkles,
} from 'lucide-react'
import * as React from 'react'
import { useGrid } from '@/components/data-grid/compound'
import { useWindowSize } from '@/components/data-grid/hooks/use-window-size'
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useModuleList } from '../../hooks/use-data'
import { PageHeader } from '../_shared/page-header'
import { StatusBadge } from '../_shared/status-badge'
import { useEntityMutations } from '../_shared/use-entity'

type PayrollRun = {
	_id: string
	runNo: string
	status: 'DRAFT' | 'CALCULATED' | 'POSTED' | 'PAID' | 'CANCELED'
	periodStart?: string | null
	periodEnd?: string | null
	scopeType: 'ALL_ACTIVE' | 'SELECTED'
	selectedEmployeeIds?: string | null
	employeeCount: number
	netAmount: number
	adjustmentCount: number
	statutoryReportCount: number
	statusReason?: string | null
}

type Employee = {
	_id: string
	employeeNo?: string
	fullName?: string
	status?: 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED'
}

type AdjustmentRow = {
	_id: string
	adjustmentNo: string
	runId: string
	employeeId: string
	adjustmentType: 'CORRECTION' | 'BONUS' | 'DEDUCTION'
	amountDelta: number
	reason: string
	appliedAt?: string | null
}

type StatutoryReportRow = {
	_id: string
	reportNo: string
	runId: string
	reportType: 'TAX_SUMMARY' | 'DEDUCTION_SUMMARY' | 'PAYMENT_FILE'
	status: 'GENERATED' | 'VOIDED'
	periodStart?: string | null
	periodEnd?: string | null
	generatedAt?: string | null
	artifactJson: string
}

type RunKind = 'REGULAR' | 'OFF_CYCLE' | 'RETRO'

const kindDescriptor: Record<RunKind, string> = {
	REGULAR: 'Regular period run',
	OFF_CYCLE: 'Outside normal payroll cycle',
	RETRO: 'Retroactive correction run',
}

export default function AdjustmentsOffcycleView() {
	const queryClient = useQueryClient()
	const windowSize = useWindowSize({ defaultWidth: 1280, defaultHeight: 900 })

	const [runKind, setRunKind] = React.useState<RunKind>('OFF_CYCLE')
	const [sourceRunId, setSourceRunId] = React.useState('none')
	const [runEmployeeId, setRunEmployeeId] = React.useState('all')
	const [runRationale, setRunRationale] = React.useState('')
	const [selectedRunId, setSelectedRunId] = React.useState('')
	const [adjustmentEmployeeId, setAdjustmentEmployeeId] = React.useState('')
	const [adjustmentType, setAdjustmentType] = React.useState<
		'CORRECTION' | 'BONUS' | 'DEDUCTION'
	>('CORRECTION')
	const [adjustmentAmount, setAdjustmentAmount] = React.useState('0')
	const [adjustmentReason, setAdjustmentReason] = React.useState('')
	const [bankAccountId, setBankAccountId] = React.useState('')
	const [reportTaxSummary, setReportTaxSummary] = React.useState(true)
	const [reportDeductionSummary, setReportDeductionSummary] =
		React.useState(true)
	const [reportPaymentFile, setReportPaymentFile] = React.useState(true)

	const runsQuery = useModuleList('payroll', 'payrollRuns', { limit: 200 })
	const employeesQuery = useModuleList('payroll', 'employees', { limit: 250 })
	const runAdjustmentsQuery = useModuleList('payroll', 'runAdjustments', {
		limit: 300,
	})
	const statutoryReportsQuery = useModuleList('payroll', 'statutoryReports', {
		limit: 300,
	})

	const payrollRuns = (runsQuery.data?.items ?? []) as PayrollRun[]
	const employees = (employeesQuery.data?.items ?? []) as Employee[]
	const adjustments = (runAdjustmentsQuery.data?.items ?? []) as AdjustmentRow[]
	const reports = (statutoryReportsQuery.data?.items ??
		[]) as StatutoryReportRow[]

	const selectedRun = payrollRuns.find((run) => run._id === selectedRunId)
	const selectedRunAdjustments = adjustments.filter(
		(row) => row.runId === selectedRunId,
	)
	const selectedRunReports = reports.filter(
		(row) => row.runId === selectedRunId,
	)

	const payrollRunsMutations = useEntityMutations('payroll', 'payrollRuns')

	const invalidatePayroll = React.useCallback(() => {
		void queryClient.invalidateQueries({
			queryKey: $rpc.payroll.payrollRuns.key(),
		})
		void queryClient.invalidateQueries({
			queryKey: $rpc.payroll.runAdjustments.key(),
		})
		void queryClient.invalidateQueries({
			queryKey: $rpc.payroll.statutoryReports.key(),
		})
		void queryClient.invalidateQueries({
			queryKey: $rpc.payroll.journalLines.key(),
		})
		void queryClient.invalidateQueries({
			queryKey: $rpc.payroll.employeeLedger.key(),
		})
		void queryClient.invalidateQueries({
			queryKey: $rpc.payroll.bankLedgerEntries.key(),
		})
		void queryClient.invalidateQueries({
			queryKey: $rpc.payroll.glEntries.key(),
		})
	}, [queryClient])

	const calculateRun = useMutation({
		...$rpc.payroll.payrollRuns.calculateRun.mutationOptions({
			onSuccess: () => {
				invalidatePayroll()
			},
		}),
	})
	const applyAdjustment = useMutation({
		...$rpc.payroll.payrollRuns.applyAdjustment.mutationOptions({
			onSuccess: () => {
				invalidatePayroll()
			},
		}),
	})
	const generateReports = useMutation({
		...$rpc.payroll.payrollRuns.generateStatutoryReports.mutationOptions({
			onSuccess: () => {
				invalidatePayroll()
			},
		}),
	})
	const postRun = useMutation({
		...$rpc.payroll.payrollRuns.postRun.mutationOptions({
			onSuccess: () => {
				invalidatePayroll()
			},
		}),
	})
	const markRunPaid = useMutation({
		...$rpc.payroll.payrollRuns.markRunPaid.mutationOptions({
			onSuccess: () => {
				invalidatePayroll()
			},
		}),
	})

	const RunsGrid = useGrid(
		() => ({
			data: payrollRuns,
			isLoading: runsQuery.isLoading,
			readOnly: true,
			enableSearch: true,
		}),
		[payrollRuns, runsQuery.isLoading],
	)

	const AdjustmentsGrid = useGrid(
		() => ({
			data: selectedRunAdjustments,
			isLoading: runAdjustmentsQuery.isLoading,
			readOnly: true,
			enableSearch: true,
		}),
		[selectedRunAdjustments, runAdjustmentsQuery.isLoading],
	)

	const ReportsGrid = useGrid(
		() => ({
			data: selectedRunReports,
			isLoading: statutoryReportsQuery.isLoading,
			readOnly: true,
			enableSearch: true,
		}),
		[selectedRunReports, statutoryReportsQuery.isLoading],
	)

	const createOffcycleRun = React.useCallback(async () => {
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

		const sourceNo =
			sourceRunId !== 'none'
				? (payrollRuns.find((run) => run._id === sourceRunId)?.runNo ??
					sourceRunId)
				: 'none'
		const selectedEmployeeIds =
			runEmployeeId !== 'all' ? runEmployeeId : undefined

		const statusReason = [
			`runKind=${runKind}`,
			`sourceRun=${sourceNo}`,
			runRationale.trim() ? `rationale=${runRationale.trim()}` : null,
		]
			.filter(Boolean)
			.join(' | ')

		const created = await payrollRunsMutations.create.mutateAsync({
			runNo: '',
			status: 'DRAFT',
			periodStart,
			periodEnd,
			scopeType: selectedEmployeeIds ? 'SELECTED' : 'ALL_ACTIVE',
			selectedEmployeeIds,
			currency: 'USD',
			employeeCount: 0,
			grossAmount: 0,
			deductionAmount: 0,
			netAmount: 0,
			postedJournalCount: 0,
			disbursementCount: 0,
			statusReason,
		})

		setSelectedRunId(created._id)
	}, [
		payrollRuns,
		payrollRunsMutations.create,
		runEmployeeId,
		runKind,
		runRationale,
		sourceRunId,
	])

	const runCalculate = React.useCallback(async () => {
		if (!selectedRunId) return
		await calculateRun.mutateAsync({ runId: selectedRunId })
	}, [calculateRun, selectedRunId])

	const runApplyAdjustment = React.useCallback(async () => {
		if (!selectedRunId || !adjustmentEmployeeId) return
		await applyAdjustment.mutateAsync({
			runId: selectedRunId,
			employeeId: adjustmentEmployeeId,
			adjustmentType,
			amountDelta: Number.parseFloat(adjustmentAmount) || 0,
			reason:
				adjustmentReason.trim() ||
				'Manual payroll adjustment from operations workspace',
		})
	}, [
		adjustmentAmount,
		adjustmentEmployeeId,
		adjustmentReason,
		adjustmentType,
		applyAdjustment,
		selectedRunId,
	])

	const runGenerateReports = React.useCallback(async () => {
		if (!selectedRunId) return
		const reportTypes: Array<
			'TAX_SUMMARY' | 'DEDUCTION_SUMMARY' | 'PAYMENT_FILE'
		> = []
		if (reportTaxSummary) reportTypes.push('TAX_SUMMARY')
		if (reportDeductionSummary) reportTypes.push('DEDUCTION_SUMMARY')
		if (reportPaymentFile) reportTypes.push('PAYMENT_FILE')
		if (reportTypes.length === 0) return

		await generateReports.mutateAsync({
			runId: selectedRunId,
			reportTypes,
			forceRegenerate: false,
		})
	}, [
		generateReports,
		reportDeductionSummary,
		reportPaymentFile,
		reportTaxSummary,
		selectedRunId,
	])

	const runPost = React.useCallback(async () => {
		if (!selectedRunId) return
		await postRun.mutateAsync({ runId: selectedRunId })
	}, [postRun, selectedRunId])

	const runMarkPaid = React.useCallback(async () => {
		if (!selectedRunId) return
		await markRunPaid.mutateAsync({
			runId: selectedRunId,
			bankAccountId: bankAccountId.trim() || undefined,
		})
	}, [bankAccountId, markRunPaid, selectedRunId])

	const adjustmentsBlocked =
		selectedRun?.status === 'PAID' || selectedRun?.status === 'CANCELED'

	return (
		<div className='space-y-8 pb-8'>
			<PageHeader
				title='Adjustments & Off-cycle Operations'
				description='Build retro/off-cycle payroll runs, apply controlled corrections, and publish statutory artifacts.'
			/>

			<div className='grid gap-6 xl:grid-cols-3'>
				<Card className='border-fuchsia-500/30 bg-gradient-to-br from-fuchsia-500/10 via-background to-background xl:col-span-2'>
					<CardHeader>
						<CardTitle className='flex items-center gap-2'>
							<Repeat2 className='size-4' />
							Off-cycle & Retro Run Builder
						</CardTitle>
						<CardDescription>
							Create special payroll runs with explicit source linkage and
							correction rationale.
						</CardDescription>
					</CardHeader>
					<CardContent className='space-y-4'>
						<div className='grid gap-3 md:grid-cols-3'>
							<div className='space-y-2'>
								<Label>Run Kind</Label>
								<Select
									value={runKind}
									onValueChange={(value) =>
										setRunKind((value ?? 'OFF_CYCLE') as RunKind)
									}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value='REGULAR'>Regular</SelectItem>
										<SelectItem value='OFF_CYCLE'>Off-cycle</SelectItem>
										<SelectItem value='RETRO'>Retro</SelectItem>
									</SelectContent>
								</Select>
								<p className='text-muted-foreground text-xs'>
									{kindDescriptor[runKind]}
								</p>
							</div>

							<div className='space-y-2'>
								<Label>Source Run Reference</Label>
								<Select
									value={sourceRunId}
									onValueChange={(value) => setSourceRunId(value ?? 'none')}
								>
									<SelectTrigger>
										<SelectValue placeholder='Optional source run' />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value='none'>No source run</SelectItem>
										{payrollRuns.map((run) => (
											<SelectItem key={run._id} value={run._id}>
												{run.runNo} · {run.status}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className='space-y-2'>
								<Label>Employee Scope</Label>
								<Select
									value={runEmployeeId}
									onValueChange={(value) => setRunEmployeeId(value ?? 'all')}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value='all'>All active employees</SelectItem>
										{employees.map((employee) => (
											<SelectItem key={employee._id} value={employee._id}>
												{employee.employeeNo ?? employee._id} ·{' '}
												{employee.fullName ?? 'Employee'}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>

						<div className='space-y-2'>
							<Label>Rationale</Label>
							<Textarea
								rows={3}
								value={runRationale}
								onChange={(event) => setRunRationale(event.target.value)}
								placeholder='Explain why this run is needed and what it corrects.'
							/>
						</div>

						<div className='flex flex-wrap gap-2'>
							<Button
								onClick={() => {
									void createOffcycleRun()
								}}
								disabled={payrollRunsMutations.create.isPending}
							>
								<Sparkles className='mr-1.5 size-4' />
								Create Run
							</Button>
							<Button
								variant='outline'
								onClick={() => {
									void runCalculate()
								}}
								disabled={!selectedRunId || calculateRun.isPending}
							>
								Calculate Selected Run
							</Button>
						</div>
					</CardContent>
				</Card>

				<Card className='border-slate-500/30 bg-gradient-to-br from-slate-500/10 via-background to-background'>
					<CardHeader>
						<CardTitle className='flex items-center gap-2'>
							<ClipboardCheck className='size-4' />
							Run Selection
						</CardTitle>
					</CardHeader>
					<CardContent className='space-y-3'>
						<Select
							value={selectedRunId}
							onValueChange={(value) => setSelectedRunId(value ?? '')}
						>
							<SelectTrigger>
								<SelectValue placeholder='Select active run' />
							</SelectTrigger>
							<SelectContent>
								{payrollRuns.map((run) => (
									<SelectItem key={run._id} value={run._id}>
										{run.runNo} · {run.status}
									</SelectItem>
								))}
							</SelectContent>
						</Select>

						{selectedRun ? (
							<div className='rounded-lg border border-border/60 bg-background/80 p-3 text-sm'>
								<div className='flex items-center justify-between gap-2'>
									<span className='font-medium'>{selectedRun.runNo}</span>
									<StatusBadge status={selectedRun.status} />
								</div>
								<p className='mt-1 text-muted-foreground text-xs'>
									Adjustments {selectedRun.adjustmentCount} · Reports{' '}
									{selectedRun.statutoryReportCount}
								</p>
								{selectedRun.statusReason ? (
									<p className='mt-1 text-muted-foreground text-xs'>
										{selectedRun.statusReason}
									</p>
								) : null}
							</div>
						) : (
							<p className='text-muted-foreground text-sm'>
								Select a run to continue.
							</p>
						)}

						<div className='space-y-2'>
							<Label>Disbursement Bank Account (optional)</Label>
							<Input
								value={bankAccountId}
								onChange={(event) => setBankAccountId(event.target.value)}
								placeholder='bank-account-id'
							/>
						</div>
					</CardContent>
				</Card>
			</div>

			<div className='grid gap-6 xl:grid-cols-2'>
				<Card className='border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-background to-background'>
					<CardHeader>
						<CardTitle>Adjustment Console</CardTitle>
						<CardDescription>
							Apply employee-level corrections and keep run state transitions
							explicit.
						</CardDescription>
					</CardHeader>
					<CardContent className='space-y-4'>
						<div className='grid gap-3 md:grid-cols-2'>
							<div className='space-y-2'>
								<Label>Employee</Label>
								<Select
									value={adjustmentEmployeeId}
									onValueChange={(value) =>
										setAdjustmentEmployeeId(value ?? '')
									}
								>
									<SelectTrigger>
										<SelectValue placeholder='Select employee' />
									</SelectTrigger>
									<SelectContent>
										{employees.map((employee) => (
											<SelectItem key={employee._id} value={employee._id}>
												{employee.employeeNo ?? employee._id} ·{' '}
												{employee.fullName ?? 'Employee'}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className='space-y-2'>
								<Label>Adjustment Type</Label>
								<Select
									value={adjustmentType}
									onValueChange={(value) =>
										setAdjustmentType(
											(value ?? 'CORRECTION') as
												| 'CORRECTION'
												| 'BONUS'
												| 'DEDUCTION',
										)
									}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value='CORRECTION'>Correction</SelectItem>
										<SelectItem value='BONUS'>Bonus</SelectItem>
										<SelectItem value='DEDUCTION'>Deduction</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>

						<div className='grid gap-3 md:grid-cols-2'>
							<div className='space-y-2'>
								<Label>Amount Delta</Label>
								<Input
									type='number'
									value={adjustmentAmount}
									onChange={(event) => setAdjustmentAmount(event.target.value)}
								/>
							</div>
							<div className='space-y-2'>
								<Label>Reason</Label>
								<Input
									value={adjustmentReason}
									onChange={(event) => setAdjustmentReason(event.target.value)}
									placeholder='Reason for adjustment'
								/>
							</div>
						</div>

						<Button
							onClick={() => {
								void runApplyAdjustment()
							}}
							disabled={
								!selectedRunId ||
								adjustmentsBlocked ||
								applyAdjustment.isPending
							}
						>
							Apply Adjustment
						</Button>
						{adjustmentsBlocked ? (
							<p className='text-amber-600 text-xs'>
								Selected run is {selectedRun?.status}. Adjustments are blocked.
							</p>
						) : null}
					</CardContent>
				</Card>

				<Card className='border-sky-500/30 bg-gradient-to-br from-sky-500/10 via-background to-background'>
					<CardHeader>
						<CardTitle className='flex items-center gap-2'>
							<FileSpreadsheet className='size-4' />
							Statutory Report Operations
						</CardTitle>
						<CardDescription>
							Generate and track report artifacts directly from run snapshots.
						</CardDescription>
					</CardHeader>
					<CardContent className='space-y-4'>
						<div className='grid gap-2 sm:grid-cols-3'>
							<label className='flex items-center gap-2 rounded-md border border-border/60 p-2 text-sm'>
								<input
									type='checkbox'
									checked={reportTaxSummary}
									onChange={(event) =>
										setReportTaxSummary(event.target.checked)
									}
								/>
								Tax Summary
							</label>
							<label className='flex items-center gap-2 rounded-md border border-border/60 p-2 text-sm'>
								<input
									type='checkbox'
									checked={reportDeductionSummary}
									onChange={(event) =>
										setReportDeductionSummary(event.target.checked)
									}
								/>
								Deduction Summary
							</label>
							<label className='flex items-center gap-2 rounded-md border border-border/60 p-2 text-sm'>
								<input
									type='checkbox'
									checked={reportPaymentFile}
									onChange={(event) =>
										setReportPaymentFile(event.target.checked)
									}
								/>
								Payment File
							</label>
						</div>

						<div className='flex flex-wrap gap-2'>
							<Button
								onClick={() => {
									void runGenerateReports()
								}}
								disabled={!selectedRunId || generateReports.isPending}
							>
								Generate Reports
							</Button>
							<Button
								variant='outline'
								onClick={() => {
									void runPost()
								}}
								disabled={!selectedRunId || postRun.isPending}
							>
								Post Run
							</Button>
							<Button
								variant='outline'
								onClick={() => {
									void runMarkPaid()
								}}
								disabled={!selectedRunId || markRunPaid.isPending}
							>
								Mark Paid
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>

			<div className='grid gap-6 xl:grid-cols-2'>
				<Card>
					<CardHeader>
						<CardTitle>Payroll Runs</CardTitle>
					</CardHeader>
					<CardContent>
						<div className='overflow-hidden rounded-xl border border-border/60'>
							<RunsGrid
								variant='flat'
								height={Math.max(windowSize.height - 360, 280)}
							>
								<RunsGrid.Header className='border-border/50 border-b bg-muted/20 px-4 py-3'>
									<RunsGrid.Toolbar filter sort search export />
								</RunsGrid.Header>
								<RunsGrid.Columns>
									<RunsGrid.Column accessorKey='runNo' title='Run' />
									<RunsGrid.Column
										accessorKey='status'
										title='Status'
										cell={({ row }) => (
											<StatusBadge status={row.original.status} />
										)}
									/>
									<RunsGrid.Column
										accessorKey='employeeCount'
										title='Employees'
										cellVariant='number'
									/>
									<RunsGrid.Column
										accessorKey='netAmount'
										title='Net'
										cellVariant='number'
										formatter={(value, formatter) =>
											formatter.currency(value.netAmount)
										}
									/>
									<RunsGrid.Column
										accessorKey='statusReason'
										title='Reference / Rationale'
									/>
									<RunsGrid.Column
										id='select'
										title='Select'
										cell={({ row }) => (
											<Button
												size='sm'
												variant='outline'
												onClick={() => setSelectedRunId(row.original._id)}
											>
												Select
											</Button>
										)}
									/>
								</RunsGrid.Columns>
							</RunsGrid>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Run Adjustments</CardTitle>
					</CardHeader>
					<CardContent>
						<div className='overflow-hidden rounded-xl border border-border/60'>
							<AdjustmentsGrid
								variant='flat'
								height={Math.max(windowSize.height - 360, 280)}
							>
								<AdjustmentsGrid.Header className='border-border/50 border-b bg-muted/20 px-4 py-3'>
									<AdjustmentsGrid.Toolbar filter sort search export />
								</AdjustmentsGrid.Header>
								<AdjustmentsGrid.Columns>
									<AdjustmentsGrid.Column
										accessorKey='adjustmentNo'
										title='Adjustment'
									/>
									<AdjustmentsGrid.Column
										accessorKey='employeeId'
										title='Employee'
									/>
									<AdjustmentsGrid.Column
										accessorKey='adjustmentType'
										title='Type'
									/>
									<AdjustmentsGrid.Column
										accessorKey='amountDelta'
										title='Amount Δ'
										cellVariant='number'
										formatter={(value, formatter) =>
											formatter.currency(value.amountDelta)
										}
									/>
									<AdjustmentsGrid.Column accessorKey='reason' title='Reason' />
								</AdjustmentsGrid.Columns>
							</AdjustmentsGrid>
						</div>
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Statutory Artifacts</CardTitle>
					<CardDescription>
						Generated report rows are reproducible from run snapshot payloads.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className='overflow-hidden rounded-xl border border-border/60'>
						<ReportsGrid
							variant='flat'
							height={Math.max(windowSize.height - 360, 280)}
						>
							<ReportsGrid.Header className='border-border/50 border-b bg-muted/20 px-4 py-3'>
								<ReportsGrid.Toolbar filter sort search export />
							</ReportsGrid.Header>
							<ReportsGrid.Columns>
								<ReportsGrid.Column accessorKey='reportNo' title='Report' />
								<ReportsGrid.Column accessorKey='reportType' title='Type' />
								<ReportsGrid.Column
									accessorKey='status'
									title='Status'
									cell={({ row }) => (
										<StatusBadge status={row.original.status} />
									)}
								/>
								<ReportsGrid.Column
									accessorKey='generatedAt'
									title='Generated'
									cellVariant='date'
								/>
								<ReportsGrid.Column
									accessorKey='artifactJson'
									title='Artifact Preview'
									cell={({ row }) => (
										<span className='line-clamp-2 max-w-[24rem] text-xs'>
											{row.original.artifactJson}
										</span>
									)}
								/>
							</ReportsGrid.Columns>
						</ReportsGrid>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
