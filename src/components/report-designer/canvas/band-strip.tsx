'use client'

import type {
	ReportBand,
	ReportElement,
} from '@server/reporting/designer-contracts'
import { GripVertical } from 'lucide-react'
import type * as React from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { BAND_LABELS } from '../constants'
import { BandDroppable } from '../dnd/band-droppable'
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
		<div className='w-full border border-border bg-background'>
			<div
				className={cn(
					'flex h-6 items-center gap-2 border-border border-b px-2',
					selected ? 'bg-primary/10' : 'bg-muted/40',
				)}
			>
				<Button
					type='button'
					variant='ghost'
					size='sm'
					onClick={onSelectBand}
					className='h-5 px-1.5 text-[10px] uppercase tracking-[0.12em]'
				>
					{BAND_LABELS[band.type]}
				</Button>
				<span className='ml-auto text-[10px] text-muted-foreground'>
					{Math.round(band.height)} pt
				</span>
			</div>
			<BandDroppable
				bandId={band.id}
				onDrop={onDrop}
				className={cn(
					'relative border-border border-t bg-background',
					selected ? 'ring-1 ring-primary/70 ring-inset' : undefined,
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
					<Button
						type='button'
						variant='ghost'
						size='xs'
						onPointerDown={onResizeBandStart}
						aria-label='Resize band height'
						className='absolute bottom-0 left-1/2 h-4 -translate-x-1/2 rounded-none border border-border border-b-0 bg-background/90 px-1 text-muted-foreground hover:text-foreground'
					>
						<GripVertical className='size-3' />
					</Button>
				</section>
			</BandDroppable>
		</div>
	)
}
