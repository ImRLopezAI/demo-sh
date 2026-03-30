import { $rpc, useMutation, useQueryClient } from '@lib/rpc'
import { useQuery } from '@tanstack/react-query'
import { BellRing, MessageSquareQuote, Radar, Truck } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import { useModuleList } from '@/app/_shell/hooks/use-data'
import { PageHeader } from '@/components/ui/json-render/dashboard-sections'
import type { SpecWorkbenchProps } from '@/lib/json-render/components/spec-workbench-helpers'
import { StatusBadge } from '@/components/ui/json-render/status-badge'

type Shipment = {
	_id: string
	shipmentNo: string
	status: 'PLANNED' | 'DISPATCHED' | 'IN_TRANSIT' | 'DELIVERED' | 'EXCEPTION'
	trackingNo?: string | null
	courierName?: string | null
	sourceDocumentNo?: string | null
}

type CarrierAccount = {
	_id: string
	carrierCode: string
	name: string
	active: boolean
}

type CarrierLabel = {
	_id: string
	labelNo: string
	shipmentId: string
	carrierAccountId: string
	status: 'QUOTED' | 'PURCHASED' | 'VOIDED' | 'ERROR'
	serviceLevel?: string | null
	rateQuoteAmount: number
	trackingNo?: string | null
	labelUrl?: string | null
}

type TrackingEvent = {
	_id: string
	shipmentId: string
	carrierEventId: string
	eventType: string
	eventStatus: string
	occurredAt?: string | null
	source: 'WEBHOOK' | 'POLL'
	exception: boolean
}

type CustomerCommsTemplate = {
	dispatched: string
	inTransit: string
	delivered: string
	exception: string
}

const COMMS_TEMPLATE_KEY = 'trace_customer_comms_template'
const DEFAULT_TEMPLATE: CustomerCommsTemplate = {
	dispatched: 'Your order {{shipmentNo}} has left our facility.',
	inTransit:
		'Shipment {{shipmentNo}} is in transit with tracking {{trackingNo}}.',
	delivered:
		'Shipment {{shipmentNo}} was delivered. Thank you for choosing us.',
	exception:
		'Shipment {{shipmentNo}} encountered a delay. Our support team is on it.',
}

interface CarrierOpsViewProps {
	specProps?: SpecWorkbenchProps
}

export default function CarrierOpsView({
	specProps,
}: CarrierOpsViewProps = {}) {
	const queryClient = useQueryClient()
	const windowSize = useWindowSize({ defaultWidth: 1280, defaultHeight: 900 })

	const [shipmentId, setShipmentId] = React.useState('')
	const [carrierAccountId, setCarrierAccountId] = React.useState('')
	const [serviceLevel, setServiceLevel] = React.useState('STANDARD')
	const [packageWeightKg, setPackageWeightKg] = React.useState('1')
	const [transitionStatus, setTransitionStatus] = React.useState<
		'DISPATCHED' | 'IN_TRANSIT' | 'DELIVERED' | 'EXCEPTION'
	>('DISPATCHED')
	const [transitionReason, setTransitionReason] = React.useState(
		'Status update from carrier operations desk',
	)
	const [carrierEventId, setCarrierEventId] = React.useState(
		`evt-${Date.now()}`,
	)
	const [eventType, setEventType] = React.useState('TRACKING_UPDATE')
	const [eventStatus, setEventStatus] = React.useState('IN_TRANSIT')
	const [eventLocation, setEventLocation] = React.useState('Distribution Hub')
	const [template, setTemplate] =
		React.useState<CustomerCommsTemplate>(DEFAULT_TEMPLATE)

	const shipmentsQuery = useModuleList('trace', 'shipments', { limit: 300 })
	const accountsQuery = useModuleList('trace', 'carrierAccounts', {
		limit: 120,
	})
	const labelsQuery = useModuleList('trace', 'carrierLabels', { limit: 350 })
	const trackingEventsQuery = useModuleList('trace', 'trackingEvents', {
		limit: 500,
	})

	const shipments = (shipmentsQuery.data?.items ?? []) as Shipment[]
	const carrierAccounts = (accountsQuery.data?.items ?? []) as CarrierAccount[]
	const labels = (labelsQuery.data?.items ?? []) as CarrierLabel[]
	const trackingEvents = (trackingEventsQuery.data?.items ??
		[]) as TrackingEvent[]

	const templateSettingQuery = useQuery(
		$rpc.hub.moduleSettings.list.queryOptions({
			input: {
				limit: 10,
				offset: 0,
				filters: {
					moduleId: 'trace',
					settingKey: COMMS_TEMPLATE_KEY,
				},
			},
		}),
	)
	const templateSetting = React.useMemo(
		() =>
			(
				templateSettingQuery.data as
					| { items?: Array<{ value?: unknown; valueJson?: string }> }
					| undefined
			)?.items?.[0],
		[templateSettingQuery.data],
	)

	React.useEffect(() => {
		const setting = templateSetting
		if (!setting) return
		const parsed = (() => {
			if (setting.value && typeof setting.value === 'object') {
				return setting.value as Partial<CustomerCommsTemplate>
			}
			try {
				return JSON.parse(
					String(setting.valueJson ?? '{}'),
				) as Partial<CustomerCommsTemplate>
			} catch {
				return {}
			}
		})()
		setTemplate((current) => ({ ...current, ...parsed }))
	}, [templateSetting])

	const selectedShipment = shipments.find((row) => row._id === shipmentId)

	const timelineQuery = useQuery({
		...$rpc.trace.carrierOps.shipmentTimeline.queryOptions({
			input: { shipmentId: shipmentId || 'missing-shipment' },
		}),
		enabled: Boolean(shipmentId),
	})
	const timeline =
		(timelineQuery.data as
			| {
					events?: Array<{
						id: string
						eventType: string
						eventStatus: string
						occurredAt?: string | null
					}>
			  }
			| undefined) ?? undefined

	const quoteRate = useMutation({
		...$rpc.trace.carrierOps.quoteRate.mutationOptions({
			onSuccess: () => {
				invalidateTrace()
			},
		}),
	})
	const purchaseLabel = useMutation({
		...$rpc.trace.carrierOps.purchaseLabel.mutationOptions({
			onSuccess: () => {
				invalidateTrace()
			},
		}),
	})
	const ingestTrackingEvent = useMutation({
		...$rpc.trace.carrierOps.ingestTrackingEvent.mutationOptions({
			onSuccess: () => {
				invalidateTrace()
			},
		}),
	})
	const transitionWithNotification = useMutation({
		...$rpc.trace.shipments.transitionWithNotification.mutationOptions({
			onSuccess: () => {
				invalidateTrace()
			},
		}),
	})
	const upsertCommsTemplate = useMutation({
		...$rpc.hub.moduleSettings.upsertModuleSetting.mutationOptions({
			onSuccess: () => {
				void queryClient.invalidateQueries({
					queryKey: $rpc.hub.moduleSettings.key(),
				})
			},
		}),
	})

	const invalidateTrace = React.useCallback(() => {
		void queryClient.invalidateQueries({ queryKey: $rpc.trace.shipments.key() })
		void queryClient.invalidateQueries({
			queryKey: $rpc.trace.carrierLabels.key(),
		})
		void queryClient.invalidateQueries({
			queryKey: $rpc.trace.trackingEvents.key(),
		})
		void queryClient.invalidateQueries({
			queryKey: $rpc.trace.carrierOps.key(),
		})
		void queryClient.invalidateQueries({
			queryKey: $rpc.hub.notifications.key(),
		})
	}, [queryClient])

	const LabelsGrid = useGrid(
		() => ({
			data: labels.filter((row) =>
				shipmentId ? row.shipmentId === shipmentId : true,
			),
			isLoading: labelsQuery.isLoading,
			readOnly: true,
			enableSearch: true,
		}),
		[labels, labelsQuery.isLoading, shipmentId],
	)

	const TrackingGrid = useGrid(
		() => ({
			data: trackingEvents.filter((row) =>
				shipmentId ? row.shipmentId === shipmentId : true,
			),
			isLoading: trackingEventsQuery.isLoading,
			readOnly: true,
			enableSearch: true,
		}),
		[shipmentId, trackingEvents, trackingEventsQuery.isLoading],
	)

	const runQuote = React.useCallback(async () => {
		if (!shipmentId || !carrierAccountId) return
		await quoteRate.mutateAsync({
			shipmentId,
			carrierAccountId,
			serviceLevel,
			packageWeightKg: Math.max(0.1, Number.parseFloat(packageWeightKg) || 1),
		})
	}, [carrierAccountId, packageWeightKg, quoteRate, serviceLevel, shipmentId])

	const runPurchase = React.useCallback(async () => {
		if (!shipmentId || !carrierAccountId) return
		await purchaseLabel.mutateAsync({
			shipmentId,
			carrierAccountId,
			serviceLevel,
			packageWeightKg: Math.max(0.1, Number.parseFloat(packageWeightKg) || 1),
		})
	}, [
		carrierAccountId,
		packageWeightKg,
		purchaseLabel,
		serviceLevel,
		shipmentId,
	])

	const runIngestEvent = React.useCallback(async () => {
		if (!shipmentId || !carrierAccountId) return
		await ingestTrackingEvent.mutateAsync({
			carrierAccountId,
			carrierEventId,
			shipmentId,
			eventType,
			eventStatus,
			location: eventLocation.trim() || undefined,
			source: 'WEBHOOK',
		})
	}, [
		carrierAccountId,
		carrierEventId,
		eventLocation,
		eventStatus,
		eventType,
		ingestTrackingEvent,
		shipmentId,
	])

	const runTransition = React.useCallback(async () => {
		if (!shipmentId) return
		await transitionWithNotification.mutateAsync({
			id: shipmentId,
			toStatus: transitionStatus,
			reason: transitionReason.trim() || undefined,
		})
	}, [
		shipmentId,
		transitionReason,
		transitionStatus,
		transitionWithNotification,
	])

	const saveTemplate = React.useCallback(async () => {
		await upsertCommsTemplate.mutateAsync({
			moduleId: 'trace',
			settingKey: COMMS_TEMPLATE_KEY,
			value: template,
			schemaVersion: 'v2',
			changeReason: 'Updated in carrier operations communications workspace',
		})
	}, [template, upsertCommsTemplate])

	return (
		<div className='space-y-8 pb-8'>
			<PageHeader
				title={
					specProps?.title ?? 'Carrier Operations & Customer Communications'
				}
				description={
					specProps?.description ??
					'Quote/purchase labels, ingest carrier events with dedupe, and operate customer communication templates with timeline triage.'
				}
			/>

			<div className='grid gap-6 xl:grid-cols-3'>
				<Card className='border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 via-background to-background xl:col-span-2'>
					<CardHeader>
						<CardTitle className='flex items-center gap-2'>
							<Truck className='size-4' />
							Carrier Label Operations
						</CardTitle>
						<CardDescription>
							Run rate quotes and label purchases from one workspace; repeated
							purchase requests return idempotent label results.
						</CardDescription>
					</CardHeader>
					<CardContent className='space-y-4'>
						<div className='grid gap-3 md:grid-cols-2'>
							<div className='space-y-2'>
								<Label>Shipment</Label>
								<Select
									value={shipmentId}
									onValueChange={(value) => setShipmentId(value ?? '')}
								>
									<SelectTrigger>
										<SelectValue placeholder='Select shipment' />
									</SelectTrigger>
									<SelectContent>
										{shipments.map((shipment) => (
											<SelectItem key={shipment._id} value={shipment._id}>
												{shipment.shipmentNo} · {shipment.status}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className='space-y-2'>
								<Label>Carrier Account</Label>
								<Select
									value={carrierAccountId}
									onValueChange={(value) => setCarrierAccountId(value ?? '')}
								>
									<SelectTrigger>
										<SelectValue placeholder='Select carrier account' />
									</SelectTrigger>
									<SelectContent>
										{carrierAccounts.map((account) => (
											<SelectItem key={account._id} value={account._id}>
												{account.carrierCode} · {account.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>

						<div className='grid gap-3 md:grid-cols-2'>
							<div className='space-y-2'>
								<Label>Service Level</Label>
								<Input
									value={serviceLevel}
									onChange={(event) => setServiceLevel(event.target.value)}
								/>
							</div>
							<div className='space-y-2'>
								<Label>Package Weight (kg)</Label>
								<Input
									type='number'
									value={packageWeightKg}
									onChange={(event) => setPackageWeightKg(event.target.value)}
								/>
							</div>
						</div>

						<div className='flex flex-wrap gap-2'>
							<Button
								onClick={() => {
									void runQuote()
								}}
								disabled={
									!shipmentId || !carrierAccountId || quoteRate.isPending
								}
							>
								Quote Rate
							</Button>
							<Button
								variant='outline'
								onClick={() => {
									void runPurchase()
								}}
								disabled={
									!shipmentId || !carrierAccountId || purchaseLabel.isPending
								}
							>
								Purchase Label
							</Button>
						</div>

						{purchaseLabel.data ? (
							<div className='rounded-lg border border-border/60 bg-background/80 p-3 text-sm'>
								<p>
									Label <strong>{purchaseLabel.data.labelNo}</strong> · tracking{' '}
									<strong>{purchaseLabel.data.trackingNo ?? 'n/a'}</strong>
								</p>
								<p className='text-muted-foreground text-xs'>
									{purchaseLabel.data.idempotent
										? 'Idempotent replay detected: existing purchased label reused.'
										: 'New purchased label created.'}
								</p>
							</div>
						) : null}
					</CardContent>
				</Card>

				<Card className='border-indigo-500/30 bg-gradient-to-br from-indigo-500/10 via-background to-background'>
					<CardHeader>
						<CardTitle>Selected Shipment</CardTitle>
					</CardHeader>
					<CardContent className='space-y-2 text-sm'>
						{selectedShipment ? (
							<>
								<div className='flex items-center justify-between gap-2'>
									<span>{selectedShipment.shipmentNo}</span>
									<StatusBadge status={selectedShipment.status} />
								</div>
								<p className='text-muted-foreground text-xs'>
									Tracking {selectedShipment.trackingNo ?? 'pending'} · source{' '}
									{selectedShipment.sourceDocumentNo ?? 'n/a'}
								</p>
							</>
						) : (
							<p className='text-muted-foreground'>
								Select a shipment to load controls.
							</p>
						)}
					</CardContent>
				</Card>
			</div>

			<div className='grid gap-6 xl:grid-cols-2'>
				<Card className='border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-background to-background'>
					<CardHeader>
						<CardTitle className='flex items-center gap-2'>
							<Radar className='size-4' />
							Carrier Event Ingestion + Timeline
						</CardTitle>
						<CardDescription>
							Submit tracking events with stable carrier event IDs to enforce
							dedupe suppression.
						</CardDescription>
					</CardHeader>
					<CardContent className='space-y-4'>
						<div className='grid gap-3 md:grid-cols-2'>
							<div className='space-y-2'>
								<Label>Carrier Event ID</Label>
								<Input
									value={carrierEventId}
									onChange={(event) => setCarrierEventId(event.target.value)}
								/>
							</div>
							<div className='space-y-2'>
								<Label>Event Type</Label>
								<Input
									value={eventType}
									onChange={(event) => setEventType(event.target.value)}
								/>
							</div>
							<div className='space-y-2'>
								<Label>Event Status</Label>
								<Input
									value={eventStatus}
									onChange={(event) => setEventStatus(event.target.value)}
								/>
							</div>
							<div className='space-y-2'>
								<Label>Location</Label>
								<Input
									value={eventLocation}
									onChange={(event) => setEventLocation(event.target.value)}
								/>
							</div>
						</div>
						<Button
							onClick={() => {
								void runIngestEvent()
							}}
							disabled={
								!shipmentId ||
								!carrierAccountId ||
								ingestTrackingEvent.isPending
							}
						>
							Ingest Tracking Event
						</Button>
						{ingestTrackingEvent.data ? (
							<div className='rounded-lg border border-border/60 bg-background/80 p-3 text-xs'>
								{ingestTrackingEvent.data.idempotent
									? 'Duplicate event suppressed (idempotent=true).'
									: 'New tracking event recorded.'}
							</div>
						) : null}

						<div className='rounded-lg border border-border/60 bg-background/80 p-3'>
							<p className='font-medium text-sm'>Shipment Timeline</p>
							<ul className='mt-2 space-y-1 text-xs'>
								{(timeline?.events ?? []).map((event) => (
									<li key={event.id}>
										{event.occurredAt ?? 'n/a'} · {event.eventType} /{' '}
										{event.eventStatus}
									</li>
								))}
								{(timeline?.events ?? []).length === 0 ? (
									<li className='text-muted-foreground'>
										No timeline events yet.
									</li>
								) : null}
							</ul>
						</div>
					</CardContent>
				</Card>

				<Card className='border-violet-500/30 bg-gradient-to-br from-violet-500/10 via-background to-background'>
					<CardHeader>
						<CardTitle className='flex items-center gap-2'>
							<BellRing className='size-4' />
							Customer Communication Triggers
						</CardTitle>
						<CardDescription>
							Trigger customer notifications through shipment status transitions
							with consistent template policy.
						</CardDescription>
					</CardHeader>
					<CardContent className='space-y-4'>
						<div className='grid gap-3 md:grid-cols-2'>
							<div className='space-y-2'>
								<Label>Target Status</Label>
								<Select
									value={transitionStatus}
									onValueChange={(value) =>
										setTransitionStatus(
											(value ?? 'DISPATCHED') as
												| 'DISPATCHED'
												| 'IN_TRANSIT'
												| 'DELIVERED'
												| 'EXCEPTION',
										)
									}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value='DISPATCHED'>Dispatched</SelectItem>
										<SelectItem value='IN_TRANSIT'>In Transit</SelectItem>
										<SelectItem value='DELIVERED'>Delivered</SelectItem>
										<SelectItem value='EXCEPTION'>Exception</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div className='space-y-2'>
								<Label>Reason</Label>
								<Input
									value={transitionReason}
									onChange={(event) => setTransitionReason(event.target.value)}
								/>
							</div>
						</div>

						<Button
							onClick={() => {
								void runTransition()
							}}
							disabled={!shipmentId || transitionWithNotification.isPending}
						>
							Trigger Customer Communication
						</Button>
					</CardContent>
				</Card>
			</div>

			<div className='grid gap-6 xl:grid-cols-2'>
				<Card>
					<CardHeader>
						<CardTitle>Carrier Labels</CardTitle>
					</CardHeader>
					<CardContent>
						<div className='overflow-hidden rounded-xl border border-border/60'>
							<LabelsGrid
								variant='flat'
								height={Math.max(windowSize.height - 380, 260)}
							>
								<LabelsGrid.Header className='border-border/50 border-b bg-muted/20 px-4 py-3'>
									<LabelsGrid.Toolbar filter sort search export />
								</LabelsGrid.Header>
								<LabelsGrid.Columns>
									<LabelsGrid.Column accessorKey='labelNo' title='Label' />
									<LabelsGrid.Column
										accessorKey='status'
										title='Status'
										cell={({ row }) => (
											<StatusBadge status={row.original.status} />
										)}
									/>
									<LabelsGrid.Column
										accessorKey='serviceLevel'
										title='Service'
									/>
									<LabelsGrid.Column
										accessorKey='trackingNo'
										title='Tracking'
									/>
									<LabelsGrid.Column
										accessorKey='rateQuoteAmount'
										title='Quote'
										cellVariant='number'
										formatter={(value, formatter) =>
											formatter.currency(value.rateQuoteAmount)
										}
									/>
								</LabelsGrid.Columns>
							</LabelsGrid>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Tracking Events</CardTitle>
					</CardHeader>
					<CardContent>
						<div className='overflow-hidden rounded-xl border border-border/60'>
							<TrackingGrid
								variant='flat'
								height={Math.max(windowSize.height - 380, 260)}
							>
								<TrackingGrid.Header className='border-border/50 border-b bg-muted/20 px-4 py-3'>
									<TrackingGrid.Toolbar filter sort search export />
								</TrackingGrid.Header>
								<TrackingGrid.Columns>
									<TrackingGrid.Column
										accessorKey='carrierEventId'
										title='Carrier Event'
									/>
									<TrackingGrid.Column accessorKey='eventType' title='Type' />
									<TrackingGrid.Column
										accessorKey='eventStatus'
										title='Status'
									/>
									<TrackingGrid.Column accessorKey='source' title='Source' />
									<TrackingGrid.Column
										accessorKey='exception'
										title='Exception'
										cell={({ row }) => (
											<StatusBadge
												status={row.original.exception ? 'EXCEPTION' : 'NORMAL'}
											/>
										)}
									/>
									<TrackingGrid.Column
										accessorKey='occurredAt'
										title='Occurred'
										cellVariant='date'
									/>
								</TrackingGrid.Columns>
							</TrackingGrid>
						</div>
					</CardContent>
				</Card>
			</div>

			<Card className='border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-background to-background'>
				<CardHeader>
					<CardTitle className='flex items-center gap-2'>
						<MessageSquareQuote className='size-4' />
						Communication Templates
					</CardTitle>
					<CardDescription>
						Templates are persisted as module settings and used for
						customer-facing messaging policy.
					</CardDescription>
				</CardHeader>
				<CardContent className='space-y-4'>
					<div className='grid gap-3 md:grid-cols-2'>
						<div className='space-y-2'>
							<Label>Dispatched</Label>
							<Textarea
								rows={2}
								value={template.dispatched}
								onChange={(event) =>
									setTemplate((current) => ({
										...current,
										dispatched: event.target.value,
									}))
								}
							/>
						</div>
						<div className='space-y-2'>
							<Label>In Transit</Label>
							<Textarea
								rows={2}
								value={template.inTransit}
								onChange={(event) =>
									setTemplate((current) => ({
										...current,
										inTransit: event.target.value,
									}))
								}
							/>
						</div>
						<div className='space-y-2'>
							<Label>Delivered</Label>
							<Textarea
								rows={2}
								value={template.delivered}
								onChange={(event) =>
									setTemplate((current) => ({
										...current,
										delivered: event.target.value,
									}))
								}
							/>
						</div>
						<div className='space-y-2'>
							<Label>Exception</Label>
							<Textarea
								rows={2}
								value={template.exception}
								onChange={(event) =>
									setTemplate((current) => ({
										...current,
										exception: event.target.value,
									}))
								}
							/>
						</div>
					</div>
					<Button
						onClick={() => {
							void saveTemplate()
						}}
						disabled={upsertCommsTemplate.isPending}
					>
						Save Template Policy
					</Button>
				</CardContent>
			</Card>
		</div>
	)
}
