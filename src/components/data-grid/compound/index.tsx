'use client'

import { DirectionProvider } from '@base-ui/react/direction-provider'
import type { ColumnDef, Table } from '@tanstack/react-table'
import { Search } from 'lucide-react'
import * as React from 'react'
import { DataGrid as DataGridBase } from '@/components/data-grid/data-grid'
import {
	DataGridExport,
	type DataGridExportProps,
} from '@/components/data-grid/data-grid-export'
import { DataGridFilterMenu } from '@/components/data-grid/data-grid-filter-menu'
import { DataGridRowHeightMenu } from '@/components/data-grid/data-grid-row-height-menu'
import { DataGridSortMenu } from '@/components/data-grid/data-grid-sort-menu'
import {
	type UseDataGridProps,
	useDataGrid,
} from '@/components/data-grid/hooks/use-data-grid'
import { getFilterFn } from '@/components/data-grid/lib/data-grid-filters'
import type { RowContextMenuItem } from '@/components/data-grid/lib/data-grid-row-context'
import type { formatters } from '@/components/data-grid/lib/data-grid-utils'
import type {
	CellOpts,
	CellSelectOption,
	InfiniteScrollOptions,
	SearchState,
	SelectionState,
	TableVariant,
} from '@/components/data-grid/types/data-grid'
import {
	ActionBar,
	ActionBarClose,
	ActionBarGroup,
	ActionBarItem,
	type ActionBarProps,
	ActionBarSelection,
	ActionBarSeparator,
} from '@/components/data-grid/ui/action-bar'
import { Kbd, KbdGroup } from '@/components/data-grid/ui/kbd'
import { cn } from '@/lib/utils'

type Formatters = typeof formatters

type CellVariantValue = CellOpts['variant'] | CellOpts
type CellVariantOptions = Partial<Omit<CellOpts, 'variant'>>
type RowClassName<TData extends object> =
	| string
	| ((row: TData, rowIndex: number) => string | undefined)

interface CreateDataGridProps<TData extends object>
	extends Omit<UseDataGridProps<TData>, 'columns'> {
	data: TData[]
	isLoading?: boolean
	emptyMessage?: React.ReactNode
	infiniteScroll?: InfiniteScrollOptions
}

interface DataGridCompositeProps {
	withSelect?: boolean
	variant?: TableVariant
	height?: number
	stretchColumns?: boolean
	adjustLayout?: boolean
	className?: string
	children?: React.ReactNode
}

interface DataGridHeaderSlotProps {
	children?: React.ReactNode
}

interface DataGridColumnsSlotProps<TData extends object = object> {
	children?: React.ReactNode
	rowContextMenu?: RowContextMenuItem<TData>[]
	cellContextMenu?: RowContextMenuItem<TData>[]
	className?: RowClassName<TData>
}

type DataGridColumnComponent<TData extends object> = <TValue = unknown>(
	props: DataGridColumnProps<TData, TValue>,
) => React.ReactElement | null

type DataGridColumnsComponent<TData extends object> = (
	props: DataGridColumnsSlotProps<TData>,
) => React.ReactElement | null

type DataGridCompositeComponent<TData extends object> = ((
	props: DataGridCompositeProps,
) => React.ReactElement | null) & {
	Header: typeof DataGridHeaderSlot
	Columns: DataGridColumnsComponent<TData>
	Column: DataGridColumnComponent<TData>
	Toolbar: typeof DataGridToolbar
	ActionBar: DataGridActionBarComponent<TData>
}

type DataGridActionBarRenderState<TData extends object> = {
	tableState: ReturnType<Table<TData>['getState']>
	selectionState?: SelectionState
	searchState?: SearchState
	enableSearch: boolean
}

type DataGridActionBarRenderFn<TData extends object> = (
	table: Table<TData>,
	state: DataGridActionBarRenderState<TData>,
) => React.ReactNode

type DataGridActionBarSelectionProps<TData extends object> = Omit<
	React.ComponentProps<typeof ActionBarSelection>,
	'children'
> & {
	children?: React.ReactNode | DataGridActionBarRenderFn<TData>
}

type DataGridActionBarGroupProps<TData extends object> = Omit<
	React.ComponentProps<typeof ActionBarGroup>,
	'children'
> & {
	children?: React.ReactNode | DataGridActionBarRenderFn<TData>
}

type DataGridActionBarComponent<TData extends object> = ((
	props: ActionBarProps,
) => React.ReactElement | null) & {
	Group: (
		props: DataGridActionBarGroupProps<TData>,
	) => React.ReactElement | null
	Item: typeof ActionBarItem
	Selection: (
		props: DataGridActionBarSelectionProps<TData>,
	) => React.ReactElement | null
	Separator: typeof ActionBarSeparator
	Close: typeof ActionBarClose
}

type DataGridToolbarToggleProps = {
	filter?: boolean
	sort?: boolean
	rowHeight?: boolean
	export?: boolean
	search?: boolean
}

interface DataGridToolbarProps<TData extends object>
	extends React.ComponentProps<'div'>,
		DataGridToolbarToggleProps {
	align?: 'start' | 'center' | 'end'
	exportProps?: Omit<DataGridExportProps<TData>, 'table'>
}

type DataGridColumnProps<TData extends object, TValue = unknown> = ColumnDef<
	TData,
	TValue
> & {
	id?: string
	accessorKey?: keyof TData | (string & {})
	accessorFn?: (row: TData, index: number) => TValue
	title?: string
	cellVariant?: CellVariantValue
	opts?: CellVariantOptions
	formatter?: (row: TData, formatters: Formatters) => React.ReactNode
	expandedContent?: (row: TData) => React.ReactNode
	handleEdit?: (row: TData) => void
	children?: React.ReactNode | ColumnDef<TData, TValue>['cell']
}

interface CompoundContextValue<TData extends object> {
	table: Table<TData>
	searchState?: SearchState
	enableSearch: boolean
	tableState: ReturnType<Table<TData>['getState']>
	selectionState?: SelectionState
}

const DataGridCompoundContext =
	React.createContext<CompoundContextValue<object> | null>(null)

function useCompoundGrid<TData extends object>() {
	const context = React.useContext(DataGridCompoundContext)
	if (!context) {
		throw new Error('useCompoundGrid must be used within a DataGrid provider')
	}
	return context as unknown as CompoundContextValue<TData>
}

function DataGridHeaderSlot(_props: DataGridHeaderSlotProps) {
	return null
}

function DataGridColumnsSlot<TData extends object>(
	_props: DataGridColumnsSlotProps<TData>,
) {
	return null
}

const DataGridColumnBase = <TData extends object, TValue = unknown>(
	_props: DataGridColumnProps<TData, TValue>,
): React.ReactElement | null => null

const EMPTY_SELECTION_STATE: SelectionState = {
	selectedCells: new Set<string>(),
	selectionRange: null,
	isSelecting: false,
}

function useSelectionStateSnapshot<TData extends object>(
	table: Table<TData>,
	fallback?: SelectionState,
) {
	const selectionStateStore = table.options.meta?.selectionStateStore
	const subscribe = React.useCallback(
		(listener: () => void) =>
			selectionStateStore?.subscribe(listener) ?? (() => undefined),
		[selectionStateStore],
	)
	const getSnapshot = React.useCallback(
		() =>
			selectionStateStore?.getSnapshot() ?? fallback ?? EMPTY_SELECTION_STATE,
		[selectionStateStore, fallback],
	)
	return React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

function DataGridActionBarSelection<TData extends object>({
	children,
	...props
}: DataGridActionBarSelectionProps<TData>) {
	const { table, tableState, selectionState, searchState, enableSearch } =
		useCompoundGrid<TData>()
	const selectionSnapshot = useSelectionStateSnapshot(table, selectionState)
	const state = React.useMemo(
		() => ({
			tableState,
			selectionState: selectionSnapshot,
			searchState,
			enableSearch,
		}),
		[tableState, selectionSnapshot, searchState, enableSearch],
	)
	const resolvedChildren =
		typeof children === 'function' ? children(table, state) : children

	return <ActionBarSelection {...props}>{resolvedChildren}</ActionBarSelection>
}

function DataGridActionBarGroup<TData extends object>({
	children,
	...props
}: DataGridActionBarGroupProps<TData>) {
	const { table, tableState, selectionState, searchState, enableSearch } =
		useCompoundGrid<TData>()
	const selectionSnapshot = useSelectionStateSnapshot(table, selectionState)
	const state = React.useMemo(
		() => ({
			tableState,
			selectionState: selectionSnapshot,
			searchState,
			enableSearch,
		}),
		[tableState, selectionSnapshot, searchState, enableSearch],
	)
	const resolvedChildren =
		typeof children === 'function' ? children(table, state) : children

	return <ActionBarGroup {...props}>{resolvedChildren}</ActionBarGroup>
}

function DataGridActionBar<TData extends object>(props: ActionBarProps) {
	const {
		open: openProp,
		onOpenChange: onOpenChangeProp,
		...actionBarProps
	} = props
	const { table, selectionState } = useCompoundGrid<TData>()
	const tableMeta = table.options.meta
	const selectionSnapshot = useSelectionStateSnapshot(table, selectionState)
	const selectedCellCount = selectionSnapshot.selectedCells.size
	const resolvedOpen = openProp ?? selectedCellCount > 0

	const onOpenChange = React.useCallback(
		(open: boolean) => {
			onOpenChangeProp?.(open)
			if (!open) {
				table.toggleAllRowsSelected(false)
				tableMeta?.onSelectionClear?.()
			}
		},
		[onOpenChangeProp, table, tableMeta],
	)

	return (
		<ActionBar
			data-grid-popover=''
			{...actionBarProps}
			open={resolvedOpen}
			onOpenChange={onOpenChange}
		/>
	)
}

function collectGridSlots<TData extends object>(children: React.ReactNode) {
	const headers: Set<React.ReactNode> = new Set()
	let columns: React.ReactElement<DataGridColumnsSlotProps<TData>> | undefined
	let rowContextMenu: RowContextMenuItem<TData>[] | undefined
	let cellContextMenu: RowContextMenuItem<TData>[] | undefined
	let rowClassName: RowClassName<TData> | undefined

	const walk = (nodes: React.ReactNode) => {
		React.Children.forEach(nodes, (child) => {
			if (!React.isValidElement<{ children?: React.ReactNode }>(child)) return

			if (child.type === DataGridHeaderSlot) {
				headers.add(child.props.children)
				return
			}

			if (child.type === DataGridColumnsSlot && !columns) {
				columns = child as React.ReactElement<DataGridColumnsSlotProps<TData>>
				const slotProps = child.props as DataGridColumnsSlotProps<TData>
				if (slotProps.rowContextMenu) {
					rowContextMenu = slotProps.rowContextMenu
				}
				if (slotProps.cellContextMenu) {
					cellContextMenu = slotProps.cellContextMenu
				}
				if (slotProps.className) {
					rowClassName = slotProps.className
				}
				return
			}

			if (child.type === React.Fragment) {
				walk(child.props.children)
			}
		})
	}

	walk(children)

	return {
		headers: Array.from(headers),
		columns,
		rowContextMenu,
		cellContextMenu,
		rowClassName,
	}
}

function resolveAccessorValue<TData extends object>(
	row: TData,
	column: DataGridColumnProps<TData, unknown>,
	index: number,
): unknown {
	if ('accessorFn' in column && typeof column.accessorFn === 'function') {
		return column.accessorFn(row, index)
	}
	if ('accessorKey' in column && column.accessorKey) {
		const key = column.accessorKey as keyof TData
		return row[key]
	}
	return undefined
}

function inferSelectOptions<TData extends object>(
	data: TData[],
	column: DataGridColumnProps<TData, unknown>,
): CellSelectOption[] {
	const seen = new Set<string>()
	const options: CellSelectOption[] = []

	data.forEach((row, index) => {
		const value = resolveAccessorValue(row, column, index)
		if (value == null) return
		const values = Array.isArray(value) ? value : [value]
		values.forEach((item) => {
			if (item == null) return
			const stringValue = String(item)
			if (seen.has(stringValue)) return
			seen.add(stringValue)
			options.push({ label: stringValue, value: stringValue })
		})
	})

	return options
}

type InferredVariant = CellOpts['variant']

const ISO_DATE_RE =
	/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/
const URL_RE = /^https?:\/\/.+/

function detectValueType(value: unknown): InferredVariant {
	if (value == null) return 'short-text'
	if (value instanceof Date && !Number.isNaN(value.getTime())) return 'date'
	if (typeof value === 'number') return 'number'
	if (typeof value === 'boolean') return 'checkbox'
	if (Array.isArray(value)) return 'multi-select'
	if (typeof value === 'string') {
		if (URL_RE.test(value)) return 'url'
		if (ISO_DATE_RE.test(value) || value.includes('GMT')) return 'date'
	}
	return 'short-text'
}

function inferCellVariant<TData extends object>(
	data: TData[],
	column: DataGridColumnProps<TData, unknown>,
): CellOpts {
	const typesSeen = new Set<InferredVariant>()
	let detectedVariant: InferredVariant = 'short-text'

	for (let i = 0; i < data.length; i++) {
		const value = resolveAccessorValue(data[i], column, i)
		if (value == null) continue

		const variant = detectValueType(value)
		typesSeen.add(variant)

		if (typesSeen.size > 1) {
			return { variant: 'short-text' }
		}

		detectedVariant = variant
	}

	if (detectedVariant === 'multi-select' || detectedVariant === 'select') {
		const options = inferSelectOptions(data, column)
		return { variant: detectedVariant, options }
	}

	return { variant: detectedVariant } as CellOpts
}

function resolveCellVariant<TData extends object>(
	column: DataGridColumnProps<TData, unknown>,
	data: TData[],
): CellOpts | undefined {
	const { cellVariant, opts } = column
	if (!cellVariant) {
		return inferCellVariant(data, column)
	}

	let resolved: CellOpts
	if (typeof cellVariant === 'string') {
		resolved = { variant: cellVariant, ...(opts ?? {}) } as CellOpts
	} else {
		resolved = opts ? ({ ...cellVariant, ...opts } as CellOpts) : cellVariant
	}

	if (resolved.variant === 'select' || resolved.variant === 'multi-select') {
		const hasOptions =
			'options' in resolved &&
			Array.isArray(resolved.options) &&
			resolved.options.length > 0
		if (!hasOptions) {
			const inferredOptions = inferSelectOptions(data, column)
			return { ...resolved, options: inferredOptions }
		}
	}

	return resolved
}

function buildDataGridColumnDef<TData extends object, TValue = unknown>(
	column: DataGridColumnProps<TData, TValue>,
	config: {
		data: TData[]
		index: number
		filterFn: ReturnType<typeof getFilterFn<TData>>
	},
): ColumnDef<TData, TValue> {
	const {
		title,
		cellVariant,
		opts,
		formatter,
		expandedContent,
		handleEdit,
		children,
		cell,
		header,
		meta,
		...rest
	} = column

	const resolvedCellVariant = resolveCellVariant(
		{ ...column, cellVariant, opts } as DataGridColumnProps<TData, unknown>,
		config.data,
	)

	let resolvedCell: ColumnDef<TData, TValue>['cell'] | undefined = cell
	if (!resolvedCell && typeof children === 'function') {
		resolvedCell = children
	} else if (!resolvedCell && children != null) {
		resolvedCell = () => children
	}
	const hasCustomCell =
		Boolean(cell) ||
		typeof children === 'function' ||
		(children != null && children !== false)

	const resolvedMeta = {
		...(meta ?? {}),
		...(title && !header ? { label: title } : {}),
		...(resolvedCellVariant ? { cell: resolvedCellVariant } : {}),
		...(formatter ? { formatter } : {}),
		...(expandedContent ? { expandedContent } : {}),
		...(handleEdit ? { handleEdit } : {}),
		...(hasCustomCell ? { customCell: true } : {}),
	}

	const columnDef = rest as ColumnDef<TData, TValue>
	if (header) {
		columnDef.header = header
	} else if (title) {
		columnDef.header = title
	}
	if (resolvedCell) {
		columnDef.cell = resolvedCell
	}
	columnDef.meta = resolvedMeta
	columnDef.filterFn = columnDef.filterFn ?? config.filterFn

	if (!columnDef.id) {
		const accessorKey =
			'accessorKey' in columnDef && columnDef.accessorKey
				? columnDef.accessorKey
				: undefined
		columnDef.id = accessorKey ? String(accessorKey) : `column-${config.index}`
	}

	return columnDef
}

function DataGridToolbar<TData extends object>({
	filter = false,
	sort = false,
	rowHeight = false,
	export: exportEnabled = false,
	search = false,
	align = 'end',
	exportProps,
	className,
	children,
	...props
}: DataGridToolbarProps<TData>) {
	const { table, searchState, enableSearch } = useCompoundGrid<TData>()
	const isMac =
		typeof navigator !== 'undefined' &&
		navigator.platform.toLowerCase().includes('mac')
	const shortcutKey = isMac ? 'Cmd' : 'Ctrl'

	const onSearchClick = React.useCallback(() => {
		searchState?.onSearchOpenChange?.(true)
	}, [searchState])

	return (
		<div
			className={cn('flex items-center gap-2 self-end', className)}
			{...props}
		>
			{search && enableSearch && searchState && (
				<button
					type='button'
					onClick={onSearchClick}
					className='inline-flex h-7 items-center gap-2 rounded-md border border-border bg-background px-2 text-foreground text-sm shadow-sm transition hover:bg-accent hover:text-accent-foreground'
				>
					<Search className='size-4 text-muted-foreground' />
					Find
					<KbdGroup className='ms-2'>
						<Kbd>{shortcutKey}</Kbd>
						<Kbd>F</Kbd>
					</KbdGroup>
				</button>
			)}
			{filter && <DataGridFilterMenu table={table} align={align} />}
			{sort && <DataGridSortMenu table={table} align={align} />}
			{rowHeight === true && <DataGridRowHeightMenu table={table} />}
			{exportEnabled && <DataGridExport table={table} {...exportProps} />}
			{children}
		</div>
	)
}

export function useGrid<TData extends object>(
	factory: () => CreateDataGridProps<TData>,
	deps: React.DependencyList = [],
) {
	const config = React.useMemo(factory, deps)
	const configRef = React.useRef(config)
	configRef.current = config

	const DataGridColumn =
		DataGridColumnBase as unknown as DataGridColumnComponent<TData>

	const ActionBarComponent = Object.assign(DataGridActionBar, {
		Group: DataGridActionBarGroup,
		Item: ActionBarItem,
		Selection: DataGridActionBarSelection,
		Separator: ActionBarSeparator,
		Close: ActionBarClose,
	}) as DataGridActionBarComponent<TData>

	function collectGridColumns(
		children: React.ReactNode,
	): Array<React.ReactElement<DataGridColumnProps<TData, unknown>>> {
		const columns: Set<
			React.ReactElement<DataGridColumnProps<TData, unknown>>
		> = new Set()

		const walk = (nodes: React.ReactNode) => {
			React.Children.forEach(nodes, (child) => {
				if (!React.isValidElement<{ children?: React.ReactNode }>(child)) return

				if (child.type === DataGridColumn) {
					columns.add(
						child as React.ReactElement<DataGridColumnProps<TData, unknown>>,
					)
					return
				}

				if (child.type === React.Fragment) {
					walk(child.props.children)
				}
			})
		}

		walk(children)

		return Array.from(columns)
	}

	const TableComponent = React.useMemo(() => {
		const Component: DataGridCompositeComponent<TData> = ({
			children,
			withSelect,
			variant,
			height,
			stretchColumns,
			adjustLayout,
			className,
		}: DataGridCompositeProps) => {
			const config = configRef.current
			const { infiniteScroll, ...gridConfig } = config
			const slots = React.useMemo(
				() => collectGridSlots<TData>(children),
				[children],
			)
			const columnElements = React.useMemo(
				() => collectGridColumns(slots.columns?.props.children),
				[slots.columns?.props.children],
			)
			const filterFn = React.useMemo(() => getFilterFn<TData>(), [])
			const baseColumns = React.useMemo(
				() =>
					columnElements.map((column, index) =>
						buildDataGridColumnDef<TData, unknown>(column.props, {
							data: config.data,
							index,
							filterFn,
						}),
					),
				[columnElements, config.data, filterFn],
			)

			const resolvedWithSelect = withSelect ?? config.withSelect
			const resolvedEnableSearch = config.enableSearch ?? true
			const hasRowContextMenu = Boolean(slots.rowContextMenu?.length)
			const { table, ...dataGridProps } = useDataGrid({
				readOnly: true,
				...gridConfig,
				enableSearch: resolvedEnableSearch,
				withSelect: resolvedWithSelect,
				columns: baseColumns,
				data: gridConfig.data,
				enableCellContextMenu: !hasRowContextMenu,
				...(infiniteScroll
					? {
							enablePagination: false,
							showPagination: false,
							paginationProps: undefined,
						}
					: {}),
			})
			const tableState = table.getState()
			const selectionState = table.options.meta?.selectionState

			const contextValue = React.useMemo(
				() => ({
					table,
					searchState: dataGridProps.searchState,
					enableSearch: resolvedEnableSearch,
					tableState,
					selectionState,
				}),
				[
					resolvedEnableSearch,
					dataGridProps.searchState,
					table,
					tableState,
					selectionState,
				],
			)

			return (
				<DirectionProvider direction={dataGridProps.dir ?? 'ltr'}>
					<DataGridCompoundContext.Provider
						value={contextValue as unknown as CompoundContextValue<object>}
					>
						<div className='w-full space-y-2.5'>
							{slots.headers.map((header, index) => (
								<React.Fragment key={`header-${index}`}>
									{header}
								</React.Fragment>
							))}
							<DataGridBase
								{...dataGridProps}
								table={table}
								variant={variant}
								height={height}
								stretchColumns={stretchColumns}
								adjustLayout={adjustLayout ?? false}
								className={cn(className)}
								rowContextMenu={slots.rowContextMenu}
								cellContextMenu={slots.cellContextMenu}
								rowClassName={slots.rowClassName}
								infiniteScroll={infiniteScroll}
								isLoading={config.isLoading}
								emptyMessage={config.emptyMessage}
							/>
							{children}
						</div>
					</DataGridCompoundContext.Provider>
				</DirectionProvider>
			)
		}

		Component.Header = DataGridHeaderSlot
		Component.Columns = DataGridColumnsSlot as DataGridColumnsComponent<TData>
		Component.Column = DataGridColumn
		Component.Toolbar = DataGridToolbar
		Component.ActionBar = ActionBarComponent

		return Component
	}, [configRef])

	return TableComponent
}

export { useCompoundGrid }
export type { DataGridColumnProps, DataGridToolbarProps, Formatters }
