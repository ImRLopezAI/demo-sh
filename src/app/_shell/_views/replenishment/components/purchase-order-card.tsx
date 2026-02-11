import * as React from 'react'
import { useGrid } from '@/components/data-grid/compound'
import { Button } from '@/components/ui/button'
import { useCreateForm } from '@/components/ui/form'
import { useModuleData, useModuleList } from '../../../hooks/use-data'
import { RecordDialog } from '../../_shared/record-dialog'
import { StatusBadge } from '../../_shared/status-badge'
import { useEntityMutations, useEntityRecord } from '../../_shared/use-entity'

interface PurchaseOrderHeader {
	_id: string
	documentNo: string
	documentType: 'ORDER' | 'RETURN_ORDER' | 'QUOTE'
	status:
		| 'DRAFT'
		| 'PENDING_APPROVAL'
		| 'APPROVED'
		| 'REJECTED'
		| 'COMPLETED'
		| 'CANCELED'
	vendorId: string
	orderDate: string
	expectedReceiptDate: string
	currency: string
	lineCount: number
	totalAmount: number
}

interface PurchaseLine {
	_id: string
	documentNo: string
	lineNo: number
	itemId: string
	description: string
	quantity: number
	unitCost: number
	lineAmount: number
	quantityReceived: number
	quantityInvoiced: number
}

type POStatus = PurchaseOrderHeader['status']

const STATUS_TRANSITIONS: Record<POStatus, POStatus[]> = {
	DRAFT: ['PENDING_APPROVAL'],
	PENDING_APPROVAL: ['APPROVED', 'REJECTED'],
	APPROVED: ['COMPLETED', 'CANCELED'],
	REJECTED: ['DRAFT'],
	COMPLETED: [],
	CANCELED: [],
}

const TRANSITION_LABELS: Record<POStatus, string> = {
	DRAFT: 'Draft',
	PENDING_APPROVAL: 'Submit for Approval',
	APPROVED: 'Approve',
	REJECTED: 'Reject',
	COMPLETED: 'Complete',
	CANCELED: 'Cancel',
}

export function PurchaseOrderCard({
	recordId,
	onClose,
}: {
	recordId: string | null
	onClose: () => void
}) {
	const isNew = recordId === 'new'
	const open = recordId !== null

	const { data: record } = useEntityRecord(
		'replenishment',
		'purchaseOrders',
		recordId,
		{ enabled: open && !isNew },
	)

	const { items: lines, isLoading: linesLoading } = useModuleData<
		'replenishment',
		PurchaseLine
	>(
		'replenishment',
		'purchaseLines',
		recordId && !isNew ? recordId : '__none__',
	)

	const { update, transitionStatus } = useEntityMutations(
		'replenishment',
		'purchaseOrders',
	)

	const { data: vendorsList } = useModuleList('replenishment', 'vendors', {
		limit: 100,
	})

	const header = record as unknown as PurchaseOrderHeader | undefined

	const [Form, form] = useCreateForm<{
		documentNo: string
		documentType: 'ORDER' | 'RETURN_ORDER' | 'QUOTE'
		vendorId: string
		orderDate: string
		expectedReceiptDate: string
		currency: string
	}>(
		() => ({
			defaultValues: {
				documentNo: header?.documentNo ?? '',
				documentType: header?.documentType ?? 'ORDER',
				vendorId: header?.vendorId ?? '',
				orderDate: header?.orderDate ?? '',
				expectedReceiptDate: header?.expectedReceiptDate ?? '',
				currency: header?.currency ?? 'USD',
			},
			onSubmit: (data) => {
				if (!recordId || isNew) return
				update.mutate({ id: recordId, data })
				onClose()
			},
		}),
		[header, recordId],
	)

	React.useEffect(() => {
		if (header) {
			form.reset({
				documentNo: header.documentNo,
				documentType: header.documentType,
				vendorId: header.vendorId,
				orderDate: header.orderDate,
				expectedReceiptDate: header.expectedReceiptDate,
				currency: header.currency,
			})
		}
	}, [header, form])

	const currentStatus = header?.status ?? 'DRAFT'
	const availableTransitions = STATUS_TRANSITIONS[currentStatus]

	const handleTransition = React.useCallback(
		(nextStatus: POStatus) => {
			if (!recordId) return
			transitionStatus.mutate(
				{ id: recordId, toStatus: nextStatus },
				{ onSuccess: () => onClose() },
			)
		},
		[recordId, transitionStatus, onClose],
	)

	const LinesGrid = useGrid(
		() => ({
			data: lines,
			isLoading: linesLoading,
			readOnly: true,
			enableSearch: false,
		}),
		[lines, linesLoading],
	)

	return (
		<RecordDialog
			open={open}
			onOpenChange={(next) => {
				if (!next) onClose()
			}}
			title={
				isNew
					? 'New Purchase Order'
					: `Purchase Order ${header?.documentNo ?? ''}`
			}
			description='Manage purchase order header and lines.'
			footer={
				<>
					{availableTransitions.map((nextStatus) => (
						<Button
							key={nextStatus}
							variant={
								nextStatus === 'REJECTED' || nextStatus === 'CANCELED'
									? 'destructive'
									: 'outline'
							}
							size='sm'
							onClick={() => handleTransition(nextStatus)}
							disabled={transitionStatus.isPending}
						>
							{TRANSITION_LABELS[nextStatus]}
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
			<div className='space-y-6'>
				<Form>
					{() => (
						<Form.Group className='grid grid-cols-3 gap-4'>
							<Form.Item>
								<Form.Label>Document No.</Form.Label>
								<Form.Field
									name='documentNo'
									render={({ field }) => (
										<Form.Control>
											<Form.Input {...field} readOnly autoComplete='off' />
										</Form.Control>
									)}
								/>
							</Form.Item>

							<Form.Item>
								<Form.Label>Document Type</Form.Label>
								<Form.Field
									name='documentType'
									render={({ field }) => (
										<Form.Control>
											<Form.Select
												value={field.value}
												onValueChange={field.onChange}
											>
												<Form.Select.Trigger className='w-full'>
													<Form.Select.Value />
												</Form.Select.Trigger>
												<Form.Select.Content>
													<Form.Select.Item value='ORDER'>
														Order
													</Form.Select.Item>
													<Form.Select.Item value='RETURN_ORDER'>
														Return Order
													</Form.Select.Item>
													<Form.Select.Item value='QUOTE'>
														Quote
													</Form.Select.Item>
												</Form.Select.Content>
											</Form.Select>
										</Form.Control>
									)}
								/>
							</Form.Item>

							<Form.Item>
								<Form.Label>Status</Form.Label>
								<div className='flex h-7 items-center'>
									<StatusBadge status={currentStatus} />
								</div>
							</Form.Item>

							<Form.Field
								name='vendorId'
								render={({ field }) => (
									<Form.Item>
										<Form.Label>Vendor</Form.Label>
										<Form.Control>
											<Form.Combo
												value={field.value}
												onValueChange={field.onChange}
											>
												<Form.Combo.Input
													showClear
													placeholder='Search vendors\u2026'
												/>
												<Form.Combo.Content>
													<Form.Combo.List>
														{(vendorsList?.items ?? []).map(
															(v: Record<string, unknown>) => (
																<Form.Combo.Item
																	key={v._id as string}
																	value={v._id as string}
																>
																	{v.vendorNo as string} - {v.name as string}
																</Form.Combo.Item>
															),
														)}
														<Form.Combo.Empty>
															No vendors found
														</Form.Combo.Empty>
													</Form.Combo.List>
												</Form.Combo.Content>
											</Form.Combo>
										</Form.Control>
									</Form.Item>
								)}
							/>

							<Form.Item>
								<Form.Label>Order Date</Form.Label>
								<Form.Field
									name='orderDate'
									render={({ field }) => (
										<Form.Control>
											<Form.DatePicker
												value={field.value}
												onValueChange={(date) =>
													field.onChange(date?.toISOString() ?? '')
												}
												placeholder='Select order date'
											/>
										</Form.Control>
									)}
								/>
							</Form.Item>

							<Form.Item>
								<Form.Label>Expected Receipt Date</Form.Label>
								<Form.Field
									name='expectedReceiptDate'
									render={({ field }) => (
										<Form.Control>
											<Form.DatePicker
												value={field.value}
												onValueChange={(date) =>
													field.onChange(date?.toISOString() ?? '')
												}
												placeholder='Select receipt date'
											/>
										</Form.Control>
									)}
								/>
							</Form.Item>

							<Form.Item>
								<Form.Label>Currency</Form.Label>
								<Form.Field
									name='currency'
									render={({ field }) => (
										<Form.Control>
											<Form.Input
												{...field}
												placeholder='USD\u2026'
												autoComplete='off'
											/>
										</Form.Control>
									)}
								/>
							</Form.Item>
						</Form.Group>
					)}
				</Form>

				<div className='space-y-2'>
					<h3 className='font-medium text-sm'>Purchase Lines</h3>
					<LinesGrid variant='dense' height={320}>
						<LinesGrid.Columns>
							<LinesGrid.Column<PurchaseLine>
								accessorKey='lineNo'
								title='Line No.'
								cellVariant='number'
							/>
							<LinesGrid.Column<PurchaseLine>
								accessorKey='itemId'
								title='Item'
							/>
							<LinesGrid.Column<PurchaseLine>
								accessorKey='description'
								title='Description'
							/>
							<LinesGrid.Column<PurchaseLine>
								accessorKey='quantity'
								title='Quantity'
								cellVariant='number'
							/>
							<LinesGrid.Column<PurchaseLine>
								accessorKey='unitCost'
								title='Unit Cost'
								cellVariant='number'
							/>
							<LinesGrid.Column<PurchaseLine>
								accessorKey='lineAmount'
								title='Line Amount'
								cellVariant='number'
							/>
							<LinesGrid.Column<PurchaseLine>
								accessorKey='quantityReceived'
								title='Qty Received'
								cellVariant='number'
							/>
							<LinesGrid.Column<PurchaseLine>
								accessorKey='quantityInvoiced'
								title='Qty Invoiced'
								cellVariant='number'
							/>
						</LinesGrid.Columns>
					</LinesGrid>
				</div>
			</div>
		</RecordDialog>
	)
}
