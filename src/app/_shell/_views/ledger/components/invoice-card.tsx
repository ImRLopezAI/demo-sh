import { $rpc, useMutation, useQueryClient } from '@lib/rpc'
import * as React from 'react'
import { useGrid } from '@/components/data-grid/compound'
import { Button } from '@/components/ui/button'
import { useCreateForm } from '@/components/ui/form'
import { useModuleData, useModuleList } from '../../../hooks/use-data'
import { FormSection } from '../../_shared/form-section'
import { RecordDialog } from '../../_shared/record-dialog'
import { StatusBadge } from '../../_shared/status-badge'
import { useTransitionWithReason } from '../../_shared/transition-reason'
import { useEntityMutations, useEntityRecord } from '../../_shared/use-entity'

interface InvoiceCardProps {
	selectedId: string | null
	onClose: () => void
}

interface InvoiceFormValues {
	invoiceNo: string
	customerId: string
	salesOrderNo: string
	postingDate: string
	dueDate: string
	currency: string
}

interface SalesInvoiceHeader {
	_id: string
	invoiceNo: string
	status: 'DRAFT' | 'POSTED' | 'REVERSED'
	eInvoiceStatus:
		| 'DRAFT'
		| 'POSTED'
		| 'SUBMITTED'
		| 'ACCEPTED'
		| 'REJECTED'
		| 'CANCELED'
	customerId: string
	salesOrderNo?: string
	postingDate?: string
	dueDate?: string
	currency?: string
}

interface SalesInvoiceLine {
	_id: string
	invoiceNo: string
	lineNo: number
	itemId: string
	itemDescription?: string
	quantity: number
	unitPrice: number
	lineAmount: number
}

const STATUS_TRANSITIONS: Record<string, { label: string; to: string }[]> = {
	DRAFT: [{ label: 'Post', to: 'POSTED' }],
	POSTED: [{ label: 'Reverse', to: 'REVERSED' }],
	REVERSED: [],
}

export function InvoiceCard({ selectedId, onClose }: InvoiceCardProps) {
	const isNew = selectedId === 'new'
	const open = selectedId !== null

	const { data: record, isLoading: recordLoading } = useEntityRecord(
		'ledger',
		'invoices',
		selectedId,
		{ enabled: !isNew && !!selectedId },
	)
	const invoice = record as SalesInvoiceHeader | undefined

	const { create, update, transitionStatus } = useEntityMutations(
		'ledger',
		'invoices',
	)
	const {
		create: createLine,
		update: updateLine,
		remove: removeLine,
	} = useEntityMutations('ledger', 'invoiceLines')

	const queryClient = useQueryClient()
	const postInvoice = useMutation({
		...$rpc.ledger.invoices.postInvoice.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: $rpc.ledger.invoices.key(),
				})
				queryClient.invalidateQueries({
					queryKey: $rpc.ledger.invoiceLines.key(),
				})
				queryClient.invalidateQueries({
					queryKey: $rpc.ledger.customerLedger.key(),
				})
				queryClient.invalidateQueries({
					queryKey: $rpc.ledger.glEntries.key(),
				})
			},
		}),
	})
	const submitEInvoice = useMutation({
		...$rpc.ledger.eInvoicing.submit.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: $rpc.ledger.invoices.key(),
				})
				queryClient.invalidateQueries({
					queryKey: $rpc.ledger.eInvoiceSubmissions.key(),
				})
			},
		}),
	})

	const { data: customersList } = useModuleList('market', 'customers', {
		limit: 100,
	})
	const { data: itemsList } = useModuleList('market', 'items', {
		limit: 100,
	})
	const lineFilters = React.useMemo(
		() => ({ invoiceNo: invoice?.invoiceNo ?? '__none__' }),
		[invoice?.invoiceNo],
	)

	const { items: linesFromApi, isLoading: linesLoading } = useModuleData<
		'ledger',
		SalesInvoiceLine
	>('ledger', 'invoiceLines', 'overview', { filters: lineFilters })
	const [draftLines, setDraftLines] = React.useState<SalesInvoiceLine[]>([])

	const [Form, form] = useCreateForm<InvoiceFormValues>(
		() => ({
			defaultValues: {
				invoiceNo: invoice?.invoiceNo ?? '',
				customerId: invoice?.customerId ?? '',
				salesOrderNo: invoice?.salesOrderNo ?? '',
				postingDate: invoice?.postingDate ?? '',
				dueDate: invoice?.dueDate ?? '',
				currency: invoice?.currency ?? 'USD',
			},
			onSubmit: async (data) => {
				if (isNew) {
					const createdInvoice = await create.mutateAsync({
						customerId: data.customerId,
						salesOrderNo: data.salesOrderNo || undefined,
						postingDate: data.postingDate || undefined,
						dueDate: data.dueDate || undefined,
						currency: data.currency || 'USD',
					})

					const createdInvoiceNo = createdInvoice?.invoiceNo
					if (createdInvoiceNo && draftLines.length > 0) {
						for (const [index, line] of draftLines.entries()) {
							await createLine.mutateAsync({
								invoiceNo: createdInvoiceNo,
								lineNo: line.lineNo || index + 1,
								itemId: line.itemId,
								itemDescription: line.itemDescription,
								quantity: line.quantity,
								unitPrice: line.unitPrice,
								lineAmount: line.lineAmount,
							})
						}
					}
				} else if (selectedId) {
					await update.mutateAsync({
						id: selectedId,
						data: {
							customerId: data.customerId,
							salesOrderNo: data.salesOrderNo || undefined,
							postingDate: data.postingDate || undefined,
							dueDate: data.dueDate || undefined,
							currency: data.currency || 'USD',
						},
					})
				}
				onClose()
			},
		}),
		[
			invoice,
			isNew,
			selectedId,
			draftLines,
			createLine,
			create,
			update,
			onClose,
		],
	)

	React.useEffect(() => {
		if (invoice && !isNew) {
			form.reset({
				invoiceNo: invoice.invoiceNo ?? '',
				customerId: invoice.customerId ?? '',
				salesOrderNo: invoice.salesOrderNo ?? '',
				postingDate: invoice.postingDate ?? '',
				dueDate: invoice.dueDate ?? '',
				currency: invoice.currency ?? 'USD',
			})
		} else if (isNew) {
			form.reset({
				invoiceNo: '',
				customerId: '',
				salesOrderNo: '',
				postingDate: '',
				dueDate: '',
				currency: 'USD',
			})
		}
	}, [invoice, isNew, form])

	React.useEffect(() => {
		if (isNew && open) {
			setDraftLines([])
		}
	}, [isNew, open])

	const lines = React.useMemo(() => {
		if (isNew) return draftLines
		return linesFromApi
	}, [isNew, draftLines, linesFromApi])

	const currentStatus = invoice?.status ?? 'DRAFT'
	const currentEInvoiceStatus = invoice?.eInvoiceStatus ?? 'DRAFT'
	const transitions = STATUS_TRANSITIONS[currentStatus] ?? []
	const canEditLines = currentStatus === 'DRAFT'

	const handleTransition = React.useCallback(
		async ({ toStatus, reason }: { toStatus: string; reason?: string }) => {
			if (!selectedId || isNew) return
			if (toStatus === 'POSTED') {
				await postInvoice.mutateAsync({ id: selectedId })
				return
			}
			await transitionStatus.mutateAsync({
				id: selectedId,
				toStatus,
				reason,
			})
		},
		[selectedId, isNew, postInvoice, transitionStatus],
	)

	const { requestTransition, reasonDialog } = useTransitionWithReason({
		moduleId: 'ledger',
		entityId: 'invoices',
		disabled: transitionStatus.isPending || postInvoice.isPending,
		onTransition: handleTransition,
	})

	const LinesGrid = useGrid(
		() => ({
			data: lines,
			isLoading: linesLoading,
			readOnly: !canEditLines,
			enableSearch: false,
			onRowAdd: async () => {
				if (!canEditLines) return null
				const firstItem = itemsList?.items?.[0]
				if (!firstItem) return null

				if (isNew) {
					setDraftLines((prev) => [
						...prev,
						{
							_id: crypto.randomUUID(),
							invoiceNo: '',
							lineNo: prev.length + 1,
							itemId: firstItem._id as string,
							itemDescription:
								(firstItem.description as string | undefined) ?? '',
							quantity: 1,
							unitPrice: Number(firstItem.unitPrice ?? 0),
							lineAmount: Number(firstItem.unitPrice ?? 0),
						},
					])
					return null
				}

				if (!invoice?.invoiceNo) return null
				await createLine.mutateAsync({
					invoiceNo: invoice.invoiceNo,
					lineNo: lines.length + 1,
					itemId: firstItem._id as string,
					itemDescription: (firstItem.description as string | undefined) ?? '',
					quantity: 1,
					unitPrice: Number(firstItem.unitPrice ?? 0),
					lineAmount: Number(firstItem.unitPrice ?? 0),
				})
				return null
			},
			onRowUpdate: async (row: SalesInvoiceLine) => {
				if (!canEditLines) return
				const selectedItem = (itemsList?.items ?? []).find(
					(item) => item._id === row.itemId,
				)
				const quantity = Number(row.quantity ?? 0)
				const unitPrice = Number(row.unitPrice ?? 0)
				const lineAmount = Number(row.lineAmount ?? quantity * unitPrice)
				const normalizedLine: SalesInvoiceLine = {
					...row,
					quantity,
					unitPrice,
					lineAmount,
					itemDescription:
						row.itemDescription ??
						(selectedItem?.description as string | undefined) ??
						'',
				}

				if (isNew) {
					setDraftLines((prev) =>
						prev.map((line) =>
							line._id === normalizedLine._id ? normalizedLine : line,
						),
					)
					return
				}
				await updateLine.mutateAsync({
					id: normalizedLine._id,
					data: normalizedLine as unknown as Record<string, unknown>,
				})
			},
			onRowDelete: async (row: SalesInvoiceLine) => {
				if (!canEditLines) return
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
			canEditLines,
			isNew,
			invoice?.invoiceNo,
			itemsList?.items,
			createLine,
			updateLine,
			removeLine,
		],
	)

	return (
		<>
			<RecordDialog
				open={open}
				onOpenChange={(isOpen) => {
					if (!isOpen) onClose()
				}}
				title={isNew ? 'New Invoice' : `Invoice ${invoice?.invoiceNo ?? ''}`}
				description={
					isNew
						? 'Create a new sales invoice.'
						: 'View and edit invoice details.'
				}
				footer={
					<>
						{!isNew &&
							transitions.length > 0 &&
							transitions.map((transition) => (
								<Button
									key={transition.to}
									variant='outline'
									size='sm'
									onClick={() => {
										void requestTransition(transition.to)
									}}
									disabled={transitionStatus.isPending || postInvoice.isPending}
									className='shadow-sm transition-all hover:shadow-md'
								>
									{postInvoice.isPending && transition.to === 'POSTED'
										? 'Posting...'
										: transition.label}
								</Button>
							))}
						<Button
							variant='outline'
							size='sm'
							onClick={onClose}
							className='shadow-sm transition-all hover:shadow-md'
						>
							Cancel
						</Button>
						{!isNew && currentStatus === 'POSTED' && (
							<Button
								variant='outline'
								size='sm'
								onClick={() => {
									if (!selectedId) return
									void submitEInvoice.mutateAsync({
										documentType: 'INVOICE',
										id: selectedId,
									})
								}}
								disabled={
									submitEInvoice.isPending ||
									currentEInvoiceStatus === 'SUBMITTED' ||
									currentEInvoiceStatus === 'ACCEPTED'
								}
								className='shadow-sm transition-all hover:shadow-md'
							>
								{submitEInvoice.isPending
									? 'Submitting...'
									: 'Submit E-Invoice'}
							</Button>
						)}
						<Button
							size='sm'
							onClick={() => form.submit()}
							className='shadow-sm transition-all hover:shadow-md'
						>
							{isNew ? 'Create' : 'Save'}
						</Button>
					</>
				}
			>
				{recordLoading && !isNew ? (
					<div className='space-y-4'>
						{[
							'invoice-skeleton-1',
							'invoice-skeleton-2',
							'invoice-skeleton-3',
							'invoice-skeleton-4',
						].map((skeletonKey) => (
							<div
								key={skeletonKey}
								className='h-12 rounded-lg bg-muted/50 motion-safe:animate-pulse'
							/>
						))}
					</div>
				) : (
					<Form>
						{() => (
							<div className='space-y-8 pt-2'>
								<FormSection title='Header'>
									<div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
										{!isNew && (
											<Form.Field
												name='invoiceNo'
												render={({ field }) => (
													<Form.Item>
														<Form.Label>Invoice No.</Form.Label>
														<Form.Control
															render={
																<Form.Input
																	{...field}
																	readOnly
																	className='bg-muted/50'
																	autoComplete='off'
																/>
															}
														/>
													</Form.Item>
												)}
											/>
										)}

										{!isNew && (
											<div className='flex items-end'>
												<StatusBadge status={currentStatus} />
											</div>
										)}
										{!isNew && (
											<div className='flex items-end'>
												<StatusBadge status={currentEInvoiceStatus} />
											</div>
										)}

										<Form.Field
											name='customerId'
											rules={{ required: 'Customer is required' }}
											render={({ field }) => (
												<Form.Item>
													<Form.Label>Customer</Form.Label>
													<Form.Control>
														<Form.Combo
															value={field.value as string}
															onValueChange={field.onChange}
														>
															<Form.Combo.Input
																showClear
																placeholder='Search customers...'
																className='bg-background/50'
															/>
															<Form.Combo.Content>
																<Form.Combo.List>
																	{(customersList?.items ?? []).map(
																		(c: Record<string, unknown>) => (
																			<Form.Combo.Item
																				key={c._id as string}
																				value={c._id as string}
																			>
																				{c.customerNo as string} -{' '}
																				{c.name as string}
																			</Form.Combo.Item>
																		),
																	)}
																	<Form.Combo.Empty>
																		No customers found
																	</Form.Combo.Empty>
																</Form.Combo.List>
															</Form.Combo.Content>
														</Form.Combo>
													</Form.Control>
													<Form.Message />
												</Form.Item>
											)}
										/>

										<Form.Field
											name='salesOrderNo'
											render={({ field }) => (
												<Form.Item>
													<Form.Label>Sales Order No.</Form.Label>
													<Form.Control
														render={
															<Form.Input
																{...field}
																placeholder='Sales order reference...'
																autoComplete='off'
																className='bg-background/50'
															/>
														}
													/>
												</Form.Item>
											)}
										/>

										<Form.Field
											name='postingDate'
											render={({ field }) => (
												<Form.Item>
													<Form.Label>Posting Date</Form.Label>
													<Form.Control
														render={
															<Form.DatePicker
																value={field.value}
																onValueChange={(date) =>
																	field.onChange(date ? date.toISOString() : '')
																}
																placeholder='Select posting date...'
																className='bg-background/50'
															/>
														}
													/>
												</Form.Item>
											)}
										/>

										<Form.Field
											name='dueDate'
											render={({ field }) => (
												<Form.Item>
													<Form.Label>Due Date</Form.Label>
													<Form.Control
														render={
															<Form.DatePicker
																value={field.value}
																onValueChange={(date) =>
																	field.onChange(date ? date.toISOString() : '')
																}
																placeholder='Select due date...'
																className='bg-background/50'
															/>
														}
													/>
												</Form.Item>
											)}
										/>

										<Form.Field
											name='currency'
											render={({ field }) => (
												<Form.Item>
													<Form.Label>Currency</Form.Label>
													<Form.Control
														render={
															<Form.Input
																{...field}
																placeholder='USD...'
																autoComplete='off'
																className='bg-background/50'
															/>
														}
													/>
												</Form.Item>
											)}
										/>
									</div>
								</FormSection>

								{(isNew || invoice) && (
									<FormSection title='Lines'>
										<div className='space-y-3'>
											{!canEditLines && !isNew && (
												<p className='text-muted-foreground text-xs'>
													Invoice lines are locked after posting.
												</p>
											)}
											<div className='overflow-hidden rounded-xl border border-border/50 bg-background/50 shadow-sm backdrop-blur-xl'>
												<LinesGrid variant='flat' height={300}>
													<LinesGrid.Header className='border-border/50 border-b bg-muted/20 px-6 py-4'>
														<LinesGrid.Toolbar filter sort />
													</LinesGrid.Header>
													<LinesGrid.Columns>
														<LinesGrid.Column<SalesInvoiceLine>
															accessorKey='lineNo'
															title='Line No.'
															cellVariant='number'
														/>
														<LinesGrid.Column<SalesInvoiceLine>
															accessorKey='itemId'
															title='Item'
															cellVariant='select'
															opts={{
																options: (itemsList?.items ?? []).map(
																	(item) => ({
																		value: item._id as string,
																		label: `${item.itemNo as string} - ${
																			item.description as string
																		}`,
																	}),
																),
															}}
														/>
														<LinesGrid.Column<SalesInvoiceLine>
															accessorKey='itemDescription'
															title='Description'
														/>
														<LinesGrid.Column<SalesInvoiceLine>
															accessorKey='quantity'
															title='Quantity'
															cellVariant='number'
														/>
														<LinesGrid.Column<SalesInvoiceLine>
															accessorKey='unitPrice'
															title='Unit Price'
															cellVariant='number'
														/>
														<LinesGrid.Column<SalesInvoiceLine>
															accessorKey='lineAmount'
															title='Line Amount'
															cellVariant='number'
														/>
													</LinesGrid.Columns>
												</LinesGrid>
											</div>
										</div>
									</FormSection>
								)}

								{!isNew && (
									<FormSection title='Status'>
										<div className='space-y-6'>
											<div className='space-y-2'>
												<p className='font-medium text-sm'>Current Status</p>
												<StatusBadge status={currentStatus} />
											</div>

											{transitions.length > 0 && (
												<div className='space-y-2'>
													<p className='font-medium text-sm'>Transition to</p>
													<div className='flex flex-wrap gap-2'>
														{transitions.map((transition) => (
															<Button
																key={transition.to}
																variant='outline'
																onClick={() => {
																	void requestTransition(transition.to)
																}}
																disabled={
																	transitionStatus.isPending ||
																	postInvoice.isPending
																}
																className='shadow-sm transition-all hover:shadow-md'
															>
																{postInvoice.isPending &&
																transition.to === 'POSTED'
																	? 'Posting...'
																	: transition.label}
															</Button>
														))}
													</div>
												</div>
											)}

											{transitions.length === 0 && (
												<p className='text-muted-foreground text-sm'>
													This invoice has been {currentStatus.toLowerCase()}.
													No further transitions are available.
												</p>
											)}
										</div>
									</FormSection>
								)}
							</div>
						)}
					</Form>
				)}
			</RecordDialog>
			{reasonDialog}
		</>
	)
}
