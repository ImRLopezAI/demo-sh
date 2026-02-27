import * as React from 'react'
import { Button } from '@/components/ui/button'
import { useCreateForm } from '@/components/ui/form'
import {
	RecordDialog,
	type RecordDialogActionGroup,
} from '../../_shared/record-dialog'
import { useEntityMutations, useEntityRecord } from '../../_shared/use-entity'

interface ShipmentMethod {
	_id: string
	code: string
	description: string
	active: boolean
}

export function ShipmentMethodCard({
	selectedId,
	onClose,
	presentation = 'dialog',
}: {
	selectedId: string | null
	onClose: () => void
	presentation?: 'dialog' | 'page'
}) {
	const isNew = selectedId === 'new'
	const open = selectedId !== null

	const { data: record, isLoading } = useEntityRecord(
		'trace',
		'shipmentMethods',
		selectedId,
		{ enabled: open && !isNew },
	)
	const method = record as ShipmentMethod | undefined

	const { create, update } = useEntityMutations('trace', 'shipmentMethods')

	const [Form, form] = useCreateForm<{
		code: string
		description: string
		active: boolean
	}>(
		() => ({
			defaultValues: {
				code: method?.code ?? '',
				description: method?.description ?? '',
				active: method?.active ?? true,
			},
			onSubmit: async (data) => {
				if (isNew) {
					await create.mutateAsync(data)
				} else if (selectedId) {
					await update.mutateAsync({ id: selectedId, data })
				}
				onClose()
			},
		}),
		[method, isNew, selectedId, create, update, onClose],
	)

	React.useEffect(() => {
		if (method && !isNew) {
			form.reset({
				code: method.code,
				description: method.description,
				active: method.active,
			})
		} else if (isNew) {
			form.reset({
				code: '',
				description: '',
				active: true,
			})
		}
	}, [method, isNew, form])

	const actionGroups = React.useMemo<RecordDialogActionGroup[]>(() => {
		if (isNew) return []
		return [
			{
				label: 'Related',
				items: [
					{
						label: 'Shipments Using Method',
						onClick: () => {
							/* TODO: implement navigation */
						},
					},
				],
			},
			{
				label: 'Navigate',
				items: [
					{
						label: 'Active Shipments',
						onClick: () => {
							/* TODO: implement navigation */
						},
					},
				],
			},
		]
	}, [isNew])

	return (
		<RecordDialog
			open={open}
			onOpenChange={(next) => {
				if (!next) onClose()
			}}
			presentation={presentation}
			title={
				isNew ? 'New Shipment Method' : `Shipment Method ${method?.code ?? ''}`
			}
			description='Manage shipment method carrier configuration.'
			actionGroups={actionGroups}
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
			{isLoading && !isNew ? (
				<div className='space-y-3'>
					{['method-skeleton-1', 'method-skeleton-2', 'method-skeleton-3'].map(
						(skeletonKey) => (
							<div
								key={skeletonKey}
								className='h-8 rounded bg-muted motion-safe:animate-pulse'
							/>
						),
					)}
				</div>
			) : (
				<Form>
					{() => (
						<div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
							<Form.Field
								name='code'
								rules={{ required: 'Code is required' }}
								render={({ field }) => (
									<Form.Item>
										<Form.Label>Code</Form.Label>
										<Form.Control>
											<Form.Input
												{...field}
												placeholder='e.g. EXPRESS'
												autoComplete='off'
											/>
										</Form.Control>
										<Form.Message />
									</Form.Item>
								)}
							/>
							<Form.Field
								name='description'
								rules={{ required: 'Description is required' }}
								render={({ field }) => (
									<Form.Item>
										<Form.Label>Description</Form.Label>
										<Form.Control>
											<Form.Input
												{...field}
												placeholder='Carrier and delivery profile'
												autoComplete='off'
											/>
										</Form.Control>
										<Form.Message />
									</Form.Item>
								)}
							/>
							<Form.Field
								name='active'
								render={({ field }) => (
									<Form.Item className='flex items-center gap-3 md:col-span-2'>
										<Form.Label>Active</Form.Label>
										<Form.Control>
											<Form.Switch
												checked={Boolean(field.value)}
												onCheckedChange={field.onChange}
											/>
										</Form.Control>
										<Form.Message />
									</Form.Item>
								)}
							/>
						</div>
					)}
				</Form>
			)}
		</RecordDialog>
	)
}
