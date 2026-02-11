'use client'

import * as React from 'react'

import {
	Progress,
	ProgressIndicator,
	ProgressTrack,
	ProgressValue,
} from '@/components/ui/progress'

import { DataGridCellWrapper } from '../data-grid-cell-wrapper'
import type { DataGridCellProps } from '../types/data-grid'

function defaultProgressVariant(value: number): string {
	if (value >= 95) return 'bg-green-600'
	if (value >= 85) return 'bg-lime-600'
	if (value >= 70) return 'bg-yellow-600'
	if (value >= 50) return 'bg-orange-600'
	return 'bg-red-700'
}

export function ProgressCell<TData>({
	cell,
	tableMeta,
	rowIndex,
	columnId,
	rowHeight,
	isFocused,
	isSelected,
	isSearchMatch,
	isActiveSearchMatch,
	readOnly,
	tableVariant,
}: Omit<DataGridCellProps<TData>, 'isEditing'>) {
	const value = cell.getValue() as number | null
	const containerRef = React.useRef<HTMLDivElement>(null)
	const cellOpts = cell.column.columnDef.meta?.cell
	const progressOpts = cellOpts?.variant === 'progress' ? cellOpts : null
	const max = progressOpts?.max ?? 100
	const getVariant = progressOpts?.getVariant ?? defaultProgressVariant

	if (value === null || value === undefined) {
		return (
			<DataGridCellWrapper<TData>
				ref={containerRef}
				cell={cell}
				tableMeta={tableMeta}
				rowIndex={rowIndex}
				columnId={columnId}
				rowHeight={rowHeight}
				tableVariant={tableVariant}
				isEditing={false}
				isFocused={isFocused}
				isSelected={isSelected}
				isSearchMatch={isSearchMatch}
				isActiveSearchMatch={isActiveSearchMatch}
				readOnly={readOnly}
			>
				<span className='text-muted-foreground'>-</span>
			</DataGridCellWrapper>
		)
	}

	const normalizedValue = Math.min((value / max) * 100, 100)

	return (
		<DataGridCellWrapper<TData>
			ref={containerRef}
			cell={cell}
			tableMeta={tableMeta}
			rowIndex={rowIndex}
			columnId={columnId}
			rowHeight={rowHeight}
			tableVariant={tableVariant}
			isEditing={false}
			isFocused={isFocused}
			isSelected={isSelected}
			isSearchMatch={isSearchMatch}
			isActiveSearchMatch={isActiveSearchMatch}
			readOnly={readOnly}
		>
			<Progress value={normalizedValue} asRoot className='w-full gap-0'>
				<ProgressValue />
				<ProgressTrack>
					<ProgressIndicator className={getVariant(value)} />
				</ProgressTrack>
			</Progress>
		</DataGridCellWrapper>
	)
}
