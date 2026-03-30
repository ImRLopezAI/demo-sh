'use client'

import { MapPin, Package } from 'lucide-react'
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

type InsightDashboardContextValue = {
	metricItems: Array<{ label: string; value: string; icon: string }>
	entryTypeMix: Array<{ name: string; value: number }>
	monthlyMovement: Array<{ month: string; count: number; amount: number }>
	inventoryStatItems: Array<{
		label: string
		value: string
		description: string
	}>
	recentEntries: Array<{
		id: string
		title: string
		subtitle: string
		status: string
	}>
	locationItems: Array<{
		id: string
		title: string
		subtitle: string
		status: string
		leadingBadge: string
		leadingBadgeClassName: string
	}>
	locationBadges: Array<{ label: string; count: string }>
}

const InsightDashboardContext =
	React.createContext<InsightDashboardContextValue | null>(null)

const ENTRY_TYPE_COLORS: Record<string, string> = {
	SALE: 'bg-emerald-500',
	PURCHASE: 'bg-sky-500',
	POSITIVE_ADJUSTMENT: 'bg-violet-500',
	NEGATIVE_ADJUSTMENT: 'bg-rose-500',
	TRANSFER: 'bg-amber-500',
}

const LOCATION_TYPE_STYLES: Record<
	string,
	{ badge: string; className: string }
> = {
	WAREHOUSE: {
		badge: 'WH',
		className: 'bg-sky-500/10 text-sky-600',
	},
	STORE: {
		badge: 'ST',
		className: 'bg-emerald-500/10 text-emerald-600',
	},
	DISTRIBUTION_CENTER: {
		badge: 'DC',
		className: 'bg-violet-500/10 text-violet-600',
	},
}

function useInsightDashboardData() {
	const { items: ledgerEntries } = useModuleData<'insight', ItemLedgerEntry>(
		'insight',
		'itemLedgerEntries',
		'all',
	)
	const { items: valueEntries } = useModuleData<'insight', ValueEntry>(
		'insight',
		'valueEntries',
		'all',
	)
	const { items: locations } = useModuleData<'insight', Location>(
		'insight',
		'locations',
		'all',
	)

	return React.useMemo<InsightDashboardContextValue>(() => {
		const totalLocations = locations.length
		const activeLocations = locations.filter(
			(location) => location.active,
		).length
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

		return {
			metricItems: [
				{
					label: 'Ledger Entries',
					value: totalLedgerEntries.toLocaleString(),
					icon: 'package',
				},
				{
					label: 'Total Cost',
					value: totalCost.toLocaleString('en-US', {
						style: 'currency',
						currency: 'USD',
						maximumFractionDigits: 0,
					}),
					icon: 'dollar',
				},
				{
					label: 'Total Sales',
					value: totalSales.toLocaleString('en-US', {
						style: 'currency',
						currency: 'USD',
						maximumFractionDigits: 0,
					}),
					icon: 'chart',
				},
				{
					label: 'Gross Margin',
					value: grossMargin.toLocaleString('en-US', {
						style: 'currency',
						currency: 'USD',
						maximumFractionDigits: 0,
					}),
					icon: 'dollar',
				},
				{
					label: 'Margin %',
					value: `${marginPct.toFixed(1)}%`,
					icon: 'chart',
				},
				{
					label: 'Locations',
					value: `${activeLocations}/${totalLocations}`,
					icon: 'map',
				},
			],
			entryTypeMix: buildCategorySeries(
				ledgerEntries.map((entry) => entry.entryType),
			),
			monthlyMovement: buildMonthlySeries(
				ledgerEntries,
				(entry) => entry.postingDate,
			),
			inventoryStatItems: [
				{
					label: 'Positive Movements',
					value: formatPercent(positiveMovements, totalLedgerEntries),
					description: `${positiveMovements.toLocaleString()} entries with qty increase`,
				},
				{
					label: 'Open Entries',
					value: openEntries.toLocaleString(),
					description: `${formatPercent(openEntries, totalLedgerEntries)} of all entries`,
				},
				{
					label: 'Avg Cost / Unit',
					value: `$${avgCostPerUnit.toFixed(2)}`,
					description: 'Across all value entries',
				},
				{
					label: 'Value Entries',
					value: valueEntries.length.toLocaleString(),
					description: 'Cost and sales records',
				},
			],
			recentEntries: ledgerEntries.slice(0, 8).map((entry) => ({
				id: entry.id,
				title: `#${entry.entryNo} · ${entry.itemId}`,
				subtitle: `${entry.locationCode} · Qty: ${entry.quantity}`,
				status: entry.entryType,
			})),
			locationItems: locations.slice(0, 8).map((location) => ({
				id: location.id,
				title: location.name,
				subtitle: location.code,
				status: location.active ? 'ACTIVE' : 'INACTIVE',
				leadingBadge: LOCATION_TYPE_STYLES[location.type]?.badge ?? '??',
				leadingBadgeClassName:
					LOCATION_TYPE_STYLES[location.type]?.className ??
					'bg-slate-100 text-slate-600',
			})),
			locationBadges: [
				{ label: 'WH', count: warehouses.toString() },
				{ label: 'ST', count: stores.toString() },
				{ label: 'DC', count: distCenters.toString() },
			],
		}
	}, [ledgerEntries, locations, valueEntries])
}

function useInsightDashboardContext() {
	const value = React.useContext(InsightDashboardContext)
	if (!value) {
		throw new Error('Insight dashboard section must be used within provider')
	}
	return value
}

export function InsightDashboardData({
	children,
}: {
	children?: React.ReactNode
}) {
	const value = useInsightDashboardData()
	return (
		<InsightDashboardContext.Provider value={value}>
			{children}
		</InsightDashboardContext.Provider>
	)
}

export function InsightKpiStrip() {
	const { metricItems } = useInsightDashboardContext()
	return <MetricStrip items={metricItems} />
}

export function InsightEntryTypeDistribution() {
	const { entryTypeMix } = useInsightDashboardContext()
	return (
		<StackedDistributionPanel
			title='Entry Type Distribution'
			description='Breakdown by item ledger entry type'
			items={entryTypeMix}
			colorMap={ENTRY_TYPE_COLORS}
			emptyMessage='No entry data available.'
		/>
	)
}

export function InsightMovementTrend() {
	const { monthlyMovement } = useInsightDashboardContext()
	return (
		<DashboardTrendChart
			className='shadow-sm transition-shadow hover:shadow-md'
			title='Inventory Movement Trend'
			description='Ledger entries created per month'
			data={monthlyMovement}
			metricKey='count'
			metricLabel='Entries'
		/>
	)
}

export function InsightInventoryStats() {
	const { inventoryStatItems } = useInsightDashboardContext()
	return <StatRowsPanel title='Inventory Metrics' items={inventoryStatItems} />
}

export function InsightRecentEntries() {
	const { recentEntries } = useInsightDashboardContext()
	return (
		<RecordListPanel
			title='Recent Ledger Entries'
			items={recentEntries}
			emptyMessage='No ledger entries found.'
			emptyIcon={<Package className='mb-3 h-8 w-8 text-muted-foreground/50' />}
		/>
	)
}

export function InsightLocationSummary() {
	const { locationBadges, locationItems } = useInsightDashboardContext()
	return (
		<RecordListPanel
			title='Location Summary'
			items={locationItems}
			metaBadges={locationBadges}
			emptyMessage='No locations found.'
			emptyIcon={<MapPin className='mb-3 h-8 w-8 text-muted-foreground/50' />}
		/>
	)
}
