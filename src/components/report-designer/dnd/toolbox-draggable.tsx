'use client'

import type { ReportElement } from '@server/reporting/designer-contracts'
import { cn } from '@/lib/utils'

export function ToolboxDraggable({
	kind,
	label,
	className,
}: {
	kind: ReportElement['kind']
	label: string
	className?: string
}) {
	return (
		<button
			type='button'
			draggable
			onDragStart={(event) => {
				event.dataTransfer.effectAllowed = 'copy'
				event.dataTransfer.setData('designer-element-kind', kind)
			}}
			className={cn(
				'flex w-full items-center justify-between rounded border border-slate-300/70 bg-white/80 px-2 py-1.5 font-medium text-[11px] text-slate-700 shadow-sm transition hover:border-amber-300 hover:bg-amber-50',
				className,
			)}
		>
			<span>{label}</span>
			<span className='font-mono text-[10px] text-slate-500'>{kind}</span>
		</button>
	)
}
