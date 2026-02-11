'use client'

import type {
	Column,
	ColumnSort,
	Header,
	SortDirection,
	SortingState,
	Table,
} from '@tanstack/react-table'
import {
	ArrowLeft,
	ArrowRight,
	ChevronDownIcon,
	ChevronsUpDown,
	ChevronUpIcon,
	EyeOffIcon,
	FilterX,
	ListFilter,
	PinIcon,
	PinOffIcon,
	Settings2,
	XIcon,
} from 'lucide-react'
import * as React from 'react'

import {
	ContextMenu,
	ContextMenuCheckboxItem,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuPortal,
	ContextMenuSeparator,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
	ContextMenuTrigger,
} from '@/components/ui/context-menu'
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { getColumnVariant } from './lib/data-grid'
import { getDefaultOperator } from './lib/data-grid-filters'
import { dataGridHeaderCellVariants } from './lib/data-grid-variants'
import type { TableVariant } from './types/data-grid'

interface DataGridColumnHeaderProps<TData, TValue>
	extends React.ComponentProps<'button'> {
	header: Header<TData, TValue>
	table: Table<TData>
	variant?: TableVariant
}

export function DataGridColumnHeader<TData, TValue>({
	header,
	table,
	variant = 'default',
	className,
	onPointerDown,
	onClick: onClickProp,
	...props
}: DataGridColumnHeaderProps<TData, TValue>) {
	const column = header.column
	const getColumnLabel = React.useCallback((col: Column<TData, unknown>) => {
		if (col.columnDef.meta?.label) {
			return col.columnDef.meta.label
		}
		if (typeof col.columnDef.header === 'string') {
			return col.columnDef.header
		}
		return col.id
	}, [])

	const label = getColumnLabel(column)

	const isAnyColumnResizing = table.getState().columnSizingInfo.isResizingColumn
	const canSort = column.getCanSort()
	const canFilter = column.getCanFilter()
	const canPin = column.getCanPin()
	const canHide = column.getCanHide()
	const allLeafColumns = table.getAllLeafColumns()
	const hideableColumns = allLeafColumns.filter((col) => col.getCanHide())

	const cellVariant = column.columnDef.meta?.cell
	const columnVariant = getColumnVariant(cellVariant?.variant)
	const filterVariant = cellVariant?.variant ?? 'short-text'
	const isFiltered = column.getIsFiltered()

	const pinnedPosition = column.getIsPinned()
	const isPinnedLeft = pinnedPosition === 'left'
	const isPinnedRight = pinnedPosition === 'right'
	const isLastVisibleColumn =
		table.getVisibleLeafColumns().at(-1)?.id === column.id
	const sortDirection = column.getIsSorted()
	const sortIndicator = React.useMemo(
		() =>
			canSort
				? sortDirection === 'asc'
					? ChevronUpIcon
					: sortDirection === 'desc'
						? ChevronDownIcon
						: ChevronsUpDown
				: ChevronDownIcon,
		[canSort, sortDirection],
	)

	const getColumnOrder = React.useCallback(() => {
		const currentOrder = table.getState().columnOrder
		if (currentOrder.length > 0) return currentOrder
		return allLeafColumns.map((col) => col.id)
	}, [allLeafColumns, table])

	const moveColumn = React.useCallback(
		(direction: 'left' | 'right') => {
			const currentOrder = getColumnOrder()
			const currentIndex = currentOrder.indexOf(column.id)
			if (currentIndex === -1) return

			if (direction === 'left' && currentIndex > 0) {
				const newOrder = [...currentOrder]
				const [movedColumn] = newOrder.splice(currentIndex, 1)
				if (!movedColumn) return
				newOrder.splice(currentIndex - 1, 0, movedColumn)
				table.setColumnOrder(newOrder)
			}

			if (direction === 'right' && currentIndex < currentOrder.length - 1) {
				const newOrder = [...currentOrder]
				const [movedColumn] = newOrder.splice(currentIndex, 1)
				if (!movedColumn) return
				newOrder.splice(currentIndex + 1, 0, movedColumn)
				table.setColumnOrder(newOrder)
			}
		},
		[column.id, getColumnOrder, table],
	)

	const canMove = React.useCallback(
		(direction: 'left' | 'right') => {
			const currentOrder = getColumnOrder()
			const currentIndex = currentOrder.indexOf(column.id)
			if (currentIndex === -1) return false
			return direction === 'left'
				? currentIndex > 0
				: currentIndex < currentOrder.length - 1
		},
		[column.id, getColumnOrder],
	)

	const onSortingChange = React.useCallback(
		(direction: SortDirection) => {
			table.setSorting((prev: SortingState) => {
				const existingSortIndex = prev.findIndex(
					(sort) => sort.id === column.id,
				)
				const newSort: ColumnSort = {
					id: column.id,
					desc: direction === 'desc',
				}

				if (existingSortIndex >= 0) {
					const updated = [...prev]
					updated[existingSortIndex] = newSort
					return updated
				} else {
					return [...prev, newSort]
				}
			})
		},
		[column.id, table],
	)

	const onSortRemove = React.useCallback(() => {
		table.setSorting((prev: SortingState) =>
			prev.filter((sort) => sort.id !== column.id),
		)
	}, [column.id, table])

	const onLeftPin = React.useCallback(() => {
		column.pin('left')
	}, [column])

	const onRightPin = React.useCallback(() => {
		column.pin('right')
	}, [column])

	const onUnpin = React.useCallback(() => {
		column.pin(false)
	}, [column])

	const onFilterToggle = React.useCallback(() => {
		if (!canFilter) return

		const wasFiltered = column.getIsFiltered()
		const defaultOperator = getDefaultOperator(filterVariant)
		table.setColumnFilters((prevFilters) => {
			const nextFilters = prevFilters.filter(
				(filter) => filter.id !== column.id,
			)
			if (nextFilters.length !== prevFilters.length) {
				return nextFilters
			}
			return [
				...nextFilters,
				{
					id: column.id,
					value: { operator: defaultOperator, value: '' },
				},
			]
		})

		if (!wasFiltered) {
			requestAnimationFrame(() => {
				table.options.meta?.onFilterMenuRequest?.(column.id)
			})
		}
	}, [canFilter, column, filterVariant, table])

	const onTriggerPointerDown = React.useCallback<
		NonNullable<React.ComponentProps<'button'>['onPointerDown']>
	>(
		(event) => {
			onPointerDown?.(event)
			if (event.defaultPrevented) return

			if (event.button !== 0) {
				return
			}
			table.options.meta?.onColumnClick?.(column.id)
		},
		[table.options.meta, column.id, onPointerDown],
	)

	const onTriggerClick = React.useCallback(
		(event: React.MouseEvent<HTMLButtonElement>) => {
			onClickProp?.(event)
			if (event.defaultPrevented) return
			if (event.button !== 0) return
			if (isAnyColumnResizing) return
			if (!canSort) return

			const currentSort = column.getIsSorted()
			if (!currentSort) {
				onSortingChange('asc')
				return
			}
			if (currentSort === 'asc') {
				onSortingChange('desc')
				return
			}
			onSortRemove()
		},
		[
			canSort,
			column,
			isAnyColumnResizing,
			onClickProp,
			onSortRemove,
			onSortingChange,
		],
	)

	return (
		<>
			<ContextMenu>
				<ContextMenuTrigger
					render={
						<button
							type='button'
							className={cn(
								'flex size-full items-center justify-between gap-2 text-sm hover:bg-accent/40 data-popup-open:bg-accent/40 [&_svg]:size-4',
								dataGridHeaderCellVariants({ variant }),
								isAnyColumnResizing && 'pointer-events-none',
								className,
							)}
							onPointerDown={onTriggerPointerDown}
							onClick={onTriggerClick}
							{...props}
						>
							<div className='flex min-w-0 flex-1 items-center gap-1.5'>
								{columnVariant && (
									<Tooltip>
										<TooltipTrigger
											render={
												<columnVariant.icon className='size-3.5 shrink-0 text-muted-foreground' />
											}
										/>
										<TooltipContent side='top'>
											<p>{columnVariant.label}</p>
										</TooltipContent>
									</Tooltip>
								)}
								<span className='truncate'>{label}</span>
							</div>
							{React.createElement(sortIndicator, {
								className: 'shrink-0 text-muted-foreground',
							})}
						</button>
					}
				/>
				<ContextMenuContent align='start' sideOffset={0} className='w-60'>
					{canSort && (
						<>
							<ContextMenuCheckboxItem
								className='relative ltr:pr-8 ltr:pl-2 rtl:pr-2 rtl:pl-8 [&>span:first-child]:ltr:right-2 [&>span:first-child]:ltr:left-auto [&>span:first-child]:rtl:right-auto [&>span:first-child]:rtl:left-2 [&_svg]:text-muted-foreground'
								checked={column.getIsSorted() === 'asc'}
								onClick={() => onSortingChange('asc')}
							>
								<ChevronUpIcon />
								Sort asc
							</ContextMenuCheckboxItem>
							<ContextMenuCheckboxItem
								className='relative ltr:pr-8 ltr:pl-2 rtl:pr-2 rtl:pl-8 [&>span:first-child]:ltr:right-2 [&>span:first-child]:ltr:left-auto [&>span:first-child]:rtl:right-auto [&>span:first-child]:rtl:left-2 [&_svg]:text-muted-foreground'
								checked={column.getIsSorted() === 'desc'}
								onClick={() => onSortingChange('desc')}
							>
								<ChevronDownIcon />
								Sort desc
							</ContextMenuCheckboxItem>
							{column.getIsSorted() && (
								<ContextMenuItem onClick={onSortRemove}>
									<XIcon />
									Remove sort
								</ContextMenuItem>
							)}
						</>
					)}
					{canFilter && (
						<>
							{canSort && <ContextMenuSeparator />}
							<ContextMenuCheckboxItem
								className='relative ltr:pr-8 ltr:pl-2 rtl:pr-2 rtl:pl-8 [&>span:first-child]:ltr:right-2 [&>span:first-child]:ltr:left-auto [&>span:first-child]:rtl:right-auto [&>span:first-child]:rtl:left-2 [&_svg]:text-muted-foreground'
								checked={isFiltered}
								onClick={onFilterToggle}
							>
								{isFiltered ? <FilterX /> : <ListFilter />}
								{isFiltered ? 'Clear filter' : 'Filter column'}
							</ContextMenuCheckboxItem>
						</>
					)}
					{canPin && (
						<>
							{(canSort || canFilter) && <ContextMenuSeparator />}

							{isPinnedLeft ? (
								<ContextMenuItem
									className='[&_svg]:text-muted-foreground'
									onClick={onUnpin}
								>
									<PinOffIcon />
									Unpin from left
								</ContextMenuItem>
							) : (
								<ContextMenuItem
									className='[&_svg]:text-muted-foreground'
									onClick={onLeftPin}
								>
									<PinIcon />
									Pin to left
								</ContextMenuItem>
							)}
							{isPinnedRight ? (
								<ContextMenuItem
									className='[&_svg]:text-muted-foreground'
									onClick={onUnpin}
								>
									<PinOffIcon />
									Unpin from right
								</ContextMenuItem>
							) : (
								<ContextMenuItem
									className='[&_svg]:text-muted-foreground'
									onClick={onRightPin}
								>
									<PinIcon />
									Pin to right
								</ContextMenuItem>
							)}
						</>
					)}
					{allLeafColumns.length > 1 && (
						<>
							{(canSort || canFilter || canPin) && <ContextMenuSeparator />}
							<ContextMenuItem
								className='[&_svg]:text-muted-foreground'
								onClick={() => moveColumn('left')}
								disabled={!canMove('left') || pinnedPosition !== false}
							>
								<ArrowLeft />
								Move to left
							</ContextMenuItem>
							<ContextMenuItem
								className='[&_svg]:text-muted-foreground'
								onClick={() => moveColumn('right')}
								disabled={!canMove('right') || pinnedPosition !== false}
							>
								<ArrowRight />
								Move to right
							</ContextMenuItem>
						</>
					)}
					{hideableColumns.length > 0 && (
						<>
							{(canSort ||
								canFilter ||
								canPin ||
								allLeafColumns.length > 1) && <ContextMenuSeparator />}
							{canHide && (
								<ContextMenuItem
									className='[&_svg]:text-muted-foreground'
									onClick={() => column.toggleVisibility(false)}
								>
									<EyeOffIcon />
									Hide column
								</ContextMenuItem>
							)}
							<ContextMenuSub>
								<ContextMenuSubTrigger>
									<Settings2 />
									Columns
								</ContextMenuSubTrigger>
								<ContextMenuPortal>
									<ContextMenuSubContent>
										{hideableColumns.map((col) => (
											<ContextMenuCheckboxItem
												key={col.id}
												checked={col.getIsVisible()}
												onSelect={(event) => event.preventDefault()}
												onCheckedChange={(value) =>
													col.toggleVisibility(!!value)
												}
											>
												{getColumnLabel(col)}
											</ContextMenuCheckboxItem>
										))}
									</ContextMenuSubContent>
								</ContextMenuPortal>
							</ContextMenuSub>
						</>
					)}
				</ContextMenuContent>
			</ContextMenu>
			{header.column.getCanResize() && !isLastVisibleColumn && (
				<DataGridColumnResizer header={header} table={table} label={label} />
			)}
		</>
	)
}

const DataGridColumnResizer = React.memo(
	DataGridColumnResizerImpl,
	(prev, next) => {
		const prevColumn = prev.header.column
		const nextColumn = next.header.column

		if (
			prevColumn.getIsResizing() !== nextColumn.getIsResizing() ||
			prevColumn.getSize() !== nextColumn.getSize()
		) {
			return false
		}

		if (prev.label !== next.label) return false

		return true
	},
) as typeof DataGridColumnResizerImpl

interface DataGridColumnResizerProps<TData, TValue>
	extends DataGridColumnHeaderProps<TData, TValue> {
	label: string
}

function DataGridColumnResizerImpl<TData, TValue>({
	header,
	table,
	label,
}: DataGridColumnResizerProps<TData, TValue>) {
	const defaultColumnDef = table._getDefaultColumnDef()

	const onDoubleClick = React.useCallback(() => {
		header.column.resetSize()
	}, [header.column])

	return (
		<div
			role='separator'
			aria-orientation='vertical'
			aria-label={`Resize ${label} column`}
			aria-valuenow={header.column.getSize()}
			aria-valuemin={defaultColumnDef.minSize}
			aria-valuemax={defaultColumnDef.maxSize}
			tabIndex={0}
			className={cn(
				"absolute -end-px top-0 z-50 h-full w-0.5 cursor-ew-resize touch-none select-none bg-border transition-opacity after:absolute after:inset-y-0 after:start-1/2 after:h-full after:w-4.5 after:-translate-x-1/2 after:content-[''] hover:bg-primary focus:bg-primary focus:outline-none",
				header.column.getIsResizing()
					? 'bg-primary'
					: 'opacity-0 hover:opacity-100',
			)}
			onDoubleClick={onDoubleClick}
			onMouseDown={header.getResizeHandler()}
			onTouchStart={header.getResizeHandler()}
		/>
	)
}
