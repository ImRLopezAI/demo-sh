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
		const majorEvery = unit === 'in' ? 36 : unit === 'mm' ? 20 : 36
		const minorEvery = majorEvery / 4
		const total = Math.ceil(length / minorEvery)
		return Array.from({ length: total + 1 }, (_, index) => {
			const position = index * minorEvery
			const isMajor =
				Math.abs((position / majorEvery) % 1) < 0.0001 ||
				Math.abs(((position / majorEvery) % 1) - 1) < 0.0001
			return {
				position,
				isMajor,
				label: isMajor ? formatTick(fromPoints(position, unit)) : '',
			}
		})
	}, [length, unit])

	return (
		<div
			aria-hidden='true'
			className='pointer-events-none relative select-none text-[#6d7480] text-[9px]'
			style={{
				width: orientation === 'horizontal' ? length * zoom : 24,
				height: orientation === 'horizontal' ? 24 : length * zoom,
			}}
		>
			{ticks.map((tick) => (
				<div
					key={`${orientation}-${tick.position}`}
					className='absolute border-[#c2c8d2]'
					style={
						orientation === 'horizontal'
							? {
									left: tick.position * zoom,
									top: tick.isMajor ? 0 : 10,
									height: tick.isMajor ? 24 : 14,
									borderLeftWidth: 1,
								}
							: {
									left: tick.isMajor ? 0 : 10,
									top: tick.position * zoom,
									width: tick.isMajor ? 24 : 14,
									borderTopWidth: 1,
								}
					}
				>
					{tick.isMajor ? (
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
					) : null}
				</div>
			))}
		</div>
	)
}
