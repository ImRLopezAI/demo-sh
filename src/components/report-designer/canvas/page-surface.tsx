'use client'

import type {
	ReportBand,
	ReportDefinition,
	ReportElement,
} from '@server/reporting/designer-contracts'
import type * as React from 'react'
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
			{rulers.show ? (
				<div className='pointer-events-none absolute top-0 left-0 h-6 w-6 rounded-tl border border-slate-300/70 bg-slate-100/90' />
			) : null}
			{rulers.show ? (
				<div className='absolute top-0 left-6'>
					<Ruler
						length={page.width}
						orientation='horizontal'
						unit={rulers.unit}
						zoom={zoom}
					/>
				</div>
			) : null}
			{rulers.show ? (
				<div className='absolute top-6 left-0'>
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
					'relative overflow-hidden rounded-md border border-slate-300/80 bg-[var(--designer-panel)] shadow-[0_20px_80px_rgba(15,23,42,0.14)]',
					rulers.show ? 'mt-6 ml-6' : undefined,
				)}
				style={{
					width: page.width,
					minHeight: page.height,
				}}
			>
				<div className='space-y-2 p-3'>
					{report.bands.map((band) => (
						<BandStrip
							key={band.id}
							band={band}
							width={Math.max(
								100,
								page.width -
									report.page.margins.left -
									report.page.margins.right -
									112,
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
