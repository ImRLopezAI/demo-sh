'use client'

import * as React from 'react'
import { fromPoints } from '../utils'

function formatTick(value: number): string {
	if (Number.isInteger(value)) return String(value)
	return value.toFixed(1)
}

export function Ruler({
	length,
	orientation,
	unit,
	zoom,
}: {
	length: number
	orientation: 'horizontal' | 'vertical'
	unit: 'pt' | 'mm' | 'in'
	zoom: number
}) {
	const ticks = React.useMemo(() => {
		const every = unit === 'in' ? 36 : unit === 'mm' ? 20 : 36
		const total = Math.ceil(length / every)
		return Array.from({ length: total + 1 }, (_, index) => {
			const position = index * every
			return {
				position,
				label: formatTick(fromPoints(position, unit)),
			}
		})
	}, [length, unit])

	return (
		<div
			aria-hidden='true'
			className='pointer-events-none select-none text-[9px] text-slate-500'
			style={{
				width: orientation === 'horizontal' ? length * zoom : 24,
				height: orientation === 'horizontal' ? 24 : length * zoom,
			}}
		>
			{ticks.map((tick) => (
				<div
					key={`${orientation}-${tick.position}`}
					className='absolute border-slate-300/60'
					style={
						orientation === 'horizontal'
							? {
									left: tick.position * zoom,
									top: 0,
									height: 24,
									borderLeftWidth: 1,
								}
							: {
									left: 0,
									top: tick.position * zoom,
									width: 24,
									borderTopWidth: 1,
								}
					}
				>
					<span
						className='absolute'
						style={
							orientation === 'horizontal'
								? { left: 2, top: 2 }
								: {
										left: 2,
										top: 2,
										transform: 'rotate(-90deg)',
										transformOrigin: '0 0',
									}
						}
					>
						{tick.label}
					</span>
				</div>
			))}
		</div>
	)
}
