import { $rpc } from '@lib/rpc'
import { useQuery } from '@tanstack/react-query'
import {
	AlertTriangle,
	MapPin,
	Package,
	PackageCheck,
	Truck,
} from 'lucide-react'
import * as React from 'react'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useModuleData } from '../../hooks/use-data'
import {
	average,
	buildMonthlySeries,
	formatPercent,
} from '../_shared/dashboard-utils'
import { DashboardTrendChart } from '../_shared/dashboard-widgets'
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

const JOURNEY_STEPS = [
	{ key: 'PLANNED', label: 'Planned', icon: Package },
	{ key: 'DISPATCHED', label: 'Dispatched', icon: MapPin },
	{ key: 'IN_TRANSIT', label: 'In Transit', icon: Truck },
	{ key: 'DELIVERED', label: 'Delivered', icon: PackageCheck },
] as const

const STEP_STYLES: Record<string, string> = {
	active: 'border-sky-500 bg-sky-500/10 text-sky-600',
	inactive: 'border-border/40 bg-background/50 text-muted-foreground/40',
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
	const statusCounts = React.useMemo(() => {
		const counts: Record<string, number> = {}
		for (const s of shipments) {
			counts[s.status] = (counts[s.status] ?? 0) + 1
		}
		return counts
	}, [shipments])
	const delivered = statusCounts.DELIVERED ?? 0
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

	const monthlyShipmentVolume = React.useMemo(
		() =>
			buildMonthlySeries(shipments, (shipment) => shipment.plannedDispatchDate),
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

	const PRIORITY_STYLES: Record<string, string> = {
		EXPRESS:
			'bg-rose-500/10 text-rose-600 border-rose-200/50 dark:border-rose-800/40',
		HIGH: 'bg-amber-500/10 text-amber-600 border-amber-200/50 dark:border-amber-800/40',
		NORMAL:
			'bg-sky-500/10 text-sky-600 border-sky-200/50 dark:border-sky-800/40',
		LOW: 'bg-slate-500/10 text-slate-600 border-slate-200/50 dark:border-slate-800/40',
	}

	return (
		<div className='space-y-6 pb-8'>
			{/* ── Shipment Journey Steps ── */}
			<div className='rounded-2xl border border-border/50 bg-background/60 p-6'>
				<p className='mb-4 font-medium text-muted-foreground text-xs uppercase tracking-[0.2em]'>
					Shipment Pipeline &middot; {totalShipments.toLocaleString()} total
				</p>
				<div className='flex items-center gap-2'>
					{JOURNEY_STEPS.map((step, i) => {
						const count = statusCounts[step.key] ?? 0
						const isActive = count > 0
						return (
							<React.Fragment key={step.key}>
								{i > 0 && (
									<div className='hidden h-px flex-1 bg-border/50 md:block' />
								)}
								<div
									className={cn(
										'flex flex-1 flex-col items-center gap-2 rounded-xl border p-4 transition-colors',
										isActive ? STEP_STYLES.active : STEP_STYLES.inactive,
									)}
								>
									<step.icon className='size-5' />
									<p className='font-bold text-2xl tabular-nums'>{count}</p>
									<p className='text-center text-[10px] uppercase tracking-wider'>
										{step.label}
									</p>
								</div>
							</React.Fragment>
						)
					})}
				</div>
			</div>

			{/* ── Exception Banner ── */}
			{exceptions > 0 && (
				<div className='flex items-center gap-4 rounded-xl border border-rose-200/50 bg-rose-500/5 p-4 dark:border-rose-800/40'>
					<div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-500/10'>
						<AlertTriangle className='size-5 text-rose-600' />
					</div>
					<div>
						<p className='font-semibold text-rose-700 text-sm dark:text-rose-400'>
							{exceptions} shipment{exceptions !== 1 ? 's' : ''} with exceptions
						</p>
						<p className='text-rose-600/70 text-xs'>
							{formatPercent(exceptions, totalShipments)} of all shipments
							require attention
						</p>
					</div>
				</div>
			)}

			{/* ── Logistics Stats Row ── */}
			<div className='grid grid-cols-2 gap-3 md:grid-cols-4'>
				{[
					{
						label: 'On-Time Rate',
						value: formatPercent(onTimeDelivered, delivered),
						sub: `${onTimeDelivered} on-time of ${delivered} delivered`,
					},
					{
						label: 'Express Share',
						value: formatPercent(expressShipments, totalShipments),
						sub: `${expressShipments} express shipments`,
					},
					{
						label: 'Tracking Coverage',
						value: formatPercent(shipmentsWithTracking, totalShipments),
						sub: 'Shipments with tracking no.',
					},
					{
						label: 'Avg Lead Time',
						value: `${averageLeadTime.toFixed(1)}d`,
						sub: 'Dispatch to delivery',
					},
				].map((stat) => (
					<div
						key={stat.label}
						className='rounded-lg border border-border/40 bg-background/50 p-4'
					>
						<p className='text-[10px] text-muted-foreground uppercase tracking-wider'>
							{stat.label}
						</p>
						<p className='mt-1 font-bold text-xl tabular-nums tracking-tight'>
							{stat.value}
						</p>
						<p className='mt-0.5 text-[10px] text-muted-foreground/60'>
							{stat.sub}
						</p>
					</div>
				))}
			</div>

			{/* ── Two-Column: Carrier Performance + Volume Trend ── */}
			<div className='grid grid-cols-1 gap-5 lg:grid-cols-5'>
				{/* Carrier Performance — Horizontal Bars */}
				<Card className='shadow-sm transition-shadow hover:shadow-md lg:col-span-2'>
					<CardHeader className='border-border/50 border-b bg-muted/20'>
						<CardTitle className='text-base'>Carrier Performance</CardTitle>
						<CardDescription>
							On-time rate and exception frequency by carrier
						</CardDescription>
					</CardHeader>
					<CardContent className='space-y-4 pt-5'>
						{carrierKpis.length === 0 ? (
							<p className='py-6 text-center text-muted-foreground text-sm'>
								No carrier data available.
							</p>
						) : (
							carrierKpis.map((kpi) => (
								<div key={kpi.carrierAccountId} className='space-y-2'>
									<div className='flex items-center justify-between'>
										<span className='truncate font-medium text-sm'>
											{kpi.carrierName}
										</span>
										<span className='text-muted-foreground text-xs tabular-nums'>
											{kpi.shipmentCount} shipments
										</span>
									</div>
									{/* On-time bar */}
									<div className='space-y-0.5'>
										<div className='flex justify-between text-[10px]'>
											<span className='text-emerald-600'>On-time</span>
											<span className='tabular-nums'>
												{(kpi.onTimeRate * 100).toFixed(1)}%
											</span>
										</div>
										<div className='h-2 w-full overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-900/30'>
											<div
												className='h-full rounded-full bg-emerald-500 transition-all'
												style={{
													width: `${(kpi.onTimeRate * 100).toFixed(1)}%`,
												}}
											/>
										</div>
									</div>
									{/* Exception bar */}
									<div className='space-y-0.5'>
										<div className='flex justify-between text-[10px]'>
											<span className='text-rose-600'>Exceptions</span>
											<span className='tabular-nums'>
												{(kpi.exceptionRate * 100).toFixed(1)}%
											</span>
										</div>
										<div className='h-2 w-full overflow-hidden rounded-full bg-rose-100 dark:bg-rose-900/30'>
											<div
												className='h-full rounded-full bg-rose-500 transition-all'
												style={{
													width: `${(kpi.exceptionRate * 100).toFixed(1)}%`,
												}}
											/>
										</div>
									</div>
								</div>
							))
						)}
					</CardContent>
				</Card>

				{/* Volume Trend */}
				<DashboardTrendChart
					className='shadow-sm transition-shadow hover:shadow-md lg:col-span-3'
					title='Shipment Volume Trend'
					description='Planned dispatch volume by month'
					data={monthlyShipmentVolume}
					metricKey='count'
					metricLabel='Shipments'
				/>
			</div>

			{/* ── Recent Shipments — Route Cards ── */}
			<Card className='shadow-sm transition-shadow hover:shadow-md'>
				<CardHeader className='border-border/50 border-b bg-muted/20'>
					<CardTitle className='text-base'>Recent Shipments</CardTitle>
					<CardDescription>
						Latest dispatch and delivery activity
					</CardDescription>
				</CardHeader>
				<CardContent className='pt-4'>
					{isLoading ? (
						<div className='space-y-3' role='status' aria-label='Loading'>
							{Array.from({ length: 5 }).map((_, i) => (
								<div
									key={`skeleton-${i}`}
									className='h-16 rounded-xl bg-muted/50 motion-safe:animate-pulse'
								/>
							))}
						</div>
					) : recentShipments.length === 0 ? (
						<div className='flex flex-col items-center justify-center py-10 text-center'>
							<Package className='mb-3 h-10 w-10 text-muted-foreground/30' />
							<p className='text-muted-foreground text-sm'>
								No shipments found.
							</p>
						</div>
					) : (
						<div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
							{recentShipments.map((shipment) => (
								<div
									key={shipment.id}
									className='rounded-xl border border-border/40 bg-background/40 p-4 transition-colors hover:bg-muted/20'
								>
									<div className='flex items-start justify-between gap-3'>
										<div className='min-w-0'>
											<div className='flex items-center gap-2'>
												<span className='font-semibold text-sm'>
													{shipment.shipmentNo}
												</span>
												<span
													className={cn(
														'rounded-md border px-1.5 py-0.5 font-bold text-[9px] uppercase',
														PRIORITY_STYLES[shipment.priority] ??
															PRIORITY_STYLES.NORMAL,
													)}
												>
													{shipment.priority}
												</span>
											</div>
											<p className='mt-1 truncate text-muted-foreground text-xs'>
												{shipment.courierName} &middot;{' '}
												{shipment.shipmentMethodCode}
											</p>
										</div>
										<StatusBadge status={shipment.status} />
									</div>

									<div className='mt-3 flex items-center gap-3 text-[10px]'>
										<div className='flex items-center gap-1 text-muted-foreground'>
											<MapPin className='size-3' />
											<span>
												{new Date(
													shipment.plannedDispatchDate,
												).toLocaleDateString()}
											</span>
										</div>
										<div className='h-px flex-1 bg-border/50' />
										<div className='flex items-center gap-1 text-muted-foreground'>
											<PackageCheck className='size-3' />
											<span>
												{new Date(
													shipment.plannedDeliveryDate,
												).toLocaleDateString()}
											</span>
										</div>
									</div>

									{shipment.trackingNo && (
										<p className='mt-2 font-mono text-[10px] text-muted-foreground'>
											Tracking: {shipment.trackingNo}
										</p>
									)}
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	)
}
