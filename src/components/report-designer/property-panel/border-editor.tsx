'use client'

import type { ReportElement } from '@server/reporting/designer-contracts'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function BorderEditor({
	element,
	onChange,
}: {
	element: ReportElement
	onChange: (patch: Partial<ReportElement>) => void
}) {
	const border = element.border?.top
	const width = border?.width ?? 0
	const color = border?.color ?? '#94a3b8'

	return (
		<div className='space-y-2'>
			<Label className='text-[11px] text-muted-foreground'>Border</Label>
			<div className='grid grid-cols-2 gap-2'>
				<Input
					type='number'
					name='border-width'
					autoComplete='off'
					aria-label='Border width'
					value={width}
					onChange={(event) => {
						const next = Number(event.target.value || 0)
						onChange({
							border: {
								top: { width: next, color, style: 'solid' },
								right: { width: next, color, style: 'solid' },
								bottom: { width: next, color, style: 'solid' },
								left: { width: next, color, style: 'solid' },
							},
						})
					}}
					className='h-7 text-[11px]'
				/>
				<input
					type='color'
					aria-label='Border color'
					value={color}
					onChange={(event) => {
						onChange({
							border: {
								top: { width, color: event.target.value, style: 'solid' },
								right: { width, color: event.target.value, style: 'solid' },
								bottom: { width, color: event.target.value, style: 'solid' },
								left: { width, color: event.target.value, style: 'solid' },
							},
						})
					}}
					className='h-7 w-full rounded-sm border border-border bg-transparent'
				/>
			</div>
		</div>
	)
}
