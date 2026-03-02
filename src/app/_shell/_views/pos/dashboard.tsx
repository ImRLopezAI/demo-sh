import { CreditCard, DollarSign, Monitor, Receipt } from 'lucide-react'
import * as React from 'react'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useModuleData } from '../../hooks/use-data'
import {
	average,
	buildCategorySeries,
	buildMonthlySeries,
	formatPercent,
} from '../_shared/dashboard-utils'
import {
	DashboardDistributionChart,
	DashboardTrendChart,
} from '../_shared/dashboard-widgets'
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

const TERMINAL_STATUS_STYLES: Record<string, string> = {
	ONLINE: 'bg-emerald-500',
	OFFLINE: 'bg-slate-400',
	MAINTENANCE: 'bg-amber-500',
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
		(sum, transaction) =>
			sum + (transaction.paidAmount ?? transaction.totalAmount ?? 0),
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

	const monthlyTransactionVolume = React.useMemo(
		() =>
			buildMonthlySeries(
				transactions,
				(transaction) => transaction.transactionAt,
			),
		[transactions],
	)

	const transactionStatusMix = React.useMemo(
		() =>
			buildCategorySeries(
				transactions.map((transaction) => transaction.status),
			),
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
				.slice(0, 12),
		[transactions],
	)

	const paymentBreakdown = React.useMemo(() => {
		const counts: Record<string, number> = {}
		for (const txn of transactions) {
			const method = txn.paymentMethod ?? 'UNKNOWN'
			counts[method] = (counts[method] ?? 0) + 1
		}
		return Object.entries(counts)
			.map(([method, count]) => ({ method, count }))
			.sort((a, b) => b.count - a.count)
	}, [transactions])

	const isLoading = transactionsLoading || terminalsLoading

	const PAYMENT_COLORS: Record<string, string> = {
		CASH: 'bg-emerald-500',
		CARD: 'bg-sky-500',
		MOBILE: 'bg-violet-500',
		MIXED: 'bg-amber-500',
		UNKNOWN: 'bg-slate-400',
	}

	return (
		<div className='space-y-5 pb-8'>
			{/* ── Terminal Status Bar ── */}
			<div className='rounded-xl border border-border/50 bg-background/60 p-4'>
				<div className='mb-3 flex items-center justify-between'>
					<div className='flex items-center gap-2'>
						<Monitor className='size-4 text-muted-foreground' />
						<span className='font-medium text-sm'>Terminal Fleet</span>
					</div>
					<span className='text-muted-foreground text-xs'>
						{onlineTerminals}/{terminals.length} online
					</span>
				</div>
				{terminals.length === 0 ? (
					<p className='text-muted-foreground text-xs'>
						No terminals registered.
					</p>
				) : (
					<div className='flex flex-wrap gap-2'>
						{terminals.map((terminal) => (
							<div
								key={terminal.id}
								className='flex items-center gap-2 rounded-lg border border-border/30 bg-background/40 px-3 py-1.5'
							>
								<div
									className={cn(
										'h-2 w-2 rounded-full',
										TERMINAL_STATUS_STYLES[terminal.status] ?? 'bg-slate-400',
									)}
								/>
								<span className='font-mono text-xs'>
									{terminal.terminalCode}
								</span>
								<span className='text-[10px] text-muted-foreground'>
									{terminal.locationCode}
								</span>
							</div>
						))}
					</div>
				)}
			</div>

			{/* ── 2x2 KPI Grid ── */}
			<div className='grid grid-cols-2 gap-3'>
				{[
					{
						label: 'Transactions',
						value: totalTransactions.toLocaleString(),
						icon: Receipt,
						sub: 'All POS transactions',
						accent: 'border-l-sky-500',
					},
					{
						label: 'Completion Rate',
						value: formatPercent(completedTransactions, totalTransactions),
						icon: CreditCard,
						sub: `${completedTransactions} completed`,
						accent: 'border-l-emerald-500',
					},
					{
						label: 'Net Sales',
						value: `$${netSales.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
						icon: DollarSign,
						sub: 'Captured payments',
						accent: 'border-l-amber-500',
					},
					{
						label: 'Avg Ticket',
						value: `$${avgTicket.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
						icon: Monitor,
						sub: 'Per transaction',
						accent: 'border-l-violet-500',
					},
				].map((kpi) => (
					<div
						key={kpi.label}
						className={cn(
							'rounded-lg border border-border/40 border-l-4 bg-background/60 p-4',
							kpi.accent,
						)}
					>
						<div className='flex items-start justify-between'>
							<div>
								<p className='text-[11px] text-muted-foreground uppercase tracking-wider'>
									{kpi.label}
								</p>
								<p className='mt-1 font-bold text-2xl tabular-nums tracking-tight'>
									{kpi.value}
								</p>
								<p className='mt-0.5 text-[11px] text-muted-foreground'>
									{kpi.sub}
								</p>
							</div>
							<kpi.icon className='size-4 text-muted-foreground/40' />
						</div>
					</div>
				))}
			</div>

			{/* ── Two-Column: Payment Mix + Transaction Status ── */}
			<div className='grid grid-cols-1 gap-5 lg:grid-cols-2'>
				{/* Payment Method Breakdown — Horizontal Bars */}
				<Card className='shadow-sm transition-shadow hover:shadow-md'>
					<CardHeader className='border-border/50 border-b bg-muted/20'>
						<CardTitle className='text-base'>Payment Mix</CardTitle>
						<CardDescription>
							Transaction distribution by payment method
						</CardDescription>
					</CardHeader>
					<CardContent className='space-y-3 pt-5'>
						{paymentBreakdown.length === 0 ? (
							<p className='py-6 text-center text-muted-foreground text-sm'>
								No payment data.
							</p>
						) : (
							paymentBreakdown.map((item) => {
								const pct =
									totalTransactions > 0
										? (item.count / totalTransactions) * 100
										: 0
								return (
									<div key={item.method} className='space-y-1'>
										<div className='flex items-center justify-between'>
											<span className='font-medium text-sm'>{item.method}</span>
											<span className='text-muted-foreground text-xs tabular-nums'>
												{item.count} ({pct.toFixed(1)}%)
											</span>
										</div>
										<div className='h-2.5 w-full overflow-hidden rounded-full bg-muted/60'>
											<div
												className={cn(
													'h-full rounded-full transition-all',
													PAYMENT_COLORS[item.method] ?? 'bg-slate-400',
												)}
												style={{ width: `${pct}%` }}
											/>
										</div>
									</div>
								)
							})
						)}
					</CardContent>
				</Card>

				{/* Transaction Status Mix — pie chart */}
				<DashboardDistributionChart
					className='shadow-sm transition-shadow hover:shadow-md'
					title='Transaction Status Mix'
					description='Distribution of current transaction states'
					data={transactionStatusMix}
				/>
			</div>

			{/* ── Transaction Volume Trend — full width ── */}
			<DashboardTrendChart
				className='shadow-sm transition-shadow hover:shadow-md'
				title='Transaction Volume Trend'
				description='Transactions processed per month'
				data={monthlyTransactionVolume}
				metricKey='count'
				metricLabel='Transactions'
			/>

			{/* ── Stats Strip ── */}
			<div className='grid grid-cols-2 gap-3 md:grid-cols-4'>
				{[
					{
						label: 'Online Terminals',
						value: `${onlineTerminals}/${terminals.length}`,
						sub: `${formatPercent(onlineTerminals, terminals.length)} availability`,
					},
					{
						label: 'Digital Payments',
						value: formatPercent(cardTxns, totalTransactions),
						sub: 'Card, mobile, and mixed',
					},
					{
						label: 'Avg Discount',
						value: `$${avgDiscount.toLocaleString('en-US', { maximumFractionDigits: 2 })}`,
						sub: 'Per transaction',
					},
					{
						label: 'Refunds',
						value: refundedTransactions.toLocaleString(),
						sub: `${formatPercent(refundedTransactions, totalTransactions)} of volume`,
					},
				].map((stat) => (
					<div
						key={stat.label}
						className='rounded-lg border border-border/40 bg-background/50 px-4 py-3'
					>
						<p className='text-[10px] text-muted-foreground uppercase tracking-wider'>
							{stat.label}
						</p>
						<p className='mt-0.5 font-semibold text-lg tabular-nums'>
							{stat.value}
						</p>
						<p className='text-[11px] text-muted-foreground'>{stat.sub}</p>
					</div>
				))}
			</div>

			{/* ── Recent Transaction Feed ── */}
			<Card className='shadow-sm transition-shadow hover:shadow-md'>
				<CardHeader className='border-border/50 border-b bg-muted/20'>
					<CardTitle className='text-base'>Transaction Feed</CardTitle>
					<CardDescription>
						Live view of recent point-of-sale activity
					</CardDescription>
				</CardHeader>
				<CardContent className='p-0'>
					{isLoading ? (
						<div className='space-y-0 p-4' role='status' aria-label='Loading'>
							{Array.from({ length: 6 }).map((_, i) => (
								<div
									key={`skeleton-${i}`}
									className='h-10 border-border/20 border-b bg-muted/30 motion-safe:animate-pulse'
								/>
							))}
						</div>
					) : recentTransactions.length === 0 ? (
						<div className='flex flex-col items-center justify-center py-12'>
							<Receipt className='mb-3 size-8 text-muted-foreground/30' />
							<p className='text-muted-foreground text-sm'>
								No transactions found.
							</p>
						</div>
					) : (
						<div className='divide-y divide-border/30'>
							{/* Header */}
							<div className='grid grid-cols-[1fr_100px_80px_80px_90px] gap-3 bg-muted/30 px-5 py-2 text-[10px] text-muted-foreground uppercase tracking-wider'>
								<span>Receipt</span>
								<span className='text-right'>Amount</span>
								<span className='text-right'>Tax</span>
								<span>Payment</span>
								<span className='text-right'>Status</span>
							</div>
							{recentTransactions.map((txn) => (
								<div
									key={txn.id}
									className='grid grid-cols-[1fr_100px_80px_80px_90px] items-center gap-3 px-5 py-2.5 text-sm transition-colors hover:bg-muted/20'
								>
									<div className='min-w-0'>
										<p className='truncate font-mono text-xs'>
											{txn.receiptNo}
										</p>
										<p className='truncate text-[10px] text-muted-foreground'>
											{new Date(txn.transactionAt).toLocaleString()}
										</p>
									</div>
									<span className='text-right font-medium tabular-nums'>
										$
										{txn.totalAmount?.toLocaleString('en-US', {
											minimumFractionDigits: 2,
										}) ?? '0.00'}
									</span>
									<span className='text-right text-muted-foreground text-xs tabular-nums'>
										$
										{txn.taxAmount?.toLocaleString('en-US', {
											minimumFractionDigits: 2,
										}) ?? '0.00'}
									</span>
									<span className='text-xs'>{txn.paymentMethod}</span>
									<div className='flex justify-end'>
										<StatusBadge status={txn.status} />
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
