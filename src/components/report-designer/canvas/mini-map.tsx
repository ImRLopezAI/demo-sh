'use client'

import type { ReportDefinition } from '@server/reporting/designer-contracts'
import * as React from 'react'
import { pageDimensions } from '../utils'

export function MiniMap({
	report,
	camera,
	onJump,
}: {
	report: ReportDefinition
	camera: { x: number; y: number; z: number }
	onJump: (x: number, y: number) => void
}) {
	const page = pageDimensions(report)
	const width = 150
	const height = Math.max(80, (page.height / page.width) * width)
	const viewport = {
		w: Math.min(width, width / camera.z),
		h: Math.min(height, height / camera.z),
		x: Math.max(0, Math.min(width, width / 2 - camera.x / 6)),
		y: Math.max(0, Math.min(height, height / 2 - camera.y / 6)),
	}
	const [dragging, setDragging] = React.useState(false)

	function jumpToClientPoint(
		target: HTMLButtonElement,
		clientX: number,
		clientY: number,
	) {
		const rect = target.getBoundingClientRect()
		const x = ((clientX - rect.left) / width) * page.width
		const y = ((clientY - rect.top) / height) * page.height
		onJump(x, y)
	}

	return (
		<div className='absolute right-4 bottom-4 w-[170px] rounded-md border border-slate-300/70 bg-white/85 p-2 shadow-lg backdrop-blur'>
			<p className='mb-2 font-medium text-[10px] text-slate-500 uppercase tracking-[0.18em]'>
				Page navigator
			</p>
			<button
				type='button'
				aria-label='Jump viewport using page navigator'
				onPointerDown={(event) => {
					event.currentTarget.setPointerCapture(event.pointerId)
					setDragging(true)
					jumpToClientPoint(event.currentTarget, event.clientX, event.clientY)
				}}
				onPointerMove={(event) => {
					if (!dragging) return
					jumpToClientPoint(event.currentTarget, event.clientX, event.clientY)
				}}
				onPointerUp={() => {
					setDragging(false)
				}}
				className='relative block overflow-hidden rounded border border-slate-200 bg-slate-50'
				style={{ width, height }}
			>
				<div
					className='absolute border border-amber-500 bg-amber-300/15'
					style={{
						left: viewport.x,
						top: viewport.y,
						width: viewport.w,
						height: viewport.h,
					}}
				/>
			</button>
		</div>
	)
}
