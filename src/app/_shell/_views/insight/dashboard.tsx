import { BarChart3, DollarSign, MapPin, Package } from 'lucide-react'
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
	buildCategorySeries,
	buildMonthlySeries,
	formatPercent,
} from '../_shared/dashboard-utils'
import { DashboardTrendChart } from '../_shared/dashboard-widgets'
import { PageHeader } from '../_shared/page-header'
import { StatusBadge } from '../_shared/status-badge'

interface ItemLedgerEntry {
	id: string
	entryNo: number
	entryType:
		| 'SALE'
		| 'PURCHASE'
		| 'POSITIVE_ADJUSTMENT'
		| 'NEGATIVE_ADJUSTMENT'
		| 'TRANSFER'
	itemId: string
	locationCode: string
	postingDate: string
	quantity: number
	remainingQty: number
	open: boolean
}

interface ValueEntry {
	id: string
	entryNo: number
	itemId: string
	postingDate: string
	entryType:
		| 'DIRECT_COST'
		| 'REVALUATION'
		| 'ROUNDING'
		| 'INDIRECT_COST'
		| 'VARIANCE'
	costAmountActual: number
	salesAmountActual: number
	costPerUnit: number
}

interface Location {
	id: string
	code: string
	name: string
	type: 'WAREHOUSE' | 'STORE' | 'DISTRIBUTION_CENTER'
	active: boolean
}

export default function Dashboard() {
	const { items: ledgerEntries, isLoading: ledgerLoading } = useModuleData<
		'insight',
		ItemLedgerEntry
	>('insight', 'itemLedgerEntries', 'all')

	const { items: valueEntries, isLoading: valueLoading } = useModuleData<
		'insight',
		ValueEntry
	>('insight', 'valueEntries', 'all')

	const { items: locations, isLoading: locationsLoading } = useModuleData<
		'insight',
		Location
	>('insight', 'locations', 'all')

	const totalLocations = locations.length
	const activeLocations = locations.filter((location) => location.active).length
	const totalLedgerEntries = ledgerEntries.length
	const totalCost = valueEntries.reduce(
		(sum, entry) => sum + (entry.costAmountActual ?? 0),
		0,
	)
	const totalSales = valueEntries.reduce(
		(sum, entry) => sum + (entry.salesAmountActual ?? 0),
		0,
	)
	const grossMargin = totalSales - totalCost
	const marginPct = totalSales > 0 ? (grossMargin / totalSales) * 100 : 0
	const positiveMovements = ledgerEntries.filter(
		(entry) => (entry.quantity ?? 0) > 0,
	).length
	const avgCostPerUnit = average(
		valueEntries.map((entry) => entry.costPerUnit ?? 0),
	)
	const warehouses = locations.filter(
		(location) => location.type === 'WAREHOUSE',
	).length
	const stores = locations.filter(
		(location) => location.type === 'STORE',
	).length
	const distCenters = locations.filter(
		(location) => location.type === 'DISTRIBUTION_CENTER',
	).length
	const openEntries = ledgerEntries.filter((entry) => entry.open).length

	const uniqueItemIds = React.useMemo(
		() => new Set(ledgerEntries.map((e) => e.itemId)).size,
		[ledgerEntries],
	)

	const computedTurnoverRate = totalCost > 0 ? totalSales / totalCost : 0

	const hydrateValues = React.useMemo(
		() => ({
			totalSKUs: uniqueItemIds,
			inventoryValue: totalCost.toLocaleString('en-US', {
				style: 'currency',
				currency: 'USD',
				maximumFractionDigits: 0,
			}),
			locationCount: activeLocations,
			turnoverRate: computedTurnoverRate.toFixed(2),
			// Turnover is considered improving when the sales-to-cost ratio exceeds 1.0
			turnoverImproving: computedTurnoverRate > 1.0,
			// TODO: forecastAccurate requires forecast entity data (e.g., demand forecasts vs actuals) not available in this dashboard scope.
			// The insight dashboard only fetches itemLedgerEntries, valueEntries, and locations.
			forecastAccurate: 0,
			// TODO: forecastTotal requires forecast entity data not available in this dashboard scope.
			forecastTotal: 0,
		}),
		[uniqueItemIds, totalCost, activeLocations, computedTurnoverRate],
	)
	useHydrateState('/insight/dashboard', hydrateValues)

	const monthlyMovement = React.useMemo(
		() => buildMonthlySeries(ledgerEntries, (entry) => entry.postingDate),
		[ledgerEntries],
	)

	const ledgerEntryMix = React.useMemo(
		() => buildCategorySeries(ledgerEntries.map((entry) => entry.entryType)),
		[ledgerEntries],
	)

	const recentEntries = React.useMemo(
		() => ledgerEntries.slice(0, 8),
		[ledgerEntries],
	)

	const isLoading = ledgerLoading || valueLoading || locationsLoading

	const ENTRY_TYPE_COLORS: Record<string, string> = {
		SALE: 'bg-emerald-500',
		PURCHASE: 'bg-sky-500',
		POSITIVE_ADJUSTMENT: 'bg-violet-500',
		NEGATIVE_ADJUSTMENT: 'bg-rose-500',
		TRANSFER: 'bg-amber-500',
	}

	const entryTotal = ledgerEntryMix.reduce((s, p) => s + p.value, 0)

	const LOCATION_TYPE_ICONS: Record<string, string> = {
		WAREHOUSE: 'bg-sky-500/10 text-sky-600',
		STORE: 'bg-emerald-500/10 text-emerald-600',
		DISTRIBUTION_CENTER: 'bg-violet-500/10 text-violet-600',
	}

	return (
		<div className='space-y-5 pb-8'>
			<PageHeader
				title='Insight Dashboard'
				description='Inventory movement, cost-to-sales visibility, and location health.'
			/>

			{/* ── Dense 6-Metric Header Grid ── */}
			<div className='grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6'>
				{[
					{
						label: 'Ledger Entries',
						value: totalLedgerEntries.toLocaleString(),
						icon: Package,
					},
					{
						label: 'Total Cost',
						value: totalCost.toLocaleString('en-US', {
							style: 'currency',
							currency: 'USD',
							maximumFractionDigits: 0,
						}),
						icon: DollarSign,
					},
					{
						label: 'Total Sales',
						value: totalSales.toLocaleString('en-US', {
							style: 'currency',
							currency: 'USD',
							maximumFractionDigits: 0,
						}),
						icon: BarChart3,
					},
					{
						label: 'Gross Margin',
						value: grossMargin.toLocaleString('en-US', {
							style: 'currency',
							currency: 'USD',
							maximumFractionDigits: 0,
						}),
						icon: DollarSign,
					},
					{
						label: 'Margin %',
						value: `${marginPct.toFixed(1)}%`,
						icon: BarChart3,
					},
					{
						label: 'Locations',
						value: `${activeLocations}/${totalLocations}`,
						icon: MapPin,
					},
				].map((metric) => (
					<div
						key={metric.label}
						className='rounded-lg border border-border/40 bg-background/60 px-3 py-2.5'
					>
						<div className='flex items-center gap-1.5'>
							<metric.icon className='size-3 text-muted-foreground/50' />
							<p className='truncate text-[10px] text-muted-foreground uppercase tracking-wider'>
								{metric.label}
							</p>
						</div>
						<p className='mt-1 font-semibold text-base tabular-nums tracking-tight'>
							{metric.value}
						</p>
					</div>
				))}
			</div>

			{/* ── Entry Type Distribution — Horizontal Bars ── */}
			<Card className='shadow-sm transition-shadow hover:shadow-md'>
				<CardHeader className='border-border/50 border-b bg-muted/20'>
					<CardTitle className='text-base'>Entry Type Distribution</CardTitle>
					<CardDescription>Breakdown by item ledger entry type</CardDescription>
				</CardHeader>
				<CardContent className='pt-5'>
					{ledgerEntryMix.length === 0 ? (
						<p className='py-6 text-center text-muted-foreground text-sm'>
							No entry data available.
						</p>
					) : (
						<div className='space-y-3'>
							{/* Stacked summary bar */}
							<div className='flex h-4 w-full overflow-hidden rounded-lg'>
								{ledgerEntryMix.map((item) => (
									<div
										key={item.name}
										className={cn(
											ENTRY_TYPE_COLORS[item.name] ?? 'bg-slate-400',
											'transition-all',
										)}
										style={{
											width: `${entryTotal > 0 ? (item.value / entryTotal) * 100 : 0}%`,
										}}
									/>
								))}
							</div>

							{/* Legend + bars */}
							<div className='grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3'>
								{ledgerEntryMix.map((item) => {
									const pct =
										entryTotal > 0
											? ((item.value / entryTotal) * 100).toFixed(1)
											: '0'
									return (
										<div
											key={item.name}
											className='flex items-center gap-3 rounded-lg border border-border/30 bg-background/40 p-2.5'
										>
											<div
												className={cn(
													'h-3 w-3 shrink-0 rounded-sm',
													ENTRY_TYPE_COLORS[item.name] ?? 'bg-slate-400',
												)}
											/>
											<div className='min-w-0 flex-1'>
												<p className='truncate text-xs'>
													{item.name.replace(/_/g, ' ')}
												</p>
												<p className='font-semibold text-sm tabular-nums'>
													{item.value.toLocaleString()}{' '}
													<span className='font-normal text-[10px] text-muted-foreground'>
														({pct}%)
													</span>
												</p>
											</div>
										</div>
									)
								})}
							</div>
						</div>
					)}
				</CardContent>
			</Card>

			{/* ── Inventory Movement Trend — full width ── */}
			<DashboardTrendChart
				className='shadow-sm transition-shadow hover:shadow-md'
				title='Inventory Movement Trend'
				description='Ledger entries created per month'
				data={monthlyMovement}
				metricKey='count'
				metricLabel='Entries'
			/>

			{/* ── Three-Column: Stats | Entries | Locations ── */}
			<div className='grid grid-cols-1 gap-5 lg:grid-cols-3'>
				{/* Inventory Stats Panel */}
				<Card className='shadow-sm transition-shadow hover:shadow-md'>
					<CardHeader className='border-border/50 border-b bg-muted/20'>
						<CardTitle className='text-base'>Inventory Metrics</CardTitle>
					</CardHeader>
					<CardContent className='space-y-0 p-0'>
						{[
							{
								label: 'Positive Movements',
								value: formatPercent(positiveMovements, totalLedgerEntries),
								sub: `${positiveMovements.toLocaleString()} entries with qty increase`,
							},
							{
								label: 'Open Entries',
								value: openEntries.toLocaleString(),
								sub: `${formatPercent(openEntries, totalLedgerEntries)} of all entries`,
							},
							{
								label: 'Avg Cost / Unit',
								value: `$${avgCostPerUnit.toFixed(2)}`,
								sub: 'Across all value entries',
							},
							{
								label: 'Value Entries',
								value: valueEntries.length.toLocaleString(),
								sub: 'Cost and sales records',
							},
						].map((stat, i) => (
							<div
								key={stat.label}
								className={cn(
									'px-4 py-3 transition-colors hover:bg-muted/30',
									i > 0 && 'border-border/30 border-t',
								)}
							>
								<div className='flex items-baseline justify-between'>
									<span className='text-muted-foreground text-xs'>
										{stat.label}
									</span>
									<span className='font-semibold text-sm tabular-nums'>
										{stat.value}
									</span>
								</div>
								<p className='mt-0.5 text-[10px] text-muted-foreground/60'>
									{stat.sub}
								</p>
							</div>
						))}
					</CardContent>
				</Card>

				{/* Recent Ledger Entries */}
				<Card className='shadow-sm transition-shadow hover:shadow-md'>
					<CardHeader className='border-border/50 border-b bg-muted/20'>
						<CardTitle className='text-base'>Recent Ledger Entries</CardTitle>
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
						) : recentEntries.length === 0 ? (
							<div className='flex flex-col items-center justify-center py-8 text-center'>
								<Package className='mb-3 h-8 w-8 text-muted-foreground/50' />
								<p className='text-muted-foreground text-sm'>
									No ledger entries found.
								</p>
							</div>
						) : (
							<div className='divide-y divide-border/30'>
								{recentEntries.map((entry, idx) => (
									<div
										key={entry.id ?? `entry-${idx}`}
										className='flex items-center justify-between gap-2 px-4 py-2.5 transition-colors hover:bg-muted/20'
									>
										<div className='min-w-0'>
											<p className='truncate font-mono text-xs'>
												#{entry.entryNo} &middot; {entry.itemId}
											</p>
											<p className='truncate text-[10px] text-muted-foreground'>
												{entry.locationCode} &middot; Qty: {entry.quantity}
											</p>
										</div>
										<StatusBadge status={entry.entryType} />
									</div>
								))}
							</div>
						)}
					</CardContent>
				</Card>

				{/* Location Summary — Mosaic */}
				<Card className='shadow-sm transition-shadow hover:shadow-md'>
					<CardHeader className='border-border/50 border-b bg-muted/20'>
						<div className='flex items-center justify-between'>
							<CardTitle className='text-base'>Location Summary</CardTitle>
							<div className='flex gap-2'>
								{[
									{ label: 'WH', count: warehouses },
									{ label: 'ST', count: stores },
									{ label: 'DC', count: distCenters },
								].map((badge) => (
									<span
										key={badge.label}
										className='rounded-md border border-border/40 bg-background/60 px-2 py-0.5 font-mono text-[10px]'
									>
										{badge.label}:{badge.count}
									</span>
								))}
							</div>
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
						) : locations.length === 0 ? (
							<div className='flex flex-col items-center justify-center py-8 text-center'>
								<MapPin className='mb-3 h-8 w-8 text-muted-foreground/50' />
								<p className='text-muted-foreground text-sm'>
									No locations found.
								</p>
							</div>
						) : (
							<div className='divide-y divide-border/30'>
								{locations.slice(0, 8).map((location, idx) => (
									<div
										key={location.id ?? `loc-${idx}`}
										className='flex items-center justify-between gap-2 px-4 py-2.5 transition-colors hover:bg-muted/20'
									>
										<div className='flex items-center gap-2.5 overflow-hidden'>
											<div
												className={cn(
													'flex h-7 w-7 shrink-0 items-center justify-center rounded-md font-bold text-[10px]',
													LOCATION_TYPE_ICONS[location.type] ??
														'bg-slate-100 text-slate-600',
												)}
											>
												{location.type === 'WAREHOUSE'
													? 'WH'
													: location.type === 'STORE'
														? 'ST'
														: 'DC'}
											</div>
											<div className='min-w-0'>
												<p className='truncate text-sm'>{location.name}</p>
												<p className='truncate text-[10px] text-muted-foreground'>
													{location.code}
												</p>
											</div>
										</div>
										<StatusBadge
											status={location.active ? 'ACTIVE' : 'INACTIVE'}
										/>
									</div>
								))}
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
