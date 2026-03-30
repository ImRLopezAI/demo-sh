import { $rpc, useQuery } from '@lib/rpc'
import { Banknote, BookOpen, Building2, Landmark } from 'lucide-react'
import * as React from 'react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from '@/components/ui/chart'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useHydrateState } from '@/lib/json-render/use-hydrate-state'
import { formatCurrency } from '@/lib/utils'
import { useModuleData } from '../../hooks/use-data'
import {
	average,
	buildCategorySeries,
	buildMonthlySeries,
	formatPercent,
} from '../_shared/dashboard-utils'
import {
	DashboardDistributionChart,
	DashboardSectionGrid,
	DashboardStatsPanel,
	DashboardTrendChart,
} from '../_shared/dashboard-widgets'
import { type KpiCardDef, KpiCards } from '../_shared/kpi-cards'
import { PageHeader } from '../_shared/page-header'
import { StatusBadge } from '../_shared/status-badge'

interface BankAccount {
	id: string
	accountNo: string
	name: string
	bankName: string
	iban: string
	swiftCode: string
	currency: string
	status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED'
	entryCount: number
	currentBalance: number
}

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

interface CashForecastResponse {
	config: {
		horizonDays: number
		lookbackDays: number
		adverseVarianceThresholdPct: number
	}
	baseline: {
		startingBalance: number
		averageDailyInflow: number
		averageDailyOutflow: number
		averageDailyNet: number
	}
	forecast: Array<{
		date: string
		forecastNet: number
		forecastBalance: number
	}>
	variance: Array<{
		date: string
		forecastNet: number
		actualNet: number
		varianceAmount: number
		variancePct: number
		isAdverse: boolean
	}>
	alerts: Array<{
		type: 'NEGATIVE_CASH_FORECAST' | 'ADVERSE_VARIANCE'
		severity: 'WARNING' | 'ERROR'
		message: string
		thresholdPct?: number
	}>
}

export default function Dashboard() {
	const [horizonDays, setHorizonDays] = React.useState('30')
	const [varianceThreshold, setVarianceThreshold] = React.useState('15')

	const { items: bankAccounts, isLoading: accountsLoading } = useModuleData<
		'flow',
		BankAccount
	>('flow', 'bankAccounts', 'overview')

	const { items: journalLines, isLoading: journalLoading } = useModuleData<
		'flow',
		GenJournalLine
	>('flow', 'journalLines', 'overview')

	const parsedHorizonDays = React.useMemo(() => {
		const parsed = Number.parseInt(horizonDays, 10)
		return Number.isFinite(parsed) ? Math.min(90, Math.max(7, parsed)) : 30
	}, [horizonDays])
	const parsedVarianceThreshold = React.useMemo(() => {
		const parsed = Number.parseFloat(varianceThreshold)
		return Number.isFinite(parsed) ? Math.min(75, Math.max(5, parsed)) : 15
	}, [varianceThreshold])

	const { data: cashForecast, isLoading: forecastLoading } =
		useQuery<CashForecastResponse>(
			$rpc.flow.analytics.cashForecast.queryOptions({
				input: {
					horizonDays: parsedHorizonDays,
					lookbackDays: 60,
					adverseVarianceThresholdPct: parsedVarianceThreshold,
				},
			}),
		)

	const totalAccounts = bankAccounts.length
	const activeAccounts = bankAccounts.filter(
		(account) => account.status === 'ACTIVE',
	).length
	const blockedAccounts = bankAccounts.filter(
		(account) => account.status === 'BLOCKED',
	).length
	const totalBalance = bankAccounts.reduce(
		(sum, account) => sum + (account.currentBalance ?? 0),
		0,
	)
	const openJournalEntries = journalLines.filter(
		(line) => line.status === 'OPEN',
	).length
	const postedJournalEntries = journalLines.filter(
		(line) => line.status === 'POSTED',
	).length
	const avgAccountBalance = average(
		bankAccounts.map((account) => account.currentBalance ?? 0),
	)
	const avgJournalValue = average(
		journalLines.map((line) =>
			Math.abs((line.debitAmount ?? 0) - (line.creditAmount ?? 0)),
		),
	)
	const adverseVarianceDays = (cashForecast?.variance ?? []).filter(
		(point) => point.isAdverse,
	).length

	/* ── Hydrate json-render state for spec-driven KPIs ── */
	const pendingPaymentLines = journalLines.filter(
		(l) => l.status === 'OPEN' && l.documentType === 'PAYMENT',
	)
	const projected30d = cashForecast?.forecast?.at(-1)?.forecastBalance ?? 0

	useHydrateState(
		'/flow/dashboard',
		React.useMemo(
			() => ({
				accountCount: totalAccounts,
				totalBalance,
				projected30d,
				projectedNegative: projected30d < 0,
				pendingPayments: pendingPaymentLines.reduce(
					(sum, l) =>
						sum + Math.abs((l.debitAmount ?? 0) - (l.creditAmount ?? 0)),
					0,
				),
				pendingPaymentCount: pendingPaymentLines.length,
				unreconciledCount: openJournalEntries,
			}),
			[
				totalAccounts,
				totalBalance,
				projected30d,
				pendingPaymentLines,
				openJournalEntries,
			],
		),
	)

	const kpis = React.useMemo<KpiCardDef[]>(
		() => [
			{
				title: 'Bank Accounts',
				value: totalAccounts,
				icon: Building2,
			},
			{
				title: 'Active Accounts',
				value: activeAccounts,
				description: formatPercent(activeAccounts, totalAccounts),
				icon: Landmark,
			},
			{
				title: 'Net Cash Position',
				value: formatCurrency(totalBalance, 'USD'),
				icon: Banknote,
			},
			{
				title: 'Open Journal Entries',
				value: openJournalEntries,
				icon: BookOpen,
			},
		],
		[activeAccounts, openJournalEntries, totalAccounts, totalBalance],
	)

	const monthlyJournalVolume = React.useMemo(
		() => buildMonthlySeries(journalLines, (line) => line.postingDate),
		[journalLines],
	)

	const journalStatusMix = React.useMemo(
		() => buildCategorySeries(journalLines.map((line) => line.status)),
		[journalLines],
	)

	const forecastTrendData = React.useMemo(
		() =>
			(cashForecast?.forecast ?? []).slice(0, 14).map((point) => ({
				month: new Date(point.date).toLocaleDateString('en-US', {
					month: 'short',
					day: 'numeric',
				}),
				count: 0,
				amount: point.forecastBalance,
			})),
		[cashForecast?.forecast],
	)

	const varianceChartData = React.useMemo(
		() =>
			(cashForecast?.variance ?? []).slice(-14).map((point) => ({
				day: new Date(point.date).toLocaleDateString('en-US', {
					month: 'short',
					day: 'numeric',
				}),
				forecast: point.forecastNet,
				actual: point.actualNet,
				isAdverse: point.isAdverse,
			})),
		[cashForecast?.variance],
	)

	const varianceChartConfig = React.useMemo<ChartConfig>(
		() => ({
			forecast: {
				label: 'Forecast Net',
				color: 'var(--color-chart-2)',
			},
			actual: {
				label: 'Actual Net',
				color: 'var(--color-chart-1)',
			},
		}),
		[],
	)
	const skeletonRows = ['row-1', 'row-2', 'row-3', 'row-4', 'row-5'] as const

	const recentAccounts = React.useMemo(
		() => bankAccounts.slice(0, 8),
		[bankAccounts],
	)

	const isLoading = accountsLoading || journalLoading || forecastLoading

	return (
		<div className='space-y-8 pb-8'>
			<PageHeader
				title='Flow Dashboard'
				description='Banking liquidity, journal throughput, and cash execution insights.'
			/>

			<KpiCards cards={kpis} />

			<Card className='shadow-sm transition-shadow duration-300 hover:shadow-md'>
				<CardHeader className='border-border/50 border-b bg-muted/20'>
					<CardTitle>Cash Forecast Controls</CardTitle>
					<CardDescription>
						Configure horizon and adverse variance thresholds for treasury
						monitoring.
					</CardDescription>
				</CardHeader>
				<CardContent className='space-y-4 pt-6'>
					<div className='grid gap-3 md:grid-cols-3'>
						<div className='space-y-1.5'>
							<Label htmlFor='flow-forecast-horizon'>
								Forecast Horizon (days)
							</Label>
							<Input
								id='flow-forecast-horizon'
								type='number'
								min={7}
								max={90}
								value={horizonDays}
								onChange={(event) => setHorizonDays(event.target.value)}
							/>
						</div>
						<div className='space-y-1.5'>
							<Label htmlFor='flow-forecast-threshold'>
								Adverse Variance Threshold (%)
							</Label>
							<Input
								id='flow-forecast-threshold'
								type='number'
								min={5}
								max={75}
								value={varianceThreshold}
								onChange={(event) => setVarianceThreshold(event.target.value)}
							/>
						</div>
						<div className='space-y-1.5'>
							<Label>Baseline Daily Net</Label>
							<p className='rounded-md border border-border/50 bg-background/60 px-3 py-2 font-medium text-sm tabular-nums'>
								{formatCurrency(
									cashForecast?.baseline.averageDailyNet ?? 0,
									'USD',
								)}
							</p>
						</div>
					</div>
					{(cashForecast?.alerts ?? []).length > 0 && (
						<div className='space-y-2 rounded-lg border border-border/50 bg-background/40 p-3'>
							<p className='font-medium text-sm'>Variance Alerts</p>
							<ul className='space-y-2'>
								{cashForecast?.alerts.map((alert) => (
									<li
										key={`${alert.type}-${alert.message}`}
										className='flex items-start justify-between gap-3'
									>
										<span className='text-muted-foreground text-sm'>
											{alert.message}
										</span>
										<StatusBadge status={alert.severity} />
									</li>
								))}
							</ul>
						</div>
					)}
				</CardContent>
			</Card>

			<DashboardSectionGrid>
				<DashboardTrendChart
					className='shadow-sm transition-shadow duration-300 hover:shadow-md xl:col-span-2'
					title='Projected Cash Balance Trend'
					description='Rolling balance projection for configured horizon'
					data={forecastTrendData}
					metricKey='amount'
					metricLabel='Forecast Balance'
				/>
				<DashboardStatsPanel
					className='shadow-sm transition-shadow duration-300 hover:shadow-md'
					title='Forecast Snapshot'
					description='Forecast baseline and variance pressure indicators'
					items={[
						{
							label: 'Starting Balance',
							value: formatCurrency(
								cashForecast?.baseline.startingBalance ?? totalBalance,
								'USD',
							),
							description: 'Current aggregate bank balance',
						},
						{
							label: 'Avg Daily Inflow',
							value: formatCurrency(
								cashForecast?.baseline.averageDailyInflow ?? 0,
								'USD',
							),
							description: 'Trailing 60-day inflow baseline',
						},
						{
							label: 'Avg Daily Outflow',
							value: formatCurrency(
								cashForecast?.baseline.averageDailyOutflow ?? 0,
								'USD',
							),
							description: 'Trailing 60-day outflow baseline',
						},
						{
							label: 'Adverse Variance Days',
							value: adverseVarianceDays.toLocaleString(),
							description: `Threshold ${parsedVarianceThreshold.toFixed(1)}%`,
						},
					]}
				/>
			</DashboardSectionGrid>

			<Card className='shadow-sm transition-shadow duration-300 hover:shadow-md'>
				<CardHeader className='border-border/50 border-b bg-muted/20'>
					<CardTitle>Actual vs Forecast Variance (Last 14 Days)</CardTitle>
					<CardDescription>
						Compares daily net cash movement against forecast baseline.
					</CardDescription>
				</CardHeader>
				<CardContent className='pt-4'>
					{isLoading ? (
						<div className='h-[280px] rounded bg-muted/40 motion-safe:animate-pulse' />
					) : varianceChartData.length === 0 ? (
						<p className='py-8 text-center text-muted-foreground text-sm'>
							No variance data available.
						</p>
					) : (
						<ChartContainer
							config={varianceChartConfig}
							className='h-[280px] w-full'
						>
							<BarChart data={varianceChartData}>
								<CartesianGrid vertical={false} strokeDasharray='3 3' />
								<XAxis dataKey='day' tickLine={false} axisLine={false} />
								<YAxis tickLine={false} axisLine={false} width={40} />
								<ChartTooltip
									cursor={false}
									content={<ChartTooltipContent indicator='line' />}
								/>
								<Bar
									dataKey='forecast'
									fill='var(--color-forecast)'
									radius={[6, 6, 2, 2]}
									maxBarSize={22}
								/>
								<Bar
									dataKey='actual'
									fill='var(--color-actual)'
									radius={[6, 6, 2, 2]}
									maxBarSize={22}
								/>
							</BarChart>
						</ChartContainer>
					)}
				</CardContent>
			</Card>

			<DashboardSectionGrid>
				<DashboardTrendChart
					className='shadow-sm transition-shadow duration-300 hover:shadow-md xl:col-span-2'
					title='Journal Throughput Trend'
					description='Journal entries posted each month'
					data={monthlyJournalVolume}
					metricKey='count'
					metricLabel='Journal Entries'
				/>
				<DashboardDistributionChart
					className='shadow-sm transition-shadow duration-300 hover:shadow-md'
					title='Journal Status Mix'
					description='Current workflow distribution'
					data={journalStatusMix}
				/>
			</DashboardSectionGrid>

			<DashboardStatsPanel
				className='shadow-sm transition-shadow duration-300 hover:shadow-md'
				title='Treasury Statistics'
				description='Core figures to track liquidity and posting health'
				items={[
					{
						label: 'Average Account Balance',
						value: formatCurrency(avgAccountBalance, 'USD'),
						description: 'Mean balance across connected accounts',
					},
					{
						label: 'Blocked Accounts',
						value: blockedAccounts.toLocaleString(),
						description: `${formatPercent(blockedAccounts, totalAccounts)} of account base`,
					},
					{
						label: 'Posted Journal Share',
						value: formatPercent(postedJournalEntries, journalLines.length),
						description: 'Posted over total journal entries',
					},
					{
						label: 'Average Journal Value',
						value: formatCurrency(avgJournalValue, 'USD'),
						description: 'Absolute debit-credit deltas',
					},
				]}
			/>

			<div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
				<Card className='shadow-sm transition-shadow duration-300 hover:shadow-md'>
					<CardHeader className='border-border/50 border-b bg-muted/20'>
						<CardTitle>Bank Accounts</CardTitle>
						<CardDescription>Connected bank accounts overview</CardDescription>
					</CardHeader>
					<CardContent className='pt-4'>
						{isLoading ? (
							<div className='space-y-2' aria-live='polite'>
								{skeletonRows.map((key) => (
									<div
										key={`account-skeleton-${key}`}
										className='h-8 rounded bg-muted motion-safe:animate-pulse'
									/>
								))}
							</div>
						) : recentAccounts.length === 0 ? (
							<p className='py-4 text-center text-muted-foreground text-sm'>
								No bank accounts found.
							</p>
						) : (
							<ul className='space-y-2'>
								{recentAccounts.map((account, idx) => (
									<li
										key={account.id ?? `account-${idx}`}
										className='flex items-center justify-between gap-2 rounded-lg border border-border/40 bg-background/30 p-3 transition-colors hover:bg-muted/50'
									>
										<div className='min-w-0 flex-1'>
											<p className='truncate font-medium text-sm'>
												{account.name}
											</p>
											<p className='text-muted-foreground text-xs'>
												{account.accountNo} &middot; {account.bankName}
											</p>
										</div>
										<div className='flex shrink-0 items-center gap-3'>
											<span className='text-muted-foreground text-xs tabular-nums'>
												{formatCurrency(
													account.currentBalance,
													account.currency || 'USD',
												)}
											</span>
											<StatusBadge status={account.status} />
										</div>
									</li>
								))}
							</ul>
						)}
					</CardContent>
				</Card>

				<Card className='shadow-sm transition-shadow duration-300 hover:shadow-md'>
					<CardHeader className='border-border/50 border-b bg-muted/20'>
						<CardTitle>Recent Journal Lines</CardTitle>
						<CardDescription>Latest payment journal activity</CardDescription>
					</CardHeader>
					<CardContent className='pt-4'>
						{isLoading ? (
							<div className='space-y-2' aria-live='polite'>
								{skeletonRows.map((key) => (
									<div
										key={`journal-skeleton-${key}`}
										className='h-8 rounded bg-muted motion-safe:animate-pulse'
									/>
								))}
							</div>
						) : journalLines.length === 0 ? (
							<p className='py-4 text-center text-muted-foreground text-sm'>
								No journal lines found.
							</p>
						) : (
							<ul className='space-y-2'>
								{journalLines.slice(0, 8).map((line, idx) => (
									<li
										key={line.id ?? `line-${idx}`}
										className='flex items-center justify-between gap-2 rounded-lg border border-border/40 bg-background/30 p-3 transition-colors hover:bg-muted/50'
									>
										<div className='min-w-0 flex-1'>
											<p className='truncate font-medium text-sm'>
												{line.documentNo} &middot; {line.description}
											</p>
											<p className='text-muted-foreground text-xs'>
												{line.accountNo} &middot; {line.documentType}
											</p>
										</div>
										<StatusBadge status={line.status} />
									</li>
								))}
							</ul>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
