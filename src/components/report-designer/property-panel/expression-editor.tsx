'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DESIGNER_FUNCTIONS } from '../expressions/functions'
import { validateExpression } from '../expressions/parser'
import type { DesignerFieldItem } from '../types'

export function ExpressionEditor({
	label = 'Expression',
	value,
	onChange,
	fields,
	placeholder,
}: {
	label?: string
	value: string
	onChange: (value: string) => void
	fields: DesignerFieldItem[]
	placeholder?: string
}) {
	const error = value ? validateExpression(value) : null
	return (
		<div className='space-y-1'>
			<Label className='text-[11px] text-muted-foreground'>{label}</Label>
			<Input
				name={label.toLowerCase().replace(/\s+/g, '-')}
				autoComplete='off'
				aria-label={label}
				value={value}
				onChange={(event) => onChange(event.target.value)}
				placeholder={placeholder ?? '=Fields.value…'}
				className='h-8 font-mono text-[11px]'
			/>
			{error ? (
				<p className='text-[10px] text-rose-600'>{error}</p>
			) : (
				<p className='text-[10px] text-muted-foreground'>
					Functions: {DESIGNER_FUNCTIONS.join(', ')} · fields: {fields.length}
				</p>
			)}
		</div>
	)
}
