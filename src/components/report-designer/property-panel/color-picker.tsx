'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function ColorPicker({
	label,
	value,
	onChange,
}: {
	label: string
	value: string
	onChange: (value: string) => void
}) {
	return (
		<div className='space-y-1'>
			<Label className='text-[11px] text-muted-foreground'>{label}</Label>
			<div className='flex items-center gap-1'>
				<input
					type='color'
					aria-label={`${label} picker`}
					value={value}
					onChange={(event) => onChange(event.target.value)}
					className='h-7 w-8 rounded-sm border border-border bg-transparent p-0.5'
				/>
				<Input
					name={label.toLowerCase().replace(/\s+/g, '-')}
					autoComplete='off'
					aria-label={label}
					value={value}
					onChange={(event) => onChange(event.target.value)}
					className='h-7 text-[11px]'
				/>
			</div>
		</div>
	)
}
