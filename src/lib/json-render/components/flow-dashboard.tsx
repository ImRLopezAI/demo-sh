'use client'

import { Banknote, BookOpen } from 'lucide-react'
import * as React from 'react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { useModuleData } from '@/app/_shell/hooks/use-data'
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
import {
	MetricStrip,
	RecordListPanel,
	StackedDistributionPanel,
	StatRowsPanel,
} from '@/components/ui/json-render/dashboard-sections'
import { DashboardTrendChart } from '@/components/ui/json-render/dashboard-widgets'
import { StatusBadge } from '@/components/ui/json-render/status-badge'
import { Label } from '@/components/ui/label'
import {
	average,
	buildCategorySeries,
	buildMonthlySeries,
	formatPercent,
} from '@/lib/json-render/dashboard-utils'
import { $rpc, useQuery } from '@/lib/rpc'
import { formatCurrency } from '@/lib/utils'

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

type FlowDashboardContextValue = {
	isLoading: boolean
	horizonDays: string
	setHorizonDays: (value: string) => void
	varianceThreshold: string
	setVarianceThreshold: (value: string) => void
	parsedHorizonDays: number
	parsedVarianceThreshold: number
	cashForecast: CashForecastResponse | undefined
	metricItems: Array<{ label: string; value: string; icon: string }>
	journalStatusMix: Array<{ name: string; value: number }>
	monthlyJournalVolume: Array<{ month: string; count: number; amount: number }>
	forecastTrendData: Array<{ month: string; count: number; amount: number }>
	varianceChartData: Array<{
		day: string
		forecast: number
		actual: number
		isAdverse: boolean
	}>
	forecastStatItems: Array<{
		label: string
		value: string
		description: string
	}>
	treasuryStatItems: Array<{
		label: string
		value: string
		description: string
	}>
	recentAccounts: Array<{
		id: string
		title: string
		subtitle: string
		status: string
	}>
	recentJournalLines: Array<{
		id: string
		title: string
		subtitle: string
		status: string
	}>
}

const FlowDashboardContext =
	React.createContext<FlowDashboardContextValue | null>(null)

const JOURNAL_STATUS_COLORS: Record<string, string> = {
	OPEN: 'bg-sky-500',
	APPROVED: 'bg-emerald-500',
	POSTED: 'bg-violet-500',
	VOIDED: 'bg-rose-500',
}

function useFlowDashboardData() {
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

	const isLoading = accountsLoading || journalLoading || forecastLoading

	return React.useMemo<FlowDashboardContextValue>(() => {
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

		return {
			isLoading,
			horizonDays,
			setHorizonDays,
			varianceThreshold,
			setVarianceThreshold,
			parsedHorizonDays,
			parsedVarianceThreshold,
			cashForecast,
			metricItems: [
				{
					label: 'Bank Accounts',
					value: totalAccounts.toLocaleString(),
					icon: 'package',
				},
				{
					label: 'Active Accounts',
					value: `${activeAccounts} (${formatPercent(activeAccounts, totalAccounts)})`,
					icon: 'map',
				},
				{
					label: 'Net Cash Position',
					value: formatCurrency(totalBalance, 'USD'),
					icon: 'dollar',
				},
				{
					label: 'Open Journal Entries',
					value: openJournalEntries.toLocaleString(),
					icon: 'chart',
				},
			],
			journalStatusMix: buildCategorySeries(
				journalLines.map((line) => line.status),
			),
			monthlyJournalVolume: buildMonthlySeries(
				journalLines,
				(line) => line.postingDate,
			),
			forecastTrendData: (cashForecast?.forecast ?? [])
				.slice(0, 14)
				.map((point) => ({
					month: new Date(point.date).toLocaleDateString('en-US', {
						month: 'short',
						day: 'numeric',
					}),
					count: 0,
					amount: point.forecastBalance,
				})),
			varianceChartData: (cashForecast?.variance ?? [])
				.slice(-14)
				.map((point) => ({
					day: new Date(point.date).toLocaleDateString('en-US', {
						month: 'short',
						day: 'numeric',
					}),
					forecast: point.forecastNet,
					actual: point.actualNet,
					isAdverse: point.isAdverse,
				})),
			forecastStatItems: [
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
			],
			treasuryStatItems: [
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
			],
			recentAccounts: bankAccounts.slice(0, 8).map((account) => ({
				id: account.id,
				title: account.name,
				subtitle: `${account.accountNo} · ${account.bankName}`,
				status: account.status,
			})),
			recentJournalLines: journalLines.slice(0, 8).map((line) => ({
				id: line.id,
				title: `${line.documentNo} · ${line.description}`,
				subtitle: `${line.accountNo} · ${line.documentType}`,
				status: line.status,
			})),
		}
	}, [
		isLoading,
		horizonDays,
		varianceThreshold,
		parsedHorizonDays,
		parsedVarianceThreshold,
		bankAccounts,
		journalLines,
		cashForecast,
	])
}

function useFlowDashboardContext() {
	const value = React.useContext(FlowDashboardContext)
	if (!value) {
		throw new Error('Flow dashboard section must be used within provider')
	}
	return value
}

export function FlowDashboardData({
	children,
}: {
	children?: React.ReactNode
}) {
	const value = useFlowDashboardData()
	return (
		<FlowDashboardContext.Provider value={value}>
			{children}
		</FlowDashboardContext.Provider>
	)
}

export function FlowKpiStrip() {
	const { metricItems } = useFlowDashboardContext()
	return <MetricStrip items={metricItems} />
}

export function FlowCashForecastControls() {
	const {
		horizonDays,
		setHorizonDays,
		varianceThreshold,
		setVarianceThreshold,
		cashForecast,
	} = useFlowDashboardContext()

	return (
		<Card className='shadow-sm transition-shadow hover:shadow-md'>
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
	)
}

export function FlowCashBalanceTrend() {
	const { forecastTrendData } = useFlowDashboardContext()
	return (
		<DashboardTrendChart
			className='shadow-sm transition-shadow hover:shadow-md'
			title='Projected Cash Balance Trend'
			description='Rolling balance projection for configured horizon'
			data={forecastTrendData}
			metricKey='amount'
			metricLabel='Forecast Balance'
		/>
	)
}

export function FlowForecastStats() {
	const { forecastStatItems } = useFlowDashboardContext()
	return (
		<StatRowsPanel
			title='Forecast Snapshot'
			description='Forecast baseline and variance pressure indicators'
			items={forecastStatItems}
		/>
	)
}

export function FlowVarianceChart() {
	const { isLoading, varianceChartData } = useFlowDashboardContext()

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

	return (
		<Card className='shadow-sm transition-shadow hover:shadow-md'>
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
	)
}

export function FlowJournalThroughputTrend() {
	const { monthlyJournalVolume } = useFlowDashboardContext()
	return (
		<DashboardTrendChart
			className='shadow-sm transition-shadow hover:shadow-md'
			title='Journal Throughput Trend'
			description='Journal entries posted each month'
			data={monthlyJournalVolume}
			metricKey='count'
			metricLabel='Journal Entries'
		/>
	)
}

export function FlowJournalStatusDistribution() {
	const { journalStatusMix } = useFlowDashboardContext()
	return (
		<StackedDistributionPanel
			title='Journal Status Mix'
			description='Current workflow distribution'
			items={journalStatusMix}
			colorMap={JOURNAL_STATUS_COLORS}
			emptyMessage='No journal data available.'
		/>
	)
}

export function FlowTreasuryStats() {
	const { treasuryStatItems } = useFlowDashboardContext()
	return (
		<StatRowsPanel
			title='Treasury Statistics'
			description='Core figures to track liquidity and posting health'
			items={treasuryStatItems}
		/>
	)
}

export function FlowBankAccountsList() {
	const { isLoading, recentAccounts } = useFlowDashboardContext()
	return (
		<RecordListPanel
			title='Bank Accounts'
			items={recentAccounts}
			isLoading={isLoading}
			emptyMessage='No bank accounts found.'
			emptyIcon={<Banknote className='mb-3 h-8 w-8 text-muted-foreground/50' />}
		/>
	)
}

export function FlowRecentJournalLines() {
	const { isLoading, recentJournalLines } = useFlowDashboardContext()
	return (
		<RecordListPanel
			title='Recent Journal Lines'
			items={recentJournalLines}
			isLoading={isLoading}
			emptyMessage='No journal lines found.'
			emptyIcon={<BookOpen className='mb-3 h-8 w-8 text-muted-foreground/50' />}
		/>
	)
}
