'use client'

import { Receipt } from 'lucide-react'
import * as React from 'react'
import { useModuleData } from '@/app/_shell/hooks/use-data'
import {
	MetricStrip,
	RecordListPanel,
	StackedDistributionPanel,
	StatRowsPanel,
} from '@/components/ui/json-render/dashboard-sections'
import {
	DashboardDistributionChart,
	DashboardTrendChart,
} from '@/components/ui/json-render/dashboard-widgets'
import {
	average,
	buildCategorySeries,
	buildMonthlySeries,
	formatPercent,
} from '@/lib/json-render/dashboard-utils'

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

type PosDashboardContextValue = {
	isLoading: boolean
	metricItems: Array<{ label: string; value: string; icon: string }>
	paymentMethodMix: Array<{ name: string; value: number }>
	transactionStatusMix: Array<{ name: string; value: number }>
	monthlyTransactionVolume: Array<{
		month: string
		count: number
		amount: number
	}>
	posStatItems: Array<{
		label: string
		value: string
		description: string
	}>
	recentTransactions: Array<{
		id: string
		title: string
		subtitle: string
		status: string
	}>
	terminalItems: Array<{
		id: string
		title: string
		subtitle: string
		status: string
		leadingBadge: string
		leadingBadgeClassName: string
	}>
	terminalBadges: Array<{ label: string; count: string }>
}

const PosDashboardContext =
	React.createContext<PosDashboardContextValue | null>(null)

const PAYMENT_COLORS: Record<string, string> = {
	CASH: 'bg-emerald-500',
	CARD: 'bg-sky-500',
	MOBILE: 'bg-violet-500',
	MIXED: 'bg-amber-500',
	UNKNOWN: 'bg-slate-400',
}

const TERMINAL_STATUS_STYLES: Record<
	string,
	{ badge: string; className: string }
> = {
	ONLINE: {
		badge: 'ON',
		className: 'bg-emerald-500/10 text-emerald-600',
	},
	OFFLINE: {
		badge: 'OFF',
		className: 'bg-slate-500/10 text-slate-600',
	},
	MAINTENANCE: {
		badge: 'MT',
		className: 'bg-amber-500/10 text-amber-600',
	},
}

function usePosDashboardData() {
	const { items: transactions, isLoading: transactionsLoading } = useModuleData<
		'pos',
		PosTransaction
	>('pos', 'transactions', 'all')
	const { items: terminals, isLoading: terminalsLoading } = useModuleData<
		'pos',
		Terminal
	>('pos', 'terminals', 'all')

	const isLoading = transactionsLoading || terminalsLoading

	return React.useMemo<PosDashboardContextValue>(() => {
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
		const offlineTerminals = terminals.filter(
			(terminal) => terminal.status === 'OFFLINE',
		).length
		const maintenanceTerminals = terminals.filter(
			(terminal) => terminal.status === 'MAINTENANCE',
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

		const paymentCounts: Record<string, number> = {}
		for (const txn of transactions) {
			const method = txn.paymentMethod ?? 'UNKNOWN'
			paymentCounts[method] = (paymentCounts[method] ?? 0) + 1
		}
		const paymentMethodMix = Object.entries(paymentCounts)
			.map(([name, value]) => ({ name, value }))
			.sort((a, b) => b.value - a.value)

		const recentSorted = [...transactions]
			.sort(
				(a, b) =>
					new Date(b.transactionAt).getTime() -
					new Date(a.transactionAt).getTime(),
			)
			.slice(0, 12)

		return {
			isLoading,
			metricItems: [
				{
					label: 'Transactions',
					value: totalTransactions.toLocaleString(),
					icon: 'package',
				},
				{
					label: 'Completion Rate',
					value: formatPercent(completedTransactions, totalTransactions),
					icon: 'chart',
				},
				{
					label: 'Net Sales',
					value: netSales.toLocaleString('en-US', {
						style: 'currency',
						currency: 'USD',
						maximumFractionDigits: 0,
					}),
					icon: 'dollar',
				},
				{
					label: 'Avg Ticket',
					value: avgTicket.toLocaleString('en-US', {
						style: 'currency',
						currency: 'USD',
						maximumFractionDigits: 0,
					}),
					icon: 'dollar',
				},
				{
					label: 'Active Terminals',
					value: `${onlineTerminals}/${terminals.length}`,
					icon: 'map',
				},
				{
					label: 'Digital Payments',
					value: formatPercent(cardTxns, totalTransactions),
					icon: 'chart',
				},
			],
			paymentMethodMix,
			transactionStatusMix: buildCategorySeries(
				transactions.map((transaction) => transaction.status),
			),
			monthlyTransactionVolume: buildMonthlySeries(
				transactions,
				(transaction) => transaction.transactionAt,
			),
			posStatItems: [
				{
					label: 'Online Terminals',
					value: `${onlineTerminals}/${terminals.length}`,
					description: `${formatPercent(onlineTerminals, terminals.length)} availability`,
				},
				{
					label: 'Digital Payments',
					value: formatPercent(cardTxns, totalTransactions),
					description: 'Card, mobile, and mixed',
				},
				{
					label: 'Avg Discount',
					value: `$${avgDiscount.toLocaleString('en-US', { maximumFractionDigits: 2 })}`,
					description: 'Per transaction',
				},
				{
					label: 'Refunds',
					value: refundedTransactions.toLocaleString(),
					description: `${formatPercent(refundedTransactions, totalTransactions)} of volume`,
				},
			],
			recentTransactions: recentSorted.map((txn) => ({
				id: txn.id,
				title: `${txn.receiptNo} · $${txn.totalAmount?.toLocaleString('en-US', { minimumFractionDigits: 2 }) ?? '0.00'}`,
				subtitle: `${txn.paymentMethod} · ${new Date(txn.transactionAt).toLocaleString()}`,
				status: txn.status,
			})),
			terminalItems: terminals.slice(0, 8).map((terminal) => ({
				id: terminal.id,
				title: terminal.name || terminal.terminalCode,
				subtitle: `${terminal.terminalCode} · ${terminal.locationCode}`,
				status: terminal.status,
				leadingBadge: TERMINAL_STATUS_STYLES[terminal.status]?.badge ?? '??',
				leadingBadgeClassName:
					TERMINAL_STATUS_STYLES[terminal.status]?.className ??
					'bg-slate-100 text-slate-600',
			})),
			terminalBadges: [
				{ label: 'ON', count: onlineTerminals.toString() },
				{ label: 'OFF', count: offlineTerminals.toString() },
				{ label: 'MT', count: maintenanceTerminals.toString() },
			],
		}
	}, [isLoading, transactions, terminals])
}

function usePosDashboardContext() {
	const value = React.useContext(PosDashboardContext)
	if (!value) {
		throw new Error('POS dashboard section must be used within provider')
	}
	return value
}

export function PosDashboardData({ children }: { children?: React.ReactNode }) {
	const value = usePosDashboardData()
	return (
		<PosDashboardContext.Provider value={value}>
			{children}
		</PosDashboardContext.Provider>
	)
}

export function PosKpiStrip() {
	const { metricItems } = usePosDashboardContext()
	return <MetricStrip items={metricItems} />
}

export function PosPaymentMethodDistribution() {
	const { paymentMethodMix } = usePosDashboardContext()
	return (
		<StackedDistributionPanel
			title='Payment Mix'
			description='Transaction distribution by payment method'
			items={paymentMethodMix}
			colorMap={PAYMENT_COLORS}
			emptyMessage='No payment data available.'
		/>
	)
}

export function PosTransactionStatusDistribution() {
	const { transactionStatusMix } = usePosDashboardContext()
	return (
		<DashboardDistributionChart
			className='shadow-sm transition-shadow hover:shadow-md'
			title='Transaction Status Mix'
			description='Distribution of current transaction states'
			data={transactionStatusMix}
		/>
	)
}

export function PosTransactionVolumeTrend() {
	const { monthlyTransactionVolume } = usePosDashboardContext()
	return (
		<DashboardTrendChart
			className='shadow-sm transition-shadow hover:shadow-md'
			title='Transaction Volume Trend'
			description='Transactions processed per month'
			data={monthlyTransactionVolume}
			metricKey='count'
			metricLabel='Transactions'
		/>
	)
}

export function PosOperationalStats() {
	const { posStatItems } = usePosDashboardContext()
	return <StatRowsPanel title='Operational Metrics' items={posStatItems} />
}

export function PosRecentTransactions() {
	const { isLoading, recentTransactions } = usePosDashboardContext()
	return (
		<RecordListPanel
			title='Transaction Feed'
			items={recentTransactions}
			isLoading={isLoading}
			emptyMessage='No transactions found.'
			emptyIcon={<Receipt className='mb-3 h-8 w-8 text-muted-foreground/50' />}
		/>
	)
}

export function PosTerminalSummary() {
	const { isLoading, terminalBadges, terminalItems } = usePosDashboardContext()
	return (
		<RecordListPanel
			title='Terminal Fleet'
			items={terminalItems}
			isLoading={isLoading}
			metaBadges={terminalBadges}
			emptyMessage='No terminals registered.'
			emptyIcon={<Receipt className='mb-3 h-8 w-8 text-muted-foreground/50' />}
		/>
	)
}
