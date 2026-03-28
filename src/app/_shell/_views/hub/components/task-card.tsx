import {
	getLabeledTransitions,
	OPERATION_TASK_STATUS_LABELS,
	OPERATION_TASK_TRANSITIONS,
	type OperationTaskStatus,
	SLA_STATUS_LABELS,
	type SlaStatus,
} from '@server/db/constants'
import { useRouter } from 'next/navigation'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { useCreateForm } from '@/components/ui/form'
import { useRecordReportGroup } from '@/hooks/use-record-report-group'
import { FormSection } from '../../_shared/form-section'
import {
	RecordDialog,
	type RecordDialogActionGroup,
} from '../../_shared/record-dialog'
import {
	renderSpecSections,
	resolveCardTitle,
	type SpecCardProps,
} from '../../_shared/spec-card-helpers'
import { useTransitionWithReason } from '../../_shared/transition-reason'
import { useEntityMutations, useEntityRecord } from '../../_shared/use-entity'

interface TaskCardProps {
	recordId: string | null
	open: boolean
	onOpenChange: (open: boolean) => void
	presentation?: 'dialog' | 'page'
	specCardProps?: SpecCardProps
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

export function TaskCard({
	recordId,
	open,
	onOpenChange,
	presentation = 'dialog',
	specCardProps,
}: TaskCardProps) {
	const router = useRouter()
	const isNew = recordId === 'new'

	const { data: record, isLoading: recordLoading } = useEntityRecord(
		'hub',
		'operationTasks',
		recordId,
		{ enabled: !isNew && !!recordId },
	)

	const { create, update, transitionStatus } = useEntityMutations(
		'hub',
		'operationTasks',
	)

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
		moduleId: 'hub',
		entityId: 'operationTasks',
		disabled: transitionStatus.isPending,
		onTransition: handleTransition,
	})

	const currentStatus = record?.status ?? 'OPEN'
	const currentSlaStatus = record?.slaStatus ?? 'ON_TRACK'
	const currentEscalationLevel = record?.escalationLevel ?? 'NONE'
	const statusOptions = getLabeledTransitions(
		currentStatus as OperationTaskStatus,
		OPERATION_TASK_TRANSITIONS,
		OPERATION_TASK_STATUS_LABELS,
	)

	const reportGroup = useRecordReportGroup({
		moduleId: 'hub',
		entityId: 'operationTasks',
		recordId,
		isNew,
	})

	const actionGroups = React.useMemo<RecordDialogActionGroup[]>(() => {
		if (isNew) return []
		return [
			{
				label: 'Actions',
				items: [
					{
						label: 'Assign',
						onClick: () => {
							/* TODO: implement assign action */
						},
					},
					{
						label: 'Escalate',
						onClick: () => {
							/* TODO: implement escalate action */
						},
						variant: 'destructive',
					},
				],
			},
			{
				label: 'Related',
				items: [
					{
						label: 'Module Dashboard',
						onClick: () => {
							const moduleId = record?.moduleId
							if (moduleId) {
								router.push(`/${moduleId}/dashboard`)
							}
						},
					},
				],
			},
			{
				label: 'Navigate',
				items: [
					{
						label: 'Related Notifications',
						onClick: () => router.push('/hub/notifications'),
					},
				],
			},
			...(reportGroup ? [reportGroup] : []),
		]
	}, [isNew, record?.moduleId, router, reportGroup])

	return (
		<>
			<RecordDialog
				open={open}
				onOpenChange={onOpenChange}
				presentation={presentation}
				actionGroups={actionGroups}
				title={
					isNew
						? (specCardProps?.newTitle ?? 'New Task')
						: resolveCardTitle(
								specCardProps?.title,
								record as any,
								`Task ${record?.taskNo ?? ''}`,
							)
				}
				description={
					specCardProps?.description ??
					(isNew
						? 'Create a new operational task.'
						: 'View and edit task details.')
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
								{specCardProps?.sections ? (
									renderSpecSections(Form, specCardProps.sections)
								) : (
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
																		field.onChange(
																			date ? date.toISOString() : '',
																		)
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
																		field.onChange(
																			date ? date.toISOString() : '',
																		)
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
								)}

								{!isNew && (
									<FormSection title='Status'>
										<div className='grid gap-4'>
											<Form.Item>
												<Form.Label>Current Status</Form.Label>
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
																OPERATION_TASK_STATUS_LABELS[
																	currentStatus as OperationTaskStatus
																] ?? currentStatus
															}
														/>
													</Form.Select.Trigger>
													<Form.Select.Content>
														<Form.Select.Item value={currentStatus}>
															{OPERATION_TASK_STATUS_LABELS[
																currentStatus as OperationTaskStatus
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
											<div className='space-y-2'>
												<p className='font-medium text-sm'>SLA Status</p>
												<div className='flex items-center gap-2 text-sm'>
													<span className='rounded-md border border-border/50 bg-background/30 px-2 py-1'>
														{SLA_STATUS_LABELS[currentSlaStatus as SlaStatus] ??
															currentSlaStatus}
													</span>
													<span className='rounded-md border border-border/50 bg-background/30 px-2 py-1'>
														{currentEscalationLevel}
													</span>
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
			{reasonDialog}
		</>
	)
}
