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
			<Label className='text-[11px] text-slate-600'>{label}</Label>
			<div className='flex items-center gap-1'>
				<input
					type='color'
					value={value}
					onChange={(event) => onChange(event.target.value)}
					className='h-7 w-8 rounded border border-slate-300 bg-transparent p-0.5'
				/>
				<Input
					value={value}
					onChange={(event) => onChange(event.target.value)}
					className='h-7 text-[11px]'
				/>
			</div>
		</div>
	)
}
