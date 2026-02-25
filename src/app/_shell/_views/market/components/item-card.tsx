import * as React from 'react'
import { Button } from '@/components/ui/button'
import { useCreateForm } from '@/components/ui/form'
import { FormSection } from '../../_shared/form-section'
import { RecordDialog } from '../../_shared/record-dialog'
import { useEntityMutations, useEntityRecord } from '../../_shared/use-entity'

interface ItemRecord {
	_id: string
	itemNo: string
	description: string
	type: 'ITEM' | 'SERVICE' | 'BUNDLE'
	unitPrice: number
	unitCost: number
	inventory: number
	uom: string
	barcode: string
	blocked: boolean
	totalSalesQty: number
	totalSalesAmount: number
}

const ITEM_TYPES = ['ITEM', 'SERVICE', 'BUNDLE'] as const

export function ItemCard({
	selectedId,
	onClose,
	presentation = 'dialog',
}: {
	selectedId: string | null
	onClose: () => void
	presentation?: 'dialog' | 'page'
}) {
	const isNew = selectedId === 'new'
	const isOpen = selectedId !== null

	const { data: record, isLoading: recordLoading } = useEntityRecord(
		'market',
		'items',
		selectedId,
		{ enabled: !isNew && isOpen },
	)

	const { create, update } = useEntityMutations('market', 'items')

	const resolvedRecord = isNew
		? {
				itemNo: '',
				description: '',
				type: 'ITEM' as const,
				unitPrice: 0,
				unitCost: 0,
				inventory: 0,
				uom: '',
				barcode: '',
				blocked: false,
				totalSalesQty: 0,
				totalSalesAmount: 0,
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

	const dialogTitle = isNew
		? 'New Item'
		: `Item ${(resolvedRecord as ItemRecord | undefined)?.itemNo ?? ''}`

	return (
		<RecordDialog
			open={isOpen}
			onOpenChange={(open) => !open && onClose()}
			presentation={presentation}
			title={dialogTitle}
			description='Item details, pricing, and inventory'
			footer={
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
						className='shadow-sm transition-all hover:shadow-md'
					>
						Save
					</Button>
				</>
			}
		>
			{recordLoading && !isNew ? (
				<div className='space-y-4'>
					{Array.from({ length: 4 }).map((_, i) => (
						<div
							key={`skeleton-${i}`}
							className='h-12 rounded-lg bg-muted/50 motion-safe:animate-pulse'
						/>
					))}
				</div>
			) : (
				<Form>
					{() => (
						<div className='space-y-8 pt-2'>
							<FormSection title='General'>
								<div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
									<Form.Field
										name='itemNo'
										render={({ field }) => (
											<Form.Item>
												<Form.Label>Item No.</Form.Label>
												<Form.Control>
													<Form.Input
														{...field}
														value={(field.value as string) ?? ''}
														readOnly={!isNew}
														placeholder='Auto-generated\u2026'
														autoComplete='off'
														className='bg-background/50'
													/>
												</Form.Control>
											</Form.Item>
										)}
									/>
									<Form.Field
										name='description'
										render={({ field }) => (
											<Form.Item>
												<Form.Label>Description</Form.Label>
												<Form.Control>
													<Form.Input
														{...field}
														value={(field.value as string) ?? ''}
														placeholder='Item description\u2026'
														autoComplete='off'
														className='bg-background/50'
													/>
												</Form.Control>
											</Form.Item>
										)}
									/>
									<Form.Field
										name='type'
										render={({ field }) => (
											<Form.Item>
												<Form.Label>Type</Form.Label>
												<Form.Control>
													<Form.Select
														value={field.value as string}
														onValueChange={field.onChange}
													>
														<Form.Select.Trigger className='w-full bg-background/50'>
															<Form.Select.Value />
														</Form.Select.Trigger>
														<Form.Select.Content>
															{ITEM_TYPES.map((type) => (
																<Form.Select.Item key={type} value={type}>
																	{type}
																</Form.Select.Item>
															))}
														</Form.Select.Content>
													</Form.Select>
												</Form.Control>
											</Form.Item>
										)}
									/>
									<Form.Field
										name='uom'
										render={({ field }) => (
											<Form.Item>
												<Form.Label>Unit of Measure</Form.Label>
												<Form.Control>
													<Form.Input
														{...field}
														value={(field.value as string) ?? ''}
														placeholder='PCS, KG, etc.\u2026'
														autoComplete='off'
														className='bg-background/50'
													/>
												</Form.Control>
											</Form.Item>
										)}
									/>
									<Form.Field
										name='barcode'
										render={({ field }) => (
											<Form.Item>
												<Form.Label>Barcode</Form.Label>
												<Form.Control>
													<Form.Input
														{...field}
														value={(field.value as string) ?? ''}
														placeholder='Barcode\u2026'
														autoComplete='off'
														className='bg-background/50'
													/>
												</Form.Control>
											</Form.Item>
										)}
									/>
									<Form.Field
										name='blocked'
										render={({ field }) => (
											<Form.Item className='flex flex-row items-center gap-3 rounded-lg border border-border/40 bg-background/30 p-4 shadow-sm'>
												<Form.Control>
													<Form.Switch
														checked={field.value as boolean}
														onCheckedChange={field.onChange}
													/>
												</Form.Control>
												<Form.Label className='font-medium'>Blocked</Form.Label>
											</Form.Item>
										)}
									/>
								</div>
							</FormSection>

							<FormSection title='Pricing'>
								<div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
									<Form.Field
										name='unitPrice'
										render={({ field }) => (
											<Form.Item>
												<Form.Label>Unit Price</Form.Label>
												<Form.Control>
													<Form.Input
														{...field}
														value={(field.value as number) ?? ''}
														type='number'
														placeholder='0.00\u2026'
														autoComplete='off'
														className='bg-background/50'
													/>
												</Form.Control>
											</Form.Item>
										)}
									/>
									<Form.Field
										name='unitCost'
										render={({ field }) => (
											<Form.Item>
												<Form.Label>Unit Cost</Form.Label>
												<Form.Control>
													<Form.Input
														{...field}
														value={(field.value as number) ?? ''}
														type='number'
														placeholder='0.00\u2026'
														autoComplete='off'
														className='bg-background/50'
													/>
												</Form.Control>
											</Form.Item>
										)}
									/>
								</div>
							</FormSection>

							<FormSection title='Inventory'>
								<div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
									<Form.Field
										name='inventory'
										render={({ field }) => (
											<Form.Item>
												<Form.Label>Inventory</Form.Label>
												<Form.Control>
													<Form.Input
														{...field}
														value={(field.value as number) ?? ''}
														type='number'
														readOnly
														autoComplete='off'
														className='bg-background/50'
													/>
												</Form.Control>
												<Form.Description>
													Computed from ledger entries
												</Form.Description>
											</Form.Item>
										)}
									/>
									<Form.Field
										name='totalSalesQty'
										render={({ field }) => (
											<Form.Item>
												<Form.Label>Total Sales Qty</Form.Label>
												<Form.Control>
													<Form.Input
														{...field}
														value={(field.value as number) ?? ''}
														type='number'
														readOnly
														autoComplete='off'
														className='bg-background/50'
													/>
												</Form.Control>
												<Form.Description>Flow field</Form.Description>
											</Form.Item>
										)}
									/>
									<Form.Field
										name='totalSalesAmount'
										render={({ field }) => (
											<Form.Item>
												<Form.Label>Total Sales Amount</Form.Label>
												<Form.Control>
													<Form.Input
														{...field}
														value={(field.value as number) ?? ''}
														type='number'
														readOnly
														autoComplete='off'
														className='bg-background/50'
													/>
												</Form.Control>
												<Form.Description>Flow field</Form.Description>
											</Form.Item>
										)}
									/>
								</div>
							</FormSection>
						</div>
					)}
				</Form>
			)}
		</RecordDialog>
	)
}
