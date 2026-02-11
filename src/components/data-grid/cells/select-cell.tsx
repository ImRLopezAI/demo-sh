'use client'

import * as React from 'react'

import { formatters } from '@/components/data-grid/lib/data-grid-utils'
import { Badge } from '@/components/ui/badge'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'

import { DataGridCellWrapper } from '../data-grid-cell-wrapper'
import type { DataGridCellProps } from '../types/data-grid'

export function SelectCell<TData>({
	cell,
	tableMeta,
	rowIndex,
	columnId,
	rowHeight,
	isFocused,
	isEditing,
	isSelected,
	isSearchMatch,
	isActiveSearchMatch,
	readOnly,
	tableVariant,
}: DataGridCellProps<TData>) {
	const initialValue = cell.getValue() as string
	const [value, setValue] = React.useState(initialValue)
	const containerRef = React.useRef<HTMLDivElement>(null)
	const formatter = cell.column.columnDef.meta?.formatter
	const cellOpts = cell.column.columnDef.meta?.cell
	const options = cellOpts?.variant === 'select' ? cellOpts.options : []

	const prevInitialValueRef = React.useRef(initialValue)
	if (initialValue !== prevInitialValueRef.current) {
		prevInitialValueRef.current = initialValue
		setValue(initialValue)
	}

	const onValueChange = React.useCallback(
		(newValue: string) => {
			if (readOnly) return
			setValue(newValue)
			tableMeta?.onDataUpdate?.({ rowIndex, columnId, value: newValue })
			tableMeta?.onCellEditingStop?.()
		},
		[tableMeta, rowIndex, columnId, readOnly],
	)

	const onOpenChange = React.useCallback(
		(open: boolean) => {
			if (open && !readOnly) {
				tableMeta?.onCellEditingStart?.(rowIndex, columnId)
			} else {
				tableMeta?.onCellEditingStop?.()
			}
		},
		[tableMeta, rowIndex, columnId, readOnly],
	)

	const onWrapperKeyDown = React.useCallback(
		(event: React.KeyboardEvent<HTMLDivElement>) => {
			if (isEditing && event.key === 'Escape') {
				event.preventDefault()
				setValue(initialValue)
				tableMeta?.onCellEditingStop?.()
			} else if (isFocused && event.key === 'Tab') {
				event.preventDefault()
				tableMeta?.onCellEditingStop?.({
					direction: event.shiftKey ? 'left' : 'right',
				})
			}
		},
		[isEditing, isFocused, initialValue, tableMeta],
	)

	const displayLabel =
		options.find((opt) => opt.value === value)?.label ?? value
	const formattedValue = formatter
		? formatter(cell.row.original, formatters)
		: null
	const displayValue = formattedValue ?? (displayLabel ? displayLabel : null)

	return (
		<DataGridCellWrapper<TData>
			ref={containerRef}
			cell={cell}
			tableMeta={tableMeta}
			rowIndex={rowIndex}
			columnId={columnId}
			rowHeight={rowHeight}
			tableVariant={tableVariant}
			isEditing={isEditing}
			isFocused={isFocused}
			isSelected={isSelected}
			isSearchMatch={isSearchMatch}
			isActiveSearchMatch={isActiveSearchMatch}
			readOnly={readOnly}
			onKeyDown={onWrapperKeyDown}
		>
			{isEditing ? (
				<Select
					value={value}
					onValueChange={(nextValue, _details) => {
						if (!nextValue) return
						onValueChange(nextValue)
					}}
					open={isEditing}
					onOpenChange={onOpenChange}
				>
					<SelectTrigger
						size='sm'
						className='size-full items-start border-none p-0 shadow-none focus-visible:ring-0 dark:bg-transparent [&_svg]:hidden'
					>
						{displayLabel ? (
							<Badge
								variant='secondary'
								className='whitespace-pre-wrap px-1.5 py-px'
							>
								<SelectValue />
							</Badge>
						) : (
							<SelectValue />
						)}
					</SelectTrigger>
					<SelectContent
						data-grid-cell-editor=''
						// compensate for the wrapper padding
						align='start'
						alignOffset={-8}
						sideOffset={-8}
						className='min-w-[calc(var(--anchor-width)+16px)]'
					>
						{options.map((option) => (
							<SelectItem key={option.value} value={option.value}>
								{option.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			) : displayValue ? (
				<div data-slot='grid-cell-content' className='min-w-0'>
					{formattedValue ? (
						formattedValue
					) : (
						<Badge
							variant='secondary'
							className='whitespace-pre-wrap px-1.5 py-px'
						>
							{displayLabel}
						</Badge>
					)}
				</div>
			) : null}
		</DataGridCellWrapper>
	)
}
