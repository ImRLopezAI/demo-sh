import * as React from 'react'
import { Button } from '@/components/ui/button'
import { useCreateForm } from '@/components/ui/form'
import { FormSection } from '../../_shared/form-section'
import { RecordDialog } from '../../_shared/record-dialog'
import { StatusBadge } from '../../_shared/status-badge'
import { useEntityMutations, useEntityRecord } from '../../_shared/use-entity'
import { useStatusTransition } from '../../_shared/use-status-transition'

interface TaskCardProps {
	recordId: string | null
	open: boolean
	onOpenChange: (open: boolean) => void
}

interface TaskFormValues {
	taskNo: string
	moduleId: string
	title: string
	description: string
	priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
	assigneeUserId: string
	dueDate: string
	slaTargetAt: string
}

const STATUS_TRANSITIONS: Record<string, { label: string; to: string }[]> = {
	OPEN: [
		{ label: 'Start', to: 'IN_PROGRESS' },
		{ label: 'Block', to: 'BLOCKED' },
	],
	IN_PROGRESS: [
		{ label: 'Block', to: 'BLOCKED' },
		{ label: 'Complete', to: 'DONE' },
	],
	BLOCKED: [
		{ label: 'Resume', to: 'IN_PROGRESS' },
		{ label: 'Complete', to: 'DONE' },
	],
	DONE: [],
}

export function TaskCard({ recordId, open, onOpenChange }: TaskCardProps) {
	const isNew = recordId === 'new'

	const { data: record, isLoading: recordLoading } = useEntityRecord(
		'hub',
		'operationTasks',
		recordId,
		{ enabled: !isNew && !!recordId },
	)

	const { create, update } = useEntityMutations('hub', 'operationTasks')

	const [Form, form] = useCreateForm<TaskFormValues>(
		() => ({
			defaultValues: {
				taskNo: record?.taskNo ?? '',
				moduleId: record?.moduleId ?? '',
				title: record?.title ?? '',
				description: record?.description ?? '',
				priority: record?.priority ?? 'MEDIUM',
				assigneeUserId: record?.assigneeUserId ?? '',
				dueDate: record?.dueDate ?? '',
				slaTargetAt: record?.slaTargetAt ?? '',
			},
			onSubmit: async (data) => {
				if (isNew) {
					await create.mutateAsync({
						moduleId: data.moduleId,
						title: data.title,
						description: data.description || undefined,
						priority: data.priority,
						assigneeUserId: data.assigneeUserId || undefined,
						dueDate: data.dueDate || undefined,
						slaTargetAt: data.slaTargetAt || undefined,
					})
				} else if (recordId) {
					await update.mutateAsync({
						id: recordId,
						data: {
							moduleId: data.moduleId,
							title: data.title,
							description: data.description || undefined,
							priority: data.priority,
							assigneeUserId: data.assigneeUserId || undefined,
							dueDate: data.dueDate || undefined,
							slaTargetAt: data.slaTargetAt || undefined,
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
				taskNo: record.taskNo ?? '',
				moduleId: record.moduleId ?? '',
				title: record.title ?? '',
				description: record.description ?? '',
				priority: record.priority ?? 'MEDIUM',
				assigneeUserId: record.assigneeUserId ?? '',
				dueDate: record.dueDate ?? '',
				slaTargetAt: record.slaTargetAt ?? '',
			})
		} else if (isNew) {
			form.reset({
				taskNo: '',
				moduleId: '',
				title: '',
				description: '',
				priority: 'MEDIUM',
				assigneeUserId: '',
				dueDate: '',
				slaTargetAt: '',
			})
		}
	}, [record, isNew, form])

	const { requestTransition, reasonDialog, transitionStatus } =
		useStatusTransition({
			moduleId: 'hub',
			entityId: 'operationTasks',
			recordId,
			isNew,
		})

	const currentStatus = record?.status ?? 'OPEN'
	const currentSlaStatus = record?.slaStatus ?? 'ON_TRACK'
	const currentEscalationLevel = record?.escalationLevel ?? 'NONE'
	const transitions = STATUS_TRANSITIONS[currentStatus] ?? []

	return (
		<>
			<RecordDialog
				open={open}
				onOpenChange={onOpenChange}
				title={isNew ? 'New Task' : `Task ${record?.taskNo ?? ''}`}
				description={
					isNew
						? 'Create a new operational task.'
						: 'View and edit task details.'
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
												name='taskNo'
												render={({ field }) => (
													<Form.Item>
														<Form.Label>Task No.</Form.Label>
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
											name='moduleId'
											rules={{ required: 'Module is required' }}
											render={({ field }) => (
												<Form.Item>
													<Form.Label>Module</Form.Label>
													<Form.Control
														render={
															<Form.Select
																value={field.value}
																onValueChange={field.onChange}
															>
																<Form.Select.Trigger>
																	<Form.Select.Value placeholder='Select module' />
																</Form.Select.Trigger>
																<Form.Select.Content>
																	<Form.Select.Item value='hub'>
																		Hub
																	</Form.Select.Item>
																	<Form.Select.Item value='market'>
																		Market
																	</Form.Select.Item>
																	<Form.Select.Item value='insight'>
																		Insight
																	</Form.Select.Item>
																	<Form.Select.Item value='replenishment'>
																		Replenishment
																	</Form.Select.Item>
																	<Form.Select.Item value='ledger'>
																		Ledger
																	</Form.Select.Item>
																	<Form.Select.Item value='pos'>
																		POS
																	</Form.Select.Item>
																	<Form.Select.Item value='trace'>
																		Trace
																	</Form.Select.Item>
																	<Form.Select.Item value='flow'>
																		Flow
																	</Form.Select.Item>
																	<Form.Select.Item value='payroll'>
																		Payroll
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
											name='title'
											rules={{ required: 'Title is required' }}
											render={({ field }) => (
												<Form.Item>
													<Form.Label>Title</Form.Label>
													<Form.Control
														render={
															<Form.Input
																{...field}
																placeholder='Task title\u2026'
															/>
														}
													/>
													<Form.Message />
												</Form.Item>
											)}
										/>

										<Form.Field
											name='description'
											render={({ field }) => (
												<Form.Item>
													<Form.Label>Description</Form.Label>
													<Form.Control
														render={
															<Form.Textarea
																{...field}
																placeholder='Optional description\u2026'
																rows={3}
															/>
														}
													/>
												</Form.Item>
											)}
										/>

										<Form.Field
											name='priority'
											rules={{ required: 'Priority is required' }}
											render={({ field }) => (
												<Form.Item>
													<Form.Label>Priority</Form.Label>
													<Form.Control
														render={
															<Form.Select
																value={field.value}
																onValueChange={field.onChange}
															>
																<Form.Select.Trigger>
																	<Form.Select.Value placeholder='Select priority' />
																</Form.Select.Trigger>
																<Form.Select.Content>
																	<Form.Select.Item value='LOW'>
																		Low
																	</Form.Select.Item>
																	<Form.Select.Item value='MEDIUM'>
																		Medium
																	</Form.Select.Item>
																	<Form.Select.Item value='HIGH'>
																		High
																	</Form.Select.Item>
																	<Form.Select.Item value='CRITICAL'>
																		Critical
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
											name='assigneeUserId'
											render={({ field }) => (
												<Form.Item>
													<Form.Label>Assignee User ID</Form.Label>
													<Form.Control
														render={
															<Form.Input
																{...field}
																placeholder='User ID (optional)\u2026'
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
																placeholder='Select due date'
															/>
														}
													/>
												</Form.Item>
											)}
										/>

										<Form.Field
											name='slaTargetAt'
											render={({ field }) => (
												<Form.Item>
													<Form.Label>SLA Target</Form.Label>
													<Form.Control
														render={
															<Form.DatePicker
																value={field.value}
																onValueChange={(date) =>
																	field.onChange(date ? date.toISOString() : '')
																}
																placeholder='Optional SLA target'
															/>
														}
													/>
												</Form.Item>
											)}
										/>
									</div>
								</FormSection>

								{!isNew && (
									<FormSection title='Status'>
										<div className='space-y-6'>
											<div className='space-y-2'>
												<p className='font-medium text-sm'>Current Status</p>
												<StatusBadge status={currentStatus} />
											</div>
											<div className='space-y-2'>
												<p className='font-medium text-sm'>SLA Status</p>
												<div className='flex items-center gap-2'>
													<StatusBadge status={currentSlaStatus} />
													<StatusBadge status={currentEscalationLevel} />
												</div>
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
													This task is complete. No further transitions are
													available.
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
