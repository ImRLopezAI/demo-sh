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
					className='absolute top-0 bottom-0 border-l'
					style={{ left: x, borderColor: 'rgba(47, 103, 178, 0.72)' }}
				/>
			))}
			{horizontal.map((y) => (
				<div
					key={`h-${y}`}
					className='absolute right-0 left-0 border-t'
					style={{ top: y, borderColor: 'rgba(47, 103, 178, 0.72)' }}
				/>
			))}
		</div>
	)
}
