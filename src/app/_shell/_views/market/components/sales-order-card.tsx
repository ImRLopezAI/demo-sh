import * as React from 'react'
import { useGrid } from '@/components/data-grid/compound'
import { Button } from '@/components/ui/button'
import { useCreateForm } from '@/components/ui/form'
import { useModuleData, useModuleList } from '../../../hooks/use-data'
import { RecordDialog } from '../../_shared/record-dialog'
import { StatusBadge } from '../../_shared/status-badge'
import { useEntityMutations, useEntityRecord } from '../../_shared/use-entity'

interface SalesOrderHeader {
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

const DOCUMENT_TYPES = ['ORDER', 'RETURN_ORDER', 'QUOTE'] as const
const STATUS_TRANSITIONS: Record<string, string[]> = {
	DRAFT: ['PENDING_APPROVAL'],
	PENDING_APPROVAL: ['APPROVED', 'REJECTED'],
	APPROVED: ['COMPLETED', 'CANCELED'],
	REJECTED: ['DRAFT'],
}

export function SalesOrderCard({
	selectedId,
	onClose,
}: {
	selectedId: string | null
	onClose: () => void
}) {
	const isNew = selectedId === 'new'
	const isOpen = selectedId !== null

	const { data: record, isLoading: recordLoading } = useEntityRecord(
		'market',
		'salesOrders',
		selectedId,
		{ enabled: !isNew && isOpen },
	)

	const { create, update, transitionStatus } = useEntityMutations(
		'market',
		'salesOrders',
	)

	const { data: customersList } = useModuleList('market', 'customers', {
		limit: 100,
	})

	const { items: allLines, isLoading: linesLoading } = useModuleData<
		'market',
		SalesLine
	>('market', 'salesLines', 'overview')

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
		if (!isOpen) return
		form.reset((resolvedRecord ?? {}) as Record<string, unknown>)
	}, [resolvedRecord, form, isOpen])

	const lines = React.useMemo(() => {
		const documentNo = (resolvedRecord as SalesOrderHeader | undefined)
			?.documentNo
		if (!documentNo || isNew) return []
		return allLines.filter((line) => line.documentNo === documentNo)
	}, [allLines, isNew, resolvedRecord])

	const handleTransition = async (newStatus: string) => {
		if (!selectedId || isNew) return
		await transitionStatus.mutateAsync({
			id: selectedId,
			toStatus: newStatus,
		})
		onClose()
	}

	const currentStatus = (resolvedRecord as SalesOrderHeader | undefined)?.status
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
		? 'New Sales Order'
		: `Sales Order ${(resolvedRecord as SalesOrderHeader | undefined)?.documentNo ?? ''}`

	return (
		<RecordDialog
			open={isOpen}
			onOpenChange={(open) => !open && onClose()}
			title={dialogTitle}
			description='Sales order header and line details'
			footer={
				<>
					{currentStatus && <StatusBadge status={currentStatus} />}
					{!isNew &&
						nextStatuses.map((status) => (
							<Button
								key={status}
								variant='outline'
								size='sm'
								onClick={() => handleTransition(status)}
								disabled={transitionStatus.isPending}
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
					{Array.from({ length: 4 }).map((_, i) => (
						<div
							key={`skeleton-${i}`}
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
													<Form.Select.Trigger className='w-full'>
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
												<StatusBadge status={field.value as string} />
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
												/>
											</Form.Control>
										</Form.Item>
									)}
								/>
								<Form.Field
									name='externalRef'
									render={({ field }) => (
										<Form.Item className='col-span-2 lg:col-span-3'>
											<Form.Label>External Reference</Form.Label>
											<Form.Control>
												<Form.Input
													{...field}
													value={(field.value as string) ?? ''}
													placeholder='External ref\u2026'
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
							<h3 className='font-medium text-sm'>Order Lines</h3>
							<LinesGrid variant='compact' height={300}>
								<LinesGrid.Columns>
									<LinesGrid.Column
										accessorKey='lineNo'
										title='Line No.'
										cellVariant='number'
									/>
									<LinesGrid.Column
										accessorKey='itemDescription'
										title='Item'
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
					)}
				</div>
			)}
		</RecordDialog>
	)
}
