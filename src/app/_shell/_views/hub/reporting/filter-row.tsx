import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import type { FilterFieldDef, FilterRow as FilterRowType } from './types'

export function FilterRow({
	filter,
	fields,
	onUpdate,
	onRemove,
}: {
	filter: FilterRowType
	fields: FilterFieldDef[]
	onUpdate: (patch: Partial<FilterRowType>) => void
	onRemove: () => void
}) {
	const selectedField = fields.find((f) => f.key === filter.field)

	return (
		<div className='flex items-center gap-2'>
			<Select
				value={filter.field}
				onValueChange={(val) => {
					if (val) onUpdate({ field: val, value: '' })
				}}
			>
				<SelectTrigger className='h-8 w-[140px] text-xs'>
					<SelectValue placeholder='Field...' />
				</SelectTrigger>
				<SelectContent>
					{fields.map((f) => (
						<SelectItem key={f.key} value={f.key}>
							{f.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			<div className='flex-1'>
				<FilterValueInput
					field={selectedField}
					value={filter.value}
					onChange={(value) => onUpdate({ value })}
				/>
			</div>

			<Button
				type='button'
				variant='ghost'
				size='sm'
				onClick={onRemove}
				className='h-8 w-8 shrink-0 p-0 text-muted-foreground hover:text-destructive'
			>
				<X className='size-3.5' aria-hidden='true' />
			</Button>
		</div>
	)
}

function FilterValueInput({
	field,
	value,
	onChange,
}: {
	field: FilterFieldDef | undefined
	value: string | number | boolean | null
	onChange: (value: string | number | boolean | null) => void
}) {
	if (!field) {
		return (
			<Input
				value={String(value ?? '')}
				onChange={(e) => onChange(e.target.value)}
				placeholder='Select a field first'
				className='h-8 text-xs'
				disabled
			/>
		)
	}

	switch (field.type) {
		case 'enum':
			return (
				<Select
					value={String(value ?? '')}
					onValueChange={(val) => {
						if (val) onChange(val)
					}}
				>
					<SelectTrigger className='h-8 text-xs'>
						<SelectValue placeholder='Select value...' />
					</SelectTrigger>
					<SelectContent>
						{field.options?.map((opt) => (
							<SelectItem key={opt} value={opt}>
								{opt}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			)
		case 'number':
			return (
				<Input
					type='number'
					value={value !== null && value !== '' ? Number(value) : ''}
					onChange={(e) =>
						onChange(e.target.value ? Number(e.target.value) : null)
					}
					placeholder='Enter number...'
					className='h-8 text-xs'
				/>
			)
		case 'boolean':
			return (
				<div className='flex h-8 items-center'>
					<Switch
						checked={Boolean(value)}
						onCheckedChange={(checked) => onChange(checked)}
					/>
				</div>
			)
		default:
			return (
				<Input
					value={String(value ?? '')}
					onChange={(e) => onChange(e.target.value)}
					placeholder='Enter value...'
					className='h-8 text-xs'
				/>
			)
	}
}
