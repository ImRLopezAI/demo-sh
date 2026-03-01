'use client'

import type {
	ReportBand,
	ReportDefinition,
	ReportElement,
} from '@server/reporting/designer-contracts'
import { Plus } from 'lucide-react'
import type * as React from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { pageDimensions } from '../utils'
import { AlignmentGuides } from './alignment-guides'
import { BandStrip } from './band-strip'
import { Ruler } from './ruler'

export function PageSurface({
	report,
	zoom,
	rulers,
	grid,
	selectedBandId,
	selectedElementIds,
	selectedElement,
	guides,
	onDrop,
	onSelectBand,
	onSelectElement,
	onElementPointerDown,
	onResizeElementStart,
	onResizeBandStart,
}: {
	report: ReportDefinition
	zoom: number
	rulers: { show: boolean; unit: 'pt' | 'mm' | 'in' }
	grid: { show: boolean; size: number }
	selectedBandId: string | null
	selectedElementIds: string[]
	selectedElement: ReportElement | null
	guides: { vertical: number[]; horizontal: number[] }
	onDrop: (params: {
		bandId: string
		x: number
		y: number
		elementKind?: string
		fieldPath?: string
	}) => void
	onSelectBand: (bandId: string) => void
	onSelectElement: (elementId: string, additive: boolean) => void
	onElementPointerDown: (
		elementId: string,
		event: React.PointerEvent<HTMLButtonElement>,
	) => void
	onResizeElementStart: (
		handle: 'nw' | 'ne' | 'sw' | 'se',
		event: React.PointerEvent<HTMLButtonElement>,
	) => void
	onResizeBandStart: (
		band: ReportBand,
		event: React.PointerEvent<HTMLButtonElement>,
	) => void
}) {
	const page = pageDimensions(report)

	return (
		<div className='relative'>
			<div className='mb-1 flex items-center gap-1'>
				<Button
					type='button'
					variant='ghost'
					size='sm'
					className='inline-flex h-7 items-center gap-1 rounded-t-sm border border-border border-b-background bg-background px-3 text-[11px] text-foreground'
				>
					<span className='font-medium'>Page1</span>
				</Button>
				<Button
					type='button'
					variant='ghost'
					size='icon-xs'
					aria-label='Add page'
					className='mt-0.5 text-muted-foreground'
				>
					<Plus className='size-3' />
				</Button>
			</div>
			{rulers.show ? (
				<div className='pointer-events-none absolute top-7 left-0 h-6 w-6 border border-border bg-muted/70' />
			) : null}
			{rulers.show ? (
				<div className='absolute top-7 left-6 overflow-hidden border border-border border-l-0 bg-muted/70'>
					<Ruler
						length={page.width}
						orientation='horizontal'
						unit={rulers.unit}
						zoom={zoom}
					/>
				</div>
			) : null}
			{rulers.show ? (
				<div className='absolute top-[52px] left-0 overflow-hidden border border-border border-t-0 bg-muted/70'>
					<Ruler
						length={page.height}
						orientation='vertical'
						unit={rulers.unit}
						zoom={zoom}
					/>
				</div>
			) : null}
			<div
				className={cn(
					'relative overflow-hidden border border-border bg-[var(--designer-panel)] shadow-sm',
					rulers.show ? 'mt-[52px] ml-6' : 'mt-1',
				)}
				style={{
					width: page.width,
					minHeight: page.height,
				}}
			>
				<div className='space-y-1.5 p-2'>
					{report.bands.map((band) => (
						<BandStrip
							key={band.id}
							band={band}
							width={Math.max(
								100,
								page.width -
									report.page.margins.left -
									report.page.margins.right,
							)}
							selected={selectedBandId === band.id}
							selectedElement={
								selectedBandId === band.id ? selectedElement : null
							}
							selectedElementIds={selectedElementIds}
							gridVisible={grid.show}
							gridSize={grid.size}
							onDrop={onDrop}
							onSelectBand={() => onSelectBand(band.id)}
							onSelectElement={onSelectElement}
							onElementPointerDown={onElementPointerDown}
							onResizeElementStart={onResizeElementStart}
							onResizeBandStart={(event) => onResizeBandStart(band, event)}
						/>
					))}
				</div>
				<AlignmentGuides
					vertical={guides.vertical}
					horizontal={guides.horizontal}
				/>
			</div>
		</div>
	)
}
