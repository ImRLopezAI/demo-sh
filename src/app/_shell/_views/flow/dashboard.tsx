import { Banknote, BookOpen, Building2, Landmark } from 'lucide-react'
import * as React from 'react'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
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

export default function Dashboard() {
	const { items: bankAccounts, isLoading: accountsLoading } = useModuleData<
		'flow',
		BankAccount
	>('flow', 'bankAccounts', 'overview')

	const { items: journalLines, isLoading: journalLoading } = useModuleData<
		'flow',
		GenJournalLine
	>('flow', 'journalLines', 'overview')

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

	const recentAccounts = React.useMemo(
		() => bankAccounts.slice(0, 8),
		[bankAccounts],
	)

	const isLoading = accountsLoading || journalLoading

	return (
		<div className='space-y-6'>
			<PageHeader
				title='Flow Dashboard'
				description='Banking liquidity, journal throughput, and cash execution insights.'
			/>

			<KpiCards cards={kpis} />

			<DashboardSectionGrid>
				<DashboardTrendChart
					className='xl:col-span-2'
					title='Journal Throughput Trend'
					description='Journal entries posted each month'
					data={monthlyJournalVolume}
					metricKey='count'
					metricLabel='Journal Entries'
				/>
				<DashboardDistributionChart
					title='Journal Status Mix'
					description='Current workflow distribution'
					data={journalStatusMix}
				/>
			</DashboardSectionGrid>

			<DashboardStatsPanel
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
				<Card>
					<CardHeader className='border-b'>
						<CardTitle>Bank Accounts</CardTitle>
						<CardDescription>Connected bank accounts overview</CardDescription>
					</CardHeader>
					<CardContent className='pt-4'>
						{isLoading ? (
							<div className='space-y-2' role='status' aria-label='Loading'>
								{Array.from({ length: 5 }).map((_, i) => (
									<div
										key={`skeleton-${i}`}
										className='h-8 rounded bg-muted motion-safe:animate-pulse'
									/>
								))}
							</div>
						) : recentAccounts.length === 0 ? (
							<p className='py-4 text-center text-muted-foreground text-sm'>
								No bank accounts found.
							</p>
						) : (
							<ul className='divide-y'>
								{recentAccounts.map((account) => (
									<li
										key={account.id}
										className='flex items-center justify-between gap-2 py-2'
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

				<Card>
					<CardHeader className='border-b'>
						<CardTitle>Recent Journal Lines</CardTitle>
						<CardDescription>Latest payment journal activity</CardDescription>
					</CardHeader>
					<CardContent className='pt-4'>
						{isLoading ? (
							<div className='space-y-2' role='status' aria-label='Loading'>
								{Array.from({ length: 5 }).map((_, i) => (
									<div
										key={`skeleton-${i}`}
										className='h-8 rounded bg-muted motion-safe:animate-pulse'
									/>
								))}
							</div>
						) : journalLines.length === 0 ? (
							<p className='py-4 text-center text-muted-foreground text-sm'>
								No journal lines found.
							</p>
						) : (
							<ul className='divide-y'>
								{journalLines.slice(0, 8).map((line) => (
									<li
										key={line.id}
										className='flex items-center justify-between gap-2 py-2'
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
