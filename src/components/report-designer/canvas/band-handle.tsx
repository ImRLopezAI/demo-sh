'use client'

import { GripVertical } from 'lucide-react'
import type * as React from 'react'
import { BAND_LABELS } from '../constants'

export function BandHandle({
	type,
	height,
	onSelect,
	onResizeStart,
}: {
	type: keyof typeof BAND_LABELS
	height: number
	onSelect: () => void
	onResizeStart: (event: React.PointerEvent<HTMLButtonElement>) => void
}) {
	return (
		<div className='flex w-28 shrink-0 flex-col justify-between rounded-l-md border border-slate-300/70 border-r-0 bg-slate-100/80 px-2 py-1'>
			<button
				type='button'
				onClick={onSelect}
				className='rounded text-left transition-colors hover:bg-slate-200/70'
			>
				<p className='font-semibold text-[10px] text-slate-600 uppercase tracking-[0.16em]'>
					{BAND_LABELS[type]}
				</p>
				<p className='text-[10px] text-slate-500'>{Math.round(height)} pt</p>
			</button>
			<button
				type='button'
				onPointerDown={onResizeStart}
				className='mt-1 inline-flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-700'
			>
				<GripVertical className='size-3' />
				Resize
			</button>
		</div>
	)
}
