'use client'

import { ShoppingCart } from 'lucide-react'
import * as React from 'react'
import { useModuleData } from '@/app/_shell/hooks/use-data'
import {
	MetricStrip,
	RecordListPanel,
	StackedDistributionPanel,
	StatRowsPanel,
} from '@/components/ui/json-render/dashboard-sections'
import { DashboardTrendChart } from '@/components/ui/json-render/dashboard-widgets'
import {
	average,
	buildCategorySeries,
	buildMonthlySeries,
	formatPercent,
} from '@/lib/json-render/dashboard-utils'

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

type MarketDashboardContextValue = {
	isLoading: boolean
	metricItems: Array<{ label: string; value: string; icon: string }>
	orderStatusMix: Array<{ name: string; value: number }>
	monthlyOrderVolume: Array<{ month: string; count: number; amount: number }>
	commercialStatItems: Array<{
		label: string
		value: string
		description: string
	}>
	recentOrders: Array<{
		id: string
		title: string
		subtitle: string
		status: string
	}>
}

const MarketDashboardContext =
	React.createContext<MarketDashboardContextValue | null>(null)

const ORDER_STATUS_COLORS: Record<string, string> = {
	OPEN: 'bg-sky-500',
	PENDING_APPROVAL: 'bg-amber-500',
	RELEASED: 'bg-emerald-500',
	SHIPPED: 'bg-violet-500',
	INVOICED: 'bg-teal-500',
	CANCELLED: 'bg-rose-500',
}

function useMarketDashboardData() {
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

	const isLoading = ordersLoading || customersLoading || itemsLoading

	return React.useMemo<MarketDashboardContextValue>(() => {
		const totalOrders = orders.length
		const pendingApproval = orders.filter(
			(order) => order.status === 'PENDING_APPROVAL',
		).length
		const grossSales = orders.reduce(
			(sum, order) => sum + (order.totalAmount ?? 0),
			0,
		)
		const avgOrderValue = average(orders.map((order) => order.totalAmount ?? 0))
		const activeCustomers = customers.filter(
			(customer) => !customer.blocked,
		).length
		const blockedCustomers = customers.length - activeCustomers
		const avgLinesPerOrder = average(
			orders.map((order) => order.lineCount ?? 0),
		)
		const topItem = [...itemRecords].sort(
			(a, b) => (b.totalSalesAmount ?? 0) - (a.totalSalesAmount ?? 0),
		)[0]

		return {
			isLoading,
			metricItems: [
				{
					label: 'Gross Revenue',
					value: grossSales.toLocaleString('en-US', {
						style: 'currency',
						currency: 'USD',
						maximumFractionDigits: 0,
					}),
					icon: 'dollar',
				},
				{
					label: 'Total Orders',
					value: totalOrders.toLocaleString(),
					icon: 'package',
				},
				{
					label: 'Customers',
					value: customers.length.toLocaleString(),
					icon: 'map',
				},
				{
					label: 'Avg Order Value',
					value: avgOrderValue.toLocaleString('en-US', {
						style: 'currency',
						currency: 'USD',
						maximumFractionDigits: 0,
					}),
					icon: 'dollar',
				},
				{
					label: 'Catalog Items',
					value: itemRecords.length.toLocaleString(),
					icon: 'package',
				},
				{
					label: 'Approval Rate',
					value: formatPercent(totalOrders - pendingApproval, totalOrders),
					icon: 'chart',
				},
			],
			orderStatusMix: buildCategorySeries(
				orders.map((order) => order.status),
				6,
			),
			monthlyOrderVolume: buildMonthlySeries(
				orders,
				(order) => order.orderDate,
			),
			commercialStatItems: [
				{
					label: 'Top Selling Item',
					value: topItem?.description ?? 'N/A',
					description: topItem
						? `$${(topItem.totalSalesAmount ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 })} revenue`
						: 'No item sales data',
				},
				{
					label: 'Basket Complexity',
					value: `${avgLinesPerOrder.toFixed(1)} lines / order`,
					description: 'Average line count per sales order',
				},
				{
					label: 'Customer Health',
					value: `${activeCustomers} active`,
					description: `${blockedCustomers} blocked (${formatPercent(blockedCustomers, customers.length)} of base)`,
				},
				{
					label: 'Catalog Size',
					value: `${itemRecords.length.toLocaleString()} items`,
					description: 'Total products in the catalog',
				},
			],
			recentOrders: [...orders]
				.sort(
					(a, b) =>
						new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime(),
				)
				.slice(0, 8)
				.map((order) => ({
					id: order.id,
					title: `${order.documentNo} · $${order.totalAmount?.toLocaleString('en-US', { minimumFractionDigits: 2 }) ?? '0.00'}`,
					subtitle: `Customer: ${order.customerId} · ${new Date(order.orderDate).toLocaleDateString()}`,
					status: order.status,
				})),
		}
	}, [isLoading, orders, customers, itemRecords])
}

function useMarketDashboardContext() {
	const value = React.useContext(MarketDashboardContext)
	if (!value) {
		throw new Error('Market dashboard section must be used within provider')
	}
	return value
}

export function MarketDashboardData({
	children,
}: {
	children?: React.ReactNode
}) {
	const value = useMarketDashboardData()
	return (
		<MarketDashboardContext.Provider value={value}>
			{children}
		</MarketDashboardContext.Provider>
	)
}

export function MarketKpiStrip() {
	const { metricItems } = useMarketDashboardContext()
	return <MetricStrip items={metricItems} />
}

export function MarketOrderStatusDistribution() {
	const { orderStatusMix } = useMarketDashboardContext()
	return (
		<StackedDistributionPanel
			title='Order Status Breakdown'
			description='Distribution across the order lifecycle'
			items={orderStatusMix}
			colorMap={ORDER_STATUS_COLORS}
			emptyMessage='No status data available.'
		/>
	)
}

export function MarketOrderVolumeTrend() {
	const { monthlyOrderVolume } = useMarketDashboardContext()
	return (
		<DashboardTrendChart
			className='shadow-sm transition-shadow hover:shadow-md'
			title='Order Volume Trend'
			description='Monthly order creation across all channels'
			data={monthlyOrderVolume}
			metricKey='count'
			metricLabel='Orders'
		/>
	)
}

export function MarketCommercialStats() {
	const { commercialStatItems } = useMarketDashboardContext()
	return (
		<StatRowsPanel title='Commercial Statistics' items={commercialStatItems} />
	)
}

export function MarketRecentOrders() {
	const { isLoading, recentOrders } = useMarketDashboardContext()
	return (
		<RecordListPanel
			title='Recent Orders'
			items={recentOrders}
			isLoading={isLoading}
			emptyMessage='No orders found.'
			emptyIcon={
				<ShoppingCart className='mb-3 h-8 w-8 text-muted-foreground/50' />
			}
		/>
	)
}
