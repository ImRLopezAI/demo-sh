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
	showHeader,
	showElementOrder,
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
	showHeader: boolean
	showElementOrder: boolean
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
		<BandDroppable
			bandId={band.id}
			onDrop={onDrop}
			className={cn(
				'relative border-border border-r border-b border-l bg-background',
				selected ? 'ring-1 ring-primary/70 ring-inset' : undefined,
			)}
		>
			<section
				className={cn(
					'relative overflow-hidden',
					selected
						? 'outline outline-1 outline-primary/25 -outline-offset-1'
						: '',
				)}
				style={{
					width,
					height: band.height,
				}}
			>
				<button
					type='button'
					onClick={onSelectBand}
					aria-label={`Select ${BAND_LABELS[band.type]} band`}
					className='absolute inset-0 z-0'
				/>
				<GridBackground size={gridSize} visible={gridVisible} />
				{showHeader ? (
					<div
						className={cn(
							'pointer-events-none absolute inset-x-0 top-0 flex h-5 items-center border-border border-b px-1.5',
							selected ? 'bg-primary/15' : 'bg-sky-100/80 dark:bg-sky-900/25',
						)}
					>
						<span className='font-medium text-[10px] text-foreground/90'>
							{BAND_LABELS[band.type]}
						</span>
						<span className='ml-auto font-mono text-[9px] text-muted-foreground'>
							{Math.round(band.height)} pt
						</span>
					</div>
				) : null}
				{band.elements.map((element, index) => (
					<CanvasElementRenderer
						key={element.id}
						element={element}
						selected={selectedElementIds.includes(element.id)}
						orderIndex={index}
						showOrder={showElementOrder}
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
					className='absolute right-1 bottom-0 h-4 rounded-none border border-border border-b-0 bg-background/90 px-1 text-muted-foreground hover:text-foreground'
				>
					<GripVertical className='size-3' />
				</Button>
			</section>
		</BandDroppable>
	)
}
