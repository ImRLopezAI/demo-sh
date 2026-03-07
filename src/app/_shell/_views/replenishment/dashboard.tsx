import {
	ArrowRight,
	ArrowRightLeft,
	CheckCircle2,
	ClipboardCheck,
	PackageSearch,
	ShoppingCart,
} from 'lucide-react'
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
} from '../_shared/dashboard-utils'
import { DashboardTrendChart } from '../_shared/dashboard-widgets'
import { PageHeader } from '../_shared/page-header'
import { StatusBadge } from '../_shared/status-badge'

interface PurchaseOrder {
	_id: string
	documentNo: string
	documentType: 'ORDER' | 'RETURN_ORDER' | 'QUOTE'
	status:
		| 'DRAFT'
		| 'PENDING_APPROVAL'
		| 'APPROVED'
		| 'REJECTED'
		| 'COMPLETED'
		| 'CANCELED'
	vendorId: string
	orderDate: string
	expectedReceiptDate: string
	currency: string
	lineCount: number
	totalAmount: number
}

interface Vendor {
	_id: string
	vendorNo: string
	name: string
	blocked: boolean
}

interface Transfer {
	_id: string
	transferNo: string
	status: 'DRAFT' | 'RELEASED' | 'IN_TRANSIT' | 'RECEIVED' | 'CANCELED'
}

interface PurchaseLineBalance {
	_id: string
	quantity: number
	quantityReceived: number
	quantityInvoiced: number
}

export default function Dashboard() {
	const { items: purchaseOrders, isLoading: purchaseOrdersLoading } =
		useModuleData<'replenishment', PurchaseOrder>(
			'replenishment',
			'purchaseOrders',
			'all',
		)

	const { items: vendors, isLoading: vendorsLoading } = useModuleData<
		'replenishment',
		Vendor
	>('replenishment', 'vendors', 'all')

	const { items: transfers, isLoading: transfersLoading } = useModuleData<
		'replenishment',
		Transfer
	>('replenishment', 'transfers', 'all')
	const { items: purchaseLines, isLoading: purchaseLinesLoading } =
		useModuleData<'replenishment', PurchaseLineBalance>(
			'replenishment',
			'purchaseLines',
			'all',
		)

	const totalPOs = purchaseOrders.length
	const pendingApproval = purchaseOrders.filter(
		(order) => order.status === 'PENDING_APPROVAL',
	).length
	const activeVendors = vendors.filter((vendor) => !vendor.blocked).length
	const blockedVendors = vendors.length - activeVendors
	const activeTransfers = transfers.filter(
		(transfer) =>
			transfer.status === 'RELEASED' || transfer.status === 'IN_TRANSIT',
	).length
	const averagePOValue = average(
		purchaseOrders.map((order) => order.totalAmount ?? 0),
	)
	const totalOrderedQty = purchaseLines.reduce(
		(sum, line) => sum + Number(line.quantity ?? 0),
		0,
	)
	const totalReceivedQty = purchaseLines.reduce(
		(sum, line) => sum + Number(line.quantityReceived ?? 0),
		0,
	)
	const totalInvoicedQty = purchaseLines.reduce(
		(sum, line) => sum + Number(line.quantityInvoiced ?? 0),
		0,
	)
	const openReceiptQty = Math.max(0, totalOrderedQty - totalReceivedQty)
	const openInvoiceQty = Math.max(0, totalReceivedQty - totalInvoicedQty)
	const urgentReceipts = purchaseOrders.filter((order) => {
		if (order.status === 'COMPLETED' || order.status === 'CANCELED')
			return false
		const expectedDate = new Date(order.expectedReceiptDate).getTime()
		if (Number.isNaN(expectedDate)) return false
		const now = Date.now()
		const diffDays = (expectedDate - now) / (1000 * 60 * 60 * 24)
		return diffDays >= 0 && diffDays <= 7
	}).length

	const monthlyPurchaseOrderVolume = React.useMemo(
		() => buildMonthlySeries(purchaseOrders, (order) => order.orderDate),
		[purchaseOrders],
	)

	const purchaseOrderStatusMix = React.useMemo(
		() => buildCategorySeries(purchaseOrders.map((order) => order.status)),
		[purchaseOrders],
	)

	const recentPurchaseOrders = React.useMemo(
		() =>
			[...purchaseOrders]
				.sort(
					(a, b) =>
						new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime(),
				)
				.slice(0, 8),
		[purchaseOrders],
	)

	const vendorNameById = React.useMemo(
		() => new Map(vendors.map((vendor) => [vendor._id, vendor.name])),
		[vendors],
	)

	const transferStatusCounts = React.useMemo(() => {
		const counts: Record<string, number> = {}
		for (const t of transfers) {
			counts[t.status] = (counts[t.status] ?? 0) + 1
		}
		return counts
	}, [transfers])

	const isLoading =
		purchaseOrdersLoading ||
		vendorsLoading ||
		transfersLoading ||
		purchaseLinesLoading

	const receivedPct =
		totalOrderedQty > 0 ? (totalReceivedQty / totalOrderedQty) * 100 : 0
	const invoicedPct =
		totalReceivedQty > 0 ? (totalInvoicedQty / totalReceivedQty) * 100 : 0

	const statusTotal = purchaseOrderStatusMix.reduce((s, p) => s + p.value, 0)

	return (
		<div className='space-y-6 pb-8'>
			<PageHeader
				title='Replenishment Dashboard'
				description='Supply pipeline visibility for purchase orders, receipts, and transfers.'
			/>

			{/* ── Supply Pipeline ── */}
			<div className='rounded-2xl border border-border/50 bg-gradient-to-r from-sky-500/5 via-background to-indigo-500/5 p-6'>
				<p className='mb-4 font-medium text-muted-foreground text-xs uppercase tracking-[0.2em]'>
					Supply Pipeline
				</p>
				<div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
					{/* Ordered */}
					<div className='rounded-xl border border-sky-200/50 bg-sky-500/5 p-5 dark:border-sky-800/40'>
						<div className='flex items-center gap-2'>
							<ShoppingCart className='size-4 text-sky-600' />
							<span className='font-medium text-sky-700 text-sm dark:text-sky-400'>
								Ordered
							</span>
						</div>
						<p className='mt-2 font-bold text-3xl tabular-nums tracking-tight'>
							{totalOrderedQty.toLocaleString()}
						</p>
						<p className='mt-1 text-muted-foreground text-xs'>
							units across {purchaseLines.length.toLocaleString()} lines
						</p>
					</div>

					{/* Received */}
					<div className='relative rounded-xl border border-emerald-200/50 bg-emerald-500/5 p-5 dark:border-emerald-800/40'>
						<div className='pointer-events-none absolute top-1/2 -left-6 hidden -translate-y-1/2 text-muted-foreground/30 md:block'>
							<ArrowRight className='size-5' />
						</div>
						<div className='flex items-center gap-2'>
							<CheckCircle2 className='size-4 text-emerald-600' />
							<span className='font-medium text-emerald-700 text-sm dark:text-emerald-400'>
								Received
							</span>
						</div>
						<p className='mt-2 font-bold text-3xl tabular-nums tracking-tight'>
							{totalReceivedQty.toLocaleString()}
						</p>
						<div className='mt-2'>
							<div className='flex items-center justify-between text-[10px]'>
								<span className='text-muted-foreground'>
									{receivedPct.toFixed(1)}% of ordered
								</span>
								<span className='font-medium text-amber-600'>
									{openReceiptQty.toLocaleString()} pending
								</span>
							</div>
							<div className='mt-1 h-2 w-full overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-900/30'>
								<div
									className='h-full rounded-full bg-emerald-500 transition-all'
									style={{ width: `${Math.min(100, receivedPct)}%` }}
								/>
							</div>
						</div>
					</div>

					{/* Invoiced */}
					<div className='relative rounded-xl border border-violet-200/50 bg-violet-500/5 p-5 dark:border-violet-800/40'>
						<div className='pointer-events-none absolute top-1/2 -left-6 hidden -translate-y-1/2 text-muted-foreground/30 md:block'>
							<ArrowRight className='size-5' />
						</div>
						<div className='flex items-center gap-2'>
							<ClipboardCheck className='size-4 text-violet-600' />
							<span className='font-medium text-sm text-violet-700 dark:text-violet-400'>
								Invoiced
							</span>
						</div>
						<p className='mt-2 font-bold text-3xl tabular-nums tracking-tight'>
							{totalInvoicedQty.toLocaleString()}
						</p>
						<div className='mt-2'>
							<div className='flex items-center justify-between text-[10px]'>
								<span className='text-muted-foreground'>
									{invoicedPct.toFixed(1)}% of received
								</span>
								<span className='font-medium text-amber-600'>
									{openInvoiceQty.toLocaleString()} pending
								</span>
							</div>
							<div className='mt-1 h-2 w-full overflow-hidden rounded-full bg-violet-100 dark:bg-violet-900/30'>
								<div
									className='h-full rounded-full bg-violet-500 transition-all'
									style={{ width: `${Math.min(100, invoicedPct)}%` }}
								/>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* ── Two-Column: Vendor Health + Transfer Status ── */}
			<div className='grid grid-cols-1 gap-5 lg:grid-cols-2'>
				{/* Vendor Health */}
				<Card className='shadow-sm transition-shadow hover:shadow-md'>
					<CardHeader className='border-border/50 border-b bg-muted/20'>
						<div className='flex items-center gap-2'>
							<PackageSearch className='size-4 text-muted-foreground' />
							<CardTitle className='text-base'>Vendor Health</CardTitle>
						</div>
					</CardHeader>
					<CardContent className='space-y-4 pt-5'>
						<div className='grid grid-cols-3 gap-3'>
							<div className='rounded-lg border border-border/30 bg-background/50 p-3 text-center'>
								<p className='font-bold text-2xl tabular-nums'>
									{vendors.length}
								</p>
								<p className='text-[10px] text-muted-foreground uppercase tracking-wider'>
									Total
								</p>
							</div>
							<div className='rounded-lg border border-emerald-200/50 bg-emerald-500/5 p-3 text-center dark:border-emerald-800/40'>
								<p className='font-bold text-2xl text-emerald-700 tabular-nums dark:text-emerald-400'>
									{activeVendors}
								</p>
								<p className='text-[10px] text-emerald-600/70 uppercase tracking-wider'>
									Active
								</p>
							</div>
							<div className='rounded-lg border border-rose-200/50 bg-rose-500/5 p-3 text-center dark:border-rose-800/40'>
								<p className='font-bold text-2xl text-rose-700 tabular-nums dark:text-rose-400'>
									{blockedVendors}
								</p>
								<p className='text-[10px] text-rose-600/70 uppercase tracking-wider'>
									Blocked
								</p>
							</div>
						</div>
						<div className='space-y-2'>
							<div className='flex justify-between text-xs'>
								<span className='text-muted-foreground'>Average PO Value</span>
								<span className='font-medium tabular-nums'>
									$
									{averagePOValue.toLocaleString('en-US', {
										maximumFractionDigits: 0,
									})}
								</span>
							</div>
							<div className='flex justify-between text-xs'>
								<span className='text-muted-foreground'>
									Receipts Due in 7 Days
								</span>
								<span className='font-medium tabular-nums'>
									{urgentReceipts}
								</span>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Transfer Status */}
				<Card className='shadow-sm transition-shadow hover:shadow-md'>
					<CardHeader className='border-border/50 border-b bg-muted/20'>
						<div className='flex items-center gap-2'>
							<ArrowRightLeft className='size-4 text-muted-foreground' />
							<CardTitle className='text-base'>Transfer Status</CardTitle>
						</div>
					</CardHeader>
					<CardContent className='space-y-4 pt-5'>
						<div className='grid grid-cols-2 gap-3'>
							<div className='rounded-lg border border-border/30 bg-background/50 p-3 text-center'>
								<p className='font-bold text-2xl tabular-nums'>
									{transfers.length}
								</p>
								<p className='text-[10px] text-muted-foreground uppercase tracking-wider'>
									Total
								</p>
							</div>
							<div className='rounded-lg border border-sky-200/50 bg-sky-500/5 p-3 text-center dark:border-sky-800/40'>
								<p className='font-bold text-2xl text-sky-700 tabular-nums dark:text-sky-400'>
									{activeTransfers}
								</p>
								<p className='text-[10px] text-sky-600/70 uppercase tracking-wider'>
									Active
								</p>
							</div>
						</div>
						<div className='space-y-2'>
							{['DRAFT', 'RELEASED', 'IN_TRANSIT', 'RECEIVED', 'CANCELED'].map(
								(status) => {
									const count = transferStatusCounts[status] ?? 0
									const pct =
										transfers.length > 0 ? (count / transfers.length) * 100 : 0
									return (
										<div key={status} className='space-y-1'>
											<div className='flex items-center justify-between text-xs'>
												<span className='text-muted-foreground'>
													{status.replace(/_/g, ' ')}
												</span>
												<span className='tabular-nums'>{count}</span>
											</div>
											<div className='h-1.5 w-full overflow-hidden rounded-full bg-muted/60'>
												<div
													className='h-full rounded-full bg-sky-500 transition-all'
													style={{ width: `${pct}%` }}
												/>
											</div>
										</div>
									)
								},
							)}
						</div>
					</CardContent>
				</Card>
			</div>

			{/* ── PO Status Breakdown ── */}
			<Card className='shadow-sm transition-shadow hover:shadow-md'>
				<CardHeader className='border-border/50 border-b bg-muted/20'>
					<CardTitle className='text-base'>Purchase Order Status</CardTitle>
					<CardDescription>
						{totalPOs.toLocaleString()} orders &middot; {pendingApproval}{' '}
						awaiting approval
					</CardDescription>
				</CardHeader>
				<CardContent className='pt-5'>
					{purchaseOrderStatusMix.length === 0 ? (
						<p className='py-6 text-center text-muted-foreground text-sm'>
							No order data available.
						</p>
					) : (
						<div className='flex flex-wrap gap-3'>
							{purchaseOrderStatusMix.map((item) => {
								const pct =
									statusTotal > 0
										? ((item.value / statusTotal) * 100).toFixed(1)
										: '0'
								return (
									<div
										key={item.name}
										className='flex-1 rounded-lg border border-border/40 bg-background/50 p-4 text-center'
										style={{ minWidth: '120px' }}
									>
										<p className='font-bold text-2xl tabular-nums'>
											{item.value}
										</p>
										<p className='mt-1 text-muted-foreground text-xs'>
											{item.name.replace(/_/g, ' ')}
										</p>
										<p className='text-[10px] text-muted-foreground/60'>
											{pct}%
										</p>
									</div>
								)
							})}
						</div>
					)}
				</CardContent>
			</Card>

			{/* ── Purchase Order Volume Trend ── */}
			<DashboardTrendChart
				className='shadow-sm transition-shadow hover:shadow-md'
				title='Purchase Order Trend'
				description='Purchase orders created per month'
				data={monthlyPurchaseOrderVolume}
				metricKey='count'
				metricLabel='Purchase Orders'
			/>

			{/* ── Recent Purchase Orders ── */}
			<Card className='shadow-sm transition-shadow hover:shadow-md'>
				<CardHeader className='border-border/50 border-b bg-muted/20'>
					<CardTitle className='text-base'>Recent Purchase Orders</CardTitle>
				</CardHeader>
				<CardContent className='p-0'>
					{isLoading ? (
						<div className='space-y-0 p-4' role='status' aria-label='Loading'>
							{Array.from({ length: 5 }).map((_, index) => (
								<div
									key={`skeleton-${index}`}
									className='h-12 border-border/20 border-b bg-muted/30 motion-safe:animate-pulse'
								/>
							))}
						</div>
					) : recentPurchaseOrders.length === 0 ? (
						<p className='p-6 text-center text-muted-foreground text-sm'>
							No purchase orders found.
						</p>
					) : (
						<div className='divide-y divide-border/30'>
							{recentPurchaseOrders.map((order) => (
								<div
									key={order._id}
									className='flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-muted/20'
								>
									<div className='flex min-w-0 items-center gap-4'>
										<div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 font-bold text-sky-600 text-xs'>
											PO
										</div>
										<div className='min-w-0'>
											<p className='truncate font-medium text-sm'>
												{order.documentNo}
											</p>
											<p className='truncate text-muted-foreground text-xs'>
												{vendorNameById.get(order.vendorId) ?? order.vendorId}{' '}
												&middot;{' '}
												{new Date(order.orderDate).toLocaleDateString()}
											</p>
										</div>
									</div>
									<div className='flex shrink-0 items-center gap-4'>
										<span className='font-medium text-sm tabular-nums'>
											$
											{order.totalAmount?.toLocaleString('en-US', {
												minimumFractionDigits: 2,
											}) ?? '0.00'}
										</span>
										<StatusBadge status={order.status} />
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
