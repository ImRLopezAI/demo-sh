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
				'flex h-8 w-full items-center justify-between rounded-[3px] border border-[#d0d4dc] bg-white px-2 py-1.5 font-medium text-[#2f343c] text-[12px] shadow-xs transition-colors hover:border-[#8aabd7] hover:bg-[#f2f6fc] focus-visible:border-[#5c87c2] focus-visible:ring-2 focus-visible:ring-[#5c87c240]',
				className,
			)}
		>
			<span>{label}</span>
			<span className='font-mono text-[#707886] text-[11px]'>{kind}</span>
		</button>
	)
}
