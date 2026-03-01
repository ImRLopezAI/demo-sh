'use client'

import { GripVertical } from 'lucide-react'
import type * as React from 'react'
import { Button } from '@/components/ui/button'
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
		<div className='flex w-[120px] shrink-0 flex-col justify-between border border-border border-r-0 bg-muted/25 px-1.5 py-1'>
			<Button
				type='button'
				variant='ghost'
				size='sm'
				onClick={onSelect}
				className='h-auto justify-start rounded-sm px-1 py-1 text-left'
			>
				<p className='font-semibold text-[10px] text-muted-foreground uppercase tracking-[0.14em]'>
					{BAND_LABELS[type]}
				</p>
				<p className='text-[10px] text-muted-foreground/90'>
					{Math.round(height)} pt
				</p>
			</Button>
			<Button
				type='button'
				variant='ghost'
				size='sm'
				onPointerDown={onResizeStart}
				className='mt-1 inline-flex h-5 items-center justify-start gap-1 rounded-sm px-1 text-[10px] text-muted-foreground hover:text-foreground'
			>
				<GripVertical className='size-3' />
				Resize
			</Button>
		</div>
	)
}
