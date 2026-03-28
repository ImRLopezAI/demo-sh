import { BookOpen, DollarSign, FileCheck, FileText } from 'lucide-react'
import * as React from 'react'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { useHydrateState } from '@/lib/json-render/use-hydrate-state'
import { cn } from '@/lib/utils'
import { useModuleData } from '../../hooks/use-data'
import {
	average,
	buildMonthlySeries,
	formatPercent,
} from '../_shared/dashboard-utils'
import { DashboardTrendChart } from '../_shared/dashboard-widgets'
import { StatusBadge } from '../_shared/status-badge'

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

export default function Dashboard() {
	const { items: invoices, isLoading: invoicesLoading } = useModuleData<
		'ledger',
		SalesInvoiceHeader
	>('ledger', 'invoices', 'all')

	const { items: customerEntries, isLoading: entriesLoading } = useModuleData<
		'ledger',
		CustLedgerEntry
	>('ledger', 'customerLedger', 'all')

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

	// E-Invoice funnel
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

	const now = new Date()
	const overdueEntries = openEntries.filter((entry) => {
		const inv = invoices.find((i) => i.invoiceNo === entry.documentNo)
		if (!inv) return false
		return new Date(inv.dueDate).getTime() < now.getTime()
	})
	const overdueCount = overdueEntries.length
	const overdueAmount = overdueEntries.reduce(
		(sum, e) => sum + (e.remainingAmount ?? 0),
		0,
	)
	const invoicesMTD = invoices.filter((inv) => {
		const d = new Date(inv.postingDate)
		return (
			d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
		)
	})
	const collectedAmount = customerEntries
		.filter((e) => e.documentType === 'PAYMENT')
		.reduce((sum, e) => sum + Math.abs(e.amount ?? 0), 0)

	const hydrateValues = React.useMemo(
		() => ({
			openInvoiceCount: openEntries.length,
			overdueCount,
			overdueAmountFormatted: `$${overdueAmount.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
			totalReceivables: `$${openReceivables.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
			invoicedMTD: `$${invoicesMTD.reduce((s, i) => s + (i.totalAmount ?? 0), 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
			invoiceCountMTD: invoicesMTD.length,
			collectedAmount: `$${collectedAmount.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
			daysOutstanding: Number(averageDueDays.toFixed(0)),
		}),
		[
			openEntries.length,
			overdueCount,
			overdueAmount,
			openReceivables,
			invoicesMTD,
			collectedAmount,
			averageDueDays,
		],
	)
	useHydrateState('/ledger/dashboard', hydrateValues)

	const monthlyInvoiceVolume = React.useMemo(
		() => buildMonthlySeries(invoices, (invoice) => invoice.postingDate),
		[invoices],
	)

	const recentInvoices = React.useMemo(
		() =>
			[...invoices]
				.sort(
					(a, b) =>
						new Date(b.postingDate).getTime() -
						new Date(a.postingDate).getTime(),
				)
				.slice(0, 10),
		[invoices],
	)

	const isLoading = invoicesLoading || entriesLoading

	// E-invoice funnel steps
	const funnelSteps = [
		{ label: 'Draft', count: eInvoiceDraft, color: 'bg-slate-400' },
		{ label: 'Posted', count: eInvoicePosted, color: 'bg-sky-500' },
		{ label: 'Submitted', count: eInvoiceSubmitted, color: 'bg-amber-500' },
		{ label: 'Accepted', count: eInvoiceAccepted, color: 'bg-emerald-500' },
		{ label: 'Rejected', count: eInvoiceRejected, color: 'bg-rose-500' },
	]
	const funnelMax = Math.max(1, ...funnelSteps.map((s) => s.count))

	return (
		<div className='space-y-6 pb-8'>
			{/* ── Dual-Metric Hero ── */}
			<div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
				{/* Invoiced Amount */}
				<div className='rounded-2xl border border-border/50 bg-gradient-to-br from-sky-500/8 via-background to-indigo-500/5 p-8'>
					<div className='flex items-center gap-2'>
						<DollarSign className='size-4 text-sky-600' />
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

				{/* Open Receivables */}
				<div className='rounded-2xl border border-border/50 bg-gradient-to-br from-amber-500/8 via-background to-rose-500/5 p-8'>
					<div className='flex items-center gap-2'>
						<BookOpen className='size-4 text-amber-600' />
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
						{openEntries.length.toLocaleString()} open entries &middot;{' '}
						{averageDueDays.toFixed(0)} day avg due window
					</p>
				</div>
			</div>

			{/* ── Invoice Status Counts ── */}
			<div className='grid grid-cols-3 gap-3'>
				{[
					{
						label: 'Draft',
						count: draftInvoices,
						icon: FileText,
						accent: 'border-l-slate-400',
					},
					{
						label: 'Posted',
						count: postedInvoices,
						icon: FileCheck,
						accent: 'border-l-emerald-500',
					},
					{
						label: 'Reversed',
						count: reversedInvoices,
						icon: BookOpen,
						accent: 'border-l-rose-500',
					},
				].map((item) => (
					<div
						key={item.label}
						className={cn(
							'rounded-lg border border-border/40 border-l-4 bg-background/60 p-4',
							item.accent,
						)}
					>
						<div className='flex items-center justify-between'>
							<p className='text-muted-foreground text-xs uppercase tracking-wider'>
								{item.label}
							</p>
							<item.icon className='size-3.5 text-muted-foreground/40' />
						</div>
						<p className='mt-1 font-bold text-2xl tabular-nums'>
							{item.count.toLocaleString()}
						</p>
						<p className='text-[10px] text-muted-foreground/60'>
							{formatPercent(item.count, totalInvoices)} of total
						</p>
					</div>
				))}
			</div>

			{/* ── E-Invoice Acceptance Funnel ── */}
			<Card className='shadow-sm transition-shadow hover:shadow-md'>
				<CardHeader className='border-border/50 border-b bg-muted/20'>
					<CardTitle className='text-base'>
						E-Invoice Processing Funnel
					</CardTitle>
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

			{/* ── Two-Column: Ledger Stats + Volume Trend ── */}
			<div className='grid grid-cols-1 gap-5 lg:grid-cols-5'>
				{/* Ledger Statistics */}
				<Card className='shadow-sm transition-shadow hover:shadow-md lg:col-span-2'>
					<CardHeader className='border-border/50 border-b bg-muted/20'>
						<CardTitle className='text-base'>Ledger Statistics</CardTitle>
					</CardHeader>
					<CardContent className='p-0'>
						{[
							{
								label: 'Open Customer Entries',
								value: openEntries.length.toLocaleString(),
								sub: `${formatPercent(openEntries.length, customerEntries.length)} of ledger entries`,
							},
							{
								label: 'Credit Memo Share',
								value: formatPercent(creditMemoCount, customerEntries.length),
								sub: `${creditMemoCount} credit memos`,
							},
							{
								label: 'Payment Entries',
								value: paymentCount.toLocaleString(),
								sub: `${formatPercent(paymentCount, customerEntries.length)} of ledger`,
							},
							{
								label: 'Average Due Window',
								value: `${averageDueDays.toFixed(1)} days`,
								sub: 'Posting to due date average',
							},
							{
								label: 'E-Invoice Acceptance',
								value: formatPercent(eInvoiceAccepted, totalInvoices),
								sub: `${eInvoiceAccepted} accepted of ${totalInvoices}`,
							},
						].map((stat, i) => (
							<div
								key={stat.label}
								className={cn(
									'flex items-baseline justify-between px-5 py-3 transition-colors hover:bg-muted/20',
									i > 0 && 'border-border/30 border-t',
								)}
							>
								<div>
									<p className='text-muted-foreground text-xs'>{stat.label}</p>
									<p className='mt-0.5 text-[10px] text-muted-foreground/60'>
										{stat.sub}
									</p>
								</div>
								<span className='font-semibold text-sm tabular-nums'>
									{stat.value}
								</span>
							</div>
						))}
					</CardContent>
				</Card>

				{/* Invoice Volume Trend */}
				<DashboardTrendChart
					className='shadow-sm transition-shadow hover:shadow-md lg:col-span-3'
					title='Invoice Volume Trend'
					description='Invoices posted per month'
					data={monthlyInvoiceVolume}
					metricKey='count'
					metricLabel='Invoices'
				/>
			</div>

			{/* ── Recent Invoices — Register Style ── */}
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
							<p className='text-muted-foreground text-sm'>
								No invoices found.
							</p>
						</div>
					) : (
						<>
							{/* Register header */}
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
											<StatusBadge status={invoice.status} />
										</div>
									</div>
								))}
							</div>
						</>
					)}
				</CardContent>
			</Card>
		</div>
	)
}
