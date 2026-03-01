'use client'

import { ListTree } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { Button } from '@/components/ui/button'
import { BAND_LABELS } from '../constants'
import { useReportDesignerStore } from '../store'

const BAND_TYPES = [
	'reportHeader',
	'pageHeader',
	'groupHeader',
	'detail',
	'groupFooter',
	'pageFooter',
	'reportFooter',
] as const

export function BandListPanel() {
	const { report, selectedBandId, selectBand, addBand } =
		useReportDesignerStore(
			useShallow((state) => ({
				report: state.report,
				selectedBandId: state.selectedBandId,
				selectBand: state.selectBand,
				addBand: state.addBand,
			})),
		)

	return (
		<div className='space-y-2'>
			<div className='flex items-center justify-between'>
				<h3 className='font-semibold text-[11px] text-slate-600 uppercase tracking-[0.16em]'>
					Report tree
				</h3>
				<ListTree className='size-3 text-slate-500' />
			</div>
			<div className='space-y-1'>
				{report.bands.map((band) => (
					<button
						key={band.id}
						type='button'
						onClick={() => selectBand(band.id)}
						className={`flex w-full items-center justify-between rounded border px-2 py-1 text-left text-[11px] ${
							selectedBandId === band.id
								? 'border-amber-400 bg-amber-50 text-amber-900'
								: 'border-slate-300/70 bg-white/80 text-slate-700 hover:border-slate-400'
						}`}
					>
						<span>{BAND_LABELS[band.type]}</span>
						<span className='font-mono text-[10px]'>
							{band.elements.length}
						</span>
					</button>
				))}
			</div>
			<div className='grid grid-cols-2 gap-1'>
				{BAND_TYPES.map((type) => (
					<Button
						key={type}
						type='button'
						variant='outline'
						size='xs'
						onClick={() => addBand(type)}
					>
						+ {BAND_LABELS[type]}
					</Button>
				))}
			</div>
		</div>
	)
}
