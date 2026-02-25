import * as React from 'react'
import { Button } from '@/components/ui/button'
import { useCreateForm } from '@/components/ui/form'
import { FormSection } from '../../_shared/form-section'
import { RecordDialog } from '../../_shared/record-dialog'
import { useEntityMutations, useEntityRecord } from '../../_shared/use-entity'

interface VendorRecord {
	_id: string
	vendorNo: string
	name: string
	contactName: string
	email: string
	phone: string
	address: string
	city: string
	country: string
	currency: string
	blocked: boolean
	purchaseOrderCount: number
	totalBalance: number
}

export function VendorCard({
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

	const { data: record, isLoading: _recordLoading } = useEntityRecord(
		'replenishment',
		'vendors',
		recordId,
		{ enabled: open && !isNew },
	)

	const { create, update } = useEntityMutations('replenishment', 'vendors')

	const vendor = record as unknown as VendorRecord | undefined

	const [Form, form] = useCreateForm<{
		vendorNo: string
		name: string
		contactName: string
		email: string
		phone: string
		blocked: boolean
		address: string
		city: string
		country: string
		currency: string
		purchaseOrderCount: number
		totalBalance: number
	}>(
		() => ({
			defaultValues: {
				vendorNo: vendor?.vendorNo ?? '',
				name: vendor?.name ?? '',
				contactName: vendor?.contactName ?? '',
				email: vendor?.email ?? '',
				phone: vendor?.phone ?? '',
				blocked: vendor?.blocked ?? false,
				address: vendor?.address ?? '',
				city: vendor?.city ?? '',
				country: vendor?.country ?? '',
				currency: vendor?.currency ?? 'USD',
				purchaseOrderCount: vendor?.purchaseOrderCount ?? 0,
				totalBalance: vendor?.totalBalance ?? 0,
			},
			onSubmit: async (data) => {
				if (isNew) {
					const created = await create.mutateAsync({
						vendorNo: '',
						name: data.name,
						contactName: data.contactName || undefined,
						email: data.email || undefined,
						phone: data.phone || undefined,
						blocked: data.blocked,
						address: data.address || undefined,
						city: data.city || undefined,
						country: data.country || undefined,
						currency: data.currency || 'USD',
					})
					if (onCreated && created?._id) {
						onCreated(created._id)
					} else {
						onClose()
					}
					return
				}

				if (!recordId) return
				await update.mutateAsync({
					id: recordId,
					data: {
						name: data.name,
						contactName: data.contactName || undefined,
						email: data.email || undefined,
						phone: data.phone || undefined,
						blocked: data.blocked,
						address: data.address || undefined,
						city: data.city || undefined,
						country: data.country || undefined,
						currency: data.currency,
					},
				})
				onClose()
			},
		}),
		[vendor, recordId, isNew, create, update, onClose, onCreated],
	)

	React.useEffect(() => {
		if (vendor) {
			form.reset({
				vendorNo: vendor.vendorNo,
				name: vendor.name,
				contactName: vendor.contactName,
				email: vendor.email,
				phone: vendor.phone,
				blocked: vendor.blocked,
				address: vendor.address,
				city: vendor.city,
				country: vendor.country,
				currency: vendor.currency,
				purchaseOrderCount: vendor.purchaseOrderCount,
				totalBalance: vendor.totalBalance,
			})
		} else if (isNew) {
			form.reset({
				vendorNo: '',
				name: '',
				contactName: '',
				email: '',
				phone: '',
				blocked: false,
				address: '',
				city: '',
				country: '',
				currency: 'USD',
				purchaseOrderCount: 0,
				totalBalance: 0,
			})
		}
	}, [vendor, form, isNew])

	return (
		<RecordDialog
			open={open}
			onOpenChange={(next) => {
				if (!next) onClose()
			}}
			presentation={presentation}
			title={isNew ? 'New Vendor' : `Vendor ${vendor?.vendorNo ?? ''}`}
			description='Manage vendor details, address, and purchasing information.'
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
			<Form>
				{() => (
					<div className='space-y-8 pt-1'>
						<FormSection title='General'>
							<Form.Group className='grid grid-cols-2 gap-4'>
								<Form.Item>
									<Form.Label>Vendor No.</Form.Label>
									<Form.Field
										name='vendorNo'
										render={({ field }) => (
											<Form.Control>
												<Form.Input {...field} readOnly autoComplete='off' />
											</Form.Control>
										)}
									/>
								</Form.Item>

								<Form.Item>
									<Form.Label>Name</Form.Label>
									<Form.Field
										name='name'
										render={({ field }) => (
											<Form.Control>
												<Form.Input
													{...field}
													placeholder='Vendor name'
													autoComplete='organization'
												/>
											</Form.Control>
										)}
									/>
								</Form.Item>

								<Form.Item>
									<Form.Label>Contact Name</Form.Label>
									<Form.Field
										name='contactName'
										render={({ field }) => (
											<Form.Control>
												<Form.Input
													{...field}
													placeholder='Contact person'
													autoComplete='name'
												/>
											</Form.Control>
										)}
									/>
								</Form.Item>

								<Form.Item>
									<Form.Label>Email</Form.Label>
									<Form.Field
										name='email'
										render={({ field }) => (
											<Form.Control>
												<Form.Input
													{...field}
													type='email'
													placeholder='vendor@example.com'
													autoComplete='email'
												/>
											</Form.Control>
										)}
									/>
								</Form.Item>

								<Form.Item>
									<Form.Label>Phone</Form.Label>
									<Form.Field
										name='phone'
										render={({ field }) => (
											<Form.Control>
												<Form.Input
													{...field}
													type='tel'
													placeholder='+1 (555) 000-0000'
													autoComplete='tel'
												/>
											</Form.Control>
										)}
									/>
								</Form.Item>

								<Form.Item>
									<Form.Label>Blocked</Form.Label>
									<Form.Field
										name='blocked'
										render={({ field }) => (
											<Form.Control>
												<Form.Switch
													checked={field.value}
													onCheckedChange={field.onChange}
												/>
											</Form.Control>
										)}
									/>
								</Form.Item>
							</Form.Group>
						</FormSection>

						<FormSection title='Address'>
							<Form.Group className='grid grid-cols-2 gap-4'>
								<Form.Item className='col-span-2'>
									<Form.Label>Address</Form.Label>
									<Form.Field
										name='address'
										render={({ field }) => (
											<Form.Control>
												<Form.Input
													{...field}
													placeholder='Street address'
													autoComplete='street-address'
												/>
											</Form.Control>
										)}
									/>
								</Form.Item>

								<Form.Item>
									<Form.Label>City</Form.Label>
									<Form.Field
										name='city'
										render={({ field }) => (
											<Form.Control>
												<Form.Input
													{...field}
													placeholder='City'
													autoComplete='address-level2'
												/>
											</Form.Control>
										)}
									/>
								</Form.Item>

								<Form.Item>
									<Form.Label>Country</Form.Label>
									<Form.Field
										name='country'
										render={({ field }) => (
											<Form.Control>
												<Form.Input
													{...field}
													placeholder='Country'
													autoComplete='country-name'
												/>
											</Form.Control>
										)}
									/>
								</Form.Item>
							</Form.Group>
						</FormSection>

						<FormSection title='Purchasing'>
							<Form.Group className='grid grid-cols-2 gap-4'>
								<Form.Item>
									<Form.Label>Currency</Form.Label>
									<Form.Field
										name='currency'
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
														<Form.Select.Item value='USD'>USD</Form.Select.Item>
														<Form.Select.Item value='EUR'>EUR</Form.Select.Item>
														<Form.Select.Item value='GBP'>GBP</Form.Select.Item>
														<Form.Select.Item value='MXN'>MXN</Form.Select.Item>
														<Form.Select.Item value='CAD'>CAD</Form.Select.Item>
													</Form.Select.Content>
												</Form.Select>
											</Form.Control>
										)}
									/>
								</Form.Item>

								<Form.Item>
									<Form.Label>Purchase Order Count</Form.Label>
									<Form.Field
										name='purchaseOrderCount'
										render={({ field }) => (
											<Form.Control>
												<Form.Input
													{...field}
													type='number'
													readOnly
													autoComplete='off'
												/>
											</Form.Control>
										)}
									/>
								</Form.Item>

								<Form.Item>
									<Form.Label>Total Balance</Form.Label>
									<Form.Field
										name='totalBalance'
										render={({ field }) => (
											<Form.Control>
												<Form.Input
													{...field}
													type='number'
													readOnly
													autoComplete='off'
												/>
											</Form.Control>
										)}
									/>
								</Form.Item>
							</Form.Group>
						</FormSection>
					</div>
				)}
			</Form>
		</RecordDialog>
	)
}
