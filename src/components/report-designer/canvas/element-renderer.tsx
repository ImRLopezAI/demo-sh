'use client'

import type { ReportElement } from '@server/reporting/designer-contracts'
import type * as React from 'react'
import { cn } from '@/lib/utils'
import { getElementDefinition } from '../elements/registry'

export function CanvasElementRenderer({
	element,
	selected,
	orderIndex,
	showOrder,
	onSelect,
	onPointerDown,
}: {
	element: ReportElement
	selected: boolean
	orderIndex: number
	showOrder: boolean
	onSelect: (event: React.MouseEvent<HTMLButtonElement>) => void
	onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => void
}) {
	const definition = getElementDefinition(element.kind)

	return (
		<button
			type='button'
			onClick={onSelect}
			onPointerDown={onPointerDown}
			onKeyDown={(event) => {
				if (event.key === 'Enter' || event.key === ' ') {
					event.preventDefault()
					onSelect(event as unknown as React.MouseEvent<HTMLButtonElement>)
				}
			}}
			aria-label={`Select ${element.kind} element`}
			data-designer-element='true'
			className={cn(
				'group absolute cursor-move rounded-[2px] border bg-background/95 px-1 py-0.5 shadow-xs transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40',
				selected
					? 'border-primary ring-2 ring-primary/20'
					: 'border-border hover:border-primary/45',
			)}
			style={{
				left: element.x,
				top: element.y,
				width: element.width,
				height: element.height,
				background:
					element.background ??
					(element.kind === 'shape' ? 'rgba(51,65,85,0.08)' : undefined),
				color: element.font?.color ?? 'hsl(var(--foreground))',
				textAlign: element.font?.align,
				fontSize: element.font?.size,
				fontWeight: element.font?.weight,
				fontStyle: element.font?.style,
			}}
		>
			<div className='pointer-events-none truncate text-[10px] leading-tight'>
				{definition.getDisplayLabel(element)}
			</div>
			{showOrder ? (
				<div className='pointer-events-none absolute -top-1 -right-1 rounded-[2px] bg-primary/90 px-1 font-mono text-[9px] text-primary-foreground leading-[1.3]'>
					{orderIndex + 1}
				</div>
			) : null}
		</button>
	)
}
