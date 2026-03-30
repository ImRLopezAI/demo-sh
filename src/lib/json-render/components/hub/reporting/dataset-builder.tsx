import type {
	DataSetDefinition,
	DataSetField,
	TopLevelRelatedField,
} from '@server/reporting/contracts'
import {
	ChevronDown,
	ChevronUp,
	Database,
	Link2,
	Plus,
	Trash2,
} from 'lucide-react'
import * as React from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { useCreateForm } from '@/components/ui/form'
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
	InputGroupText,
} from '@/components/ui/input-group'
import { Label } from '@/components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { TABLE_RELATIONSHIPS } from './constants'

interface DatasetBuilderProps {
	definition: DataSetDefinition | null
	availableTables: Array<{ table: string; fields: string[] }>
	onChange: (definition: DataSetDefinition) => void
	onClear: () => void
}

const EMPTY_DEFINITION: DataSetDefinition = {
	type: 'list',
	primaryTable: '',
	fields: [],
}

export function DatasetBuilder({
	definition,
	availableTables,
	onChange,
	onClear,
}: DatasetBuilderProps) {
	const def = definition ?? EMPTY_DEFINITION
	const primaryTableMeta = availableTables.find(
		(t) => t.table === def.primaryTable,
	)

	function updateDef(patch: Partial<DataSetDefinition>) {
		onChange({ ...def, ...patch })
	}

	function toggleField(fieldName: string, label: string) {
		const existing = def.fields.find(
			(f) => !('type' in f) && f.name === fieldName,
		)
		if (existing) {
			updateDef({
				fields: def.fields.filter(
					(f) => !(!('type' in f) && f.name === fieldName),
				),
			})
		} else {
			updateDef({
				fields: [
					...def.fields,
					{ name: fieldName, label } satisfies DataSetField,
				],
			})
		}
	}

	function isFieldSelected(fieldName: string): boolean {
		return def.fields.some((f) => !('type' in f) && f.name === fieldName)
	}

	function addRelation() {
		const newRelation: TopLevelRelatedField = {
			type: 'related',
			name: '',
			label: '',
			relatedModel: '',
			joinField: '',
			fields: [],
		}
		updateDef({ fields: [...def.fields, newRelation] })
	}

	function updateRelation(index: number, patch: Partial<TopLevelRelatedField>) {
		const updated = [...def.fields]
		const relatedFields = updated.filter(
			(f): f is TopLevelRelatedField => 'type' in f && f.type === 'related',
		)
		const target = relatedFields[index]
		if (!target) return

		const actualIndex = updated.indexOf(target)
		updated[actualIndex] = { ...target, ...patch }
		updateDef({ fields: updated })
	}

	function removeRelation(index: number) {
		const relatedFields = def.fields.filter(
			(f): f is TopLevelRelatedField => 'type' in f && f.type === 'related',
		)
		const target = relatedFields[index]
		if (!target) return
		updateDef({ fields: def.fields.filter((f) => f !== target) })
	}

	const relatedFields = def.fields.filter(
		(f): f is TopLevelRelatedField => 'type' in f && f.type === 'related',
	)

	const validRelations = TABLE_RELATIONSHIPS[def.primaryTable] ?? []

	const hasDefinition = def.primaryTable.length > 0

	return (
		<div className='space-y-3'>
			<div className='flex items-center justify-between'>
				<Label className='font-medium text-sm'>Dataset Definition</Label>
				{hasDefinition && (
					<Button
						type='button'
						variant='ghost'
						size='sm'
						onClick={onClear}
						className='h-7 gap-1 text-muted-foreground text-xs hover:text-destructive'
					>
						<Trash2 className='size-3' aria-hidden='true' />
						Clear
					</Button>
				)}
			</div>

			{!hasDefinition ? (
				<Card className='flex flex-col items-center gap-3 px-4 py-6'>
					<Database
						className='size-8 text-muted-foreground/40'
						aria-hidden='true'
					/>
					<p className='text-center text-muted-foreground text-xs'>
						Configure a dataset to control which data populates your report.
						Select a primary table and choose fields to include.
					</p>
					<div className='w-full max-w-[220px]'>
						<Select
							value=''
							onValueChange={(val) => {
								if (val) updateDef({ primaryTable: val, fields: [] })
							}}
						>
							<SelectTrigger className='h-8 text-xs'>
								<SelectValue placeholder='Select primary table...' />
							</SelectTrigger>
							<SelectContent>
								{availableTables.map((t) => (
									<SelectItem key={t.table} value={t.table}>
										{t.table}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</Card>
			) : (
				<div className='space-y-3'>
					{/* Primary table + type toggle */}
					<Card className='space-y-3 p-3'>
						<div className='flex items-center gap-2'>
							<Database
								className='size-4 shrink-0 text-muted-foreground'
								aria-hidden='true'
							/>
							<Select
								value={def.primaryTable}
								onValueChange={(val) => {
									if (val) updateDef({ primaryTable: val, fields: [] })
								}}
							>
								<SelectTrigger className='h-7 flex-1 text-xs'>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{availableTables.map((t) => (
										<SelectItem key={t.table} value={t.table}>
											{t.table}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<div className='flex items-center gap-1.5'>
								<span className='text-[10px] text-muted-foreground'>
									{def.type === 'single' ? 'Single' : 'List'}
								</span>
								<Switch
									size='sm'
									checked={def.type === 'list'}
									onCheckedChange={(checked) =>
										updateDef({ type: checked ? 'list' : 'single' })
									}
								/>
							</div>
						</div>
					</Card>

					{/* Direct fields from primary table */}
					{primaryTableMeta && primaryTableMeta.fields.length > 0 && (
						<Card className='p-3'>
							<Label className='mb-2 block text-muted-foreground text-xs'>
								Fields from{' '}
								<span className='font-mono text-foreground'>
									{def.primaryTable}
								</span>
							</Label>
							<div className='grid grid-cols-2 gap-x-3 gap-y-1.5'>
								{primaryTableMeta.fields.map((fieldName) => (
									<label
										key={fieldName}
										className='flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 hover:bg-muted/40'
									>
										<Checkbox
											checked={isFieldSelected(fieldName)}
											onCheckedChange={() => toggleField(fieldName, fieldName)}
										/>
										<span className='truncate font-mono text-[11px]'>
											{fieldName}
										</span>
									</label>
								))}
							</div>
						</Card>
					)}

					{/* Related entities */}
					<div className='space-y-2'>
						<div className='flex items-center justify-between'>
							<Label className='text-muted-foreground text-xs'>
								Related Entities
							</Label>
							{validRelations.length > 0 ? (
								<Button
									type='button'
									variant='outline'
									size='sm'
									onClick={addRelation}
									className='h-6 gap-1 text-[10px]'
								>
									<Plus className='size-3' aria-hidden='true' />
									Add Relation
								</Button>
							) : (
								<span className='text-[10px] text-muted-foreground/60'>
									No known relations
								</span>
							)}
						</div>

						{def.type === 'single' && validRelations.length > 0 && (
							<p className='text-[10px] text-muted-foreground/70'>
								<span className='font-medium'>Lookup</span> relations fetch a
								single parent/master record.{' '}
								<span className='font-medium'>Has-many</span> relations pull
								child line items.
							</p>
						)}

						{relatedFields.length === 0 ? (
							<p className='py-2 text-center text-[11px] text-muted-foreground/70'>
								No related entities configured.
							</p>
						) : (
							relatedFields.map((rel, idx) => (
								<RelatedEntityCard
									key={idx}
									relation={rel}
									primaryTable={def.primaryTable}
									primaryTableFields={primaryTableMeta?.fields ?? []}
									availableTables={availableTables}
									onUpdate={(patch) => updateRelation(idx, patch)}
									onRemove={() => removeRelation(idx)}
								/>
							))
						)}
					</div>
				</div>
			)}
		</div>
	)
}

interface RelatedEntityFormValues {
	name: string
	relatedModel: string
	joinField: string
	relatedJoinField: string
}

function RelatedEntityCard({
	relation,
	primaryTable,
	primaryTableFields,
	availableTables,
	onUpdate,
	onRemove,
}: {
	relation: TopLevelRelatedField
	primaryTable: string
	primaryTableFields: string[]
	availableTables: Array<{ table: string; fields: string[] }>
	onUpdate: (patch: Partial<TopLevelRelatedField>) => void
	onRemove: () => void
}) {
	const [expanded, setExpanded] = React.useState(true)

	// Stable ref so the watch subscription never goes stale
	const onUpdateRef = React.useRef(onUpdate)
	onUpdateRef.current = onUpdate

	const [Form, form] = useCreateForm<RelatedEntityFormValues>(
		() => ({
			defaultValues: {
				name: relation.name,
				relatedModel: relation.relatedModel,
				joinField: relation.joinField ?? '',
				relatedJoinField: relation.relatedJoinField ?? '',
			},
			onSubmit: () => {},
		}),
		// eslint-disable-next-line react-hooks/exhaustive-deps -- initialise once per mount
		[],
	)

	const relatedModel = form.watch('relatedModel')
	const relatedTableMeta = availableTables.find((t) => t.table === relatedModel)

	const validRelations = TABLE_RELATIONSHIPS[primaryTable] ?? []

	function handleRelatedTableChange(tableName: string) {
		const match = validRelations.find((r) => r.relatedTable === tableName)
		form.setValue('relatedModel', tableName)
		if (match) {
			form.setValue('name', match.suggestedAlias)
			form.setValue('joinField', match.joinField)
			form.setValue('relatedJoinField', match.relatedJoinField)
			onUpdateRef.current({
				relatedModel: tableName,
				name: match.suggestedAlias,
				label: match.suggestedAlias,
				joinField: match.joinField,
				relatedJoinField: match.relatedJoinField,
				fields: [],
			})
		} else {
			onUpdateRef.current({
				relatedModel: tableName,
				fields: [],
			})
		}
	}

	function toggleRelField(fieldName: string) {
		const existing = relation.fields.find(
			(f) => !('type' in f) && f.name === fieldName,
		)
		if (existing) {
			onUpdate({
				fields: relation.fields.filter(
					(f) => !(!('type' in f) && f.name === fieldName),
				),
			})
		} else {
			onUpdate({
				fields: [...relation.fields, { name: fieldName, label: fieldName }],
			})
		}
	}

	function isRelFieldSelected(fieldName: string): boolean {
		return relation.fields.some((f) => !('type' in f) && f.name === fieldName)
	}

	// Determine relation type for badge display
	const matchedRelation = validRelations.find(
		(r) => r.relatedTable === relatedModel,
	)
	const relationType = matchedRelation
		? matchedRelation.relationType
		: relation.relatedJoinField
			? 'has-many'
			: 'lookup'

	return (
		<Card className='overflow-hidden'>
			<div className='flex items-center gap-2 px-3 py-2'>
				<Link2
					className='size-3.5 shrink-0 text-muted-foreground'
					aria-hidden='true'
				/>
				<Badge variant='outline' className='shrink-0 text-[10px]'>
					{relationType}
				</Badge>
				<span className='min-w-0 flex-1 truncate font-mono text-muted-foreground text-xs'>
					{relation.name || '(unnamed)'}
				</span>
				<Button
					type='button'
					variant='ghost'
					size='sm'
					onClick={() => setExpanded(!expanded)}
					className='h-6 w-6 shrink-0 p-0'
				>
					{expanded ? (
						<ChevronUp className='size-3' aria-hidden='true' />
					) : (
						<ChevronDown className='size-3' aria-hidden='true' />
					)}
				</Button>
				<Button
					type='button'
					variant='ghost'
					size='sm'
					onClick={onRemove}
					className='h-6 w-6 shrink-0 p-0 text-muted-foreground hover:text-destructive'
				>
					<Trash2 className='size-3' aria-hidden='true' />
				</Button>
			</div>

			{expanded && (
				<Form>
					{() => (
						<div className='space-y-2.5 border-border/60 border-t px-3 py-2.5'>
							{/* Alias + Related Table */}
							<div className='grid grid-cols-2 gap-2'>
								<Form.Field
									name='name'
									rules={{ required: 'Alias is required' }}
									render={({ field }) => (
										<Form.Item className='gap-1'>
											<InputGroup>
												<InputGroupAddon align='inline-start'>
													<InputGroupText>Alias</InputGroupText>
												</InputGroupAddon>
												<InputGroupInput
													{...field}
													onChange={(e) => {
														field.onChange(e)
														onUpdateRef.current({
															name: e.target.value,
															label: e.target.value,
														})
													}}
													placeholder='e.g. customer'
													className='font-mono text-[11px]'
												/>
											</InputGroup>
											<Form.Message />
										</Form.Item>
									)}
								/>

								<Form.Field
									name='relatedModel'
									rules={{ required: 'Table is required' }}
									render={({ field }) => (
										<Form.Item className='gap-1'>
											<Form.Label className='text-[10px] text-muted-foreground'>
												Related Table
											</Form.Label>
											<Form.Select
												value={field.value}
												onValueChange={(val) => {
													if (val) handleRelatedTableChange(val)
												}}
											>
												<Form.Select.Trigger className='h-7 text-[11px]'>
													<Form.Select.Value placeholder='Select...' />
												</Form.Select.Trigger>
												<Form.Select.Content>
													{validRelations.map((rel) => (
														<Form.Select.Item
															key={rel.relatedTable}
															value={rel.relatedTable}
														>
															<span className='flex items-center gap-1.5'>
																{rel.label}
																<Badge
																	variant='secondary'
																	className='ml-auto px-1 py-0 text-[9px]'
																>
																	{rel.relationType}
																</Badge>
															</span>
														</Form.Select.Item>
													))}
													{availableTables.length > 0 && (
														<>
															<Form.Select.Separator />
															{availableTables
																.filter(
																	(t) =>
																		!validRelations.some(
																			(r) => r.relatedTable === t.table,
																		),
																)
																.map((t) => (
																	<Form.Select.Item
																		key={t.table}
																		value={t.table}
																	>
																		<span className='text-muted-foreground'>
																			{t.table}
																		</span>
																	</Form.Select.Item>
																))}
														</>
													)}
												</Form.Select.Content>
											</Form.Select>
											<Form.Message />
										</Form.Item>
									)}
								/>
							</div>

							{/* Join fields */}
							<div className='grid grid-cols-2 gap-2'>
								<Form.Field
									name='joinField'
									render={({ field }) => (
										<Form.Item className='gap-1'>
											<Form.Label className='text-[10px] text-muted-foreground'>
												Join (primary field)
											</Form.Label>
											<Form.Select
												value={field.value}
												onValueChange={(val) => {
													if (val) {
														field.onChange(val)
														onUpdateRef.current({
															joinField: val,
														})
													}
												}}
											>
												<Form.Select.Trigger className='h-7 font-mono text-[11px]'>
													<Form.Select.Value placeholder='Select field...' />
												</Form.Select.Trigger>
												<Form.Select.Content>
													{primaryTableFields.map((f) => (
														<Form.Select.Item key={f} value={f}>
															{f}
														</Form.Select.Item>
													))}
												</Form.Select.Content>
											</Form.Select>
										</Form.Item>
									)}
								/>

								<Form.Field
									name='relatedJoinField'
									render={({ field }) => (
										<Form.Item className='gap-1'>
											<Form.Label className='text-[10px] text-muted-foreground'>
												FK (related field)
											</Form.Label>
											<Form.Select
												value={field.value}
												onValueChange={(val) => {
													if (val) {
														field.onChange(val)
														onUpdateRef.current({
															relatedJoinField: val || undefined,
														})
													}
												}}
											>
												<Form.Select.Trigger className='h-7 font-mono text-[11px]'>
													<Form.Select.Value placeholder='Select field...' />
												</Form.Select.Trigger>
												<Form.Select.Content>
													{relatedTableMeta?.fields.map((f) => (
														<Form.Select.Item key={f} value={f}>
															{f}
														</Form.Select.Item>
													)) ?? (
														<Form.Select.Item value='_' disabled>
															Select a related table first
														</Form.Select.Item>
													)}
												</Form.Select.Content>
											</Form.Select>
										</Form.Item>
									)}
								/>
							</div>

							{/* Related table fields */}
							{relatedTableMeta && relatedTableMeta.fields.length > 0 && (
								<div>
									<Label className='mb-1.5 block text-[10px] text-muted-foreground'>
										Include Fields
									</Label>
									<div className='grid grid-cols-2 gap-x-3 gap-y-1'>
										{relatedTableMeta.fields.map((fieldName) => (
											<label
												key={fieldName}
												className='flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 hover:bg-muted/40'
											>
												<Checkbox
													checked={isRelFieldSelected(fieldName)}
													onCheckedChange={() => toggleRelField(fieldName)}
												/>
												<span className='truncate font-mono text-[10px]'>
													{fieldName}
												</span>
											</label>
										))}
									</div>
								</div>
							)}
						</div>
					)}
				</Form>
			)}
		</Card>
	)
}
