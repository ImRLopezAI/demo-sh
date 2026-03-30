import {
	getLabeledTransitions,
	TRANSFER_STATUS_LABELS,
	TRANSFER_TRANSITIONS,
	type TransferStatus,
} from '@server/db/constants'
import { useRouter } from 'next/navigation'
import * as React from 'react'
import { useGrid } from '@/components/data-grid/compound'
import { Button } from '@/components/ui/button'
import { useCreateForm } from '@/components/ui/form'
import { useRecordReportGroup } from '@/hooks/use-record-report-group'
import { useModuleData, useModuleList } from '@/app/_shell/hooks/use-data'
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

interface TransferHeader {
	_id: string
	transferNo: string
	status: TransferStatus
	fromLocationCode: string
	toLocationCode: string
	shipmentDate: string
	receiptDate: string
	lineCount: number
}

interface TransferLine {
	_id: string
	transferNo: string
	lineNo: number
	itemId: string
	description: string
	quantity: number
	quantityShipped: number
	quantityReceived: number
}

export function TransferCard({
	recordId,
	onClose,
	onCreated,
	presentation = 'dialog',
	specCardProps,
}: {
	recordId: string | null
	onClose: () => void
	onCreated?: (id: string) => void
	presentation?: 'dialog' | 'page'
	specCardProps?: SpecCardProps
}) {
	const router = useRouter()
	const isNew = recordId === 'new'
	const open = recordId !== null

	const { data: record } = useEntityRecord(
		'replenishment',
		'transfers',
		recordId,
		{ enabled: open && !isNew },
	)
	const header = record as unknown as TransferHeader | undefined
	const lineFilters = React.useMemo(
		() => ({ transferNo: header?.transferNo ?? '__none__' }),
		[header?.transferNo],
	)

	const { items: linesFromApi, isLoading: linesLoading } = useModuleData<
		'replenishment',
		TransferLine
	>('replenishment', 'transferLines', 'overview', { filters: lineFilters })

	const { create, update, transitionStatus } = useEntityMutations(
		'replenishment',
		'transfers',
	)
	const {
		create: createLine,
		update: updateLine,
		remove: removeLine,
	} = useEntityMutations('replenishment', 'transferLines')

	const { data: locationsList } = useModuleList('insight', 'locations', {
		limit: 100,
	})
	const { data: itemsList } = useModuleList('market', 'items', {
		limit: 100,
	})
	const [draftLines, setDraftLines] = React.useState<TransferLine[]>([])

	const [Form, form] = useCreateForm<{
		transferNo: string
		fromLocationCode: string
		toLocationCode: string
		shipmentDate: string
		receiptDate: string
	}>(
		() => ({
			defaultValues: {
				transferNo: header?.transferNo ?? '',
				fromLocationCode: header?.fromLocationCode ?? '',
				toLocationCode: header?.toLocationCode ?? '',
				shipmentDate: header?.shipmentDate ?? '',
				receiptDate: header?.receiptDate ?? '',
			},
			onSubmit: async (data) => {
				if (isNew) {
					const createdTransfer = await create.mutateAsync(data)
					const transferNo = createdTransfer?.transferNo as string | undefined
					if (transferNo && draftLines.length > 0) {
						for (const [index, line] of draftLines.entries()) {
							await createLine.mutateAsync({
								transferNo,
								lineNo: line.lineNo || index + 1,
								itemId: line.itemId,
								quantity: line.quantity,
								quantityShipped: line.quantityShipped,
								quantityReceived: line.quantityReceived,
							})
						}
					}
					if (onCreated && createdTransfer?._id) {
						onCreated(createdTransfer._id)
					} else {
						onClose()
					}
					return
				}

				if (!recordId) return
				await update.mutateAsync({ id: recordId, data })
				onClose()
			},
		}),
		[
			header,
			recordId,
			isNew,
			create,
			update,
			createLine,
			draftLines,
			onClose,
			onCreated,
		],
	)

	React.useEffect(() => {
		if (header) {
			form.reset({
				transferNo: header.transferNo,
				fromLocationCode: header.fromLocationCode,
				toLocationCode: header.toLocationCode,
				shipmentDate: header.shipmentDate,
				receiptDate: header.receiptDate,
			})
		} else if (isNew) {
			form.reset({
				transferNo: '',
				fromLocationCode: '',
				toLocationCode: '',
				shipmentDate: new Date().toISOString(),
				receiptDate: '',
			})
		}
	}, [header, form, isNew])
	React.useEffect(() => {
		if (isNew && open) {
			setDraftLines([])
		}
	}, [isNew, open])

	const lines = React.useMemo(() => {
		if (isNew) return draftLines
		return header ? linesFromApi : []
	}, [isNew, draftLines, header, linesFromApi])

	const currentStatus = header?.status ?? 'DRAFT'
	const statusOptions = getLabeledTransitions(
		currentStatus as TransferStatus,
		TRANSFER_TRANSITIONS,
		TRANSFER_STATUS_LABELS,
	)

	const handleTransition = React.useCallback(
		async ({ toStatus, reason }: { toStatus: string; reason?: string }) => {
			if (!recordId) return
			await transitionStatus.mutateAsync({
				id: recordId,
				toStatus,
				reason,
			})
			onClose()
		},
		[recordId, transitionStatus, onClose],
	)

	const { requestTransition, reasonDialog } = useTransitionWithReason({
		moduleId: 'replenishment',
		entityId: 'transfers',
		disabled: transitionStatus.isPending,
		getStatusLabel: (status) =>
			TRANSFER_STATUS_LABELS[status as TransferStatus] ?? status,
		onTransition: handleTransition,
	})

	const reportGroup = useRecordReportGroup({
		moduleId: 'replenishment',
		entityId: 'transfers',
		recordId: recordId,
		isNew,
	})

	const LinesGrid = useGrid(
		() => ({
			data: lines,
			isLoading: linesLoading,
			readOnly: false,
			enableSearch: false,
			onRowAdd: async () => {
				const firstItem = itemsList?.items?.[0]
				if (!firstItem) return null
				if (isNew) {
					setDraftLines((prev) => [
						...prev,
						{
							_id: crypto.randomUUID(),
							transferNo: '',
							lineNo: prev.length + 1,
							itemId: firstItem._id as string,
							description: (firstItem.description as string | undefined) ?? '',
							quantity: 1,
							quantityShipped: 0,
							quantityReceived: 0,
						},
					])
					return null
				}

				const transferNo = header?.transferNo
				if (!transferNo) return null
				await createLine.mutateAsync({
					transferNo,
					itemId: firstItem._id as string,
					quantity: 1,
					quantityShipped: 0,
					quantityReceived: 0,
				})
				return null
			},
			onRowUpdate: async (row: TransferLine) => {
				if (isNew) {
					setDraftLines((prev) =>
						prev.map((line) =>
							line._id === row._id ? { ...line, ...row } : line,
						),
					)
					return
				}
				await updateLine.mutateAsync({
					id: row._id,
					data: row as unknown as Record<string, unknown>,
				})
			},
			onRowDelete: async (row: TransferLine) => {
				if (isNew) {
					setDraftLines((prev) => prev.filter((line) => line._id !== row._id))
					return
				}
				await removeLine.mutateAsync({ id: row._id })
			},
		}),
		[
			lines,
			linesLoading,
			isNew,
			header,
			itemsList?.items,
			createLine,
			updateLine,
			removeLine,
		],
	)

	const actionGroups = React.useMemo<RecordDialogActionGroup[]>(() => {
		if (isNew) return []
		return [
			{
				label: 'Actions',
				items: [
					{
						label: 'Ship Transfer',
						onClick: () => {
							/* TODO: implement ship action */
						},
						disabled: currentStatus !== 'RELEASED',
					},
					{
						label: 'Receive Transfer',
						onClick: () => {
							/* TODO: implement receive action */
						},
						disabled: currentStatus !== 'IN_TRANSIT',
					},
				],
			},
			{
				label: 'Related',
				items: [
					{
						label: 'From Location',
						onClick: () => router.push('/insight/locations'),
						disabled: !header?.fromLocationCode,
					},
					{
						label: 'To Location',
						onClick: () => router.push('/insight/locations'),
						disabled: !header?.toLocationCode,
					},
				],
			},
			{
				label: 'Navigate',
				items: [
					{
						label: 'Item Ledger Entries',
						onClick: () => router.push('/insight/item-ledger'),
					},
					{
						label: 'Transfers',
						onClick: () => router.push('/replenishment/transfers'),
					},
				],
			},
			...(reportGroup ? [reportGroup] : []),
		]
	}, [
		isNew,
		currentStatus,
		header?.fromLocationCode,
		header?.toLocationCode,
		router,
		reportGroup,
	])

	return (
		<>
			<RecordDialog
				open={open}
				onOpenChange={(next) => {
					if (!next) onClose()
				}}
				presentation={presentation}
				actionGroups={actionGroups}
				title={
					isNew
						? (specCardProps?.newTitle ?? 'New Transfer')
						: resolveCardTitle(
								specCardProps?.title,
								header as unknown as Record<string, unknown> | undefined,
								`Transfer ${header?.transferNo ?? ''}`,
							)
				}
				description={
					specCardProps?.description ?? 'Manage transfer header and lines.'
				}
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
				<div className='space-y-6'>
					<Form>
						{() => (
							<>
								{specCardProps?.sections ? (
									renderSpecSections(Form, specCardProps.sections)
								) : (
									<Form.Group className='grid grid-cols-3 gap-4'>
										<Form.Item>
											<Form.Label>Transfer No.</Form.Label>
											<Form.Field
												name='transferNo'
												render={({ field }) => (
													<Form.Control>
														<Form.Input
															{...field}
															readOnly
															autoComplete='off'
														/>
													</Form.Control>
												)}
											/>
										</Form.Item>

										<Form.Item>
											<Form.Label>Status</Form.Label>
											<Form.Select
												value={currentStatus}
												onValueChange={(toStatus) => {
													if (toStatus && toStatus !== currentStatus) {
														void requestTransition(toStatus)
													}
												}}
												disabled={isNew || statusOptions.length === 0}
											>
												<Form.Select.Trigger className='w-full'>
													<Form.Select.Value
														placeholder={
															TRANSFER_STATUS_LABELS[
																currentStatus as TransferStatus
															] ?? currentStatus
														}
													/>
												</Form.Select.Trigger>
												<Form.Select.Content>
													<Form.Select.Item value={currentStatus}>
														{TRANSFER_STATUS_LABELS[
															currentStatus as TransferStatus
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

										<Form.Field
											name='fromLocationCode'
											render={({ field }) => (
												<Form.Item>
													<Form.Label>From Location</Form.Label>
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
																placeholder='Search locations\u2026'
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
												</Form.Item>
											)}
										/>

										<Form.Field
											name='toLocationCode'
											render={({ field }) => (
												<Form.Item>
													<Form.Label>To Location</Form.Label>
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
																placeholder='Search locations\u2026'
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
												</Form.Item>
											)}
										/>

										<Form.Item>
											<Form.Label>Shipment Date</Form.Label>
											<Form.Field
												name='shipmentDate'
												render={({ field }) => (
													<Form.Control>
														<Form.DatePicker
															value={field.value}
															onValueChange={(date) =>
																field.onChange(date?.toISOString() ?? '')
															}
															placeholder='Select shipment date'
														/>
													</Form.Control>
												)}
											/>
										</Form.Item>

										<Form.Item>
											<Form.Label>Receipt Date</Form.Label>
											<Form.Field
												name='receiptDate'
												render={({ field }) => (
													<Form.Control>
														<Form.DatePicker
															value={field.value}
															onValueChange={(date) =>
																field.onChange(date?.toISOString() ?? '')
															}
															placeholder='Select receipt date'
														/>
													</Form.Control>
												)}
											/>
										</Form.Item>
									</Form.Group>
								)}
							</>
						)}
					</Form>

					<div className='space-y-2'>
						<h3 className='font-medium text-sm'>Transfer Lines</h3>
						<LinesGrid variant='compact' height={280}>
							<LinesGrid.Columns>
								<LinesGrid.Column<TransferLine>
									accessorKey='lineNo'
									title='Line No.'
									cellVariant='number'
								/>
								<LinesGrid.Column<TransferLine>
									accessorKey='itemId'
									title='Item'
									cellVariant='select'
									opts={{
										options: (itemsList?.items ?? []).map((item) => ({
											value: item._id as string,
											label: `${item.itemNo as string} - ${
												item.description as string
											}`,
										})),
									}}
								/>
								<LinesGrid.Column<TransferLine>
									accessorKey='description'
									title='Description'
								/>
								<LinesGrid.Column<TransferLine>
									accessorKey='quantity'
									title='Quantity'
									cellVariant='number'
								/>
								<LinesGrid.Column<TransferLine>
									accessorKey='quantityShipped'
									title='Qty Shipped'
									cellVariant='number'
								/>
								<LinesGrid.Column<TransferLine>
									accessorKey='quantityReceived'
									title='Qty Received'
									cellVariant='number'
								/>
							</LinesGrid.Columns>
						</LinesGrid>
					</div>
				</div>
			</RecordDialog>
			{reasonDialog}
		</>
	)
}
