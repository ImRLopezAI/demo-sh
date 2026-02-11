import * as React from 'react'
import { Button } from '@/components/ui/button'
import { useCreateForm } from '@/components/ui/form'
import { formatCurrency } from '@/lib/utils'
import { FormSection } from '../../_shared/form-section'
import { RecordDialog } from '../../_shared/record-dialog'
import { StatusBadge } from '../../_shared/status-badge'
import { useEntityMutations, useEntityRecord } from '../../_shared/use-entity'

interface BankAccountCardProps {
	selectedId: string | null
	onClose: () => void
}

interface BankAccountFormValues {
	accountNo: string
	name: string
	bankName: string
	iban: string
	swiftCode: string
	currency: string
}

const CURRENCY_OPTIONS = [
	{ value: 'USD', label: 'USD - US Dollar' },
	{ value: 'EUR', label: 'EUR - Euro' },
	{ value: 'GBP', label: 'GBP - British Pound' },
	{ value: 'MXN', label: 'MXN - Mexican Peso' },
	{ value: 'CAD', label: 'CAD - Canadian Dollar' },
	{ value: 'JPY', label: 'JPY - Japanese Yen' },
	{ value: 'CHF', label: 'CHF - Swiss Franc' },
]

export function BankAccountCard({ selectedId, onClose }: BankAccountCardProps) {
	const isNew = selectedId === 'new'
	const open = selectedId !== null

	const { data: record, isLoading: recordLoading } = useEntityRecord(
		'flow',
		'bankAccounts',
		selectedId,
		{ enabled: !isNew && !!selectedId },
	)

	const { create, update } = useEntityMutations('flow', 'bankAccounts')

	const [Form, form] = useCreateForm<BankAccountFormValues>(
		() => ({
			defaultValues: {
				accountNo: record?.accountNo ?? '',
				name: record?.name ?? '',
				bankName: record?.bankName ?? '',
				iban: record?.iban ?? '',
				swiftCode: record?.swiftCode ?? '',
				currency: record?.currency ?? 'USD',
			},
			onSubmit: async (data) => {
				if (isNew) {
					await create.mutateAsync({
						name: data.name,
						bankName: data.bankName,
						iban: data.iban,
						swiftCode: data.swiftCode,
						currency: data.currency,
					})
				} else if (selectedId) {
					await update.mutateAsync({
						id: selectedId,
						data: {
							name: data.name,
							bankName: data.bankName,
							iban: data.iban,
							swiftCode: data.swiftCode,
							currency: data.currency,
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
				accountNo: record.accountNo ?? '',
				name: record.name ?? '',
				bankName: record.bankName ?? '',
				iban: record.iban ?? '',
				swiftCode: record.swiftCode ?? '',
				currency: record.currency ?? 'USD',
			})
		} else if (isNew) {
			form.reset({
				accountNo: '',
				name: '',
				bankName: '',
				iban: '',
				swiftCode: '',
				currency: 'USD',
			})
		}
	}, [record, isNew, form])

	return (
		<RecordDialog
			open={open}
			onOpenChange={(isOpen) => {
				if (!isOpen) onClose()
			}}
			title={
				isNew ? 'New Bank Account' : `Bank Account ${record?.accountNo ?? ''}`
			}
			description={
				isNew
					? 'Add a new bank account to the system.'
					: 'View and edit bank account details.'
			}
			footer={
				<>
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
							<FormSection title='General'>
								<div className='grid gap-4'>
									{!isNew && (
										<Form.Field
											name='accountNo'
											render={({ field }) => (
												<Form.Item>
													<Form.Label>Account No.</Form.Label>
													<Form.Control
														render={
															<Form.Input
																{...field}
																readOnly
																autoComplete='off'
																className='bg-muted'
															/>
														}
													/>
												</Form.Item>
											)}
										/>
									)}

									<Form.Field
										name='name'
										rules={{ required: 'Name is required' }}
										render={({ field }) => (
											<Form.Item>
												<Form.Label>Name</Form.Label>
												<Form.Control
													render={
														<Form.Input
															{...field}
															placeholder='Account name\u2026'
															autoComplete='off'
														/>
													}
												/>
												<Form.Message />
											</Form.Item>
										)}
									/>

									<Form.Field
										name='bankName'
										rules={{ required: 'Bank name is required' }}
										render={({ field }) => (
											<Form.Item>
												<Form.Label>Bank Name</Form.Label>
												<Form.Control
													render={
														<Form.Input
															{...field}
															placeholder='Bank name\u2026'
															autoComplete='off'
														/>
													}
												/>
												<Form.Message />
											</Form.Item>
										)}
									/>

									<Form.Field
										name='iban'
										render={({ field }) => (
											<Form.Item>
												<Form.Label>IBAN</Form.Label>
												<Form.Control
													render={
														<Form.Input
															{...field}
															placeholder='IBAN number\u2026'
															autoComplete='off'
														/>
													}
												/>
											</Form.Item>
										)}
									/>

									<Form.Field
										name='swiftCode'
										render={({ field }) => (
											<Form.Item>
												<Form.Label>SWIFT Code</Form.Label>
												<Form.Control
													render={
														<Form.Input
															{...field}
															placeholder='SWIFT / BIC code\u2026'
															autoComplete='off'
														/>
													}
												/>
											</Form.Item>
										)}
									/>

									<Form.Field
										name='currency'
										rules={{ required: 'Currency is required' }}
										render={({ field }) => (
											<Form.Item>
												<Form.Label>Currency</Form.Label>
												<Form.Control
													render={
														<Form.Select
															value={field.value}
															onValueChange={field.onChange}
														>
															<Form.Select.Trigger>
																<Form.Select.Value placeholder='Select currency\u2026' />
															</Form.Select.Trigger>
															<Form.Select.Content>
																{CURRENCY_OPTIONS.map((option) => (
																	<Form.Select.Item
																		key={option.value}
																		value={option.value}
																	>
																		{option.label}
																	</Form.Select.Item>
																))}
															</Form.Select.Content>
														</Form.Select>
													}
												/>
												<Form.Message />
											</Form.Item>
										)}
									/>

									{!isNew && (
										<div className='space-y-2'>
											<p className='font-medium text-sm'>Status</p>
											<StatusBadge status={record?.status} />
										</div>
									)}
								</div>
							</FormSection>

							{!isNew && (
								<FormSection title='Statistics'>
									<div className='grid gap-4'>
										<div className='grid grid-cols-2 gap-4'>
											<div className='space-y-1'>
												<p className='font-medium text-muted-foreground text-xs'>
													Entry Count
												</p>
												<p className='font-semibold text-lg tabular-nums'>
													{record?.entryCount?.toLocaleString() ?? '0'}
												</p>
											</div>
											<div className='space-y-1'>
												<p className='font-medium text-muted-foreground text-xs'>
													Current Balance
												</p>
												<p className='font-semibold text-lg tabular-nums'>
													{formatCurrency(
														record?.currentBalance,
														record?.currency || 'USD',
													)}
												</p>
											</div>
										</div>
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
