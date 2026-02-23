import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Package, PackageCheck, Truck } from 'lucide-react'
import * as React from 'react'
import { $rpc } from '@lib/rpc'
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

export default function TraceDashboard() {
	const { items: shipments, isLoading } = useModuleData<'trace', Shipment>(
		'trace',
		'shipments',
		'all',
	)
	const carrierKpisQuery = useQuery(
		$rpc.trace.carrierOps.carrierKpis.queryOptions({
			input: {},
		}),
	)

	const totalShipments = shipments.length
	const inTransit = shipments.filter(
		(shipment) => shipment.status === 'IN_TRANSIT',
	).length
	const delivered = shipments.filter(
		(shipment) => shipment.status === 'DELIVERED',
	).length
	const exceptions = shipments.filter(
		(shipment) => shipment.status === 'EXCEPTION',
	).length
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

	const kpis = React.useMemo<KpiCardDef[]>(
		() => [
			{
				title: 'Total Shipments',
				value: totalShipments,
				description: 'All shipment records',
				icon: Package,
			},
			{
				title: 'In Transit',
				value: inTransit,
				description: 'Currently being shipped',
				icon: Truck,
			},
			{
				title: 'Delivered',
				value: delivered,
				description: 'Successfully delivered',
				icon: PackageCheck,
			},
			{
				title: 'Exceptions',
				value: exceptions,
				description: 'Requires attention',
				icon: AlertTriangle,
			},
		],
		[delivered, exceptions, inTransit, totalShipments],
	)

	const monthlyShipmentVolume = React.useMemo(
		() =>
			buildMonthlySeries(shipments, (shipment) => shipment.plannedDispatchDate),
		[shipments],
	)

	const shipmentStatusMix = React.useMemo(
		() => buildCategorySeries(shipments.map((shipment) => shipment.status)),
		[shipments],
	)

	const recentShipments = React.useMemo(
		() =>
			[...shipments]
				.sort(
					(a, b) =>
						new Date(b.plannedDispatchDate).getTime() -
						new Date(a.plannedDispatchDate).getTime(),
				)
				.slice(0, 10),
		[shipments],
	)
	const carrierKpis = carrierKpisQuery.data ?? []

	return (
		<div className='space-y-8 pb-8'>
			<PageHeader
				title='Trace Dashboard'
				description='Shipment operations, delivery reliability, and exception trends.'
			/>

			<KpiCards cards={kpis} />

			<DashboardSectionGrid>
				<DashboardTrendChart
					className='shadow-sm transition-shadow duration-300 hover:shadow-md xl:col-span-2'
					title='Shipment Volume Trend'
					description='Planned dispatch volume by month'
					data={monthlyShipmentVolume}
					metricKey='count'
					metricLabel='Shipments'
				/>
				<DashboardDistributionChart
					className='shadow-sm transition-shadow duration-300 hover:shadow-md'
					title='Shipment Status Mix'
					description='Current distribution by shipment status'
					data={shipmentStatusMix}
				/>
			</DashboardSectionGrid>

			<DashboardStatsPanel
				className='shadow-sm transition-shadow duration-300 hover:shadow-md'
				title='Logistics Statistics'
				description='Signals for delivery quality and carrier management'
				items={[
					{
						label: 'On-Time Delivery Rate',
						value: formatPercent(onTimeDelivered, delivered),
						description: 'Delivered on/before planned date',
					},
					{
						label: 'Express Shipment Share',
						value: formatPercent(expressShipments, totalShipments),
						description: `${expressShipments.toLocaleString()} express shipments`,
					},
					{
						label: 'Tracking Coverage',
						value: formatPercent(shipmentsWithTracking, totalShipments),
						description: 'Shipments with valid tracking number',
					},
					{
						label: 'Average Lead Time',
						value: `${averageLeadTime.toFixed(1)} days`,
						description: 'Dispatch to delivery average',
					},
				]}
			/>

			<Card className='shadow-sm transition-shadow duration-300 hover:shadow-md'>
				<CardHeader className='border-border/50 border-b bg-muted/20'>
					<CardTitle>Recent Shipments</CardTitle>
				</CardHeader>
				<CardContent className='pt-6'>
					{isLoading ? (
						<div className='space-y-3' role='status' aria-label='Loading'>
							{Array.from({ length: 5 }).map((_, i) => (
								<div
									key={`skeleton-${i}`}
									className='h-12 rounded-lg bg-muted/50 motion-safe:animate-pulse'
								/>
							))}
						</div>
					) : recentShipments.length === 0 ? (
						<div className='flex flex-col items-center justify-center py-8 text-center'>
							<Package className='mb-3 h-8 w-8 text-muted-foreground/50' />
							<p className='text-muted-foreground text-sm'>
								No shipments found.
							</p>
						</div>
					) : (
						<ul className='space-y-3'>
							{recentShipments.map((shipment) => (
								<li
									key={shipment.id}
									className='flex items-center justify-between rounded-lg border border-border/40 bg-background/30 p-3 transition-colors hover:bg-muted/50'
								>
									<div className='flex min-w-0 items-center gap-3'>
										<span className='truncate font-medium'>
											{shipment.shipmentNo}
										</span>
										<span className='truncate text-muted-foreground text-xs'>
											{shipment.courierName}
										</span>
									</div>
									<div className='flex shrink-0 items-center gap-3'>
										<span className='text-muted-foreground text-xs tabular-nums'>
											{shipment.trackingNo}
										</span>
										<StatusBadge status={shipment.status} />
									</div>
								</li>
							))}
						</ul>
					)}
				</CardContent>
			</Card>

			<Card className='shadow-sm transition-shadow duration-300 hover:shadow-md'>
				<CardHeader className='border-border/50 border-b bg-muted/20'>
					<CardTitle>Carrier Performance KPIs</CardTitle>
				</CardHeader>
				<CardContent className='pt-6'>
					{carrierKpis.length === 0 ? (
						<p className='text-muted-foreground text-sm'>
							No carrier KPI data available.
						</p>
					) : (
						<ul className='space-y-2'>
							{carrierKpis.map((kpi) => (
								<li
									key={kpi.carrierAccountId}
									className='flex items-center justify-between rounded-lg border border-border/40 bg-background/30 p-3 text-sm'
								>
									<div>
										<p className='font-medium'>{kpi.carrierName}</p>
										<p className='text-muted-foreground text-xs'>
											{kpi.shipmentCount.toLocaleString()} shipments
										</p>
									</div>
									<div className='text-right text-xs'>
										<p>
											On-time: {(kpi.onTimeRate * 100).toFixed(1)}%
										</p>
										<p>
											Exceptions: {(kpi.exceptionRate * 100).toFixed(1)}%
										</p>
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
