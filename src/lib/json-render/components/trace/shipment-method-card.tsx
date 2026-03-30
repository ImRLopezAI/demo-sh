import { useRouter } from 'next/navigation'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { useCreateForm } from '@/components/ui/form'
import { useRecordReportGroup } from '@/hooks/use-record-report-group'
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
	specCardProps,
}: {
	selectedId: string | null
	onClose: () => void
	presentation?: 'dialog' | 'page'
	specCardProps?: SpecCardProps
}) {
	const router = useRouter()
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

	const reportGroup = useRecordReportGroup({
		moduleId: 'trace',
		entityId: 'shipmentMethods',
		recordId: selectedId,
		isNew,
	})

	const actionGroups = React.useMemo<RecordDialogActionGroup[]>(() => {
		if (isNew) return []
		return [
			{
				label: 'Related',
				items: [
					{
						label: 'Shipments Using Method',
						onClick: () => router.push('/trace/shipments'),
					},
				],
			},
			{
				label: 'Navigate',
				items: [
					{
						label: 'Shipments',
						onClick: () => router.push('/trace/shipments'),
					},
				],
			},
			...(reportGroup ? [reportGroup] : []),
		]
	}, [isNew, router, reportGroup])

	return (
		<RecordDialog
			open={open}
			onOpenChange={(next) => {
				if (!next) onClose()
			}}
			presentation={presentation}
			title={
				isNew
					? (specCardProps?.newTitle ?? 'New Shipment Method')
					: resolveCardTitle(
							specCardProps?.title,
							method as any,
							`Shipment Method ${method?.code ?? ''}`,
						)
			}
			description={
				specCardProps?.description ??
				'Manage shipment method carrier configuration.'
			}
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
						<>
							{specCardProps?.sections ? (
								renderSpecSections(Form, specCardProps.sections)
							) : (
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
						</>
					)}
				</Form>
			)}
		</RecordDialog>
	)
}
