'use client'

import { FileText } from 'lucide-react'
import * as React from 'react'
import { useModuleData } from '@/app/_shell/hooks/use-data'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import {
	MetricStrip,
	StatRowsPanel,
} from '@/components/ui/json-render/dashboard-sections'
import { DashboardTrendChart } from '@/components/ui/json-render/dashboard-widgets'
import {
	average,
	buildMonthlySeries,
	formatPercent,
} from '@/lib/json-render/dashboard-utils'
import { cn } from '@/lib/utils'

interface SalesInvoiceHeader {
	id: string
	invoiceNo: string
	status: 'DRAFT' | 'POSTED' | 'REVERSED'
	eInvoiceStatus:
		| 'DRAFT'
		| 'POSTED'
		| 'SUBMITTED'
		| 'ACCEPTED'
		| 'REJECTED'
		| 'CANCELED'
	customerId: string
	salesOrderNo: string
	postingDate: string
	dueDate: string
	currency: string
	lineCount: number
	totalAmount: number
}

interface CustLedgerEntry {
	id: string
	entryNo: number
	customerId: string
	postingDate: string
	documentType: 'INVOICE' | 'CREDIT_MEMO' | 'PAYMENT'
	documentNo: string
	description: string
	amount: number
	remainingAmount: number
	open: boolean
	currency: string
}

type LedgerDashboardContextValue = {
	isLoading: boolean
	metricItems: Array<{ label: string; value: string; icon: string }>
	invoicedAmount: number
	avgInvoiceAmount: number
	totalInvoices: number
	openReceivables: number
	openEntryCount: number
	averageDueDays: number
	invoiceStatusCounts: Array<{
		label: string
		count: number
		accent: string
	}>
	funnelSteps: Array<{
		label: string
		count: number
		color: string
	}>
	funnelMax: number
	ledgerStatItems: Array<{
		label: string
		value: string
		description: string
	}>
	monthlyInvoiceVolume: Array<{
		month: string
		count: number
		amount: number
	}>
	recentInvoices: Array<{
		id: string
		invoiceNo: string
		customerId: string
		totalAmount: number
		postingDate: string
		dueDate: string
		status: string
	}>
}

const LedgerDashboardContext =
	React.createContext<LedgerDashboardContextValue | null>(null)

function useLedgerDashboardData() {
	const { items: invoices, isLoading: invoicesLoading } = useModuleData<
		'ledger',
		SalesInvoiceHeader
	>('ledger', 'invoices', 'all')

	const { items: customerEntries, isLoading: entriesLoading } = useModuleData<
		'ledger',
		CustLedgerEntry
	>('ledger', 'customerLedger', 'all')

	const isLoading = invoicesLoading || entriesLoading

	return React.useMemo<LedgerDashboardContextValue>(() => {
		const totalInvoices = invoices.length
		const postedInvoices = invoices.filter(
			(invoice) => invoice.status === 'POSTED',
		).length
		const draftInvoices = invoices.filter(
			(invoice) => invoice.status === 'DRAFT',
		).length
		const reversedInvoices = invoices.filter(
			(invoice) => invoice.status === 'REVERSED',
		).length

		const eInvoiceDraft = invoices.filter(
			(invoice) => invoice.eInvoiceStatus === 'DRAFT',
		).length
		const eInvoicePosted = invoices.filter(
			(invoice) => invoice.eInvoiceStatus === 'POSTED',
		).length
		const eInvoiceSubmitted = invoices.filter(
			(invoice) => invoice.eInvoiceStatus === 'SUBMITTED',
		).length
		const eInvoiceAccepted = invoices.filter(
			(invoice) => invoice.eInvoiceStatus === 'ACCEPTED',
		).length
		const eInvoiceRejected = invoices.filter(
			(invoice) => invoice.eInvoiceStatus === 'REJECTED',
		).length

		const invoicedAmount = invoices.reduce(
			(sum, invoice) => sum + (invoice.totalAmount ?? 0),
			0,
		)
		const openEntries = customerEntries.filter((entry) => entry.open)
		const openReceivables = openEntries.reduce(
			(sum, entry) => sum + (entry.remainingAmount ?? 0),
			0,
		)
		const avgInvoiceAmount = average(
			invoices.map((invoice) => invoice.totalAmount ?? 0),
		)
		const creditMemoCount = customerEntries.filter(
			(entry) => entry.documentType === 'CREDIT_MEMO',
		).length
		const paymentCount = customerEntries.filter(
			(entry) => entry.documentType === 'PAYMENT',
		).length
		const averageDueDays = average(
			invoices
				.map((invoice) => {
					const posting = new Date(invoice.postingDate).getTime()
					const due = new Date(invoice.dueDate).getTime()
					if (Number.isNaN(posting) || Number.isNaN(due)) return null
					return Math.max(0, (due - posting) / (1000 * 60 * 60 * 24))
				})
				.filter((value): value is number => typeof value === 'number'),
		)

		const recentInvoices = [...invoices]
			.sort(
				(a, b) =>
					new Date(b.postingDate).getTime() - new Date(a.postingDate).getTime(),
			)
			.slice(0, 10)

		return {
			isLoading,
			metricItems: [
				{
					label: 'Total Invoiced',
					value: `$${invoicedAmount.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
					icon: 'dollar',
				},
				{
					label: 'Open Receivables',
					value: `$${openReceivables.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
					icon: 'dollar',
				},
				{
					label: 'Avg Days Outstanding',
					value: `${averageDueDays.toFixed(0)}d`,
					icon: 'chart',
				},
				{
					label: 'Total Invoices',
					value: totalInvoices.toLocaleString(),
					icon: 'package',
				},
				{
					label: 'Avg Invoice',
					value: `$${avgInvoiceAmount.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
					icon: 'dollar',
				},
				{
					label: 'Open Entries',
					value: openEntries.length.toLocaleString(),
					icon: 'chart',
				},
			],
			invoicedAmount,
			avgInvoiceAmount,
			totalInvoices,
			openReceivables,
			openEntryCount: openEntries.length,
			averageDueDays,
			invoiceStatusCounts: [
				{
					label: 'Draft',
					count: draftInvoices,
					accent: 'border-l-slate-400',
				},
				{
					label: 'Posted',
					count: postedInvoices,
					accent: 'border-l-emerald-500',
				},
				{
					label: 'Reversed',
					count: reversedInvoices,
					accent: 'border-l-rose-500',
				},
			],
			funnelSteps: [
				{ label: 'Draft', count: eInvoiceDraft, color: 'bg-slate-400' },
				{ label: 'Posted', count: eInvoicePosted, color: 'bg-sky-500' },
				{
					label: 'Submitted',
					count: eInvoiceSubmitted,
					color: 'bg-amber-500',
				},
				{
					label: 'Accepted',
					count: eInvoiceAccepted,
					color: 'bg-emerald-500',
				},
				{
					label: 'Rejected',
					count: eInvoiceRejected,
					color: 'bg-rose-500',
				},
			],
			funnelMax: Math.max(
				1,
				eInvoiceDraft,
				eInvoicePosted,
				eInvoiceSubmitted,
				eInvoiceAccepted,
				eInvoiceRejected,
			),
			ledgerStatItems: [
				{
					label: 'Open Customer Entries',
					value: openEntries.length.toLocaleString(),
					description: `${formatPercent(openEntries.length, customerEntries.length)} of ledger entries`,
				},
				{
					label: 'Credit Memo Share',
					value: formatPercent(creditMemoCount, customerEntries.length),
					description: `${creditMemoCount} credit memos`,
				},
				{
					label: 'Payment Entries',
					value: paymentCount.toLocaleString(),
					description: `${formatPercent(paymentCount, customerEntries.length)} of ledger`,
				},
				{
					label: 'Average Due Window',
					value: `${averageDueDays.toFixed(1)} days`,
					description: 'Posting to due date average',
				},
				{
					label: 'E-Invoice Acceptance',
					value: formatPercent(eInvoiceAccepted, totalInvoices),
					description: `${eInvoiceAccepted} accepted of ${totalInvoices}`,
				},
			],
			monthlyInvoiceVolume: buildMonthlySeries(
				invoices,
				(invoice) => invoice.postingDate,
			),
			recentInvoices: recentInvoices.map((invoice) => ({
				id: invoice.id,
				invoiceNo: invoice.invoiceNo,
				customerId: invoice.customerId,
				totalAmount: invoice.totalAmount,
				postingDate: invoice.postingDate,
				dueDate: invoice.dueDate,
				status: invoice.status,
			})),
		}
	}, [isLoading, invoices, customerEntries])
}

function useLedgerDashboardContext() {
	const value = React.useContext(LedgerDashboardContext)
	if (!value) {
		throw new Error('Ledger dashboard section must be used within provider')
	}
	return value
}

export function LedgerDashboardData({
	children,
}: {
	children?: React.ReactNode
}) {
	const value = useLedgerDashboardData()
	return (
		<LedgerDashboardContext.Provider value={value}>
			{children}
		</LedgerDashboardContext.Provider>
	)
}

export function LedgerKpiStrip() {
	const { metricItems } = useLedgerDashboardContext()
	return <MetricStrip items={metricItems} />
}

export function LedgerHeroCards() {
	const {
		invoicedAmount,
		avgInvoiceAmount,
		totalInvoices,
		openReceivables,
		openEntryCount,
		averageDueDays,
	} = useLedgerDashboardContext()

	return (
		<div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
			<div className='rounded-2xl border border-border/50 bg-gradient-to-br from-sky-500/8 via-background to-indigo-500/5 p-8'>
				<div className='flex items-center gap-2'>
					<p className='font-medium text-muted-foreground text-xs uppercase tracking-[0.2em]'>
						Invoiced Amount
					</p>
				</div>
				<p className='mt-3 font-bold text-4xl tabular-nums tracking-tight'>
					$
					{invoicedAmount.toLocaleString('en-US', {
						maximumFractionDigits: 0,
					})}
				</p>
				<p className='mt-2 text-muted-foreground text-sm'>
					{totalInvoices.toLocaleString()} invoices &middot; avg $
					{avgInvoiceAmount.toLocaleString('en-US', {
						maximumFractionDigits: 0,
					})}
				</p>
			</div>

			<div className='rounded-2xl border border-border/50 bg-gradient-to-br from-amber-500/8 via-background to-rose-500/5 p-8'>
				<div className='flex items-center gap-2'>
					<p className='font-medium text-muted-foreground text-xs uppercase tracking-[0.2em]'>
						Open Receivables
					</p>
				</div>
				<p className='mt-3 font-bold text-4xl tabular-nums tracking-tight'>
					$
					{openReceivables.toLocaleString('en-US', {
						maximumFractionDigits: 0,
					})}
				</p>
				<p className='mt-2 text-muted-foreground text-sm'>
					{openEntryCount.toLocaleString()} open entries &middot;{' '}
					{averageDueDays.toFixed(0)} day avg due window
				</p>
			</div>
		</div>
	)
}

export function LedgerInvoiceStatusCounts() {
	const { invoiceStatusCounts, totalInvoices } = useLedgerDashboardContext()

	return (
		<div className='grid grid-cols-3 gap-3'>
			{invoiceStatusCounts.map((item) => (
				<div
					key={item.label}
					className={cn(
						'rounded-lg border border-border/40 border-l-4 bg-background/60 p-4',
						item.accent,
					)}
				>
					<p className='text-muted-foreground text-xs uppercase tracking-wider'>
						{item.label}
					</p>
					<p className='mt-1 font-bold text-2xl tabular-nums'>
						{item.count.toLocaleString()}
					</p>
					<p className='text-[10px] text-muted-foreground/60'>
						{formatPercent(item.count, totalInvoices)} of total
					</p>
				</div>
			))}
		</div>
	)
}

export function LedgerEInvoiceFunnel() {
	const { funnelSteps, funnelMax } = useLedgerDashboardContext()

	return (
		<Card className='shadow-sm transition-shadow hover:shadow-md'>
			<CardHeader className='border-border/50 border-b bg-muted/20'>
				<CardTitle className='text-base'>E-Invoice Processing Funnel</CardTitle>
				<CardDescription>Electronic invoice lifecycle stages</CardDescription>
			</CardHeader>
			<CardContent className='space-y-3 pt-5'>
				{funnelSteps.map((step) => {
					const pct = (step.count / funnelMax) * 100
					return (
						<div key={step.label} className='flex items-center gap-4'>
							<span className='w-20 text-right text-muted-foreground text-xs'>
								{step.label}
							</span>
							<div className='relative h-8 flex-1'>
								<div
									className={cn(
										'absolute inset-y-0 left-0 flex items-center rounded-md px-3 transition-all',
										step.color,
									)}
									style={{
										width: `${Math.max(pct, step.count > 0 ? 8 : 0)}%`,
									}}
								>
									<span className='font-semibold text-white text-xs tabular-nums drop-shadow-sm'>
										{step.count > 0 ? step.count.toLocaleString() : ''}
									</span>
								</div>
							</div>
						</div>
					)
				})}
			</CardContent>
		</Card>
	)
}

export function LedgerStats() {
	const { ledgerStatItems } = useLedgerDashboardContext()
	return <StatRowsPanel title='Ledger Statistics' items={ledgerStatItems} />
}

export function LedgerInvoiceVolumeTrend() {
	const { monthlyInvoiceVolume } = useLedgerDashboardContext()
	return (
		<DashboardTrendChart
			className='shadow-sm transition-shadow hover:shadow-md'
			title='Invoice Volume Trend'
			description='Invoices posted per month'
			data={monthlyInvoiceVolume}
			metricKey='count'
			metricLabel='Invoices'
		/>
	)
}

export function LedgerInvoiceRegister() {
	const { isLoading, recentInvoices } = useLedgerDashboardContext()

	return (
		<Card className='shadow-sm transition-shadow hover:shadow-md'>
			<CardHeader className='border-border/50 border-b bg-muted/20'>
				<div className='flex items-center justify-between'>
					<div>
						<CardTitle className='text-base'>Invoice Register</CardTitle>
						<CardDescription>
							Latest sales invoices by posting date
						</CardDescription>
					</div>
					<span className='rounded-full border border-sky-200/60 bg-sky-50 px-3 py-1 font-medium text-sky-700 text-xs dark:border-sky-800/40 dark:bg-sky-950 dark:text-sky-300'>
						{recentInvoices.length} shown
					</span>
				</div>
			</CardHeader>
			<CardContent className='p-0'>
				{isLoading ? (
					<div className='space-y-0 p-4' role='status' aria-label='Loading'>
						{Array.from({ length: 5 }).map((_, i) => (
							<div
								key={`skeleton-${i}`}
								className='h-10 border-border/20 border-b bg-muted/30 motion-safe:animate-pulse'
							/>
						))}
					</div>
				) : recentInvoices.length === 0 ? (
					<div className='flex flex-col items-center justify-center py-12'>
						<FileText className='mb-3 size-8 text-muted-foreground/30' />
						<p className='text-muted-foreground text-sm'>No invoices found.</p>
					</div>
				) : (
					<>
						<div className='grid grid-cols-[1fr_100px_100px_80px_100px] gap-3 border-border/30 border-b bg-muted/30 px-5 py-2 text-[10px] text-muted-foreground uppercase tracking-wider'>
							<span>Invoice</span>
							<span className='text-right'>Amount</span>
							<span className='text-right'>Posted</span>
							<span className='text-right'>Due</span>
							<span className='text-right'>Status</span>
						</div>
						<div className='divide-y divide-border/20'>
							{recentInvoices.map((invoice) => (
								<div
									key={invoice.id}
									className='grid grid-cols-[1fr_100px_100px_80px_100px] items-center gap-3 px-5 py-2.5 text-sm transition-colors hover:bg-muted/20'
								>
									<div className='min-w-0'>
										<p className='truncate font-medium text-xs'>
											{invoice.invoiceNo}
										</p>
										<p className='truncate text-[10px] text-muted-foreground'>
											{invoice.customerId}
										</p>
									</div>
									<span className='text-right font-medium tabular-nums'>
										$
										{invoice.totalAmount?.toLocaleString('en-US', {
											minimumFractionDigits: 2,
										}) ?? '0.00'}
									</span>
									<span className='text-right text-muted-foreground text-xs tabular-nums'>
										{new Date(invoice.postingDate).toLocaleDateString()}
									</span>
									<span className='text-right text-muted-foreground text-xs tabular-nums'>
										{new Date(invoice.dueDate).toLocaleDateString()}
									</span>
									<div className='flex justify-end'>
										<span
											className={cn(
												'inline-flex items-center rounded-full px-2 py-0.5 font-medium text-[10px]',
												invoice.status === 'POSTED' &&
													'bg-emerald-500/10 text-emerald-600',
												invoice.status === 'DRAFT' &&
													'bg-slate-500/10 text-slate-600',
												invoice.status === 'REVERSED' &&
													'bg-rose-500/10 text-rose-600',
											)}
										>
											{invoice.status}
										</span>
									</div>
								</div>
							))}
						</div>
					</>
				)}
			</CardContent>
		</Card>
	)
}
