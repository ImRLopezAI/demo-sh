'use client'

import type { HeaderGroup, SortingState, Table } from '@tanstack/react-table'
import * as React from 'react'

import { DataGridColumnHeader } from '@/components/data-grid/data-grid-column-header'
import { cn } from '@/lib/utils'

import {
	flexRender,
	getColumnBorderVisibility,
	getColumnPinningStyle,
	getColumnSizeVarId,
} from './lib/data-grid'
import { dataGridHeaderCellVariants } from './lib/data-grid-variants'
import type { Direction, TableVariant } from './types/data-grid'

interface DataGridHeaderRowProps<TData> {
	headerGroup: HeaderGroup<TData>
	table: Table<TData>
	sorting: SortingState
	rowIndex: number
	variant: TableVariant
	dir: Direction
	stretchColumns: boolean
}

export const DataGridHeaderRow = React.memo(function DataGridHeaderRow<TData>({
	headerGroup,
	table,
	sorting,
	rowIndex,
	variant,
	dir,
	stretchColumns,
}: DataGridHeaderRowProps<TData>) {
	return (
		<div
			key={headerGroup.id}
			role='row'
			aria-rowindex={rowIndex + 1}
			data-slot='grid-header-row'
			tabIndex={-1}
			className='flex w-full'
			style={{
				width: stretchColumns ? '100%' : 'var(--grid-width)',
				minWidth: 'var(--grid-width)',
			}}
		>
			{headerGroup.headers.map((header, colIndex) => {
				const currentSort = sorting.find((sort) => sort.id === header.column.id)
				const isSortable = header.column.getCanSort()
				const headerSizeId = getColumnSizeVarId(header.id)

				const nextHeader = headerGroup.headers[colIndex + 1]
				const isLastColumn = colIndex === headerGroup.headers.length - 1

				const isSelectColumn = header.column.id === 'select'
				const { showEndBorder, showStartBorder } = getColumnBorderVisibility({
					column: header.column,
					nextColumn: nextHeader?.column,
					isLastColumn,
				})

				return (
					<div
						key={header.id}
						role='columnheader'
						aria-colindex={colIndex + 1}
						aria-sort={
							currentSort?.desc === false
								? 'ascending'
								: currentSort?.desc === true
									? 'descending'
									: isSortable
										? 'none'
										: undefined
						}
						data-slot='grid-header-cell'
						tabIndex={-1}
						className={cn('relative', {
							grow: stretchColumns && header.column.id !== 'select',
							'border-e':
								(showEndBorder || (variant === 'bordered' && !isLastColumn)) &&
								header.column.id !== 'select',
							'border-s': showStartBorder && header.column.id !== 'select',
							'border-border':
								showEndBorder || showStartBorder || variant === 'bordered',
						})}
						style={{
							...getColumnPinningStyle({
								column: header.column,
								dir,
							}),
							width: `calc(var(--header-${headerSizeId}-size) * 1px)`,
						}}
					>
						{header.isPlaceholder ? null : typeof header.column.columnDef
								.header === 'function' ? (
							<div
								className={cn(
									'size-full',
									dataGridHeaderCellVariants({ variant }),
									isSelectColumn && 'box-border justify-center px-2',
								)}
							>
								{flexRender(
									header.column.columnDef.header,
									header.getContext(),
								)}
							</div>
						) : (
							<DataGridColumnHeader
								header={header}
								table={table}
								variant={variant}
							/>
						)}
					</div>
				)
			})}
		</div>
	)
}) as <TData>(props: DataGridHeaderRowProps<TData>) => React.ReactElement
