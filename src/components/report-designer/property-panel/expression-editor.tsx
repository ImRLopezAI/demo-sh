'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DESIGNER_FUNCTIONS } from '../expressions/functions'
import { validateExpression } from '../expressions/parser'
import type { DesignerFieldItem } from '../types'

export function ExpressionEditor({
	value,
	onChange,
	fields,
	placeholder,
}: {
	value: string
	onChange: (value: string) => void
	fields: DesignerFieldItem[]
	placeholder?: string
}) {
	const error = value ? validateExpression(value) : null
	return (
		<div className='space-y-1'>
			<Label className='text-[11px] text-slate-600'>Expression</Label>
			<Input
				value={value}
				onChange={(event) => onChange(event.target.value)}
				placeholder={placeholder ?? '=Fields.value'}
				className='h-8 font-mono text-[11px]'
			/>
			{error ? (
				<p className='text-[10px] text-rose-600'>{error}</p>
			) : (
				<p className='text-[10px] text-slate-500'>
					Functions: {DESIGNER_FUNCTIONS.join(', ')} · fields: {fields.length}
				</p>
			)}
		</div>
	)
}
