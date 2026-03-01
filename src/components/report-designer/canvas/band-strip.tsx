'use client'

import type {
	ReportBand,
	ReportElement,
} from '@server/reporting/designer-contracts'
import type * as React from 'react'
import { cn } from '@/lib/utils'
import { BandDroppable } from '../dnd/band-droppable'
import { BandHandle } from './band-handle'
import { CanvasElementRenderer } from './element-renderer'
import { GridBackground } from './grid-background'
import { SelectionOverlay } from './selection-overlay'

export function BandStrip({
	band,
	width,
	selected,
	selectedElement,
	selectedElementIds,
	gridVisible,
	gridSize,
	onSelectBand,
	onSelectElement,
	onElementPointerDown,
	onResizeElementStart,
	onResizeBandStart,
	onDrop,
}: {
	band: ReportBand
	width: number
	selected: boolean
	selectedElement: ReportElement | null
	selectedElementIds: string[]
	gridVisible: boolean
	gridSize: number
	onSelectBand: () => void
	onSelectElement: (elementId: string, additive: boolean) => void
	onElementPointerDown: (
		elementId: string,
		event: React.PointerEvent<HTMLButtonElement>,
	) => void
	onResizeElementStart: (
		handle: 'nw' | 'ne' | 'sw' | 'se',
		event: React.PointerEvent<HTMLButtonElement>,
	) => void
	onResizeBandStart: (event: React.PointerEvent<HTMLButtonElement>) => void
	onDrop: (params: {
		bandId: string
		x: number
		y: number
		elementKind?: string
		fieldPath?: string
	}) => void
}) {
	return (
		<div className='flex w-full'>
			<BandHandle
				type={band.type}
				height={band.height}
				onSelect={onSelectBand}
				onResizeStart={onResizeBandStart}
			/>
			<BandDroppable
				bandId={band.id}
				onDrop={onDrop}
				className={cn(
					'relative border border-border bg-background',
					selected ? 'ring-1 ring-primary/65' : undefined,
				)}
			>
				<section
					className='relative overflow-hidden'
					style={{
						width,
						height: band.height,
					}}
				>
					<GridBackground size={gridSize} visible={gridVisible} />
					{band.elements.map((element) => (
						<CanvasElementRenderer
							key={element.id}
							element={element}
							selected={selectedElementIds.includes(element.id)}
							onSelect={(event) => {
								event.stopPropagation()
								onSelectElement(element.id, event.metaKey || event.ctrlKey)
							}}
							onPointerDown={(event) => {
								event.stopPropagation()
								onElementPointerDown(element.id, event)
							}}
						/>
					))}
					<SelectionOverlay
						element={selectedElement}
						onResizeStart={onResizeElementStart}
					/>
				</section>
			</BandDroppable>
		</div>
	)
}
