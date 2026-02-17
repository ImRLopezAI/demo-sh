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

export default function Dashboard() {
	const { items: invoices, isLoading: invoicesLoading } = useModuleData(
		'ledger',
		'salesInvoiceHeaders',
	)

	const { items: customerEntries, isLoading: entriesLoading } = useModuleData(
		'ledger',
		'custLedgerEntries',
	)

	const totalInvoices = invoices.length
	const postedInvoices = invoices.filter(
		(invoice) => invoice.status === 'POSTED',
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
				const posting = new Date(invoice.postingDate ?? '').getTime()
				const due = new Date(invoice.dueDate ?? '').getTime()
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
						new Date(b.postingDate ?? '').getTime() -
						new Date(a.postingDate ?? '').getTime(),
				)
				.slice(0, 10),
		[invoices],
	)

	const isLoading = invoicesLoading || entriesLoading

	return (
		<div className='space-y-6'>
			<PageHeader
				title='Ledger Dashboard'
				description='Invoice health, receivables exposure, and accounting quality signals.'
			/>

			<KpiCards cards={kpis} />

			<DashboardSectionGrid>
				<DashboardTrendChart
					className='xl:col-span-2'
					title='Invoice Volume Trend'
					description='Invoices posted per month'
					data={monthlyInvoiceVolume}
					metricKey='count'
					metricLabel='Invoices'
				/>
				<DashboardDistributionChart
					title='Invoice Status Mix'
					description='Current invoice lifecycle distribution'
					data={invoiceStatusMix}
				/>
			</DashboardSectionGrid>

			<DashboardStatsPanel
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
				]}
			/>

			<Card>
				<CardHeader className='border-b'>
					<CardTitle>Recent Invoices</CardTitle>
					<CardDescription>Latest sales invoices</CardDescription>
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
					) : recentInvoices.length === 0 ? (
						<p className='text-muted-foreground text-sm'>No invoices found.</p>
					) : (
						<ul className='space-y-1'>
							{recentInvoices.map((invoice) => (
								<li
									key={invoice._id}
									className='flex items-center justify-between rounded-md px-3 py-2 text-sm'
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
