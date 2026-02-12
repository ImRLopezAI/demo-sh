import { BarChart3, DollarSign, MapPin, Package } from 'lucide-react'
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
	const positiveMovements = ledgerEntries.filter(
		(entry) => (entry.quantity ?? 0) > 0,
	).length
	const avgCostPerUnit = average(
		valueEntries.map((entry) => entry.costPerUnit ?? 0),
	)
	const warehouses = locations.filter(
		(location) => location.type === 'WAREHOUSE',
	).length

	const kpis = React.useMemo<KpiCardDef[]>(
		() => [
			{
				title: 'Ledger Entries',
				value: totalLedgerEntries,
				icon: Package,
			},
			{
				title: 'Total Cost',
				value: totalCost.toLocaleString('en-US', {
					style: 'currency',
					currency: 'USD',
				}),
				icon: DollarSign,
			},
			{
				title: 'Total Sales',
				value: totalSales.toLocaleString('en-US', {
					style: 'currency',
					currency: 'USD',
				}),
				icon: BarChart3,
			},
			{
				title: 'Gross Margin',
				value: grossMargin.toLocaleString('en-US', {
					style: 'currency',
					currency: 'USD',
				}),
				icon: MapPin,
			},
		],
		[grossMargin, totalCost, totalLedgerEntries, totalSales],
	)

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

	return (
		<div className='space-y-6'>
			<PageHeader
				title='Insight Dashboard'
				description='Inventory analytics, value movements, and location performance intelligence.'
			/>

			<KpiCards cards={kpis} />

			<DashboardSectionGrid>
				<DashboardTrendChart
					className='xl:col-span-2'
					title='Inventory Movement Trend'
					description='Ledger movement records created per month'
					data={monthlyMovement}
					metricKey='count'
					metricLabel='Entries'
				/>
				<DashboardDistributionChart
					title='Entry Type Mix'
					description='Distribution by item ledger entry type'
					data={ledgerEntryMix}
				/>
			</DashboardSectionGrid>

			<DashboardStatsPanel
				title='Inventory Statistics'
				description='Operational signals for stock strategy and valuation'
				items={[
					{
						label: 'Active Locations',
						value: `${activeLocations}/${totalLocations}`,
						description: `${formatPercent(activeLocations, totalLocations)} currently active`,
					},
					{
						label: 'Warehouse Footprint',
						value: warehouses.toLocaleString(),
						description: 'Locations tagged as warehouse',
					},
					{
						label: 'Positive Movement Share',
						value: formatPercent(positiveMovements, totalLedgerEntries),
						description: 'Entries with quantity increase',
					},
					{
						label: 'Average Cost Per Unit',
						value: `$${avgCostPerUnit.toFixed(2)}`,
						description: 'Across value entries',
					},
				]}
			/>

			<div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
				<Card>
					<CardHeader className='border-b'>
						<CardTitle>Recent Ledger Entries</CardTitle>
						<CardDescription>Latest item ledger movements</CardDescription>
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
						) : recentEntries.length === 0 ? (
							<p className='py-4 text-center text-muted-foreground text-sm'>
								No ledger entries found.
							</p>
						) : (
							<ul className='divide-y'>
								{recentEntries.map((entry) => (
									<li
										key={entry.id}
										className='flex items-center justify-between gap-2 py-2'
									>
										<div className='min-w-0 flex-1'>
											<p className='truncate font-medium text-sm'>
												#{entry.entryNo} &middot; {entry.itemId}
											</p>
											<p className='truncate text-muted-foreground text-xs'>
												{entry.locationCode} &middot; Qty: {entry.quantity}
											</p>
										</div>
										<StatusBadge status={entry.entryType} />
									</li>
								))}
							</ul>
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader className='border-b'>
						<CardTitle>Location Summary</CardTitle>
						<CardDescription>Active locations by type</CardDescription>
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
						) : locations.length === 0 ? (
							<p className='py-4 text-center text-muted-foreground text-sm'>
								No locations found.
							</p>
						) : (
							<ul className='divide-y'>
								{locations.slice(0, 8).map((location) => (
									<li
										key={location.id}
										className='flex items-center justify-between gap-2 py-2'
									>
										<div className='min-w-0 flex-1'>
											<p className='truncate font-medium text-sm'>
												{location.name}
											</p>
											<p className='truncate text-muted-foreground text-xs'>
												{location.code}
											</p>
										</div>
										<div className='flex shrink-0 items-center gap-2'>
											<StatusBadge status={location.type} />
											<StatusBadge
												status={location.active ? 'ACTIVE' : 'INACTIVE'}
											/>
										</div>
									</li>
								))}
							</ul>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
