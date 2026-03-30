'use client'

import { Truck } from 'lucide-react'
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

interface Shipment {
	id: string
	shipmentNo: string
	status: 'PLANNED' | 'DISPATCHED' | 'IN_TRANSIT' | 'DELIVERED' | 'EXCEPTION'
	sourceDocumentType: string
	sourceDocumentNo: string
	shipmentMethodCode: string
	priority: 'LOW' | 'NORMAL' | 'HIGH' | 'EXPRESS'
	plannedDispatchDate: string
	plannedDeliveryDate: string
	actualDispatchDate: string
	actualDeliveryDate: string
	courierName: string
	trackingNo: string
	lineCount: number
}

type TraceDashboardContextValue = {
	isLoading: boolean
	metricItems: Array<{ label: string; value: string; icon: string }>
	shipmentStatusMix: Array<{ name: string; value: number }>
	monthlyShipmentVolume: Array<{ month: string; count: number; amount: number }>
	logisticsStatItems: Array<{
		label: string
		value: string
		description: string
	}>
	recentShipments: Array<{
		id: string
		title: string
		subtitle: string
		status: string
	}>
	statusPipelineBadges: Array<{ label: string; count: string }>
}

const TraceDashboardContext =
	React.createContext<TraceDashboardContextValue | null>(null)

const STATUS_COLORS: Record<string, string> = {
	PLANNED: 'bg-slate-500',
	DISPATCHED: 'bg-sky-500',
	IN_TRANSIT: 'bg-amber-500',
	DELIVERED: 'bg-emerald-500',
	EXCEPTION: 'bg-rose-500',
}

function useTraceDashboardData() {
	const { items: shipments, isLoading: shipmentsLoading } = useModuleData<
		'trace',
		Shipment
	>('trace', 'shipments', 'all')

	const isLoading = shipmentsLoading

	return React.useMemo<TraceDashboardContextValue>(() => {
		const totalShipments = shipments.length

		const statusCounts: Record<string, number> = {}
		for (const s of shipments) {
			statusCounts[s.status] = (statusCounts[s.status] ?? 0) + 1
		}

		const delivered = statusCounts.DELIVERED ?? 0
		const inTransit = statusCounts.IN_TRANSIT ?? 0
		const exceptions = statusCounts.EXCEPTION ?? 0
		const expressShipments = shipments.filter(
			(shipment) => shipment.priority === 'EXPRESS',
		).length
		const shipmentsWithTracking = shipments.filter((shipment) =>
			Boolean(shipment.trackingNo),
		).length

		const onTimeDelivered = shipments.filter((shipment) => {
			if (shipment.status !== 'DELIVERED') return false
			const planned = new Date(shipment.plannedDeliveryDate).getTime()
			const actual = new Date(shipment.actualDeliveryDate).getTime()
			if (Number.isNaN(planned) || Number.isNaN(actual)) return false
			return actual <= planned
		}).length

		const leadTimes = shipments
			.map((shipment) => {
				const dispatch = new Date(
					shipment.actualDispatchDate || shipment.plannedDispatchDate,
				).getTime()
				const delivery = new Date(
					shipment.actualDeliveryDate || shipment.plannedDeliveryDate,
				).getTime()
				if (Number.isNaN(dispatch) || Number.isNaN(delivery)) return null
				return Math.max(0, (delivery - dispatch) / (1000 * 60 * 60 * 24))
			})
			.filter((value): value is number => typeof value === 'number')
		const averageLeadTime = average(leadTimes)

		const uniqueCarriers = new Set(
			shipments
				.map((s) => s.courierName)
				.filter((name) => typeof name === 'string' && name.trim().length > 0),
		).size

		return {
			isLoading,
			metricItems: [
				{
					label: 'Total Shipments',
					value: totalShipments.toLocaleString(),
					icon: 'package',
				},
				{
					label: 'Delivered',
					value: delivered.toLocaleString(),
					icon: 'package',
				},
				{
					label: 'In Transit',
					value: inTransit.toLocaleString(),
					icon: 'package',
				},
				{
					label: 'Avg Lead Time',
					value: `${averageLeadTime.toFixed(1)}d`,
					icon: 'chart',
				},
				{
					label: 'Carriers',
					value: uniqueCarriers.toLocaleString(),
					icon: 'map',
				},
				{
					label: 'Exception Rate',
					value: formatPercent(exceptions, totalShipments),
					icon: 'chart',
				},
			],
			shipmentStatusMix: buildCategorySeries(shipments.map((s) => s.status)),
			monthlyShipmentVolume: buildMonthlySeries(
				shipments,
				(shipment) => shipment.plannedDispatchDate,
			),
			logisticsStatItems: [
				{
					label: 'On-Time Rate',
					value: formatPercent(onTimeDelivered, delivered),
					description: `${onTimeDelivered.toLocaleString()} on-time of ${delivered.toLocaleString()} delivered`,
				},
				{
					label: 'Express Share',
					value: formatPercent(expressShipments, totalShipments),
					description: `${expressShipments.toLocaleString()} express shipments`,
				},
				{
					label: 'Tracking Coverage',
					value: formatPercent(shipmentsWithTracking, totalShipments),
					description: 'Shipments with tracking no.',
				},
				{
					label: 'Avg Lead Time',
					value: `${averageLeadTime.toFixed(1)}d`,
					description: 'Dispatch to delivery',
				},
			],
			recentShipments: [...shipments]
				.sort(
					(a, b) =>
						new Date(b.plannedDispatchDate).getTime() -
						new Date(a.plannedDispatchDate).getTime(),
				)
				.slice(0, 8)
				.map((shipment) => ({
					id: shipment.id,
					title: `${shipment.shipmentNo} · ${shipment.priority}`,
					subtitle: `${shipment.courierName} · ${shipment.shipmentMethodCode}`,
					status: shipment.status,
				})),
			statusPipelineBadges: [
				{
					label: 'PLN',
					count: (statusCounts.PLANNED ?? 0).toString(),
				},
				{
					label: 'DSP',
					count: (statusCounts.DISPATCHED ?? 0).toString(),
				},
				{
					label: 'TRN',
					count: (statusCounts.IN_TRANSIT ?? 0).toString(),
				},
				{
					label: 'DLV',
					count: (statusCounts.DELIVERED ?? 0).toString(),
				},
				{
					label: 'EXC',
					count: (statusCounts.EXCEPTION ?? 0).toString(),
				},
			],
		}
	}, [isLoading, shipments])
}

function useTraceDashboardContext() {
	const value = React.useContext(TraceDashboardContext)
	if (!value) {
		throw new Error('Trace dashboard section must be used within provider')
	}
	return value
}

export function TraceDashboardData({
	children,
}: {
	children?: React.ReactNode
}) {
	const value = useTraceDashboardData()
	return (
		<TraceDashboardContext.Provider value={value}>
			{children}
		</TraceDashboardContext.Provider>
	)
}

export function TraceKpiStrip() {
	const { metricItems } = useTraceDashboardContext()
	return <MetricStrip items={metricItems} />
}

export function TraceShipmentStatusDistribution() {
	const { shipmentStatusMix } = useTraceDashboardContext()
	return (
		<StackedDistributionPanel
			title='Shipment Status Distribution'
			description='Breakdown by shipment status'
			items={shipmentStatusMix}
			colorMap={STATUS_COLORS}
			emptyMessage='No shipment data available.'
		/>
	)
}

export function TraceShipmentVolumeTrend() {
	const { monthlyShipmentVolume } = useTraceDashboardContext()
	return (
		<DashboardTrendChart
			className='shadow-sm transition-shadow hover:shadow-md'
			title='Shipment Volume Trend'
			description='Planned dispatch volume by month'
			data={monthlyShipmentVolume}
			metricKey='count'
			metricLabel='Shipments'
		/>
	)
}

export function TraceLogisticsStats() {
	const { logisticsStatItems } = useTraceDashboardContext()
	return <StatRowsPanel title='Logistics Metrics' items={logisticsStatItems} />
}

export function TraceRecentShipments() {
	const { isLoading, statusPipelineBadges, recentShipments } =
		useTraceDashboardContext()
	return (
		<RecordListPanel
			title='Recent Shipments'
			items={recentShipments}
			isLoading={isLoading}
			metaBadges={statusPipelineBadges}
			emptyMessage='No shipments found.'
			emptyIcon={<Truck className='mb-3 h-8 w-8 text-muted-foreground/50' />}
		/>
	)
}
