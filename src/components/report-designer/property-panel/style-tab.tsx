'use client'

import type { ReportElement } from '@server/reporting/designer-contracts'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
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
					<Label className='text-[11px] text-muted-foreground'>Size</Label>
					<Input
						type='number'
						name='font-size'
						autoComplete='off'
						aria-label='Font size'
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
					<Label className='text-[11px] text-muted-foreground'>Align</Label>
					<Select
						value={font.align}
						onValueChange={(value) =>
							onUpdate({
								font: {
									...font,
									align: value as 'left' | 'center' | 'right',
								},
							})
						}
					>
						<SelectTrigger className='h-7 text-[11px]'>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value='left'>Left</SelectItem>
							<SelectItem value='center'>Center</SelectItem>
							<SelectItem value='right'>Right</SelectItem>
						</SelectContent>
					</Select>
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
