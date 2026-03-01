'use client'

export function AlignmentGuides({
	vertical,
	horizontal,
}: {
	vertical: number[]
	horizontal: number[]
}) {
	return (
		<div className='pointer-events-none absolute inset-0'>
			{vertical.map((x) => (
				<div
					key={`v-${x}`}
					className='absolute top-0 bottom-0 border-primary/70 border-l'
					style={{ left: x }}
				/>
			))}
			{horizontal.map((y) => (
				<div
					key={`h-${y}`}
					className='absolute right-0 left-0 border-primary/70 border-t'
					style={{ top: y }}
				/>
			))}
		</div>
	)
}
