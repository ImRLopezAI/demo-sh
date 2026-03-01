'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export function BandDroppable({
	bandId,
	onDrop,
	children,
	className,
}: {
	bandId: string
	onDrop: (params: {
		bandId: string
		x: number
		y: number
		elementKind?: string
		fieldPath?: string
	}) => void
	children: React.ReactNode
	className?: string
}) {
	const [over, setOver] = React.useState(false)

	return (
		<section
			aria-label='Band drop zone'
			onDragOver={(event) => {
				event.preventDefault()
				setOver(true)
			}}
			onDragLeave={() => setOver(false)}
			onDrop={(event) => {
				event.preventDefault()
				setOver(false)
				const rect = event.currentTarget.getBoundingClientRect()
				const x = event.clientX - rect.left
				const y = event.clientY - rect.top
				onDrop({
					bandId,
					x,
					y,
					elementKind:
						event.dataTransfer.getData('designer-element-kind') || undefined,
					fieldPath:
						event.dataTransfer.getData('designer-field-path') || undefined,
				})
			}}
			className={cn(
				over ? 'outline-dashed outline-2 outline-amber-400/70' : undefined,
				className,
			)}
		>
			{children}
		</section>
	)
}
