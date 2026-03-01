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
				'flex w-full items-center justify-between rounded-sm border border-border bg-background px-2 py-1.5 font-medium text-[11px] text-foreground shadow-xs transition-colors hover:border-primary/40 hover:bg-muted/60 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30',
				className,
			)}
		>
			<span>{label}</span>
			<span className='font-mono text-[10px] text-muted-foreground'>
				{kind}
			</span>
		</button>
	)
}
