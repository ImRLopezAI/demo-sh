'use client'

import type { ReportElement } from '@server/reporting/designer-contracts'
import type * as React from 'react'

const HANDLES = [
	{ id: 'nw', cursor: 'nwse-resize', style: { left: -5, top: -5 } },
	{ id: 'ne', cursor: 'nesw-resize', style: { right: -5, top: -5 } },
	{ id: 'sw', cursor: 'nesw-resize', style: { left: -5, bottom: -5 } },
	{ id: 'se', cursor: 'nwse-resize', style: { right: -5, bottom: -5 } },
] as const

export function SelectionOverlay({
	element,
	onResizeStart,
}: {
	element: ReportElement | null
	onResizeStart: (
		handle: (typeof HANDLES)[number]['id'],
		event: React.PointerEvent<HTMLButtonElement>,
	) => void
}) {
	if (!element) return null

	return (
		<div
			className='pointer-events-none absolute border border-amber-500'
			style={{
				left: element.x,
				top: element.y,
				width: element.width,
				height: element.height,
			}}
		>
			{HANDLES.map((handle) => (
				<button
					key={handle.id}
					type='button'
					onPointerDown={(event) => onResizeStart(handle.id, event)}
					aria-label={`Resize element from ${handle.id} corner`}
					className='pointer-events-auto absolute size-2 rounded-full border border-amber-500 bg-white'
					style={{ ...handle.style, cursor: handle.cursor }}
				/>
			))}
		</div>
	)
}
