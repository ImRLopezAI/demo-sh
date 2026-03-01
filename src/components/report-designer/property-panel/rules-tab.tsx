'use client'

import type { ReportElement } from '@server/reporting/designer-contracts'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function RulesTab({
	element,
	onUpdate,
}: {
	element: ReportElement
	onUpdate: (patch: Partial<ReportElement>) => void
}) {
	return (
		<div className='space-y-2'>
			<div className='space-y-1'>
				<Label className='text-[11px] text-muted-foreground'>
					Conditional visibility
				</Label>
				<Input
					name='conditional-visibility'
					autoComplete='off'
					aria-label='Conditional visibility'
					value={element.visibility ?? ''}
					onChange={(event) => onUpdate({ visibility: event.target.value })}
					placeholder='=Fields.status == "Draft"'
					className='h-8 font-mono text-[11px]'
				/>
			</div>
			<div className='text-[10px] text-muted-foreground'>
				Use the expression language to toggle visibility or create rule-based
				labels.
			</div>
		</div>
	)
}
