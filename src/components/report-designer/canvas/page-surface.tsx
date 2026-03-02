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
	showBandHeaders,
	showElementOrder,
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
	showBandHeaders: boolean
	showElementOrder: boolean
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
	const contentWidth = Math.max(
		100,
		page.width - report.page.margins.left - report.page.margins.right,
	)

	return (
		<div className='relative'>
			<div className='mb-1 flex items-center gap-1'>
				<Button
					type='button'
					variant='ghost'
					size='sm'
					className='inline-flex h-8 items-center gap-1 rounded-[3px] rounded-b-none border border-[#cfd3db] border-b-[#f4f5f8] bg-[#eef1f6] px-3 text-[#2f333b] text-[14px]'
				>
					<span className='font-medium'>Page1</span>
				</Button>
				<Button
					type='button'
					variant='ghost'
					size='icon-xs'
					aria-label='Add page'
					className='mt-0.5 text-[#6a727e]'
				>
					<Plus className='size-3' />
				</Button>
			</div>
			{rulers.show ? (
				<div
					className='pointer-events-none absolute top-7 left-0 h-6 w-6 border bg-[#eceff4]'
					style={{ borderColor: '#cfd3db' }}
				/>
			) : null}
			{rulers.show ? (
				<div
					className='absolute top-7 left-6 overflow-hidden border border-l-0 bg-[#eceff4]'
					style={{ borderColor: '#cfd3db' }}
				>
					<Ruler
						length={page.width}
						orientation='horizontal'
						unit={rulers.unit}
						zoom={zoom}
					/>
				</div>
			) : null}
			{rulers.show ? (
				<div
					className='absolute top-[52px] left-0 overflow-hidden border border-t-0 bg-[#eceff4]'
					style={{ borderColor: '#cfd3db' }}
				>
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
					'relative overflow-hidden border bg-[var(--designer-panel)] shadow-sm',
					rulers.show ? 'mt-[52px] ml-6' : 'mt-1',
				)}
				style={{
					width: page.width,
					height: page.height,
					borderColor: '#cfd3db',
				}}
			>
				<div className='pointer-events-none absolute inset-0'>
					<div
						className='absolute inset-y-0 border-r'
						style={{ left: report.page.margins.left }}
					/>
					<div
						className='absolute inset-y-0 border-r'
						style={{ right: report.page.margins.right }}
					/>
					<div
						className='absolute inset-x-0 border-b'
						style={{ top: report.page.margins.top }}
					/>
					<div
						className='absolute inset-x-0 border-t'
						style={{ bottom: report.page.margins.bottom }}
					/>
				</div>
				<div
					className='absolute overflow-hidden border bg-background'
					style={{
						left: report.page.margins.left,
						top: report.page.margins.top,
						width: contentWidth,
						borderColor: '#ced2d9',
					}}
				>
					{report.bands.map((band) => (
						<BandStrip
							key={band.id}
							band={band}
							width={contentWidth}
							selected={selectedBandId === band.id}
							selectedElement={
								selectedBandId === band.id ? selectedElement : null
							}
							selectedElementIds={selectedElementIds}
							gridVisible={grid.show}
							gridSize={grid.size}
							showHeader={showBandHeaders}
							showElementOrder={showElementOrder}
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
