'use client'

import type { ReportElement } from '@server/reporting/designer-contracts'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { fromPoints, toPoints } from '../utils'

function NumberField({
	label,
	value,
	onChange,
}: {
	label: string
	value: number
	onChange: (value: number) => void
}) {
	return (
		<div className='space-y-1'>
			<Label className='text-[11px] text-slate-600'>{label}</Label>
			<Input
				type='number'
				value={Number.isFinite(value) ? value : 0}
				onChange={(event) => onChange(Number(event.target.value || 0))}
				className='h-7 text-[11px]'
			/>
		</div>
	)
}

export function PositionTab({
	element,
	unit,
	onUpdate,
}: {
	element: ReportElement
	unit: 'pt' | 'mm' | 'in'
	onUpdate: (patch: Partial<ReportElement>) => void
}) {
	return (
		<div className='space-y-2'>
			<div className='grid grid-cols-2 gap-2'>
				<NumberField
					label={`X (${unit})`}
					value={fromPoints(element.x, unit)}
					onChange={(value) => onUpdate({ x: toPoints(value, unit) })}
				/>
				<NumberField
					label={`Y (${unit})`}
					value={fromPoints(element.y, unit)}
					onChange={(value) => onUpdate({ y: toPoints(value, unit) })}
				/>
				<NumberField
					label={`W (${unit})`}
					value={fromPoints(element.width, unit)}
					onChange={(value) => onUpdate({ width: toPoints(value, unit) })}
				/>
				<NumberField
					label={`H (${unit})`}
					value={fromPoints(element.height, unit)}
					onChange={(value) => onUpdate({ height: toPoints(value, unit) })}
				/>
			</div>
		</div>
	)
}
