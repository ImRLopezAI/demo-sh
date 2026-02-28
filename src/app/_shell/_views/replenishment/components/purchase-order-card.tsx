import { $rpc, useMutation, useQueryClient } from '@lib/rpc'
import {
	DOCUMENT_APPROVAL_STATUS_LABELS,
	DOCUMENT_APPROVAL_TRANSITIONS,
	type DocumentApprovalStatus,
	getLabeledTransitions,
} from '@server/db/constants'
import * as React from 'react'
import { useGrid } from '@/components/data-grid/compound'
import { Button } from '@/components/ui/button'
import { useCreateForm } from '@/components/ui/form'
import { toSelectItemsMap } from '@/lib/select-items'
import { useModuleData, useModuleList } from '../../../hooks/use-data'
import { FormSection } from '../../_shared/form-section'
import {
	RecordDialog,
	type RecordDialogActionGroup,
} from '../../_shared/record-dialog'
import { useTransitionWithReason } from '../../_shared/transition-reason'
import { useEntityMutations, useEntityRecord } from '../../_shared/use-entity'
import { useRecordReportGroup } from '@/hooks/use-record-report-group'

interface PurchaseOrderHeader {
	_id: string
	documentNo: string
	documentType: 'ORDER' | 'RETURN_ORDER' | 'QUOTE'
	status: DocumentApprovalStatus
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

interface VendorOption {
	_id: string
	vendorNo?: string
	name?: string
}

interface ItemOption {
	_id: string
	itemNo?: string
	description?: string
	unitCost?: number
}

interface PurchaseOrderCreateInput {
	documentNo: string
	documentType: 'ORDER' | 'RETURN_ORDER' | 'QUOTE'
	vendorId: string
	orderDate: string
	expectedReceiptDate: string
	currency: string
}

export function PurchaseOrderCard({
	recordId,
	onClose,
	onCreated,
	presentation = 'dialog',
}: {
	recordId: string | null
	onClose: () => void
	onCreated?: (id: string) => void
	presentation?: 'dialog' | 'page'
}) {
	const isNew = recordId === 'new'
	const open = recordId !== null

	const { data: record } = useEntityRecord(
		'replenishment',
		'purchaseOrders',
		recordId,
		{ enabled: open && !isNew },
	)
	const header = record as unknown as PurchaseOrderHeader | undefined
	const lineFilters = React.useMemo(
		() => ({ documentNo: header?.documentNo ?? '__none__' }),
		[header?.documentNo],
	)

	const { items: linesFromApi, isLoading: linesLoading } = useModuleData<
		'replenishment',
		PurchaseLine
	>('replenishment', 'purchaseLines', 'overview', { filters: lineFilters })

	const { update, transitionStatus } = useEntityMutations(
		'replenishment',
		'purchaseOrders',
	)

	const {
		create: createLine,
		update: updateLine,
		remove: removeLine,
	} = useEntityMutations('replenishment', 'purchaseLines')
	const queryClient = useQueryClient()

	const invalidatePurchaseOrderQueries = React.useCallback(() => {
		queryClient.invalidateQueries({
			queryKey: $rpc.replenishment.purchaseOrders.key(),
		})
		queryClient.invalidateQueries({
			queryKey: $rpc.replenishment.purchaseLines.key(),
		})
	}, [queryClient])

	const createWithLines = useMutation({
		...$rpc.replenishment.purchaseOrders.createWithLines.mutationOptions({
			onSuccess: invalidatePurchaseOrderQueries,
		}),
	})
	const receivePurchaseOrder = useMutation({
		...$rpc.replenishment.purchaseOrders.receive.mutationOptions({
			onSuccess: () => {
				invalidatePurchaseOrderQueries()
				queryClient.invalidateQueries({
					queryKey: $rpc.replenishment.purchaseReceipts.key(),
				})
			},
		}),
	})
	const createInvoiceFromOrder = useMutation({
		...$rpc.replenishment.purchaseInvoices.createFromOrder.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: $rpc.replenishment.purchaseInvoices.key(),
				})
			},
		}),
	})

	const { data: vendorsList } = useModuleList('replenishment', 'vendors', {
		limit: 100,
	})

	const { data: itemsList } = useModuleList('market', 'items', {
		limit: 100,
	})
	const [draftLines, setDraftLines] = React.useState<PurchaseLine[]>([])
	const vendorOptions = (vendorsList?.items ?? []) as VendorOption[]
	const itemOptions = (itemsList?.items ?? []) as ItemOption[]
	const vendorItemsMap = React.useMemo(
		() =>
			toSelectItemsMap(
				vendorOptions,
				(v) => v._id,
				(v) =>
					`${v.name ?? 'Unnamed vendor'}${v.vendorNo ? ` (${v.vendorNo})` : ''}`,
			),
		[vendorOptions],
	)
	const lines = React.useMemo(
		() => (isNew ? draftLines : linesFromApi),
		[draftLines, isNew, linesFromApi],
	)

	const [Form, form] = useCreateForm<PurchaseOrderCreateInput>(
		() => ({
			defaultValues: {
				documentNo: header?.documentNo ?? '',
				documentType: header?.documentType ?? 'ORDER',
				vendorId: header?.vendorId ?? '',
				orderDate: header?.orderDate ?? new Date().toISOString(),
				expectedReceiptDate:
					header?.expectedReceiptDate ?? new Date().toISOString(),
				currency: header?.currency ?? 'USD',
			},
			onSubmit: async (data) => {
				if (isNew) {
					if (draftLines.length === 0) {
						throw new Error('Add at least one purchase line before saving')
					}

					const created = await createWithLines.mutateAsync({
						header: {
							documentType: data.documentType,
							status: 'DRAFT',
							vendorId: data.vendorId,
							orderDate: data.orderDate,
							expectedReceiptDate: data.expectedReceiptDate,
							currency: data.currency,
						},
						lines: draftLines.map((line, index) => ({
							lineNo: line.lineNo || index + 1,
							itemId: line.itemId,
							quantity: line.quantity,
							unitCost: line.unitCost,
							lineAmount: line.lineAmount,
							quantityReceived: line.quantityReceived,
							quantityInvoiced: line.quantityInvoiced,
						})),
					})

					const createdOrder = created.header
					if (onCreated && createdOrder?._id) {
						onCreated(createdOrder._id)
					} else {
						onClose()
					}
				} else if (recordId) {
					await update.mutateAsync({
						id: recordId,
						data: data as unknown as Record<string, unknown>,
					})
					onClose()
				}
			},
		}),
		[
			header,
			recordId,
			isNew,
			createWithLines,
			draftLines,
			update,
			onClose,
			onCreated,
		],
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
		} else if (isNew) {
			form.reset({
				documentNo: '',
				documentType: 'ORDER',
				vendorId: '',
				orderDate: new Date().toISOString(),
				expectedReceiptDate: new Date().toISOString(),
				currency: 'USD',
			})
		}
	}, [header, isNew, form])

	React.useEffect(() => {
		if (isNew && open) {
			setDraftLines([])
		}
	}, [isNew, open])

	const currentStatus = header?.status ?? 'DRAFT'
	const statusOptions = isNew
		? []
		: getLabeledTransitions(
				currentStatus as DocumentApprovalStatus,
				DOCUMENT_APPROVAL_TRANSITIONS,
				DOCUMENT_APPROVAL_STATUS_LABELS,
			)
	const canReceive =
		!isNew &&
		!!header &&
		(currentStatus === 'APPROVED' || currentStatus === 'COMPLETED') &&
		lines.some(
			(line) => Number(line.quantityReceived ?? 0) < Number(line.quantity ?? 0),
		)
	const canCreateInvoice =
		!isNew &&
		!!header &&
		(currentStatus === 'APPROVED' || currentStatus === 'COMPLETED') &&
		lines.some(
			(line) =>
				Number(line.quantityReceived ?? 0) > Number(line.quantityInvoiced ?? 0),
		)

	const handleTransition = React.useCallback(
		async ({ toStatus, reason }: { toStatus: string; reason?: string }) => {
			if (!recordId) return
			await transitionStatus.mutateAsync({
				id: recordId,
				toStatus,
				reason,
			})
			onClose()
		},
		[recordId, transitionStatus, onClose],
	)
	const handleReceive = React.useCallback(async () => {
		if (!header?._id) return
		await receivePurchaseOrder.mutateAsync({
			purchaseOrderId: header._id,
		})
	}, [header?._id, receivePurchaseOrder])
	const handleCreateInvoice = React.useCallback(async () => {
		if (!header?._id) return
		await createInvoiceFromOrder.mutateAsync({
			purchaseOrderId: header._id,
		})
	}, [header?._id, createInvoiceFromOrder])

	const { requestTransition, reasonDialog } = useTransitionWithReason({
		moduleId: 'replenishment',
		entityId: 'purchaseOrders',
		disabled: transitionStatus.isPending,
		getStatusLabel: (status) =>
			DOCUMENT_APPROVAL_STATUS_LABELS[status as DocumentApprovalStatus] ??
			status,
		onTransition: handleTransition,
	})

	const reportGroup = useRecordReportGroup({
		moduleId: 'replenishment',
		entityId: 'purchaseOrders',
		recordId: recordId,
		isNew,
	})

	const LinesGrid = useGrid(
		() => ({
			data: lines,
			isLoading: linesLoading,
			readOnly: false,
			enableSearch: false,
			onRowAdd: async () => {
				const firstItem = itemOptions[0]
				if (!firstItem) return null
				if (isNew) {
					setDraftLines((prev) => [
						...prev,
						{
							_id: crypto.randomUUID(),
							documentNo: '',
							lineNo: prev.length + 1,
							itemId: firstItem._id,
							description: firstItem.description ?? '',
							quantity: 1,
							unitCost: firstItem.unitCost ?? 0,
							lineAmount: firstItem.unitCost ?? 0,
							quantityReceived: 0,
							quantityInvoiced: 0,
						},
					])
					return null
				}
				const documentNo = header?.documentNo
				if (!documentNo) return null
				await createLine.mutateAsync({
					documentNo,
					itemId: firstItem._id,
					quantity: 1,
					unitCost: firstItem.unitCost ?? 0,
					lineAmount: firstItem.unitCost ?? 0,
					quantityReceived: 0,
					quantityInvoiced: 0,
				})
				return null
			},
			onRowUpdate: async (row: PurchaseLine) => {
				if (isNew) {
					setDraftLines((prev) =>
						prev.map((line) =>
							line._id === row._id ? { ...line, ...row } : line,
						),
					)
					return
				}
				await updateLine.mutateAsync({
					id: row._id,
					data: row as unknown as Record<string, unknown>,
				})
			},
			onRowDelete: async (row: PurchaseLine) => {
				if (isNew) {
					setDraftLines((prev) => prev.filter((line) => line._id !== row._id))
					return
				}
				await removeLine.mutateAsync({ id: row._id })
			},
		}),
		[
			lines,
			linesLoading,
			header?.documentNo,
			createLine,
			updateLine,
			removeLine,
			itemOptions,
			isNew,
		],
	)

	const actionGroups = React.useMemo<RecordDialogActionGroup[]>(() => {
		if (isNew) return []
		return [
			{
				label: 'Actions',
				items: [
					{
						label: receivePurchaseOrder.isPending
							? 'Receiving...'
							: 'Receive Remaining',
						onClick: () => void handleReceive(),
						disabled: !canReceive || receivePurchaseOrder.isPending,
					},
					{
						label: createInvoiceFromOrder.isPending
							? 'Creating...'
							: 'Create Invoice',
						onClick: () => void handleCreateInvoice(),
						disabled: !canCreateInvoice || createInvoiceFromOrder.isPending,
					},
				],
			},
			{
				label: 'Related',
				items: [
					{
						label: 'Vendor Card',
						onClick: () => {
							/* TODO: navigate to vendor card */
						},
						disabled: !header?.vendorId,
					},
					{
						label: 'Purchase Lines',
						onClick: () => {
							/* TODO: scroll to lines section */
						},
					},
				],
			},
			{
				label: 'Navigate',
				items: [
					{
						label: 'Vendor Ledger Entries',
						onClick: () => {
							/* TODO: navigate to vendor ledger entries */
						},
						disabled: !header?.vendorId,
					},
					{
						label: 'Posted Invoices',
						onClick: () => {
							/* TODO: navigate to posted invoices */
						},
					},
				],
			},
		...(reportGroup ? [reportGroup] : []),
		]
	}, [
		isNew,
		canReceive,
		canCreateInvoice,
		handleReceive,
		handleCreateInvoice,
		receivePurchaseOrder.isPending,
		createInvoiceFromOrder.isPending,
		header?.vendorId,
		reportGroup,
	])

	return (
		<>
			<RecordDialog
				open={open}
				onOpenChange={(next) => {
					if (!next) onClose()
				}}
				presentation={presentation}
				title={
					isNew
						? 'New Purchase Order'
						: `Purchase Order ${header?.documentNo ?? ''}`
				}
				description='Manage purchase order header and lines.'
				actionGroups={actionGroups}
				footer={
					<>
						{!isNew && (
							<Button
								variant='outline'
								size='sm'
								onClick={() => {
									void handleReceive()
								}}
								disabled={!canReceive || receivePurchaseOrder.isPending}
							>
								{receivePurchaseOrder.isPending
									? 'Receiving...'
									: 'Receive Remaining'}
							</Button>
						)}
						{!isNew && (
							<Button
								variant='outline'
								size='sm'
								onClick={() => {
									void handleCreateInvoice()
								}}
								disabled={!canCreateInvoice || createInvoiceFromOrder.isPending}
							>
								{createInvoiceFromOrder.isPending
									? 'Creating...'
									: 'Create Invoice'}
							</Button>
						)}
						<Button variant='outline' size='sm' onClick={onClose}>
							Cancel
						</Button>
						<Button
							size='sm'
							onClick={() => form.submit()}
							data-testid='purchase-order-save-button'
							disabled={
								createWithLines.isPending ||
								update.isPending ||
								receivePurchaseOrder.isPending ||
								createInvoiceFromOrder.isPending
							}
						>
							Save
						</Button>
					</>
				}
			>
				<div className='space-y-8 pt-2'>
					<Form>
						{() => (
							<FormSection title='Header'>
								<div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
									<Form.Item>
										<Form.Label>Document No.</Form.Label>
										<Form.Field
											name='documentNo'
											render={({ field }) => (
												<Form.Control>
													<Form.Input
														{...field}
														readOnly
														autoComplete='off'
														className='bg-background/50'
													/>
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
														<Form.Select.Trigger className='w-full bg-background/50'>
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
										<Form.Select
											value={currentStatus}
											onValueChange={(toStatus) => {
												if (toStatus && toStatus !== currentStatus) {
													void requestTransition(toStatus)
												}
											}}
											disabled={isNew || statusOptions.length === 0}
										>
											<Form.Select.Trigger className='w-full bg-background/50'>
												<Form.Select.Value
													placeholder={
														DOCUMENT_APPROVAL_STATUS_LABELS[
															currentStatus as DocumentApprovalStatus
														] ?? currentStatus
													}
												/>
											</Form.Select.Trigger>
											<Form.Select.Content>
												<Form.Select.Item value={currentStatus}>
													{DOCUMENT_APPROVAL_STATUS_LABELS[
														currentStatus as DocumentApprovalStatus
													] ?? currentStatus}
												</Form.Select.Item>
												{statusOptions.map((opt) => (
													<Form.Select.Item key={opt.to} value={opt.to}>
														{opt.label}
													</Form.Select.Item>
												))}
											</Form.Select.Content>
										</Form.Select>
									</Form.Item>

									<Form.Field
										name='vendorId'
										render={({ field }) => (
											<Form.Item>
												<Form.Label>Vendor</Form.Label>
												<Form.Control>
													<Form.Select
														value={field.value}
														onValueChange={field.onChange}
														items={vendorItemsMap}
													>
														<Form.Select.Trigger
															className='w-full bg-background/50'
															data-testid='purchase-order-vendor-select'
														>
															<Form.Select.Value placeholder='Select vendor' />
														</Form.Select.Trigger>
														<Form.Select.Content>
															{vendorOptions.map((vendor) => (
																<Form.Select.Item
																	key={vendor._id}
																	value={vendor._id}
																>
																	{vendor.name ?? 'Unnamed vendor'}
																	{vendor.vendorNo
																		? ` (${vendor.vendorNo})`
																		: ''}
																</Form.Select.Item>
															))}
														</Form.Select.Content>
													</Form.Select>
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
														className='bg-background/50'
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
														className='bg-background/50'
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
														className='bg-background/50'
													/>
												</Form.Control>
											)}
										/>
									</Form.Item>
								</div>
							</FormSection>
						)}
					</Form>

					{(isNew || header) && (
						<FormSection title='Purchase Lines'>
							<div className='overflow-hidden rounded-xl border border-border/50 bg-background/50 shadow-sm backdrop-blur-xl'>
								<LinesGrid variant='flat' height={320}>
									<LinesGrid.Columns>
										<LinesGrid.Column<PurchaseLine>
											accessorKey='lineNo'
											title='Line No.'
											cellVariant='number'
										/>
										<LinesGrid.Column<PurchaseLine>
											accessorKey='itemId'
											title='Item'
											cellVariant='select'
											opts={{
												options: itemOptions.map((item) => ({
													value: item._id,
													label: `${item.itemNo ?? item._id} - ${
														item.description ?? ''
													}`,
												})),
											}}
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
						</FormSection>
					)}
				</div>
			</RecordDialog>
			{reasonDialog}
		</>
	)
}
