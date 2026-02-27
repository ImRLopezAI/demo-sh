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
import { useModuleData, useModuleList } from '../../../hooks/use-data'
import { FormSection } from '../../_shared/form-section'
import { RecordDialog } from '../../_shared/record-dialog'
import { useTransitionWithReason } from '../../_shared/transition-reason'
import { useEntityMutations, useEntityRecord } from '../../_shared/use-entity'

interface SalesOrderHeader {
	_id: string
	documentNo: string
	documentType: 'ORDER' | 'RETURN_ORDER' | 'QUOTE'
	status: DocumentApprovalStatus
	customerId: string
	orderDate: string
	currency: string
	externalRef: string
	lineCount: number
	totalAmount: number
}

interface SalesLine {
	_id: string
	documentNo: string
	lineNo: number
	itemId: string
	description: string
	quantity: number
	unitPrice: number
	discountPercent: number
	lineAmount: number
}

interface CustomerOption {
	_id: string
	customerNo?: string
	name?: string
}

interface ItemOption {
	_id: string
	itemNo?: string
	description?: string
	unitPrice?: number
}

interface SalesOrderCreateInput {
	documentNo: string
	documentType: 'ORDER' | 'RETURN_ORDER' | 'QUOTE'
	status: 'DRAFT'
	customerId: string
	orderDate: string
	currency: string
	externalRef: string
}

const DOCUMENT_TYPES = ['ORDER', 'RETURN_ORDER', 'QUOTE'] as const
type SalesOrderCardPresentation = 'dialog' | 'page'

export function SalesOrderCard({
	selectedId,
	onClose,
	onCreated,
	presentation = 'dialog',
}: {
	selectedId: string | null
	onClose: () => void
	onCreated?: (id: string) => void
	presentation?: SalesOrderCardPresentation
}) {
	const isNew = selectedId === 'new'
	const isOpen = selectedId !== null

	const { data: record, isLoading: recordLoading } = useEntityRecord(
		'market',
		'salesOrders',
		selectedId,
		{ enabled: !isNew && isOpen },
	)

	const { update, transitionStatus } = useEntityMutations(
		'market',
		'salesOrders',
	)

	const {
		create: createLine,
		update: updateLine,
		remove: removeLine,
	} = useEntityMutations('market', 'salesLines')
	const queryClient = useQueryClient()

	const invalidateSalesOrderQueries = React.useCallback(() => {
		queryClient.invalidateQueries({
			queryKey: $rpc.market.salesOrders.key(),
		})
		queryClient.invalidateQueries({
			queryKey: $rpc.market.salesLines.key(),
		})
	}, [queryClient])

	const createWithLines = useMutation({
		...$rpc.market.salesOrders.createWithLines.mutationOptions({
			onSuccess: invalidateSalesOrderQueries,
		}),
	})
	const submitForApproval = useMutation({
		...$rpc.market.salesOrders.submitForApproval.mutationOptions({
			onSuccess: invalidateSalesOrderQueries,
		}),
	})
	const cancelWithRelease = useMutation({
		...$rpc.market.salesOrders.cancelWithRelease.mutationOptions({
			onSuccess: invalidateSalesOrderQueries,
		}),
	})

	const { data: customersList } = useModuleList('market', 'customers', {
		limit: 100,
	})

	const { data: itemsList } = useModuleList('market', 'items', {
		limit: 100,
	})
	const customerOptions = (customersList?.items ?? []) as CustomerOption[]
	const itemOptions = (itemsList?.items ?? []) as ItemOption[]
	const lineFilters = React.useMemo(
		() => ({
			documentNo:
				(record as SalesOrderHeader | undefined)?.documentNo ?? '__none__',
		}),
		[(record as SalesOrderHeader | undefined)?.documentNo],
	)

	const { items: allLines, isLoading: linesLoading } = useModuleData<
		'market',
		SalesLine
	>('market', 'salesLines', 'overview', { filters: lineFilters })

	const newRecordDefaults = React.useMemo(
		() => ({
			documentNo: '',
			documentType: 'ORDER' as const,
			status: 'DRAFT' as const,
			customerId: '',
			orderDate: new Date().toISOString(),
			currency: 'USD',
			externalRef: '',
		}),
		[],
	)

	const resolvedRecord = React.useMemo(
		() => (isNew ? newRecordDefaults : record),
		[isNew, newRecordDefaults, record],
	)
	const [draftLines, setDraftLines] = React.useState<SalesLine[]>([])

	const [Form, form] = useCreateForm<SalesOrderCreateInput>(
		() => ({
			defaultValues: (resolvedRecord ?? {}) as SalesOrderCreateInput,
			onSubmit: async (data) => {
				if (isNew) {
					if (draftLines.length === 0) {
						throw new Error('Add at least one order line before saving')
					}

					const created = await createWithLines.mutateAsync({
						header: {
							documentType: data.documentType,
							status: 'DRAFT',
							customerId: data.customerId,
							orderDate: data.orderDate,
							currency: data.currency,
							externalRef: data.externalRef || undefined,
						},
						lines: draftLines.map((line, index) => ({
							lineNo: line.lineNo || index + 1,
							itemId: line.itemId,
							quantity: line.quantity,
							unitPrice: line.unitPrice,
							discountPercent: line.discountPercent,
							lineAmount: line.lineAmount,
						})),
					})

					const createdOrder = created.header
					if (onCreated && createdOrder?._id) {
						onCreated(createdOrder._id)
					} else {
						onClose()
					}
				} else if (selectedId) {
					await update.mutateAsync({
						id: selectedId,
						data: data as unknown as Record<string, unknown>,
					})
					onClose()
				}
			},
		}),
		[
			resolvedRecord,
			isNew,
			selectedId,
			draftLines,
			createWithLines,
			update,
			onCreated,
			onClose,
		],
	)

	React.useEffect(() => {
		if (!isOpen) return
		form.reset((resolvedRecord ?? {}) as SalesOrderCreateInput)
	}, [resolvedRecord, form, isOpen])
	React.useEffect(() => {
		if (isNew && isOpen) {
			setDraftLines([])
		}
	}, [isNew, isOpen])

	const lines = React.useMemo(() => {
		if (isNew) return draftLines
		return allLines
	}, [allLines, isNew, draftLines])

	const handleTransition = React.useCallback(
		async ({ toStatus, reason }: { toStatus: string; reason?: string }) => {
			if (!selectedId || isNew) return
			if (toStatus === 'PENDING_APPROVAL') {
				await submitForApproval.mutateAsync({ id: selectedId })
				onClose()
				return
			}
			if (toStatus === 'CANCELED') {
				await cancelWithRelease.mutateAsync({
					id: selectedId,
					reason,
				})
				onClose()
				return
			}
			await transitionStatus.mutateAsync({
				id: selectedId,
				toStatus,
				reason,
			})
			onClose()
		},
		[
			selectedId,
			isNew,
			submitForApproval,
			cancelWithRelease,
			transitionStatus,
			onClose,
		],
	)

	const { requestTransition, reasonDialog } = useTransitionWithReason({
		moduleId: 'market',
		entityId: 'salesOrders',
		disabled:
			transitionStatus.isPending ||
			submitForApproval.isPending ||
			cancelWithRelease.isPending,
		onTransition: handleTransition,
	})

	const currentStatus = (resolvedRecord as SalesOrderHeader | undefined)?.status
	const statusOptions = currentStatus
		? getLabeledTransitions(
				currentStatus as DocumentApprovalStatus,
				DOCUMENT_APPROVAL_TRANSITIONS,
				DOCUMENT_APPROVAL_STATUS_LABELS,
			)
		: []

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
							unitPrice: firstItem.unitPrice ?? 0,
							discountPercent: 0,
							lineAmount: firstItem.unitPrice ?? 0,
						},
					])
					return null
				}
				const documentNo = (resolvedRecord as SalesOrderHeader | undefined)
					?.documentNo
				if (!documentNo) return null
				await createLine.mutateAsync({
					documentNo,
					itemId: firstItem._id,
					quantity: 1,
					unitPrice: firstItem.unitPrice ?? 0,
					discountPercent: 0,
					lineAmount: firstItem.unitPrice ?? 0,
				})
				return null
			},
			onRowUpdate: async (row: SalesLine) => {
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
			onRowDelete: async (row: SalesLine) => {
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
			resolvedRecord,
			createLine,
			updateLine,
			removeLine,
			itemOptions,
			isNew,
		],
	)

	const dialogTitle = isNew
		? 'New Sales Order'
		: `Sales Order ${(resolvedRecord as SalesOrderHeader | undefined)?.documentNo ?? ''}`

	if (!isOpen) {
		return <>{reasonDialog}</>
	}

	const footerActions = (
		<>
			<Button
				variant='outline'
				size='sm'
				onClick={onClose}
				className='shadow-sm transition-all hover:shadow-md'
			>
				Cancel
			</Button>
			<Button
				size='sm'
				onClick={() => form.submit()}
				data-testid='sales-order-save-button'
				disabled={
					createWithLines.isPending ||
					update.isPending ||
					submitForApproval.isPending ||
					cancelWithRelease.isPending
				}
				className='shadow-sm transition-all hover:shadow-md'
			>
				Save
			</Button>
		</>
	)

	const cardBody =
		recordLoading && !isNew ? (
			<div className='space-y-4'>
				{['skeleton-1', 'skeleton-2', 'skeleton-3', 'skeleton-4'].map(
					(skeletonKey) => (
						<div
							key={skeletonKey}
							className='h-12 rounded-lg bg-muted/50 motion-safe:animate-pulse'
						/>
					),
				)}
			</div>
		) : (
			<div className='space-y-8 pt-2'>
				<Form>
					{() => (
						<>
							<FormSection title='Header'>
								<div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
									<Form.Field
										name='documentNo'
										render={({ field }) => (
											<Form.Item>
												<Form.Label>Document No.</Form.Label>
												<Form.Control>
													<Form.Input
														{...field}
														value={(field.value as string) ?? ''}
														readOnly
														placeholder='Auto-generated\u2026'
														autoComplete='off'
														className='bg-background/50'
													/>
												</Form.Control>
											</Form.Item>
										)}
									/>
									<Form.Field
										name='documentType'
										render={({ field }) => (
											<Form.Item>
												<Form.Label>Document Type</Form.Label>
												<Form.Control>
													<Form.Select
														value={field.value as string}
														onValueChange={field.onChange}
													>
														<Form.Select.Trigger className='w-full bg-background/50'>
															<Form.Select.Value />
														</Form.Select.Trigger>
														<Form.Select.Content>
															{DOCUMENT_TYPES.map((type) => (
																<Form.Select.Item key={type} value={type}>
																	{type.replace(/_/g, ' ')}
																</Form.Select.Item>
															))}
														</Form.Select.Content>
													</Form.Select>
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
													<Form.Select
														value={(field.value as string) ?? ''}
														onValueChange={(toStatus) => {
															if (toStatus && toStatus !== field.value) {
																void requestTransition(toStatus)
															}
														}}
														disabled={isNew || statusOptions.length === 0}
													>
														<Form.Select.Trigger className='w-full bg-background/50'>
															<Form.Select.Value
																placeholder={
																	DOCUMENT_APPROVAL_STATUS_LABELS[
																		(field.value as DocumentApprovalStatus) ??
																			'DRAFT'
																	] ?? String(field.value ?? 'DRAFT')
																}
															/>
														</Form.Select.Trigger>
														<Form.Select.Content>
															<Form.Select.Item
																value={(field.value as string) ?? 'DRAFT'}
															>
																{DOCUMENT_APPROVAL_STATUS_LABELS[
																	(field.value as DocumentApprovalStatus) ??
																		'DRAFT'
																] ?? String(field.value ?? 'DRAFT')}
															</Form.Select.Item>
															{statusOptions.map((opt) => (
																<Form.Select.Item key={opt.to} value={opt.to}>
																	{opt.label}
																</Form.Select.Item>
															))}
														</Form.Select.Content>
													</Form.Select>
												</Form.Control>
											</Form.Item>
										)}
									/>
									<Form.Field
										name='customerId'
										render={({ field }) => (
											<Form.Item>
												<Form.Label>Customer</Form.Label>
												<Form.Control>
													<Form.Select
														value={field.value as string}
														onValueChange={field.onChange}
													>
														<Form.Select.Trigger
															className='w-full bg-background/50'
															data-testid='sales-order-customer-select'
														>
															<Form.Select.Value placeholder='Select customer' />
														</Form.Select.Trigger>
														<Form.Select.Content>
															{customerOptions.map((customer) => (
																<Form.Select.Item
																	key={customer._id}
																	value={customer._id}
																>
																	{customer.name ?? 'Unnamed customer'}
																	{customer.customerNo
																		? ` (${customer.customerNo})`
																		: ''}
																</Form.Select.Item>
															))}
														</Form.Select.Content>
													</Form.Select>
												</Form.Control>
											</Form.Item>
										)}
									/>
									<Form.Field
										name='orderDate'
										render={({ field }) => (
											<Form.Item>
												<Form.Label>Order Date</Form.Label>
												<Form.Control>
													<Form.DatePicker
														value={field.value as string}
														onValueChange={(date) =>
															field.onChange(date?.toISOString() ?? '')
														}
														placeholder='Select date\u2026'
														className='bg-background/50'
													/>
												</Form.Control>
											</Form.Item>
										)}
									/>
									<Form.Field
										name='currency'
										render={({ field }) => (
											<Form.Item>
												<Form.Label>Currency</Form.Label>
												<Form.Control>
													<Form.Input
														{...field}
														value={(field.value as string) ?? ''}
														placeholder='USD\u2026'
														autoComplete='off'
														className='bg-background/50'
													/>
												</Form.Control>
											</Form.Item>
										)}
									/>
									<Form.Field
										name='externalRef'
										render={({ field }) => (
											<Form.Item className='col-span-1 md:col-span-2 lg:col-span-3'>
												<Form.Label>External Reference</Form.Label>
												<Form.Control>
													<Form.Input
														{...field}
														value={(field.value as string) ?? ''}
														placeholder='External ref\u2026'
														autoComplete='off'
														className='bg-background/50'
													/>
												</Form.Control>
											</Form.Item>
										)}
									/>
								</div>
							</FormSection>

							<FormSection title='Order Lines'>
								<div className='overflow-hidden rounded-lg border border-border/50 bg-background/50 shadow-sm backdrop-blur-xl'>
									<LinesGrid variant='compact' height={300}>
										<LinesGrid.Columns>
											<LinesGrid.Column
												accessorKey='lineNo'
												title='Line No.'
												cellVariant='number'
											/>
											<LinesGrid.Column
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
											<LinesGrid.Column
												accessorKey='quantity'
												title='Quantity'
												cellVariant='number'
											/>
											<LinesGrid.Column
												accessorKey='unitPrice'
												title='Unit Price'
												cellVariant='number'
												formatter={(v, f) => f.currency(v.unitPrice)}
											/>
											<LinesGrid.Column
												accessorKey='discountPercent'
												title='Discount %'
												cellVariant='number'
												formatter={(v, f) => f.percent(v.discountPercent)}
											/>
											<LinesGrid.Column
												accessorKey='lineAmount'
												title='Line Amount'
												cellVariant='number'
												formatter={(v, f) => f.currency(v.lineAmount)}
											/>
										</LinesGrid.Columns>
									</LinesGrid>
								</div>
							</FormSection>
						</>
					)}
				</Form>
			</div>
		)

	return (
		<>
			<RecordDialog
				open={isOpen}
				onOpenChange={(open) => !open && onClose()}
				title={dialogTitle}
				description='Sales order header and line details'
				footer={footerActions}
				presentation={presentation}
			>
				{cardBody}
			</RecordDialog>
			{reasonDialog}
		</>
	)
}
