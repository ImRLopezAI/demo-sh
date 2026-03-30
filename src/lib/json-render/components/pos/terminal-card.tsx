import {
	getLabeledTransitions,
	TERMINAL_STATUS_LABELS,
	TERMINAL_TRANSITIONS,
	type TerminalStatus,
} from '@server/db/constants'
import { useRouter } from 'next/navigation'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { useCreateForm } from '@/components/ui/form'
import { useRecordReportGroup } from '@/hooks/use-record-report-group'
import { useModuleList } from '@/app/_shell/hooks/use-data'
import {
	RecordDialog,
	type RecordDialogActionGroup,
} from '@/lib/json-render/components/record-dialog'
import {
	renderSpecSections,
	resolveCardTitle,
	type SpecCardProps,
} from '@/lib/json-render/components/spec-card-helpers'
import { useTransitionWithReason } from '@/lib/json-render/components/transition-reason'
import { useEntityMutations, useEntityRecord } from '@/lib/json-render/components/use-entity'

interface TerminalFormValues {
	terminalCode: string
	name: string
	locationCode: string
}

export function TerminalCard({
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
		'pos',
		'terminals',
		selectedId,
		{ enabled: !isNew && isOpen },
	)

	const { create, update, transitionStatus } = useEntityMutations(
		'pos',
		'terminals',
	)

	const resolvedRecord = isNew
		? {
				terminalCode: '',
				name: '',
				locationCode: '',
				status: 'OFFLINE' as const,
			}
		: record

	const [Form, form] = useCreateForm<TerminalFormValues>(
		() => ({
			defaultValues: {
				terminalCode: resolvedRecord?.terminalCode ?? '',
				name: resolvedRecord?.name ?? '',
				locationCode: resolvedRecord?.locationCode ?? '',
			},
			onSubmit: async (data) => {
				if (isNew) {
					await create.mutateAsync({
						name: data.name,
						locationCode: data.locationCode,
					})
				} else if (selectedId) {
					await update.mutateAsync({
						id: selectedId,
						data: {
							name: data.name,
							locationCode: data.locationCode,
						},
					})
				}
				onClose()
			},
		}),
		[resolvedRecord, isNew, selectedId],
	)

	React.useEffect(() => {
		if (record && !isNew) {
			form.reset({
				terminalCode: record.terminalCode ?? '',
				name: record.name ?? '',
				locationCode: record.locationCode ?? '',
			})
		} else if (isNew) {
			form.reset({
				terminalCode: '',
				name: '',
				locationCode: '',
			})
		}
	}, [record, isNew, form])

	const handleTransition = React.useCallback(
		async ({ toStatus, reason }: { toStatus: string; reason?: string }) => {
			if (!selectedId || isNew) return
			await transitionStatus.mutateAsync({
				id: selectedId,
				toStatus,
				reason,
			})
		},
		[selectedId, isNew, transitionStatus],
	)

	const { requestTransition, reasonDialog } = useTransitionWithReason({
		moduleId: 'pos',
		entityId: 'terminals',
		disabled: transitionStatus.isPending,
		onTransition: handleTransition,
	})

	const { data: locationsList } = useModuleList('insight', 'locations', {
		limit: 100,
	})

	const reportGroup = useRecordReportGroup({
		moduleId: 'pos',
		entityId: 'terminals',
		recordId: selectedId,
		isNew,
	})

	const currentStatus = record?.status ?? 'OFFLINE'
	const statusOptions = getLabeledTransitions(
		currentStatus as TerminalStatus,
		TERMINAL_TRANSITIONS,
		TERMINAL_STATUS_LABELS,
	)

	const actionGroups = React.useMemo<RecordDialogActionGroup[]>(() => {
		if (isNew) return []
		return [
			{
				label: 'Actions',
				items: [
					{
						label: 'Activate Terminal',
						onClick: () => {
							/* TODO: implement activate action */
						},
						disabled: currentStatus === 'ONLINE',
					},
					{
						label: 'Deactivate Terminal',
						onClick: () => {
							/* TODO: implement deactivate action */
						},
						disabled: currentStatus === 'OFFLINE',
						variant: 'destructive',
					},
				],
			},
			{
				label: 'Related',
				items: [
					{
						label: 'Location',
						onClick: () => router.push('/insight/locations'),
					},
				],
			},
			{
				label: 'Navigate',
				items: [
					{
						label: 'Sessions',
						onClick: () => router.push('/pos/sessions'),
					},
					{
						label: 'Transactions',
						onClick: () => router.push('/pos/transactions'),
					},
				],
			},
			...(reportGroup ? [reportGroup] : []),
		]
	}, [isNew, currentStatus, router, reportGroup])

	const dialogTitle = isNew
		? (specCardProps?.newTitle ?? 'New Terminal')
		: resolveCardTitle(
				specCardProps?.title,
				resolvedRecord as any,
				`Terminal ${resolvedRecord?.terminalCode ?? ''}`,
			)

	return (
		<>
			<RecordDialog
				open={isOpen}
				onOpenChange={(open) => !open && onClose()}
				presentation={presentation}
				actionGroups={actionGroups}
				title={dialogTitle}
				description={
					specCardProps?.description ??
					(isNew
						? 'Register a new POS terminal.'
						: 'View and edit terminal details.')
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
							<>
								{specCardProps?.sections ? (
									renderSpecSections(Form, specCardProps.sections)
								) : (
									<div className='grid gap-4 pt-4'>
										{!isNew && (
											<Form.Field
												name='terminalCode'
												render={({ field }) => (
													<Form.Item>
														<Form.Label>Terminal Code</Form.Label>
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
											name='name'
											rules={{ required: 'Name is required' }}
											render={({ field }) => (
												<Form.Item>
													<Form.Label>Name</Form.Label>
													<Form.Control
														render={
															<Form.Input
																{...field}
																placeholder='Terminal name…'
															/>
														}
													/>
													<Form.Message />
												</Form.Item>
											)}
										/>

										<Form.Field
											name='locationCode'
											rules={{ required: 'Location is required' }}
											render={({ field }) => (
												<Form.Item>
													<Form.Label>Location</Form.Label>
													<Form.Control>
														<Form.Combo
															value={field.value}
															onValueChange={field.onChange}
															itemToStringLabel={(code: string) => {
																const loc = (locationsList?.items ?? []).find(
																	(l: Record<string, unknown>) =>
																		l.code === code,
																) as Record<string, unknown> | undefined
																return loc
																	? `${loc.code as string} - ${loc.name as string}`
																	: code
															}}
														>
															<Form.Combo.Input
																showClear
																placeholder='Search locations…'
															/>
															<Form.Combo.Content>
																<Form.Combo.List>
																	{(locationsList?.items ?? []).map(
																		(l: Record<string, unknown>) => (
																			<Form.Combo.Item
																				key={l._id as string}
																				value={l.code as string}
																			>
																				{l.code as string} - {l.name as string}
																			</Form.Combo.Item>
																		),
																	)}
																	<Form.Combo.Empty>
																		No locations found
																	</Form.Combo.Empty>
																</Form.Combo.List>
															</Form.Combo.Content>
														</Form.Combo>
													</Form.Control>
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
																TERMINAL_STATUS_LABELS[
																	currentStatus as TerminalStatus
																] ?? currentStatus
															}
														/>
													</Form.Select.Trigger>
													<Form.Select.Content>
														<Form.Select.Item value={currentStatus}>
															{TERMINAL_STATUS_LABELS[
																currentStatus as TerminalStatus
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
									</div>
								)}
							</>
						)}
					</Form>
				)}
			</RecordDialog>
			{reasonDialog}
		</>
	)
}
