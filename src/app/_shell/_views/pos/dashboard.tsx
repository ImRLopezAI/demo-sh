import { CreditCard, DollarSign, Monitor, Receipt } from 'lucide-react'
import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

interface PosTransaction {
	id: string
	receiptNo: string
	posSessionId: string
	status: 'OPEN' | 'COMPLETED' | 'VOIDED' | 'REFUNDED'
	customerId: string
	totalAmount: number
	taxAmount: number
	discountAmount: number
	paidAmount: number
	paymentMethod: 'CASH' | 'CARD' | 'MOBILE' | 'MIXED'
	transactionAt: string
	lineCount: number
}

interface Terminal {
	id: string
	terminalCode: string
	name: string
	locationCode: string
	status: 'ONLINE' | 'OFFLINE' | 'MAINTENANCE'
	sessionCount: number
}

export default function PosDashboard() {
	const { items: transactions, isLoading: transactionsLoading } = useModuleData<
		'pos',
		PosTransaction
	>('pos', 'transactions', 'all')
	const { items: terminals, isLoading: terminalsLoading } = useModuleData<
		'pos',
		Terminal
	>('pos', 'terminals', 'all')

	const totalTransactions = transactions.length
	const completedTransactions = transactions.filter(
		(transaction) => transaction.status === 'COMPLETED',
	).length
	const netSales = transactions.reduce(
		(sum, transaction) => sum + (transaction.paidAmount ?? transaction.totalAmount ?? 0),
		0,
	)
	const avgTicket = average(
		transactions.map((transaction) => transaction.totalAmount ?? 0),
	)
	const onlineTerminals = terminals.filter(
		(terminal) => terminal.status === 'ONLINE',
	).length
	const cardTxns = transactions.filter(
		(transaction) =>
			transaction.paymentMethod === 'CARD' ||
			transaction.paymentMethod === 'MOBILE' ||
			transaction.paymentMethod === 'MIXED',
	).length
	const avgDiscount = average(
		transactions.map((transaction) => transaction.discountAmount ?? 0),
	)
	const refundedTransactions = transactions.filter(
		(transaction) => transaction.status === 'REFUNDED',
	).length

	const kpis = React.useMemo<KpiCardDef[]>(
		() => [
			{
				title: 'Transactions',
				value: totalTransactions,
				description: 'All POS transactions',
				icon: Receipt,
			},
			{
				title: 'Completion Rate',
				value: formatPercent(completedTransactions, totalTransactions),
				description: 'Completed over total',
				icon: CreditCard,
			},
			{
				title: 'Net Sales',
				value: `$${netSales.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
				description: 'Captured payments',
				icon: DollarSign,
			},
			{
				title: 'Avg Ticket',
				value: `$${avgTicket.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
				description: 'Average transaction amount',
				icon: Monitor,
			},
		],
		[avgTicket, completedTransactions, netSales, totalTransactions],
	)

	const monthlyTransactionVolume = React.useMemo(
		() => buildMonthlySeries(transactions, (transaction) => transaction.transactionAt),
		[transactions],
	)

	const transactionStatusMix = React.useMemo(
		() => buildCategorySeries(transactions.map((transaction) => transaction.status)),
		[transactions],
	)

	const recentTransactions = React.useMemo(
		() =>
			[...transactions]
				.sort(
					(a, b) =>
						new Date(b.transactionAt).getTime() -
						new Date(a.transactionAt).getTime(),
				)
				.slice(0, 10),
		[transactions],
	)

	const isLoading = transactionsLoading || terminalsLoading

	return (
		<div className='space-y-6'>
			<PageHeader
				title='POS Dashboard'
				description='Checkout velocity, payment mix, and terminal activity in one view.'
			/>

			<KpiCards cards={kpis} />

			<DashboardSectionGrid>
				<DashboardTrendChart
					className='xl:col-span-2'
					title='Transaction Volume Trend'
					description='Transactions processed per month'
					data={monthlyTransactionVolume}
					metricKey='count'
					metricLabel='Transactions'
				/>
				<DashboardDistributionChart
					title='Transaction Status Mix'
					description='Distribution of current transaction states'
					data={transactionStatusMix}
				/>
			</DashboardSectionGrid>

			<DashboardStatsPanel
				title='POS Statistics'
				description='Signals that impact checkout quality and conversion'
				items={[
					{
						label: 'Online Terminals',
						value: `${onlineTerminals}/${terminals.length}`,
						description: `${formatPercent(onlineTerminals, terminals.length)} availability`,
					},
					{
						label: 'Digital Payment Share',
						value: formatPercent(cardTxns, totalTransactions),
						description: 'Card, mobile, and mixed payments',
					},
					{
						label: 'Average Discount',
						value: `$${avgDiscount.toLocaleString('en-US', { maximumFractionDigits: 2 })}`,
						description: 'Per transaction discount amount',
					},
					{
						label: 'Refunded Transactions',
						value: refundedTransactions.toLocaleString(),
						description: `${formatPercent(refundedTransactions, totalTransactions)} of total volume`,
					},
				]}
			/>

			<Card>
				<CardHeader>
					<CardTitle>Recent Transactions</CardTitle>
				</CardHeader>
				<CardContent>
					{isLoading ? (
						<div className='space-y-2'>
							{Array.from({ length: 5 }).map((_, i) => (
								<div
									key={`skeleton-${i}`}
									className='h-8 rounded bg-muted motion-safe:animate-pulse'
								/>
							))}
						</div>
					) : recentTransactions.length === 0 ? (
						<p className='text-muted-foreground text-sm'>
							No transactions found.
						</p>
					) : (
						<div className='space-y-1'>
							{recentTransactions.map((transaction) => (
								<div
									key={transaction.id}
									className='flex items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-muted/50'
								>
									<div className='flex items-center gap-3'>
										<span className='font-medium'>{transaction.receiptNo}</span>
										<span className='text-muted-foreground text-xs'>
											{transaction.customerId}
										</span>
									</div>
									<div className='flex items-center gap-3'>
										<span className='text-muted-foreground text-xs tabular-nums'>
											$
											{transaction.totalAmount?.toLocaleString('en-US', {
												minimumFractionDigits: 2,
											}) ?? '0.00'}
										</span>
										<StatusBadge status={transaction.status} />
									</div>
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	)
}
