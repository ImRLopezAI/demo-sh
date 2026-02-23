import { BookOpen, DollarSign, FileCheck, FileText } from 'lucide-react'
import * as React from 'react'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
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
	const acceptedEInvoices = invoices.filter(
		(invoice) => invoice.eInvoiceStatus === 'ACCEPTED',
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

	const kpis = React.useMemo<KpiCardDef[]>(
		() => [
			{
				title: 'Total Invoices',
				value: totalInvoices,
				description: 'All sales invoices',
				icon: FileText,
			},
			{
				title: 'Posted Rate',
				value: formatPercent(postedInvoices, totalInvoices),
				description: 'Finalized invoices',
				icon: FileCheck,
			},
			{
				title: 'Invoiced Amount',
				value: `$${invoicedAmount.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
				description: 'Gross invoice value',
				icon: DollarSign,
			},
			{
				title: 'Open Receivables',
				value: `$${openReceivables.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
				description: 'Outstanding customer balances',
				icon: BookOpen,
			},
		],
		[invoicedAmount, openReceivables, postedInvoices, totalInvoices],
	)

	const monthlyInvoiceVolume = React.useMemo(
		() => buildMonthlySeries(invoices, (invoice) => invoice.postingDate),
		[invoices],
	)

	const invoiceStatusMix = React.useMemo(
		() => buildCategorySeries(invoices.map((invoice) => invoice.status)),
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

	return (
		<div className='space-y-8 pb-8'>
			<PageHeader
				title='Ledger Dashboard'
				description='Invoice health, receivables exposure, and accounting quality signals.'
			/>

			<KpiCards cards={kpis} />

			<DashboardSectionGrid>
				<DashboardTrendChart
					className='shadow-sm transition-shadow duration-300 hover:shadow-md xl:col-span-2'
					title='Invoice Volume Trend'
					description='Invoices posted per month'
					data={monthlyInvoiceVolume}
					metricKey='count'
					metricLabel='Invoices'
				/>
				<DashboardDistributionChart
					className='shadow-sm transition-shadow duration-300 hover:shadow-md'
					title='Invoice Status Mix'
					description='Current invoice lifecycle distribution'
					data={invoiceStatusMix}
				/>
			</DashboardSectionGrid>

			<DashboardStatsPanel
				className='shadow-sm transition-shadow duration-300 hover:shadow-md'
				title='Ledger Statistics'
				description='Quality and risk indicators for accounts receivable'
				items={[
					{
						label: 'Average Invoice Amount',
						value: `$${avgInvoiceAmount.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
						description: 'Mean invoice value',
					},
					{
						label: 'Open Customer Entries',
						value: openEntries.length.toLocaleString(),
						description: `${formatPercent(openEntries.length, customerEntries.length)} of ledger entries`,
					},
					{
						label: 'Credit Memo Share',
						value: formatPercent(creditMemoCount, customerEntries.length),
						description: 'Credit memo entries over total ledger documents',
					},
					{
						label: 'Average Due Window',
						value: `${averageDueDays.toFixed(1)} days`,
						description: 'Posting date to due date average',
					},
					{
						label: 'E-Invoice Acceptance',
						value: formatPercent(acceptedEInvoices, totalInvoices),
						description: `${acceptedEInvoices.toLocaleString()} accepted submissions`,
					},
				]}
			/>

			<Card className='shadow-sm transition-shadow duration-300 hover:shadow-md'>
				<CardHeader className='border-border/50 border-b pb-4'>
					<CardTitle className='text-xl'>Recent Invoices</CardTitle>
					<CardDescription>Latest sales invoices</CardDescription>
				</CardHeader>
				<CardContent className='pt-6'>
					{isLoading ? (
						<div className='space-y-3' role='status' aria-label='Loading'>
							{Array.from({ length: 5 }).map((_, i) => (
								<div
									key={`skeleton-${i}`}
									className='h-12 rounded-lg bg-muted/50 motion-safe:animate-pulse'
								/>
							))}
						</div>
					) : recentInvoices.length === 0 ? (
						<p className='text-muted-foreground text-sm'>No invoices found.</p>
					) : (
						<ul className='space-y-2'>
							{recentInvoices.map((invoice) => (
								<li
									key={invoice.id}
									className='flex items-center justify-between rounded-lg border border-border/40 bg-background/30 p-3 text-sm transition-colors hover:bg-muted/50'
								>
									<div className='flex min-w-0 items-center gap-3'>
										<span className='truncate font-medium'>
											{invoice.invoiceNo}
										</span>
										<span className='truncate text-muted-foreground text-xs'>
											{invoice.customerId}
										</span>
									</div>
									<div className='flex items-center gap-3'>
										<span className='text-muted-foreground text-xs tabular-nums'>
											$
											{invoice.totalAmount?.toLocaleString('en-US', {
												minimumFractionDigits: 2,
											}) ?? '0.00'}
										</span>
										<StatusBadge status={invoice.status} />
									</div>
								</li>
							))}
						</ul>
					)}
				</CardContent>
			</Card>
		</div>
	)
}
