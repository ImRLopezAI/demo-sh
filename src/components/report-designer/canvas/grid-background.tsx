'use client'

export function GridBackground({
	size,
	visible,
}: {
	size: number
	visible: boolean
}) {
	if (!visible) return null
	return (
		<div
			aria-hidden='true'
			className='pointer-events-none absolute inset-0 rounded-md'
			style={{
				backgroundImage:
					'linear-gradient(to right, var(--designer-grid) 1px, transparent 1px), linear-gradient(to bottom, var(--designer-grid) 1px, transparent 1px)',
				backgroundSize: `${size}px ${size}px`,
			}}
		/>
	)
}
