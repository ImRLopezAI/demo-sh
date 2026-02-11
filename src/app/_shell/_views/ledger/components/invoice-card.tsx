import * as React from 'react'
import { useGrid } from '@/components/data-grid/compound'
import { Button } from '@/components/ui/button'
import { useCreateForm } from '@/components/ui/form'
import { useModuleData, useModuleList } from '../../../hooks/use-data'
import { FormSection } from '../../_shared/form-section'
import { RecordDialog } from '../../_shared/record-dialog'
import { StatusBadge } from '../../_shared/status-badge'
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

interface SalesInvoiceLine {
	_id: string
	invoiceNo: string
	lineNo: number
	itemId: string
	description: string
	quantity: number
	unitPrice: number
	lineAmount: number
}

const STATUS_TRANSITIONS: Record<string, { label: string; to: string }[]> = {
	DRAFT: [{ label: 'Post', to: 'POSTED' }],
	POSTED: [],
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

	const { create, update, transitionStatus } = useEntityMutations(
		'ledger',
		'invoices',
	)

	const { data: customersList } = useModuleList('market', 'customers', {
		limit: 100,
	})

	const { items: lines, isLoading: linesLoading } = useModuleData<
		'ledger',
		SalesInvoiceLine
	>('ledger', 'invoiceLines', record?.invoiceNo ?? '__none__')

	const [Form, form] = useCreateForm<InvoiceFormValues>(
		() => ({
			defaultValues: {
				invoiceNo: record?.invoiceNo ?? '',
				customerId: record?.customerId ?? '',
				salesOrderNo: record?.salesOrderNo ?? '',
				postingDate: record?.postingDate ?? '',
				dueDate: record?.dueDate ?? '',
				currency: record?.currency ?? 'USD',
			},
			onSubmit: async (data) => {
				if (isNew) {
					await create.mutateAsync({
						customerId: data.customerId,
						salesOrderNo: data.salesOrderNo || undefined,
						postingDate: data.postingDate || undefined,
						dueDate: data.dueDate || undefined,
						currency: data.currency || 'USD',
					})
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
		[record, isNew, selectedId],
	)

	React.useEffect(() => {
		if (record && !isNew) {
			form.reset({
				invoiceNo: record.invoiceNo ?? '',
				customerId: record.customerId ?? '',
				salesOrderNo: record.salesOrderNo ?? '',
				postingDate: record.postingDate ?? '',
				dueDate: record.dueDate ?? '',
				currency: record.currency ?? 'USD',
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
	}, [record, isNew, form])

	const handleTransition = async (toStatus: string) => {
		if (!selectedId || isNew) return
		await transitionStatus.mutateAsync({
			id: selectedId,
			toStatus,
		})
	}

	const currentStatus = record?.status ?? 'DRAFT'
	const transitions = STATUS_TRANSITIONS[currentStatus] ?? []

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
			onOpenChange={(isOpen) => {
				if (!isOpen) onClose()
			}}
			title={isNew ? 'New Invoice' : `Invoice ${record?.invoiceNo ?? ''}`}
			description={
				isNew ? 'Create a new sales invoice.' : 'View and edit invoice details.'
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
								onClick={() => handleTransition(transition.to)}
								disabled={transitionStatus.isPending}
							>
								{transition.label}
							</Button>
						))}
					<Button variant='outline' size='sm' onClick={onClose}>
						Cancel
					</Button>
					<Button size='sm' onClick={() => form.submit()}>
						{isNew ? 'Create' : 'Save'}
					</Button>
				</>
			}
		>
			{recordLoading && !isNew ? (
				<div className='flex items-center justify-center py-12 text-muted-foreground text-sm'>
					Loading...
				</div>
			) : (
				<Form>
					{() => (
						<div className='space-y-8 pt-1'>
							<FormSection title='Header'>
								<div className='grid gap-4 sm:grid-cols-2'>
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
																className='bg-muted'
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
															placeholder='Search customers\u2026'
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
															placeholder='Sales order reference\u2026'
															autoComplete='off'
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
															placeholder='Select posting date\u2026'
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
															placeholder='Select due date\u2026'
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
															placeholder='USD\u2026'
															autoComplete='off'
														/>
													}
												/>
											</Form.Item>
										)}
									/>
								</div>
							</FormSection>

							{!isNew && (
								<FormSection title='Lines'>
									<div>
										<LinesGrid variant='compact' height={300}>
											<LinesGrid.Header>
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
												/>
												<LinesGrid.Column<SalesInvoiceLine>
													accessorKey='description'
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
															onClick={() => handleTransition(transition.to)}
															disabled={transitionStatus.isPending}
														>
															{transition.label}
														</Button>
													))}
												</div>
											</div>
										)}

										{transitions.length === 0 && (
											<p className='text-muted-foreground text-sm'>
												This invoice has been {currentStatus.toLowerCase()}. No
												further transitions are available.
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
	)
}
