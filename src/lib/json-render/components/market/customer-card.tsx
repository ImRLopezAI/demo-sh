import { useRouter } from 'next/navigation'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { useCreateForm } from '@/components/ui/form'
import { useRecordReportGroup } from '@/hooks/use-record-report-group'
import { FormSection } from '@/components/ui/json-render/form-section'
import {
	RecordDialog,
	type RecordDialogActionGroup,
} from '@/lib/json-render/components/record-dialog'
import {
	renderSpecSections,
	resolveCardTitle,
	type SpecCardProps,
} from '@/lib/json-render/components/spec-card-helpers'
import { useEntityMutations, useEntityRecord } from '@/lib/json-render/components/use-entity'

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
	presentation = 'dialog',
	specCardProps,
}: {
	selectedId: string | null
	onClose: () => void
	presentation?: 'dialog' | 'page'
	specCardProps?: SpecCardProps
}) {
	const router = useRouter()
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

	const reportGroup = useRecordReportGroup({
		moduleId: 'market',
		entityId: 'customers',
		recordId: selectedId,
		isNew,
	})

	const dialogTitle = isNew
		? (specCardProps?.newTitle ?? 'New Customer')
		: resolveCardTitle(
				specCardProps?.title,
				resolvedRecord as Record<string, unknown> | undefined,
				`Customer ${(resolvedRecord as CustomerRecord | undefined)?.customerNo ?? ''}`,
			)

	const actionGroups = React.useMemo<RecordDialogActionGroup[]>(() => {
		if (isNew) return []
		return [
			{
				label: 'Actions',
				items: [
					{
						label: 'Create Sales Order',
						onClick: () => router.push('/market/sales-orders'),
					},
					{
						label: 'Create Invoice',
						onClick: () => router.push('/ledger/invoices'),
					},
				],
			},
			{
				label: 'Related',
				items: [
					{
						label: 'Sales Orders',
						onClick: () => router.push('/market/sales-orders'),
					},
					{
						label: 'Invoices',
						onClick: () => router.push('/ledger/invoices'),
					},
				],
			},
			{
				label: 'Navigate',
				items: [
					{
						label: 'Customer Ledger Entries',
						onClick: () => router.push('/ledger/customer-ledger'),
					},
				],
			},
			...(reportGroup ? [reportGroup] : []),
		]
	}, [isNew, router, reportGroup])

	return (
		<RecordDialog
			open={isOpen}
			onOpenChange={(open) => !open && onClose()}
			presentation={presentation}
			title={dialogTitle}
			description={
				specCardProps?.description ??
				'Customer details, address, and statistics'
			}
			actionGroups={actionGroups}
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
						<>
							{specCardProps?.sections ? (
								renderSpecSections(Form, specCardProps.sections)
							) : (
								<div className='space-y-8 pt-2'>
									<FormSection title='General'>
										<div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
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
																className='bg-background/50'
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
																className='bg-background/50'
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
																className='bg-background/50'
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
														<Form.Label className='font-medium'>
															Blocked
														</Form.Label>
													</Form.Item>
												)}
											/>
										</div>
									</FormSection>

									<FormSection title='Address'>
										<div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
											<Form.Field
												name='address'
												render={({ field }) => (
													<Form.Item className='col-span-1 md:col-span-2'>
														<Form.Label>Address</Form.Label>
														<Form.Control>
															<Form.Textarea
																{...field}
																value={(field.value as string) ?? ''}
																placeholder='Street address\u2026'
																autoComplete='street-address'
																rows={2}
																className='bg-background/50'
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
																className='bg-background/50'
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
																className='bg-background/50'
															/>
														</Form.Control>
													</Form.Item>
												)}
											/>
										</div>
									</FormSection>

									<FormSection title='Statistics'>
										<div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
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
																className='bg-background/50'
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
						</>
					)}
				</Form>
			)}
		</RecordDialog>
	)
}
