'use client'

import type { ReportElement } from '@server/reporting/designer-contracts'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BorderEditor } from './border-editor'
import { ColorPicker } from './color-picker'
import { FontPicker } from './font-picker'

export function StyleTab({
	element,
	onUpdate,
}: {
	element: ReportElement
	onUpdate: (patch: Partial<ReportElement>) => void
}) {
	const font = element.font ?? {
		family: 'Helvetica' as const,
		size: 11,
		weight: 'normal' as const,
		style: 'normal' as const,
		color: '#111827',
		align: 'left' as const,
		lineHeight: 1.2,
	}

	return (
		<div className='space-y-2'>
			<FontPicker
				value={font.family}
				onChange={(family) =>
					onUpdate({
						font: {
							...font,
							family,
						},
					})
				}
			/>
			<div className='grid grid-cols-2 gap-2'>
				<div className='space-y-1'>
					<Label className='text-[11px] text-slate-600'>Size</Label>
					<Input
						type='number'
						value={font.size}
						onChange={(event) =>
							onUpdate({
								font: {
									...font,
									size: Number(event.target.value || 10),
								},
							})
						}
						className='h-7 text-[11px]'
					/>
				</div>
				<div className='space-y-1'>
					<Label className='text-[11px] text-slate-600'>Align</Label>
					<select
						value={font.align}
						onChange={(event) =>
							onUpdate({
								font: {
									...font,
									align: event.target.value as 'left' | 'center' | 'right',
								},
							})
						}
						className='h-7 w-full rounded border border-slate-300 bg-white px-2 text-[11px]'
					>
						<option value='left'>Left</option>
						<option value='center'>Center</option>
						<option value='right'>Right</option>
					</select>
				</div>
			</div>
			<ColorPicker
				label='Text color'
				value={font.color}
				onChange={(color) =>
					onUpdate({
						font: {
							...font,
							color,
						},
					})
				}
			/>
			<ColorPicker
				label='Background'
				value={element.background ?? '#ffffff'}
				onChange={(background) => onUpdate({ background })}
			/>
			<BorderEditor element={element} onChange={onUpdate} />
		</div>
	)
}
