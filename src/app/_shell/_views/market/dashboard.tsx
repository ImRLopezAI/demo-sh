import { DollarSign, ShoppingCart, TrendingUp, Users } from 'lucide-react'
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

interface SalesOrder {
	id: string
	documentNo: string
	documentType: string
	status: string
	customerId: string
	orderDate: string
	currency: string
	totalAmount: number
	lineCount: number
}

interface Customer {
	id: string
	customerNo: string
	name: string
	blocked: boolean
}

interface Item {
	id: string
	itemNo: string
	description: string
	totalSalesAmount: number
}

export default function MarketDashboard() {
	const { items: orders, isLoading: ordersLoading } = useModuleData<
		'market',
		SalesOrder
	>('market', 'salesOrders', 'all')
	const { items: customers, isLoading: customersLoading } = useModuleData<
		'market',
		Customer
	>('market', 'customers', 'all')
	const { items: itemRecords, isLoading: itemsLoading } = useModuleData<
		'market',
		Item
	>('market', 'items', 'all')

	const totalOrders = orders.length
	const pendingApproval = orders.filter(
		(order) => order.status === 'PENDING_APPROVAL',
	).length
	const grossSales = orders.reduce(
		(sum, order) => sum + (order.totalAmount ?? 0),
		0,
	)
	const avgOrderValue = average(orders.map((order) => order.totalAmount ?? 0))
	const activeCustomers = customers.filter((customer) => !customer.blocked).length
	const blockedCustomers = customers.length - activeCustomers
	const avgLinesPerOrder = average(orders.map((order) => order.lineCount ?? 0))
	const topItem = [...itemRecords].sort(
		(a, b) => (b.totalSalesAmount ?? 0) - (a.totalSalesAmount ?? 0),
	)[0]

	const kpis = React.useMemo<KpiCardDef[]>(
		() => [
			{
				title: 'Total Orders',
				value: totalOrders,
				description: 'All sales orders',
				icon: ShoppingCart,
			},
			{
				title: 'Approval Rate',
				value: formatPercent(totalOrders - pendingApproval, totalOrders),
				description: 'Orders not waiting for approval',
				icon: TrendingUp,
			},
			{
				title: 'Gross Sales',
				value: `$${grossSales.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
				description: 'Total order amount',
				icon: DollarSign,
			},
			{
				title: 'Avg Order Value',
				value: `$${avgOrderValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
				description: 'Average ticket',
				icon: Users,
			},
		],
		[avgOrderValue, grossSales, pendingApproval, totalOrders],
	)

	const monthlyOrderVolume = React.useMemo(
		() => buildMonthlySeries(orders, (order) => order.orderDate),
		[orders],
	)

	const orderStatusMix = React.useMemo(
		() => buildCategorySeries(orders.map((order) => order.status), 6),
		[orders],
	)

	const recentOrders = React.useMemo(
		() =>
			[...orders]
				.sort(
					(a, b) =>
						new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime(),
				)
				.slice(0, 10),
		[orders],
	)

	const isLoading = ordersLoading || customersLoading || itemsLoading

	return (
		<div className='space-y-6'>
			<PageHeader
				title='Market Dashboard'
				description='Revenue, customer health, and order performance for your commerce operations.'
			/>

			<KpiCards cards={kpis} />

			<DashboardSectionGrid>
				<DashboardTrendChart
					className='xl:col-span-2'
					title='Order Volume Trend'
					description='Orders created per month'
					data={monthlyOrderVolume}
					metricKey='count'
					metricLabel='Orders'
				/>
				<DashboardDistributionChart
					title='Order Status Mix'
					description='Current distribution by status'
					data={orderStatusMix}
				/>
			</DashboardSectionGrid>

			<DashboardStatsPanel
				title='Commercial Statistics'
				description='Key operational insights to monitor weekly'
				items={[
					{
						label: 'Active Customers',
						value: activeCustomers.toLocaleString(),
						description: `${blockedCustomers.toLocaleString()} blocked accounts`,
					},
					{
						label: 'Average Lines Per Order',
						value: avgLinesPerOrder.toFixed(1),
						description: 'Basket complexity indicator',
					},
					{
						label: 'Top Selling Item',
						value: topItem?.description ?? 'N/A',
						description: topItem
							? `$${(topItem.totalSalesAmount ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
							: 'No item sales data',
					},
				]}
			/>

			<Card>
				<CardHeader>
					<CardTitle>Recent Orders</CardTitle>
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
					) : recentOrders.length === 0 ? (
						<p className='text-muted-foreground text-sm'>No orders found.</p>
					) : (
						<div className='space-y-1'>
							{recentOrders.map((order) => (
								<div
									key={order.id}
									className='flex items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-muted/50'
								>
									<div className='flex items-center gap-3'>
										<span className='font-medium'>{order.documentNo}</span>
										<span className='text-muted-foreground text-xs'>
											{order.customerId}
										</span>
									</div>
									<div className='flex items-center gap-3'>
										<span className='text-muted-foreground text-xs tabular-nums'>
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
