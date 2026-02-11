'use client'

import type { ColumnDef, Table, TableMeta } from '@tanstack/react-table'
import { CopyIcon, EraserIcon, ScissorsIcon, Trash2Icon } from 'lucide-react'
import * as React from 'react'
import { toast } from 'sonner'
import {
	getItemId,
	getLinkUrl,
	isAction,
	isComponent,
	isItemDisabled,
	isItemHidden,
	isLink,
	isSeparator,
	type RowContextMenuComponent,
	type RowContextMenuItem,
} from '@/components/data-grid/lib/data-grid-row-context'
import {
	ContextMenu as BaseContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
} from '@/components/ui/context-menu'
import { useAsRef } from './hooks/use-as-ref'
import { parseCellKey } from './lib/data-grid'
import type { CellUpdate, ContextMenuState } from './types/data-grid'

interface DataGridContextMenuProps<TData> {
	tableMeta: TableMeta<TData>
	table: Table<TData>
	columns: Array<ColumnDef<TData>>
	contextMenu: ContextMenuState
	extraItems?: RowContextMenuItem<TData>[]
}

interface ComponentState<TData> {
	item: RowContextMenuComponent<TData>
	row: TData
}

export function DataGridContextMenu<TData>({
	tableMeta,
	table,
	columns,
	contextMenu,
	extraItems,
}: DataGridContextMenuProps<TData>) {
	const onContextMenuOpenChange = tableMeta?.onContextMenuOpenChange
	const selectionState = tableMeta?.selectionState
	const dataGridRef = tableMeta?.dataGridRef
	const onDataUpdate = tableMeta?.onDataUpdate
	const onRowsDelete = tableMeta?.onRowsDelete
	const onCellsCopy = tableMeta?.onCellsCopy
	const onCellsCut = tableMeta?.onCellsCut
	const [componentState, setComponentState] =
		React.useState<ComponentState<TData> | null>(null)

	const openComponent = React.useCallback(
		(item: RowContextMenuComponent<TData>, row: TData) => {
			setComponentState({ item, row })
		},
		[],
	)

	const closeComponent = React.useCallback(() => {
		setComponentState(null)
	}, [])

	const focusedCell = tableMeta?.focusedCell
	const menuRow =
		extraItems?.length && focusedCell
			? (table.getRowModel().rows[focusedCell.rowIndex]?.original ?? null)
			: null

	const shouldRenderMenu = contextMenu.open

	if (!shouldRenderMenu && !componentState) return null

	return (
		<>
			{shouldRenderMenu && (
				<DataGridContextMenuRoot
					tableMeta={tableMeta}
					columns={columns}
					dataGridRef={dataGridRef}
					contextMenu={contextMenu}
					onContextMenuOpenChange={onContextMenuOpenChange}
					selectionState={selectionState}
					onDataUpdate={onDataUpdate}
					onRowsDelete={onRowsDelete}
					onCellsCopy={onCellsCopy}
					onCellsCut={onCellsCut}
					extraItems={extraItems}
					menuRow={menuRow}
					openComponent={openComponent}
				/>
			)}
			{componentState?.item.component({
				row: componentState.row,
				open: true,
				onOpenChange: (open) => !open && closeComponent(),
				onClose: closeComponent,
			})}
		</>
	)
}

interface ContextMenuProps<TData>
	extends Pick<
			TableMeta<TData>,
			| 'dataGridRef'
			| 'onContextMenuOpenChange'
			| 'selectionState'
			| 'onDataUpdate'
			| 'onRowsDelete'
			| 'onCellsCopy'
			| 'onCellsCut'
			| 'readOnly'
		>,
		Required<Pick<TableMeta<TData>, 'contextMenu'>> {
	tableMeta: TableMeta<TData>
	columns: Array<ColumnDef<TData>>
	extraItems?: RowContextMenuItem<TData>[]
	menuRow?: TData | null
	openComponent: (item: RowContextMenuComponent<TData>, row: TData) => void
}

const DataGridContextMenuRoot = React.memo(
	DataGridContextMenuImpl,
	(prev, next) => {
		if (prev.contextMenu.open !== next.contextMenu.open) return false
		if (!next.contextMenu.open) return true
		if (prev.contextMenu.x !== next.contextMenu.x) return false
		if (prev.contextMenu.y !== next.contextMenu.y) return false

		const prevSize = prev.selectionState?.selectedCells?.size ?? 0
		const nextSize = next.selectionState?.selectedCells?.size ?? 0
		if (prevSize !== nextSize) return false

		if (prev.extraItems !== next.extraItems) return false
		if (prev.menuRow !== next.menuRow) return false

		return true
	},
) as typeof DataGridContextMenuImpl

function DataGridContextMenuImpl<TData>({
	tableMeta,
	columns,
	dataGridRef,
	contextMenu,
	onContextMenuOpenChange,
	selectionState,
	onDataUpdate,
	onRowsDelete,
	onCellsCopy,
	onCellsCut,
	extraItems,
	menuRow,
	openComponent,
}: ContextMenuProps<TData>) {
	const propsRef = useAsRef({
		dataGridRef,
		selectionState,
		onDataUpdate,
		onRowsDelete,
		onCellsCopy,
		onCellsCut,
		columns,
	})

	const anchorStyle = React.useMemo<React.CSSProperties>(
		() => ({
			position: 'fixed',
			left: `${contextMenu.x}px`,
			top: `${contextMenu.y}px`,
			width: 0,
			height: 0,
			padding: 0,
			margin: 0,
			border: 'none',
			background: 'transparent',
			pointerEvents: 'none',
			opacity: 0,
		}),
		[contextMenu.x, contextMenu.y],
	)

	const finalFocus = propsRef.current.dataGridRef

	const onCopy = React.useCallback(() => {
		propsRef.current.onCellsCopy?.()
	}, [propsRef])

	const onCut = React.useCallback(() => {
		propsRef.current.onCellsCut?.()
	}, [propsRef])

	const onClear = React.useCallback(() => {
		const { selectionState, columns, onDataUpdate } = propsRef.current

		if (
			!selectionState?.selectedCells ||
			selectionState.selectedCells.size === 0
		)
			return

		const updates: Array<CellUpdate> = []

		for (const cellKey of selectionState.selectedCells) {
			const { rowIndex, columnId } = parseCellKey(cellKey)

			// Get column from columns array
			const column = columns.find((col) => {
				if (col.id) return col.id === columnId
				if ('accessorKey' in col) return col.accessorKey === columnId
				return false
			})
			const cellVariant = column?.meta?.cell?.variant

			let emptyValue: unknown = ''
			if (cellVariant === 'multi-select' || cellVariant === 'file') {
				emptyValue = []
			} else if (cellVariant === 'number' || cellVariant === 'date') {
				emptyValue = null
			} else if (cellVariant === 'checkbox') {
				emptyValue = false
			}

			updates.push({ rowIndex, columnId, value: emptyValue })
		}

		onDataUpdate?.(updates)

		toast.success(
			`${updates.length} cell${updates.length !== 1 ? 's' : ''} cleared`,
		)
	}, [propsRef])

	const onDelete = React.useCallback(async () => {
		const { selectionState, onRowsDelete } = propsRef.current

		if (
			!selectionState?.selectedCells ||
			selectionState.selectedCells.size === 0
		)
			return

		const rowIndices = new Set<number>()
		for (const cellKey of selectionState.selectedCells) {
			const { rowIndex } = parseCellKey(cellKey)
			rowIndices.add(rowIndex)
		}

		const rowIndicesArray = Array.from(rowIndices).sort((a, b) => a - b)
		const rowCount = rowIndicesArray.length

		await onRowsDelete?.(rowIndicesArray)

		toast.success(`${rowCount} row${rowCount !== 1 ? 's' : ''} deleted`)
	}, [propsRef])

	const hasExtraItems = Boolean(extraItems?.length && menuRow)

	return (
		<BaseContextMenu
			open={contextMenu.open}
			onOpenChange={onContextMenuOpenChange}
		>
			<div data-context-menu-anchor style={anchorStyle} />
			<ContextMenuContent
				data-grid-popover=''
				align='start'
				className='w-48'
				finalFocus={finalFocus}
				style={{
					position: 'fixed',
					left: `${contextMenu.x}px`,
					top: `${contextMenu.y}px`,
				}}
			>
				<ContextMenuItem onClick={onCopy}>
					<CopyIcon />
					Copy
				</ContextMenuItem>
				<ContextMenuItem onClick={onCut} disabled={tableMeta?.readOnly}>
					<ScissorsIcon />
					Cut
				</ContextMenuItem>
				<ContextMenuItem onClick={onClear} disabled={tableMeta?.readOnly}>
					<EraserIcon />
					Clear
				</ContextMenuItem>
				{hasExtraItems && <ContextMenuSeparator />}
				{hasExtraItems &&
					extraItems?.map((item, index) => {
						const itemId = getItemId(item, index)

						if (isSeparator(item)) {
							return <ContextMenuSeparator key={itemId} />
						}

						if (isItemHidden(item, menuRow!)) return null

						const Icon = item.icon
						const disabled = isItemDisabled(item, menuRow!)

						if (isLink(item)) {
							const url = getLinkUrl(item, menuRow!)
							return (
								<ContextMenuItem
									key={itemId}
									disabled={disabled}
									variant={item.variant}
									onClick={() => {
										if (item.external) {
											window.open(url, '_blank', 'noopener,noreferrer')
										} else {
											window.location.href = url
										}
									}}
								>
									{Icon && <Icon className='mr-2 size-4' />}
									{item.label}
									{item.shortcut && (
										<span className='ml-auto text-muted-foreground text-xs'>
											{item.shortcut}
										</span>
									)}
								</ContextMenuItem>
							)
						}

						if (isComponent(item)) {
							return (
								<ContextMenuItem
									key={itemId}
									disabled={disabled}
									variant={item.variant}
									onClick={() => {
										openComponent(item, menuRow!)
										onContextMenuOpenChange?.(false)
									}}
								>
									{Icon && <Icon className='mr-2 size-4' />}
									{item.label}
									{item.shortcut && (
										<span className='ml-auto text-muted-foreground text-xs'>
											{item.shortcut}
										</span>
									)}
								</ContextMenuItem>
							)
						}

						if (isAction(item)) {
							return (
								<ContextMenuItem
									key={itemId}
									disabled={disabled}
									variant={item.variant}
									onClick={() => {
										item.onAction(menuRow!)
										onContextMenuOpenChange?.(false)
									}}
								>
									{Icon && <Icon className='mr-2 size-4' />}
									{item.label}
									{item.shortcut && (
										<span className='ml-auto text-muted-foreground text-xs'>
											{item.shortcut}
										</span>
									)}
								</ContextMenuItem>
							)
						}

						return null
					})}
				{onRowsDelete && (
					<>
						<ContextMenuSeparator />
						<ContextMenuItem variant='destructive' onClick={onDelete}>
							<Trash2Icon />
							Delete rows
						</ContextMenuItem>
					</>
				)}
			</ContextMenuContent>
		</BaseContextMenu>
	)
}
