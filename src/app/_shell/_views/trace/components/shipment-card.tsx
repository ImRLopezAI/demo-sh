import { $rpc, useMutation, useQueryClient } from '@lib/rpc'
import * as React from 'react'
import { useGrid } from '@/components/data-grid/compound'
import { Button } from '@/components/ui/button'
import { useCreateForm } from '@/components/ui/form'
import { useModuleData, useModuleList } from '../../../hooks/use-data'
import { RecordDialog } from '../../_shared/record-dialog'
import { StatusBadge } from '../../_shared/status-badge'
import { useTransitionWithReason } from '../../_shared/transition-reason'
import { useEntityMutations, useEntityRecord } from '../../_shared/use-entity'

interface ShipmentHeader {
	_id: string
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
}

interface ShipmentLine {
	_id: string
	shipmentNo: string
	lineNo: number
	itemId: string
	description: string
	quantity: number
	quantityShipped: number
}

interface TrackingEvent {
	_id: string
	shipmentId: string
	carrierEventId: string
	eventType: string
	eventStatus: string
	occurredAt: string
	location: string
	exception: boolean
	source: 'WEBHOOK' | 'POLL'
}

const PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'EXPRESS'] as const

const STATUS_TRANSITIONS: Record<string, string[]> = {
	PLANNED: ['DISPATCHED', 'EXCEPTION'],
	DISPATCHED: ['IN_TRANSIT', 'EXCEPTION'],
	IN_TRANSIT: ['DELIVERED', 'EXCEPTION'],
	DELIVERED: ['EXCEPTION'],
}

export function ShipmentCard({
	selectedId,
	onClose,
}: {
	selectedId: string | null
	onClose: () => void
}) {
	const isNew = selectedId === 'new'
	const isOpen = selectedId !== null

	const { data: record, isLoading: recordLoading } = useEntityRecord(
		'trace',
		'shipments',
		selectedId,
		{ enabled: !isNew && isOpen },
	)

	const { create, update } = useEntityMutations('trace', 'shipments')
	const queryClient = useQueryClient()
	const transitionWithNotification = useMutation({
		...$rpc.trace.shipments.transitionWithNotification.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: $rpc.trace.shipments.key() })
				queryClient.invalidateQueries({
					queryKey: $rpc.hub.notifications.key(),
				})
			},
		}),
	})

	const { data: methodsList } = useModuleList('trace', 'shipmentMethods', {
		limit: 100,
	})
	const lineFilters = React.useMemo(
		() => ({
			shipmentNo:
				(record as ShipmentHeader | undefined)?.shipmentNo ?? '__none__',
		}),
		[(record as ShipmentHeader | undefined)?.shipmentNo],
	)
	const eventFilters = React.useMemo(
		() => ({
			shipmentId: (record as ShipmentHeader | undefined)?._id ?? '__none__',
		}),
		[(record as ShipmentHeader | undefined)?._id],
	)

	const { items: allLines, isLoading: linesLoading } = useModuleData<
		'trace',
		ShipmentLine
	>('trace', 'shipmentLines', 'overview', { filters: lineFilters })
	const { items: trackingEvents, isLoading: eventsLoading } = useModuleData<
		'trace',
		TrackingEvent
	>('trace', 'trackingEvents', 'overview', { filters: eventFilters })

	const resolvedRecord = isNew
		? {
				shipmentNo: '',
				status: 'PLANNED' as const,
				sourceDocumentType: '',
				sourceDocumentNo: '',
				shipmentMethodCode: '',
				priority: 'NORMAL' as const,
				plannedDispatchDate: new Date().toISOString(),
				plannedDeliveryDate: '',
				actualDispatchDate: '',
				actualDeliveryDate: '',
				courierName: '',
				trackingNo: '',
			}
		: record

	const [Form, form] = useCreateForm(
		() => ({
			defaultValues: (resolvedRecord ?? {}) as Record<string, unknown>,
			onSubmit: async (data) => {
				if (isNew) {
					await create.mutateAsync(data)
				} else if (selectedId) {
					await update.mutateAsync({ id: selectedId, data })
				}
				onClose()
			},
		}),
		[resolvedRecord, isNew, selectedId],
	)

	React.useEffect(() => {
		form.reset((resolvedRecord ?? {}) as Record<string, unknown>)
	}, [resolvedRecord, form])

	const lines = React.useMemo(() => {
		if (isNew) return []
		return allLines
	}, [allLines, isNew])
	const timelineEvents = React.useMemo(
		() =>
			[...trackingEvents].sort(
				(a, b) =>
					new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime(),
			),
		[trackingEvents],
	)

	const handleTransition = React.useCallback(
		async ({ toStatus, reason }: { toStatus: string; reason?: string }) => {
			if (!selectedId || isNew) return
			await transitionWithNotification.mutateAsync({
				id: selectedId,
				toStatus: toStatus as
					| 'DISPATCHED'
					| 'IN_TRANSIT'
					| 'DELIVERED'
					| 'EXCEPTION',
				reason,
			})
			onClose()
		},
		[selectedId, isNew, transitionWithNotification, onClose],
	)

	const { requestTransition, reasonDialog } = useTransitionWithReason({
		moduleId: 'trace',
		entityId: 'shipments',
		disabled: transitionWithNotification.isPending,
		onTransition: handleTransition,
	})

	const currentStatus = (resolvedRecord as ShipmentHeader | undefined)?.status
	const nextStatuses = currentStatus
		? (STATUS_TRANSITIONS[currentStatus] ?? [])
		: []

	const LinesGrid = useGrid(
		() => ({
			data: lines,
			isLoading: linesLoading,
			readOnly: true,
			enableSearch: false,
		}),
		[lines, linesLoading],
	)

	const dialogTitle = isNew
		? 'New Shipment'
		: `Shipment ${(resolvedRecord as ShipmentHeader | undefined)?.shipmentNo ?? ''}`

	return (
		<>
			<RecordDialog
				open={isOpen}
				onOpenChange={(open) => !open && onClose()}
				title={dialogTitle}
				description='Shipment header and line details'
				footer={
					<>
						{currentStatus && <StatusBadge status={currentStatus} />}
						{!isNew &&
							nextStatuses.map((status) => (
								<Button
									key={status}
									variant='outline'
									size='sm'
									onClick={() => {
										void requestTransition(status)
									}}
									disabled={transitionWithNotification.isPending}
								>
									{status.replace(/_/g, ' ')}
								</Button>
							))}
						<Button variant='outline' size='sm' onClick={onClose}>
							Cancel
						</Button>
						<Button size='sm' onClick={() => form.submit()}>
							Save
						</Button>
					</>
				}
			>
				{recordLoading && !isNew ? (
					<div className='space-y-3'>
						{[
							'shipment-skeleton-1',
							'shipment-skeleton-2',
							'shipment-skeleton-3',
							'shipment-skeleton-4',
						].map((skeletonKey) => (
							<div
								key={skeletonKey}
								className='h-8 rounded bg-muted motion-safe:animate-pulse'
							/>
						))}
					</div>
				) : (
					<div className='space-y-6'>
						<Form>
							{() => (
								<div className='grid grid-cols-2 gap-4 lg:grid-cols-3'>
									<Form.Field
										name='shipmentNo'
										render={({ field }) => (
											<Form.Item>
												<Form.Label>Shipment No.</Form.Label>
												<Form.Control>
													<Form.Input
														{...field}
														value={(field.value as string) ?? ''}
														readOnly
														placeholder='Auto-generated'
														autoComplete='off'
													/>
												</Form.Control>
											</Form.Item>
										)}
									/>
									<Form.Field
										name='status'
										render={({ field }) => (
											<Form.Item>
												<Form.Label>Status</Form.Label>
												<Form.Control>
													<StatusBadge status={field.value as string} />
												</Form.Control>
											</Form.Item>
										)}
									/>
									<Form.Field
										name='sourceDocumentType'
										render={({ field }) => (
											<Form.Item>
												<Form.Label>Source Doc. Type</Form.Label>
												<Form.Control>
													<Form.Input
														{...field}
														value={(field.value as string) ?? ''}
														placeholder='Source document type'
														autoComplete='off'
													/>
												</Form.Control>
											</Form.Item>
										)}
									/>
									<Form.Field
										name='sourceDocumentNo'
										render={({ field }) => (
											<Form.Item>
												<Form.Label>Source Doc. No.</Form.Label>
												<Form.Control>
													<Form.Input
														{...field}
														value={(field.value as string) ?? ''}
														placeholder='Source document number'
														autoComplete='off'
													/>
												</Form.Control>
											</Form.Item>
										)}
									/>
									<Form.Field
										name='shipmentMethodCode'
										render={({ field }) => (
											<Form.Item>
												<Form.Label>Shipment Method</Form.Label>
												<Form.Control>
													<Form.Combo
														value={field.value as string}
														onValueChange={field.onChange}
													>
														<Form.Combo.Input
															showClear
															placeholder='Search shipment methods\u2026'
														/>
														<Form.Combo.Content>
															<Form.Combo.List>
																{(methodsList?.items ?? []).map(
																	(m: Record<string, unknown>) => (
																		<Form.Combo.Item
																			key={m._id as string}
																			value={m.code as string}
																		>
																			{m.code as string} -{' '}
																			{m.description as string}
																		</Form.Combo.Item>
																	),
																)}
																<Form.Combo.Empty>
																	No shipment methods found
																</Form.Combo.Empty>
															</Form.Combo.List>
														</Form.Combo.Content>
													</Form.Combo>
												</Form.Control>
											</Form.Item>
										)}
									/>
									<Form.Field
										name='priority'
										render={({ field }) => (
											<Form.Item>
												<Form.Label>Priority</Form.Label>
												<Form.Control>
													<Form.Select
														value={field.value as string}
														onValueChange={field.onChange}
													>
														<Form.Select.Trigger className='w-full'>
															<Form.Select.Value />
														</Form.Select.Trigger>
														<Form.Select.Content>
															{PRIORITIES.map((priority) => (
																<Form.Select.Item
																	key={priority}
																	value={priority}
																>
																	{priority.replace(/_/g, ' ')}
																</Form.Select.Item>
															))}
														</Form.Select.Content>
													</Form.Select>
												</Form.Control>
											</Form.Item>
										)}
									/>
									<Form.Field
										name='plannedDispatchDate'
										render={({ field }) => (
											<Form.Item>
												<Form.Label>Planned Dispatch</Form.Label>
												<Form.Control>
													<Form.DatePicker
														value={field.value as string}
														onValueChange={(date) =>
															field.onChange(date?.toISOString() ?? '')
														}
														placeholder='Select date'
													/>
												</Form.Control>
											</Form.Item>
										)}
									/>
									<Form.Field
										name='plannedDeliveryDate'
										render={({ field }) => (
											<Form.Item>
												<Form.Label>Planned Delivery</Form.Label>
												<Form.Control>
													<Form.DatePicker
														value={field.value as string}
														onValueChange={(date) =>
															field.onChange(date?.toISOString() ?? '')
														}
														placeholder='Select date'
													/>
												</Form.Control>
											</Form.Item>
										)}
									/>
									<Form.Field
										name='actualDispatchDate'
										render={({ field }) => (
											<Form.Item>
												<Form.Label>Actual Dispatch</Form.Label>
												<Form.Control>
													<Form.DatePicker
														value={field.value as string}
														onValueChange={(date) =>
															field.onChange(date?.toISOString() ?? '')
														}
														placeholder='Select date'
													/>
												</Form.Control>
											</Form.Item>
										)}
									/>
									<Form.Field
										name='actualDeliveryDate'
										render={({ field }) => (
											<Form.Item>
												<Form.Label>Actual Delivery</Form.Label>
												<Form.Control>
													<Form.DatePicker
														value={field.value as string}
														onValueChange={(date) =>
															field.onChange(date?.toISOString() ?? '')
														}
														placeholder='Select date'
													/>
												</Form.Control>
											</Form.Item>
										)}
									/>
									<Form.Field
										name='courierName'
										render={({ field }) => (
											<Form.Item>
												<Form.Label>Courier</Form.Label>
												<Form.Control>
													<Form.Input
														{...field}
														value={(field.value as string) ?? ''}
														placeholder='Courier name'
														autoComplete='off'
													/>
												</Form.Control>
											</Form.Item>
										)}
									/>
									<Form.Field
										name='trackingNo'
										render={({ field }) => (
											<Form.Item>
												<Form.Label>Tracking No.</Form.Label>
												<Form.Control>
													<Form.Input
														{...field}
														value={(field.value as string) ?? ''}
														placeholder='Tracking number'
														autoComplete='off'
													/>
												</Form.Control>
											</Form.Item>
										)}
									/>
								</div>
							)}
						</Form>

						{!isNew && (
							<div className='space-y-3'>
								<h3 className='font-medium text-sm'>Shipment Lines</h3>
								<LinesGrid variant='compact' height={280}>
									<LinesGrid.Columns>
										<LinesGrid.Column
											accessorKey='lineNo'
											title='Line No.'
											cellVariant='number'
										/>
										<LinesGrid.Column accessorKey='itemId' title='Item' />
										<LinesGrid.Column
											accessorKey='description'
											title='Description'
										/>
										<LinesGrid.Column
											accessorKey='quantity'
											title='Quantity'
											cellVariant='number'
										/>
										<LinesGrid.Column
											accessorKey='quantityShipped'
											title='Qty Shipped'
											cellVariant='number'
										/>
									</LinesGrid.Columns>
								</LinesGrid>
							</div>
						)}
						{!isNew && (
							<div className='space-y-3'>
								<h3 className='font-medium text-sm'>Tracking Timeline</h3>
								{eventsLoading ? (
									<div className='space-y-2'>
										{['evt-1', 'evt-2', 'evt-3'].map((key) => (
											<div
												key={key}
												className='h-8 rounded bg-muted motion-safe:animate-pulse'
											/>
										))}
									</div>
								) : timelineEvents.length === 0 ? (
									<div className='rounded-md border border-border/50 bg-background/30 px-3 py-4 text-muted-foreground text-sm'>
										No tracking events yet.
									</div>
								) : (
									<ul className='space-y-2 rounded-md border border-border/50 bg-background/30 p-3'>
										{timelineEvents.map((event) => (
											<li
												key={event._id}
												className='flex items-center justify-between gap-3 rounded-md border border-border/40 px-3 py-2 text-sm'
											>
												<div className='min-w-0'>
													<p className='truncate font-medium'>
														{event.eventType} ({event.eventStatus})
													</p>
													<p className='truncate text-muted-foreground text-xs'>
														{event.location || 'Location unavailable'} •{' '}
														{event.source}
													</p>
												</div>
												<div className='flex items-center gap-2'>
													<span className='text-muted-foreground text-xs'>
														{event.occurredAt
															? new Date(event.occurredAt).toLocaleString()
															: '-'}
													</span>
													{event.exception ? (
														<StatusBadge status='EXCEPTION' />
													) : (
														<StatusBadge status='INFO' />
													)}
												</div>
											</li>
										))}
									</ul>
								)}
							</div>
						)}
					</div>
				)}
			</RecordDialog>
			{reasonDialog}
		</>
	)
}
