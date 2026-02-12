import {
	ArrowRightLeft,
	ClipboardCheck,
	PackageSearch,
	ShoppingCart,
} from 'lucide-react'
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

interface PurchaseOrder {
	id: string
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
	id: string
	vendorNo: string
	name: string
	blocked: boolean
}

interface Transfer {
	id: string
	transferNo: string
	status: 'DRAFT' | 'RELEASED' | 'IN_TRANSIT' | 'RECEIVED' | 'CANCELED'
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
	const urgentReceipts = purchaseOrders.filter((order) => {
		if (order.status === 'COMPLETED' || order.status === 'CANCELED')
			return false
		const expectedDate = new Date(order.expectedReceiptDate).getTime()
		if (Number.isNaN(expectedDate)) return false
		const now = Date.now()
		const diffDays = (expectedDate - now) / (1000 * 60 * 60 * 24)
		return diffDays >= 0 && diffDays <= 7
	}).length

	const kpis = React.useMemo<KpiCardDef[]>(
		() => [
			{
				title: 'Total Purchase Orders',
				value: totalPOs,
				icon: ShoppingCart,
			},
			{
				title: 'Pending Approval',
				value: pendingApproval,
				icon: ClipboardCheck,
				description: 'Orders awaiting approval',
			},
			{
				title: 'Active Vendors',
				value: activeVendors,
				icon: PackageSearch,
			},
			{
				title: 'Active Transfers',
				value: activeTransfers,
				icon: ArrowRightLeft,
				description: 'Released or in transit',
			},
		],
		[activeTransfers, activeVendors, pendingApproval, totalPOs],
	)

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

	const isLoading = purchaseOrdersLoading || vendorsLoading || transfersLoading

	return (
		<div className='space-y-6'>
			<PageHeader
				title='Replenishment Dashboard'
				description='Purchase velocity, supplier quality, and transfer execution insights.'
			/>
			<KpiCards cards={kpis} />

			<DashboardSectionGrid>
				<DashboardTrendChart
					className='xl:col-span-2'
					title='Purchase Order Trend'
					description='Purchase orders created per month'
					data={monthlyPurchaseOrderVolume}
					metricKey='count'
					metricLabel='Purchase Orders'
				/>
				<DashboardDistributionChart
					title='PO Status Mix'
					description='Distribution by purchase order state'
					data={purchaseOrderStatusMix}
				/>
			</DashboardSectionGrid>

			<DashboardStatsPanel
				title='Replenishment Statistics'
				description='Signals for demand planning and supply continuity'
				items={[
					{
						label: 'Average PO Value',
						value: `$${averagePOValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
						description: 'Average order size',
					},
					{
						label: 'Transfer Activation Rate',
						value: formatPercent(activeTransfers, transfers.length),
						description: 'Released and in-transit transfers',
					},
					{
						label: 'Blocked Vendors',
						value: blockedVendors.toLocaleString(),
						description: `${formatPercent(blockedVendors, vendors.length)} of vendor base`,
					},
					{
						label: 'Receipts Due in 7 Days',
						value: urgentReceipts.toLocaleString(),
						description: 'Open orders with near-term expected receipts',
					},
				]}
			/>

			<Card>
				<CardHeader>
					<CardTitle>Recent Purchase Orders</CardTitle>
				</CardHeader>
				<CardContent>
					{isLoading ? (
						<div className='space-y-2' role='status' aria-label='Loading'>
							{Array.from({ length: 5 }).map((_, index) => (
								<div
									key={`skeleton-${index}`}
									className='h-8 rounded bg-muted motion-safe:animate-pulse'
								/>
							))}
						</div>
					) : recentPurchaseOrders.length === 0 ? (
						<p className='text-muted-foreground text-sm'>
							No purchase orders found.
						</p>
					) : (
						<ul className='space-y-1'>
							{recentPurchaseOrders.map((order) => (
								<li
									key={order.id}
									className='flex items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-muted/50'
								>
									<div className='flex min-w-0 items-center gap-3'>
										<span className='truncate font-medium'>
											{order.documentNo}
										</span>
										<span className='truncate text-muted-foreground text-xs'>
											{order.vendorId}
										</span>
									</div>
									<div className='flex shrink-0 items-center gap-3'>
										<span className='text-muted-foreground text-xs tabular-nums'>
											$
											{order.totalAmount?.toLocaleString('en-US', {
												minimumFractionDigits: 2,
											}) ?? '0.00'}
										</span>
										<StatusBadge status={order.status} />
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
