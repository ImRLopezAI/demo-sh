import { $rpc, useMutation, useQuery, useQueryClient } from '@lib/rpc'
import { AlertTriangle, Bell, LineChart, Save } from 'lucide-react'
import * as React from 'react'
import { useGrid } from '@/components/data-grid/compound'
import { useWindowSize } from '@/components/data-grid/hooks/use-window-size'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { useModuleList } from '../../hooks/use-data'
import { PageHeader } from '../_shared/page-header'
import type { SpecWorkbenchProps } from '../_shared/spec-workbench-helpers'
import { StatusBadge } from '../_shared/status-badge'

type ForecastSignal = {
	itemId: string
	locationCode: string
	demandQty: number
	currentStock: number
	avgDailyDemand: number
	daysOfCover: number | null
	stockoutRisk: 'LOW' | 'MEDIUM' | 'HIGH'
	forecastDemandHorizon: number
	forecastDemand30Days: number
	confidence?: 'LOW' | 'MEDIUM' | 'HIGH'
}

type Location = { _id: string; code?: string; name?: string }

type Item = { _id: string; itemNo?: string; description?: string }

type AlertPolicy = {
	stockoutRiskThreshold: 'LOW' | 'MEDIUM' | 'HIGH'
	obsoleteDaysThreshold: number
	dedupeMinutes: number
	escalationMinutes: number
}

const ALERT_SETTING_KEY = 'insight_alert_subscription'

export default function ForecastWorkbenchView({
	specProps,
}: {
	specProps?: SpecWorkbenchProps
} = {}) {
	const queryClient = useQueryClient()
	const windowSize = useWindowSize({ defaultWidth: 1280, defaultHeight: 900 })
	const [horizonDays, setHorizonDays] = React.useState('30')
	const [locationCode, setLocationCode] = React.useState('all')
	const [itemId, setItemId] = React.useState('all')
	const [policy, setPolicy] = React.useState<AlertPolicy>({
		stockoutRiskThreshold: 'HIGH',
		obsoleteDaysThreshold: 45,
		dedupeMinutes: 120,
		escalationMinutes: 60,
	})

	const locationQuery = useModuleList('insight', 'locations', { limit: 200 })
	const itemsQuery = useModuleList('market', 'items', { limit: 300 })
	const locations = (locationQuery.data?.items ?? []) as Location[]
	const items = (itemsQuery.data?.items ?? []) as Item[]

	const forecastDemand = useMutation({
		...$rpc.insight.forecastDemand.mutationOptions(),
	})

	const upsertPolicy = useMutation({
		...$rpc.hub.moduleSettings.upsertModuleSetting.mutationOptions({
			onSuccess: () => {
				void queryClient.invalidateQueries({
					queryKey: $rpc.hub.moduleSettings.key(),
				})
			},
		}),
	})

	const triggerAlerts = useMutation({
		...$rpc.insight.triggerForecastAlerts.mutationOptions({
			onSuccess: () => {
				void queryClient.invalidateQueries({
					queryKey: $rpc.hub.notifications.key(),
				})
			},
		}),
	})

	const alertPolicyQuery = useQuery({
		...$rpc.hub.moduleSettings.list.queryOptions({
			input: {
				limit: 10,
				offset: 0,
				filters: { moduleId: 'insight', settingKey: ALERT_SETTING_KEY },
			},
		}),
	})

	React.useEffect(() => {
		const row = alertPolicyQuery.data?.items?.[0] as
			| { value?: unknown; valueJson?: string }
			| undefined
		if (!row) return
		const parsed = (() => {
			if (row.value && typeof row.value === 'object')
				return row.value as Partial<AlertPolicy>
			try {
				return JSON.parse(String(row.valueJson ?? '{}')) as Partial<AlertPolicy>
			} catch {
				return {}
			}
		})()
		setPolicy((current) => ({
			...current,
			...parsed,
		}))
	}, [alertPolicyQuery.data?.items])

	const handleRunForecast = React.useCallback(async () => {
		await forecastDemand.mutateAsync({
			horizonDays: Math.min(
				180,
				Math.max(7, Number.parseInt(horizonDays, 10) || 30),
			),
			locationCode: locationCode === 'all' ? undefined : locationCode,
			itemId: itemId === 'all' ? undefined : itemId,
			limit: 100,
		})
	}, [forecastDemand, horizonDays, itemId, locationCode])

	const handleSavePolicy = React.useCallback(async () => {
		await upsertPolicy.mutateAsync({
			moduleId: 'insight',
			settingKey: ALERT_SETTING_KEY,
			value: policy,
			schemaVersion: 'v2',
			changeReason: 'Updated from forecast workbench',
		})
	}, [policy, upsertPolicy])

	const signals = (forecastDemand.data?.signals ?? []) as ForecastSignal[]
	const highRiskSignals = signals.filter((row) => row.stockoutRisk === 'HIGH')
	const mediumRiskSignals = signals.filter(
		(row) => row.stockoutRisk === 'MEDIUM',
	)
	const lowRiskSignals = signals.filter((row) => row.stockoutRisk === 'LOW')
	const noMoverSignals = signals.filter((row) => row.demandQty <= 0)
	const obsoleteSignals = signals.filter(
		(row) =>
			row.daysOfCover !== null &&
			row.daysOfCover > policy.obsoleteDaysThreshold,
	)

	const handleTriggerAlerts = React.useCallback(async () => {
		await triggerAlerts.mutateAsync({
			horizonDays: Math.min(
				180,
				Math.max(7, Number.parseInt(horizonDays, 10) || 30),
			),
			locationCode: locationCode === 'all' ? undefined : locationCode,
			itemId: itemId === 'all' ? undefined : itemId,
			limit: 100,
			maxNotifications: 20,
		})
	}, [horizonDays, itemId, locationCode, triggerAlerts])

	const ForecastGrid = useGrid(
		() => ({
			data: signals,
			isLoading: forecastDemand.isPending,
			readOnly: true,
			enableSearch: true,
		}),
		[signals, forecastDemand.isPending],
	)

	return (
		<div className='space-y-8 pb-8'>
			<PageHeader
				title={specProps?.title ?? 'Forecast Workbench & Alerting'}
				description={
					specProps?.description ??
					'Run demand signals, segment risk posture, and tune alert subscriptions for Insight.'
				}
			/>

			<div className='grid gap-6 xl:grid-cols-2'>
				<Card className='border-indigo-500/30 bg-gradient-to-br from-indigo-500/10 via-background to-background'>
					<CardHeader>
						<CardTitle className='flex items-center gap-2'>
							<LineChart className='size-4' />
							Forecast Controls
						</CardTitle>
						<CardDescription>
							Tune horizon, location, and item scope for demand risk evaluation.
						</CardDescription>
					</CardHeader>
					<CardContent className='space-y-4'>
						<div className='grid gap-3 md:grid-cols-3'>
							<div className='space-y-2'>
								<Label>Horizon (days)</Label>
								<Input
									type='number'
									value={horizonDays}
									onChange={(event) => setHorizonDays(event.target.value)}
								/>
							</div>
							<div className='space-y-2'>
								<Label>Location</Label>
								<Select
									value={locationCode}
									onValueChange={(value) => setLocationCode(value ?? 'all')}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value='all'>All locations</SelectItem>
										{locations.map((location) => (
											<SelectItem
												key={location._id}
												value={location.code ?? location._id}
											>
												{location.code ?? location._id} ·{' '}
												{location.name ?? 'Location'}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className='space-y-2'>
								<Label>Item</Label>
								<Select
									value={itemId}
									onValueChange={(value) => setItemId(value ?? 'all')}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value='all'>All items</SelectItem>
										{items.map((item) => (
											<SelectItem key={item._id} value={item._id}>
												{item.itemNo ?? item._id} · {item.description ?? 'Item'}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>

						<Button
							onClick={() => {
								void handleRunForecast()
							}}
							disabled={forecastDemand.isPending}
						>
							Run Forecast
						</Button>

						<div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-5'>
							<SummaryChip label='Signals' value={String(signals.length)} />
							<SummaryChip
								label='High Risk'
								value={String(highRiskSignals.length)}
							/>
							<SummaryChip
								label='Medium Risk'
								value={String(mediumRiskSignals.length)}
							/>
							<SummaryChip
								label='No Movers'
								value={String(noMoverSignals.length)}
							/>
							<SummaryChip
								label='Obsolete'
								value={String(obsoleteSignals.length)}
							/>
						</div>
					</CardContent>
				</Card>

				<Card className='border-rose-500/30 bg-gradient-to-br from-rose-500/10 via-background to-background'>
					<CardHeader>
						<CardTitle className='flex items-center gap-2'>
							<Bell className='size-4' />
							Alert Subscription Policy
						</CardTitle>
						<CardDescription>
							Persisted policy controls dedupe/escalation behavior for inventory
							risk alerts.
						</CardDescription>
					</CardHeader>
					<CardContent className='space-y-4'>
						<div className='grid gap-3 md:grid-cols-2'>
							<div className='space-y-2'>
								<Label>Risk Threshold</Label>
								<Select
									value={policy.stockoutRiskThreshold}
									onValueChange={(value) =>
										setPolicy((current) => ({
											...current,
											stockoutRiskThreshold: (value ?? 'HIGH') as
												| 'LOW'
												| 'MEDIUM'
												| 'HIGH',
										}))
									}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value='HIGH'>High</SelectItem>
										<SelectItem value='MEDIUM'>Medium</SelectItem>
										<SelectItem value='LOW'>Low</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div className='space-y-2'>
								<Label>Obsolete Days Threshold</Label>
								<Input
									type='number'
									value={policy.obsoleteDaysThreshold}
									onChange={(event) =>
										setPolicy((current) => ({
											...current,
											obsoleteDaysThreshold: Number(event.target.value),
										}))
									}
								/>
							</div>
							<div className='space-y-2'>
								<Label>Dedupe Window (minutes)</Label>
								<Input
									type='number'
									value={policy.dedupeMinutes}
									onChange={(event) =>
										setPolicy((current) => ({
											...current,
											dedupeMinutes: Number(event.target.value),
										}))
									}
								/>
							</div>
							<div className='space-y-2'>
								<Label>Escalation Delay (minutes)</Label>
								<Input
									type='number'
									value={policy.escalationMinutes}
									onChange={(event) =>
										setPolicy((current) => ({
											...current,
											escalationMinutes: Number(event.target.value),
										}))
									}
								/>
							</div>
						</div>

						<div className='flex flex-wrap gap-2'>
							<Button
								onClick={() => {
									void handleSavePolicy()
								}}
								disabled={upsertPolicy.isPending}
							>
								<Save className='mr-1.5 size-4' />
								Save Policy
							</Button>
							<Button
								variant='outline'
								onClick={() => {
									void handleTriggerAlerts()
								}}
								disabled={triggerAlerts.isPending}
							>
								<AlertTriangle className='mr-1.5 size-4' />
								Trigger Deduped Alerts
							</Button>
						</div>
						{triggerAlerts.data ? (
							<p className='text-muted-foreground text-xs'>
								Created {triggerAlerts.data.created} notifications · deduped{' '}
								{triggerAlerts.data.deduped} within policy window.
							</p>
						) : null}
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Forecast & Segmentation Results</CardTitle>
					<CardDescription>
						Risk-ranked demand forecast with coverage and segmentation
						indicators.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className='overflow-hidden rounded-xl border border-border/60'>
						<ForecastGrid
							variant='flat'
							height={Math.max(windowSize.height - 320, 320)}
						>
							<ForecastGrid.Header className='border-border/50 border-b bg-muted/20 px-4 py-3'>
								<ForecastGrid.Toolbar filter sort search export />
							</ForecastGrid.Header>
							<ForecastGrid.Columns>
								<ForecastGrid.Column accessorKey='itemId' title='Item ID' />
								<ForecastGrid.Column
									accessorKey='locationCode'
									title='Location'
								/>
								<ForecastGrid.Column
									accessorKey='demandQty'
									title='Demand Qty'
									cellVariant='number'
								/>
								<ForecastGrid.Column
									accessorKey='currentStock'
									title='Current Stock'
									cellVariant='number'
								/>
								<ForecastGrid.Column
									accessorKey='daysOfCover'
									title='Days of Cover'
									cellVariant='number'
								/>
								<ForecastGrid.Column
									accessorKey='stockoutRisk'
									title='Risk'
									cell={({ row }) => (
										<StatusBadge status={row.original.stockoutRisk} />
									)}
								/>
								<ForecastGrid.Column
									accessorKey='forecastDemand30Days'
									title='30D Forecast'
									cellVariant='number'
								/>
							</ForecastGrid.Columns>
						</ForecastGrid>
					</div>
				</CardContent>
			</Card>

			<div className='grid gap-4 md:grid-cols-3'>
				<SegmentCard title='Stockout Candidates' rows={highRiskSignals} />
				<SegmentCard title='Slow Movers' rows={mediumRiskSignals} />
				<SegmentCard
					title='No Movers / Obsolete'
					rows={[
						...noMoverSignals,
						...obsoleteSignals,
						...lowRiskSignals,
					].slice(0, 8)}
				/>
			</div>
		</div>
	)
}

function SummaryChip({ label, value }: { label: string; value: string }) {
	return (
		<div className='rounded-lg border border-border/60 bg-background/80 p-3 text-center'>
			<p className='text-muted-foreground text-xs'>{label}</p>
			<p className='font-semibold text-lg'>{value}</p>
		</div>
	)
}

function SegmentCard({
	title,
	rows,
}: {
	title: string
	rows: ForecastSignal[]
}) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className='text-base'>{title}</CardTitle>
			</CardHeader>
			<CardContent>
				<ul className='space-y-2 text-sm'>
					{rows.slice(0, 6).map((row) => (
						<li
							key={`${row.itemId}-${row.locationCode}`}
							className='rounded-md border border-border/60 p-2'
						>
							<div className='flex items-center justify-between gap-2'>
								<span>{row.itemId}</span>
								<StatusBadge status={row.stockoutRisk} />
							</div>
							<p className='text-muted-foreground text-xs'>
								{row.locationCode} · cover {row.daysOfCover ?? 'n/a'}
							</p>
						</li>
					))}
					{rows.length === 0 ? (
						<li className='text-muted-foreground text-xs'>No rows yet.</li>
					) : null}
				</ul>
			</CardContent>
		</Card>
	)
}
