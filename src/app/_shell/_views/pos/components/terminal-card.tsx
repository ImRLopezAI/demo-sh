import * as React from 'react'
import { Button } from '@/components/ui/button'
import { useCreateForm } from '@/components/ui/form'
import { RecordDialog } from '../../_shared/record-dialog'
import { StatusBadge } from '../../_shared/status-badge'
import { useEntityMutations, useEntityRecord } from '../../_shared/use-entity'

interface TerminalFormValues {
	terminalCode: string
	name: string
	locationCode: string
	status: 'ONLINE' | 'OFFLINE' | 'MAINTENANCE'
}

export function TerminalCard({
	selectedId,
	onClose,
}: {
	selectedId: string | null
	onClose: () => void
}) {
	const isNew = selectedId === 'new'
	const isOpen = selectedId !== null

	const { data: record, isLoading: recordLoading } = useEntityRecord(
		'pos',
		'terminals',
		selectedId,
		{ enabled: !isNew && isOpen },
	)

	const { create, update } = useEntityMutations('pos', 'terminals')

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
				status: resolvedRecord?.status ?? 'OFFLINE',
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
				status: record.status ?? 'OFFLINE',
			})
		} else if (isNew) {
			form.reset({
				terminalCode: '',
				name: '',
				locationCode: '',
				status: 'OFFLINE',
			})
		}
	}, [record, isNew, form])

	const dialogTitle = isNew
		? 'New Terminal'
		: `Terminal ${resolvedRecord?.terminalCode ?? ''}`

	return (
		<RecordDialog
			open={isOpen}
			onOpenChange={(open) => !open && onClose()}
			title={dialogTitle}
			description={
				isNew
					? 'Register a new POS terminal.'
					: 'View and edit terminal details.'
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
													placeholder='Terminal name\u2026'
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
										<Form.Label>Location Code</Form.Label>
										<Form.Control
											render={
												<Form.Input
													{...field}
													placeholder='Location code\u2026'
												/>
											}
										/>
										<Form.Message />
									</Form.Item>
								)}
							/>

							{!isNew && (
								<Form.Field
									name='status'
									render={({ field }) => (
										<Form.Item>
											<Form.Label>Status</Form.Label>
											<Form.Control
												render={<StatusBadge status={field.value as string} />}
											/>
										</Form.Item>
									)}
								/>
							)}
						</div>
					)}
				</Form>
			)}
		</RecordDialog>
	)
}
