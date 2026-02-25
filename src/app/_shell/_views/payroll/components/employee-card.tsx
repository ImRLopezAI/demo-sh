import {
	EMPLOYEE_STATUS_LABELS,
	EMPLOYEE_TRANSITIONS,
	type EmployeeStatus,
	getLabeledTransitions,
} from '@server/db/constants'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { useCreateForm } from '@/components/ui/form'
import { FormSection } from '../../_shared/form-section'
import { RecordDialog } from '../../_shared/record-dialog'
import { useTransitionWithReason } from '../../_shared/transition-reason'
import { useEntityMutations, useEntityRecord } from '../../_shared/use-entity'

interface EmployeeCardProps {
	recordId: string | null
	open: boolean
	onOpenChange: (open: boolean) => void
	presentation?: 'dialog' | 'page'
}

interface EmployeeFormValues {
	employeeNo: string
	firstName: string
	lastName: string
	email: string
	phone: string
	department: string
	jobTitle: string
	employmentType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACTOR' | 'TEMPORARY'
	hireDate: string
	terminationDate: string
	baseSalary: number
	payFrequency: 'WEEKLY' | 'BIWEEKLY' | 'SEMI_MONTHLY' | 'MONTHLY'
	bankAccountId: string
}

export function EmployeeCard({
	recordId,
	open,
	onOpenChange,
	presentation = 'dialog',
}: EmployeeCardProps) {
	const isNew = recordId === 'new'

	const { data: record, isLoading: recordLoading } = useEntityRecord(
		'payroll',
		'employees',
		recordId,
		{ enabled: !isNew && !!recordId },
	)

	const { create, update, transitionStatus } = useEntityMutations(
		'payroll',
		'employees',
	)

	const [Form, form] = useCreateForm<EmployeeFormValues>(
		() => ({
			defaultValues: {
				employeeNo: record?.employeeNo ?? '',
				firstName: record?.firstName ?? '',
				lastName: record?.lastName ?? '',
				email: record?.email ?? '',
				phone: record?.phone ?? '',
				department: record?.department ?? '',
				jobTitle: record?.jobTitle ?? '',
				employmentType: record?.employmentType ?? 'FULL_TIME',
				hireDate: record?.hireDate ?? '',
				terminationDate: record?.terminationDate ?? '',
				baseSalary: record?.baseSalary ?? 0,
				payFrequency: record?.payFrequency ?? 'MONTHLY',
				bankAccountId: record?.bankAccountId ?? '',
			},
			onSubmit: async (data) => {
				if (isNew) {
					await create.mutateAsync({
						firstName: data.firstName,
						lastName: data.lastName,
						email: data.email || undefined,
						phone: data.phone || undefined,
						department: data.department || undefined,
						jobTitle: data.jobTitle || undefined,
						employmentType: data.employmentType,
						hireDate: data.hireDate || undefined,
						terminationDate: data.terminationDate || undefined,
						baseSalary: data.baseSalary,
						payFrequency: data.payFrequency,
						bankAccountId: data.bankAccountId || undefined,
					})
				} else if (recordId) {
					await update.mutateAsync({
						id: recordId,
						data: {
							firstName: data.firstName,
							lastName: data.lastName,
							email: data.email || undefined,
							phone: data.phone || undefined,
							department: data.department || undefined,
							jobTitle: data.jobTitle || undefined,
							employmentType: data.employmentType,
							hireDate: data.hireDate || undefined,
							terminationDate: data.terminationDate || undefined,
							baseSalary: data.baseSalary,
							payFrequency: data.payFrequency,
							bankAccountId: data.bankAccountId || undefined,
						},
					})
				}
				onOpenChange(false)
			},
		}),
		[record, isNew, recordId],
	)

	React.useEffect(() => {
		if (record && !isNew) {
			form.reset({
				employeeNo: record.employeeNo ?? '',
				firstName: record.firstName ?? '',
				lastName: record.lastName ?? '',
				email: record.email ?? '',
				phone: record.phone ?? '',
				department: record.department ?? '',
				jobTitle: record.jobTitle ?? '',
				employmentType: record.employmentType ?? 'FULL_TIME',
				hireDate: record.hireDate ?? '',
				terminationDate: record.terminationDate ?? '',
				baseSalary: record.baseSalary ?? 0,
				payFrequency: record.payFrequency ?? 'MONTHLY',
				bankAccountId: record.bankAccountId ?? '',
			})
		} else if (isNew) {
			form.reset({
				employeeNo: '',
				firstName: '',
				lastName: '',
				email: '',
				phone: '',
				department: '',
				jobTitle: '',
				employmentType: 'FULL_TIME',
				hireDate: '',
				terminationDate: '',
				baseSalary: 0,
				payFrequency: 'MONTHLY',
				bankAccountId: '',
			})
		}
	}, [record, isNew, form])

	const handleTransition = React.useCallback(
		async ({ toStatus, reason }: { toStatus: string; reason?: string }) => {
			if (!recordId || isNew) return
			await transitionStatus.mutateAsync({
				id: recordId,
				toStatus,
				reason,
			})
		},
		[recordId, isNew, transitionStatus],
	)

	const { requestTransition, reasonDialog } = useTransitionWithReason({
		moduleId: 'payroll',
		entityId: 'employees',
		disabled: transitionStatus.isPending,
		onTransition: handleTransition,
	})

	const currentStatus = record?.status ?? 'ACTIVE'
	const statusOptions = getLabeledTransitions(
		currentStatus as EmployeeStatus,
		EMPLOYEE_TRANSITIONS,
		EMPLOYEE_STATUS_LABELS,
	)

	return (
		<>
			<RecordDialog
				open={open}
				onOpenChange={onOpenChange}
				presentation={presentation}
				title={isNew ? 'New Employee' : `Employee ${record?.employeeNo ?? ''}`}
				description={
					isNew
						? 'Create a new employee record.'
						: 'View and edit employee details.'
				}
				footer={
					<>
						<Button
							variant='outline'
							size='sm'
							onClick={() => onOpenChange(false)}
						>
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
												name='employeeNo'
												render={({ field }) => (
													<Form.Item>
														<Form.Label>Employee No.</Form.Label>
														<Form.Control
															render={
																<Form.Input
																	{...field}
																	readOnly
																	className='bg-muted'
																/>
															}
														/>
													</Form.Item>
												)}
											/>
										)}

										<Form.Field
											name='firstName'
											rules={{ required: 'First name is required' }}
											render={({ field }) => (
												<Form.Item>
													<Form.Label>First Name</Form.Label>
													<Form.Control
														render={
															<Form.Input
																{...field}
																placeholder='First name…'
																autoComplete='off'
															/>
														}
													/>
													<Form.Message />
												</Form.Item>
											)}
										/>

										<Form.Field
											name='lastName'
											rules={{ required: 'Last name is required' }}
											render={({ field }) => (
												<Form.Item>
													<Form.Label>Last Name</Form.Label>
													<Form.Control
														render={
															<Form.Input
																{...field}
																placeholder='Last name…'
																autoComplete='off'
															/>
														}
													/>
													<Form.Message />
												</Form.Item>
											)}
										/>

										<Form.Field
											name='email'
											render={({ field }) => (
												<Form.Item>
													<Form.Label>Email</Form.Label>
													<Form.Control
														render={
															<Form.Input
																{...field}
																type='email'
																placeholder='Email address…'
																autoComplete='email'
															/>
														}
													/>
												</Form.Item>
											)}
										/>

										<Form.Field
											name='phone'
											render={({ field }) => (
												<Form.Item>
													<Form.Label>Phone</Form.Label>
													<Form.Control
														render={
															<Form.Input
																{...field}
																type='tel'
																placeholder='Phone number…'
																autoComplete='tel'
															/>
														}
													/>
												</Form.Item>
											)}
										/>
									</div>
								</FormSection>

								<FormSection title='Employment'>
									<div className='grid gap-4'>
										<Form.Field
											name='department'
											render={({ field }) => (
												<Form.Item>
													<Form.Label>Department</Form.Label>
													<Form.Control
														render={
															<Form.Input
																{...field}
																placeholder='Department…'
																autoComplete='off'
															/>
														}
													/>
												</Form.Item>
											)}
										/>

										<Form.Field
											name='jobTitle'
											render={({ field }) => (
												<Form.Item>
													<Form.Label>Job Title</Form.Label>
													<Form.Control
														render={
															<Form.Input
																{...field}
																placeholder='Job title…'
																autoComplete='off'
															/>
														}
													/>
												</Form.Item>
											)}
										/>

										<Form.Field
											name='employmentType'
											rules={{ required: 'Employment type is required' }}
											render={({ field }) => (
												<Form.Item>
													<Form.Label>Employment Type</Form.Label>
													<Form.Control
														render={
															<Form.Select
																value={field.value}
																onValueChange={field.onChange}
															>
																<Form.Select.Trigger>
																	<Form.Select.Value placeholder='Select type…' />
																</Form.Select.Trigger>
																<Form.Select.Content>
																	<Form.Select.Item value='FULL_TIME'>
																		Full Time
																	</Form.Select.Item>
																	<Form.Select.Item value='PART_TIME'>
																		Part Time
																	</Form.Select.Item>
																	<Form.Select.Item value='CONTRACTOR'>
																		Contractor
																	</Form.Select.Item>
																	<Form.Select.Item value='TEMPORARY'>
																		Temporary
																	</Form.Select.Item>
																</Form.Select.Content>
															</Form.Select>
														}
													/>
													<Form.Message />
												</Form.Item>
											)}
										/>

										{!isNew && (
											<Form.Item>
												<Form.Label>Status</Form.Label>
												<Form.Select
													value={currentStatus}
													onValueChange={(toStatus) => {
														if (toStatus && toStatus !== currentStatus) {
															void requestTransition(toStatus)
														}
													}}
													disabled={statusOptions.length === 0}
												>
													<Form.Select.Trigger>
														<Form.Select.Value
															placeholder={
																EMPLOYEE_STATUS_LABELS[
																	currentStatus as EmployeeStatus
																] ?? currentStatus
															}
														/>
													</Form.Select.Trigger>
													<Form.Select.Content>
														<Form.Select.Item value={currentStatus}>
															{EMPLOYEE_STATUS_LABELS[
																currentStatus as EmployeeStatus
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
										)}

										<Form.Field
											name='hireDate'
											render={({ field }) => (
												<Form.Item>
													<Form.Label>Hire Date</Form.Label>
													<Form.Control
														render={
															<Form.DatePicker
																value={field.value}
																onValueChange={(date) =>
																	field.onChange(date ? date.toISOString() : '')
																}
																placeholder='Select hire date…'
															/>
														}
													/>
												</Form.Item>
											)}
										/>

										<Form.Field
											name='terminationDate'
											render={({ field }) => (
												<Form.Item>
													<Form.Label>Termination Date</Form.Label>
													<Form.Control
														render={
															<Form.DatePicker
																value={field.value}
																onValueChange={(date) =>
																	field.onChange(date ? date.toISOString() : '')
																}
																placeholder='Select termination date…'
															/>
														}
													/>
												</Form.Item>
											)}
										/>
									</div>
								</FormSection>

								<FormSection title='Compensation'>
									<div className='grid gap-4'>
										<Form.Field
											name='baseSalary'
											rules={{ required: 'Base salary is required' }}
											render={({ field }) => (
												<Form.Item>
													<Form.Label>Base Salary</Form.Label>
													<Form.Control
														render={
															<Form.Input
																{...field}
																type='number'
																placeholder='0.00…'
																autoComplete='off'
																onChange={(e) =>
																	field.onChange(
																		Number.parseFloat(e.target.value) || 0,
																	)
																}
															/>
														}
													/>
													<Form.Message />
												</Form.Item>
											)}
										/>

										<Form.Field
											name='payFrequency'
											rules={{ required: 'Pay frequency is required' }}
											render={({ field }) => (
												<Form.Item>
													<Form.Label>Pay Frequency</Form.Label>
													<Form.Control
														render={
															<Form.Select
																value={field.value}
																onValueChange={field.onChange}
															>
																<Form.Select.Trigger>
																	<Form.Select.Value placeholder='Select frequency…' />
																</Form.Select.Trigger>
																<Form.Select.Content>
																	<Form.Select.Item value='WEEKLY'>
																		Weekly
																	</Form.Select.Item>
																	<Form.Select.Item value='BIWEEKLY'>
																		Biweekly
																	</Form.Select.Item>
																	<Form.Select.Item value='SEMI_MONTHLY'>
																		Semi-Monthly
																	</Form.Select.Item>
																	<Form.Select.Item value='MONTHLY'>
																		Monthly
																	</Form.Select.Item>
																</Form.Select.Content>
															</Form.Select>
														}
													/>
													<Form.Message />
												</Form.Item>
											)}
										/>

										<Form.Field
											name='bankAccountId'
											render={({ field }) => (
												<Form.Item>
													<Form.Label>Bank Account ID</Form.Label>
													<Form.Control
														render={
															<Form.Input
																{...field}
																placeholder='Bank account for salary disbursement…'
																autoComplete='off'
															/>
														}
													/>
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
			{reasonDialog}
		</>
	)
}
