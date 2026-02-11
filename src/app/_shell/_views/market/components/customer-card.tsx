import * as React from 'react'
import { Button } from '@/components/ui/button'
import { useCreateForm } from '@/components/ui/form'
import { FormSection } from '../../_shared/form-section'
import { RecordDialog } from '../../_shared/record-dialog'
import { useEntityMutations, useEntityRecord } from '../../_shared/use-entity'

interface CustomerRecord {
	_id: string
	customerNo: string
	name: string
	email: string
	phone: string
	address: string
	city: string
	country: string
	blocked: boolean
	orderCount: number
	totalBalance: number
}

export function CustomerCard({
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
		'customers',
		selectedId,
		{ enabled: !isNew && isOpen },
	)

	const { create, update } = useEntityMutations('market', 'customers')

	const resolvedRecord = isNew
		? {
				customerNo: '',
				name: '',
				email: '',
				phone: '',
				address: '',
				city: '',
				country: '',
				blocked: false,
				orderCount: 0,
				totalBalance: 0,
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
		? 'New Customer'
		: `Customer ${(resolvedRecord as CustomerRecord | undefined)?.name ?? ''}`

	return (
		<RecordDialog
			open={isOpen}
			onOpenChange={(open) => !open && onClose()}
			title={dialogTitle}
			description='Customer details, address, and statistics'
			footer={
				<>
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
				<Form>
					{() => (
						<div className='space-y-8 pt-1'>
							<FormSection title='General'>
								<div className='grid grid-cols-2 gap-4'>
									<Form.Field
										name='customerNo'
										render={({ field }) => (
											<Form.Item>
												<Form.Label>Customer No.</Form.Label>
												<Form.Control>
													<Form.Input
														{...field}
														value={(field.value as string) ?? ''}
														readOnly={!isNew}
														placeholder='Auto-generated\u2026'
														autoComplete='off'
													/>
												</Form.Control>
											</Form.Item>
										)}
									/>
									<Form.Field
										name='name'
										render={({ field }) => (
											<Form.Item>
												<Form.Label>Name</Form.Label>
												<Form.Control>
													<Form.Input
														{...field}
														value={(field.value as string) ?? ''}
														placeholder='Customer name\u2026'
														autoComplete='name'
													/>
												</Form.Control>
											</Form.Item>
										)}
									/>
									<Form.Field
										name='email'
										render={({ field }) => (
											<Form.Item>
												<Form.Label>Email</Form.Label>
												<Form.Control>
													<Form.Input
														{...field}
														value={(field.value as string) ?? ''}
														type='email'
														placeholder='email@example.com\u2026'
														autoComplete='email'
													/>
												</Form.Control>
											</Form.Item>
										)}
									/>
									<Form.Field
										name='phone'
										render={({ field }) => (
											<Form.Item>
												<Form.Label>Phone</Form.Label>
												<Form.Control>
													<Form.Input
														{...field}
														value={(field.value as string) ?? ''}
														placeholder='+1 234 567 890\u2026'
														autoComplete='tel'
													/>
												</Form.Control>
											</Form.Item>
										)}
									/>
									<Form.Field
										name='blocked'
										render={({ field }) => (
											<Form.Item className='flex flex-row items-center gap-3'>
												<Form.Control>
													<Form.Switch
														checked={field.value as boolean}
														onCheckedChange={field.onChange}
													/>
												</Form.Control>
												<Form.Label>Blocked</Form.Label>
											</Form.Item>
										)}
									/>
								</div>
							</FormSection>

							<FormSection title='Address'>
								<div className='grid grid-cols-2 gap-4'>
									<Form.Field
										name='address'
										render={({ field }) => (
											<Form.Item className='col-span-2'>
												<Form.Label>Address</Form.Label>
												<Form.Control>
													<Form.Textarea
														{...field}
														value={(field.value as string) ?? ''}
														placeholder='Street address\u2026'
														autoComplete='street-address'
														rows={2}
													/>
												</Form.Control>
											</Form.Item>
										)}
									/>
									<Form.Field
										name='city'
										render={({ field }) => (
											<Form.Item>
												<Form.Label>City</Form.Label>
												<Form.Control>
													<Form.Input
														{...field}
														value={(field.value as string) ?? ''}
														placeholder='City\u2026'
														autoComplete='address-level2'
													/>
												</Form.Control>
											</Form.Item>
										)}
									/>
									<Form.Field
										name='country'
										render={({ field }) => (
											<Form.Item>
												<Form.Label>Country</Form.Label>
												<Form.Control>
													<Form.Input
														{...field}
														value={(field.value as string) ?? ''}
														placeholder='Country\u2026'
														autoComplete='country-name'
													/>
												</Form.Control>
											</Form.Item>
										)}
									/>
								</div>
							</FormSection>

							<FormSection title='Statistics'>
								<div className='grid grid-cols-2 gap-4'>
									<Form.Field
										name='orderCount'
										render={({ field }) => (
											<Form.Item>
												<Form.Label>Order Count</Form.Label>
												<Form.Control>
													<Form.Input
														{...field}
														value={(field.value as number) ?? ''}
														type='number'
														readOnly
														autoComplete='off'
													/>
												</Form.Control>
												<Form.Description>Flow field</Form.Description>
											</Form.Item>
										)}
									/>
									<Form.Field
										name='totalBalance'
										render={({ field }) => (
											<Form.Item>
												<Form.Label>Total Balance</Form.Label>
												<Form.Control>
													<Form.Input
														{...field}
														value={(field.value as number) ?? ''}
														type='number'
														readOnly
														autoComplete='off'
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
