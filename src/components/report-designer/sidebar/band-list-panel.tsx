'use client'

import { ListTree, Search } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
		<div className='grid h-full grid-rows-[auto_auto_1fr_auto] gap-2'>
			<div className='flex items-center justify-between border-border border-b pb-1'>
				<h3 className='font-semibold text-[11px] text-muted-foreground uppercase tracking-[0.16em]'>
					Report tree
				</h3>
				<ListTree className='size-3 text-muted-foreground' />
			</div>
			<div className='relative'>
				<Search className='pointer-events-none absolute top-1/2 left-2 size-3 -translate-y-1/2 text-muted-foreground' />
				<Input
					aria-label='Search bands'
					placeholder='Search bands…'
					className='h-7 pl-6 text-[11px]'
				/>
			</div>
			<div className='min-h-0 space-y-1 overflow-auto pr-1'>
				{report.bands.map((band) => (
					<Button
						key={band.id}
						type='button'
						variant='ghost'
						size='sm'
						onClick={() => selectBand(band.id)}
						className={`h-auto w-full justify-between rounded-sm border px-2 py-1 text-left text-[11px] transition-colors ${
							selectedBandId === band.id
								? 'border-primary/45 bg-primary/10 text-foreground'
								: 'border-border bg-background text-foreground hover:border-primary/35 hover:bg-muted/45'
						}`}
					>
						<span>{BAND_LABELS[band.type]}</span>
						<span className='font-mono text-[10px] text-muted-foreground'>
							{band.elements.length}
						</span>
					</Button>
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
