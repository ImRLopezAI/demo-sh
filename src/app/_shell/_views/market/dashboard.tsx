import { DollarSign, ShoppingCart, TrendingUp, Users } from 'lucide-react'
import * as React from 'react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from '@/components/ui/chart'
import { cn } from '@/lib/utils'
import { useModuleData } from '../../hooks/use-data'
import {
	average,
	buildCategorySeries,
	buildMonthlySeries,
	formatPercent,
} from '../_shared/dashboard-utils'
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
	const activeCustomers = customers.filter(
		(customer) => !customer.blocked,
	).length
	const blockedCustomers = customers.length - activeCustomers
	const avgLinesPerOrder = average(orders.map((order) => order.lineCount ?? 0))
	const topItem = [...itemRecords].sort(
		(a, b) => (b.totalSalesAmount ?? 0) - (a.totalSalesAmount ?? 0),
	)[0]

	const monthlyOrderVolume = React.useMemo(
		() => buildMonthlySeries(orders, (order) => order.orderDate),
		[orders],
	)

	const orderStatusMix = React.useMemo(
		() =>
			buildCategorySeries(
				orders.map((order) => order.status),
				6,
			),
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

	const trendConfig = React.useMemo<ChartConfig>(
		() => ({
			count: { label: 'Orders', color: 'var(--color-chart-1)' },
		}),
		[],
	)

	const isLoading = ordersLoading || customersLoading || itemsLoading

	const statusTotal = orderStatusMix.reduce((s, p) => s + p.value, 0)

	const STATUS_COLORS = [
		'bg-emerald-500',
		'bg-amber-500',
		'bg-sky-500',
		'bg-rose-500',
		'bg-violet-500',
		'bg-slate-400',
	]

	return (
		<div className='space-y-6 pb-8'>
			{/* ── Revenue Hero Banner ── */}
			<div className='relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-emerald-500/10 via-background to-teal-500/5 px-8 py-10'>
				<div className='pointer-events-none absolute -top-16 right-8 h-56 w-56 rounded-full bg-emerald-500/8 blur-3xl' />
				<div className='pointer-events-none absolute -bottom-20 left-12 h-40 w-40 rounded-full bg-teal-500/6 blur-3xl' />
				<div className='relative'>
					<p className='font-medium text-muted-foreground text-xs uppercase tracking-[0.2em]'>
						Gross Revenue
					</p>
					<p className='mt-3 font-bold text-5xl tabular-nums tracking-tight'>
						$
						{grossSales.toLocaleString('en-US', {
							maximumFractionDigits: 0,
						})}
					</p>
					<p className='mt-2 text-muted-foreground text-sm'>
						{totalOrders.toLocaleString()} orders &middot;{' '}
						{customers.length.toLocaleString()} customers &middot;{' '}
						{itemRecords.length.toLocaleString()} catalog items
					</p>
				</div>
			</div>

			{/* ── Horizontal Metrics Strip ── */}
			<div className='grid grid-cols-1 gap-3 sm:grid-cols-3'>
				{[
					{
						label: 'Approval Rate',
						value: formatPercent(totalOrders - pendingApproval, totalOrders),
						sub: `${pendingApproval} pending`,
						icon: TrendingUp,
						accent: 'bg-amber-500/10 text-amber-600',
					},
					{
						label: 'Avg Order Value',
						value: `$${avgOrderValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
						sub: `${avgLinesPerOrder.toFixed(1)} lines/order`,
						icon: DollarSign,
						accent: 'bg-sky-500/10 text-sky-600',
					},
					{
						label: 'Active Customers',
						value: activeCustomers.toLocaleString(),
						sub: `${blockedCustomers} blocked`,
						icon: Users,
						accent: 'bg-violet-500/10 text-violet-600',
					},
				].map((metric) => (
					<div
						key={metric.label}
						className='flex items-center gap-4 rounded-xl border border-border/40 bg-background/60 p-4 transition-colors hover:bg-muted/30'
					>
						<div className={cn('rounded-lg p-2.5', metric.accent)}>
							<metric.icon className='size-4' aria-hidden />
						</div>
						<div className='min-w-0'>
							<p className='truncate text-muted-foreground text-xs'>
								{metric.label}
							</p>
							<p className='font-semibold text-lg tabular-nums tracking-tight'>
								{metric.value}
							</p>
							<p className='truncate text-[11px] text-muted-foreground/70'>
								{metric.sub}
							</p>
						</div>
					</div>
				))}
			</div>

			{/* ── Full-Width Order Volume Trend ── */}
			<Card className='shadow-sm transition-shadow hover:shadow-md'>
				<CardHeader className='border-border/50 border-b bg-muted/20'>
					<CardTitle>Order Volume Trend</CardTitle>
					<CardDescription>
						Monthly order creation across all channels
					</CardDescription>
				</CardHeader>
				<CardContent className='pt-4'>
					<ChartContainer config={trendConfig} className='h-[260px] w-full'>
						<BarChart
							data={monthlyOrderVolume}
							margin={{ top: 8, right: 8, left: 4, bottom: 0 }}
						>
							<CartesianGrid vertical={false} strokeDasharray='3 3' />
							<XAxis
								dataKey='month'
								tickLine={false}
								axisLine={false}
								tickMargin={8}
							/>
							<YAxis tickLine={false} axisLine={false} width={32} />
							<ChartTooltip
								cursor={false}
								content={<ChartTooltipContent indicator='line' />}
							/>
							<Bar
								dataKey='count'
								fill='var(--color-count)'
								radius={[8, 8, 2, 2]}
								maxBarSize={40}
							/>
						</BarChart>
					</ChartContainer>
				</CardContent>
			</Card>

			{/* ── Two-Column: Status Bars + Commercial Stats ── */}
			<div className='grid grid-cols-1 gap-6 lg:grid-cols-5'>
				{/* Horizontal Status Breakdown */}
				<Card className='shadow-sm transition-shadow hover:shadow-md lg:col-span-3'>
					<CardHeader className='border-border/50 border-b bg-muted/20'>
						<CardTitle>Order Status Breakdown</CardTitle>
						<CardDescription>
							Distribution across the order lifecycle
						</CardDescription>
					</CardHeader>
					<CardContent className='space-y-4 pt-6'>
						{orderStatusMix.length === 0 ? (
							<p className='py-8 text-center text-muted-foreground text-sm'>
								No status data available.
							</p>
						) : (
							<>
								{/* Stacked bar summary */}
								<div className='flex h-3 w-full overflow-hidden rounded-full'>
									{orderStatusMix.map((item, i) => (
										<div
											key={item.name}
											className={cn(
												STATUS_COLORS[i % STATUS_COLORS.length],
												'transition-all',
											)}
											style={{
												width: `${statusTotal > 0 ? (item.value / statusTotal) * 100 : 0}%`,
											}}
										/>
									))}
								</div>

								{/* Individual status rows */}
								{orderStatusMix.map((item, i) => {
									const pct =
										statusTotal > 0
											? ((item.value / statusTotal) * 100).toFixed(1)
											: '0'
									return (
										<div key={item.name} className='flex items-center gap-4'>
											<div
												className={cn(
													'h-3 w-3 shrink-0 rounded-full',
													STATUS_COLORS[i % STATUS_COLORS.length],
												)}
											/>
											<span className='min-w-0 flex-1 truncate text-sm'>
												{item.name}
											</span>
											<span className='font-medium text-sm tabular-nums'>
												{item.value.toLocaleString()}
											</span>
											<div className='hidden w-32 sm:block'>
												<div className='h-2 w-full overflow-hidden rounded-full bg-muted/60'>
													<div
														className={cn(
															STATUS_COLORS[i % STATUS_COLORS.length],
															'h-full rounded-full transition-all',
														)}
														style={{ width: `${pct}%` }}
													/>
												</div>
											</div>
											<span className='w-14 text-right text-muted-foreground text-xs tabular-nums'>
												{pct}%
											</span>
										</div>
									)
								})}
							</>
						)}
					</CardContent>
				</Card>

				{/* Commercial Stats — stacked cards */}
				<div className='flex flex-col gap-3 lg:col-span-2'>
					{[
						{
							label: 'Top Selling Item',
							value: topItem?.description ?? 'N/A',
							sub: topItem
								? `$${(topItem.totalSalesAmount ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 })} revenue`
								: 'No item sales data',
						},
						{
							label: 'Basket Complexity',
							value: `${avgLinesPerOrder.toFixed(1)} lines / order`,
							sub: 'Average line count per sales order',
						},
						{
							label: 'Customer Health',
							value: `${activeCustomers} active`,
							sub: `${blockedCustomers} blocked (${formatPercent(blockedCustomers, customers.length)} of base)`,
						},
						{
							label: 'Catalog Size',
							value: `${itemRecords.length.toLocaleString()} items`,
							sub: 'Total products in the catalog',
						},
					].map((stat) => (
						<div
							key={stat.label}
							className='rounded-xl border border-border/40 bg-background/60 p-4 transition-colors hover:bg-muted/30'
						>
							<p className='text-muted-foreground text-xs'>{stat.label}</p>
							<p className='mt-1 truncate font-semibold text-base tabular-nums'>
								{stat.value}
							</p>
							<p className='mt-0.5 truncate text-[11px] text-muted-foreground/70'>
								{stat.sub}
							</p>
						</div>
					))}
				</div>
			</div>

			{/* ── Recent Orders ── */}
			<Card className='shadow-sm transition-shadow hover:shadow-md'>
				<CardHeader className='flex flex-row items-center justify-between border-border/50 border-b bg-muted/20 pb-4'>
					<div className='space-y-1'>
						<CardTitle className='text-xl'>Recent Orders</CardTitle>
						<CardDescription>
							Latest transactions across all channels
						</CardDescription>
					</div>
					<span className='rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-medium text-emerald-700 text-xs dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'>
						{recentOrders.length} shown
					</span>
				</CardHeader>
				<CardContent className='pt-4'>
					{isLoading ? (
						<div className='space-y-3' role='status' aria-label='Loading'>
							{Array.from({ length: 5 }).map((_, i) => (
								<div
									key={`skeleton-${i}`}
									className='h-14 rounded-xl bg-muted/50 motion-safe:animate-pulse'
								/>
							))}
						</div>
					) : recentOrders.length === 0 ? (
						<div className='flex flex-col items-center justify-center py-14 text-center'>
							<ShoppingCart className='mb-4 size-12 text-muted-foreground/20' />
							<p className='font-medium text-muted-foreground text-sm'>
								No orders found.
							</p>
							<p className='mt-1 text-muted-foreground text-xs'>
								New orders will appear here
							</p>
						</div>
					) : (
						<ul className='mt-2 space-y-2'>
							{recentOrders.map((order) => (
								<li
									key={order.id}
									className='group flex items-center justify-between rounded-xl border border-border/40 bg-background/40 px-5 py-3.5 text-sm transition-all hover:border-border/80 hover:bg-accent/50'
								>
									<div className='flex min-w-0 items-center gap-4'>
										<div className='flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600'>
											<ShoppingCart className='size-4' />
										</div>
										<div className='flex flex-col'>
											<span className='truncate font-semibold text-foreground'>
												{order.documentNo}
											</span>
											<span className='truncate text-muted-foreground text-xs'>
												Customer: {order.customerId}
											</span>
										</div>
									</div>
									<div className='flex items-center gap-6'>
										<div className='flex flex-col items-end'>
											<span className='font-medium text-foreground tabular-nums'>
												$
												{order.totalAmount?.toLocaleString('en-US', {
													minimumFractionDigits: 2,
												}) ?? '0.00'}
											</span>
											<span className='text-[10px] text-muted-foreground uppercase tracking-wider'>
												{new Date(order.orderDate).toLocaleDateString()}
											</span>
										</div>
										<StatusBadge status={order.status} className='shadow-sm' />
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
