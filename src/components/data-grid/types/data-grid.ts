import type { Cell, TableMeta } from '@tanstack/react-table'
import type { TableVariant } from '../lib/data-grid-variants'

export type { TableVariant }

type Formatters =
	typeof import('@/components/data-grid/lib/data-grid-utils').formatters

export type Direction = 'ltr' | 'rtl'

export type RowHeightValue = 'short' | 'medium' | 'tall' | 'extra-tall'

export interface CellSelectOption {
	label: string
	value: string
	icon?: React.FC<React.SVGProps<SVGSVGElement>>
	count?: number
}

export type CellOpts =
	| {
			variant: 'short-text'
	  }
	| {
			variant: 'long-text'
	  }
	| {
			variant: 'number'
			min?: number
			max?: number
			step?: number
	  }
	| {
			variant: 'select'
			options: CellSelectOption[]
	  }
	| {
			variant: 'multi-select'
			options: CellSelectOption[]
	  }
	| {
			variant: 'checkbox'
	  }
	| {
			variant: 'date'
	  }
	| {
			variant: 'url'
	  }
	| {
			variant: 'file'
			maxFileSize?: number
			maxFiles?: number
			accept?: string
			multiple?: boolean
	  }
	| {
			variant: 'progress'
			max?: number
			getVariant?: (value: number) => string
	  }

export interface CellUpdate {
	rowIndex: number
	columnId: string
	value: unknown
}

export interface CellPosition {
	rowIndex: number
	columnId: string
}

export interface CellRange {
	start: CellPosition
	end: CellPosition
}

export interface SelectionState {
	selectedCells: Set<string>
	selectionRange: CellRange | null
	isSelecting: boolean
}

export interface ContextMenuState {
	open: boolean
	x: number
	y: number
}

export interface PasteDialogState {
	open: boolean
	rowsNeeded: number
	clipboardText: string
}

export interface InfiniteScrollOptions {
	loadMore: () => void | Promise<void>
	hasMore?: boolean
	isLoading?: boolean
	threshold?: number
}

export type NavigationDirection =
	| 'up'
	| 'down'
	| 'left'
	| 'right'
	| 'home'
	| 'end'
	| 'ctrl+up'
	| 'ctrl+down'
	| 'ctrl+home'
	| 'ctrl+end'
	| 'pageup'
	| 'pagedown'
	| 'pageleft'
	| 'pageright'

declare module '@tanstack/react-table' {
	// biome-ignore lint/correctness/noUnusedVariables: TData and TValue are used in the ColumnMeta interface
	interface ColumnMeta<TData, TValue> {
		label?: string
		cell?: CellOpts
		customCell?: boolean
		formatter?: (row: TData, formatters: Formatters) => React.ReactNode
		expandedContent?: (row: TData) => React.ReactNode
		handleEdit?: (row: TData) => void
	}

	// biome-ignore lint/correctness/noUnusedVariables: TData is used in the TableMeta interface
	interface TableMeta<TData> {
		dataGridRef?: React.RefObject<HTMLElement | null>
		cellMapRef?: React.RefObject<Map<string, HTMLDivElement>>
		focusedCell?: CellPosition | null
		editingCell?: CellPosition | null
		selectionState?: SelectionState
		searchOpen?: boolean
		getIsCellSelected?: (rowIndex: number, columnId: string) => boolean
		getIsSearchMatch?: (rowIndex: number, columnId: string) => boolean
		getIsActiveSearchMatch?: (rowIndex: number, columnId: string) => boolean
		getVisualRowIndex?: (rowId: string) => number | undefined
		rowHeight?: RowHeightValue
		selectionStateStore?: {
			subscribe: (listener: () => void) => () => void
			getSnapshot: () => SelectionState
		}
		onRowHeightChange?: (value: RowHeightValue) => void
		onRowSelect?: (
			rowIndex: number,
			checked: boolean,
			shiftKey: boolean,
		) => void
		onDataUpdate?: (params: CellUpdate | Array<CellUpdate>) => void
		onRowsDelete?: (rowIndices: number[]) => void | Promise<void>
		onColumnClick?: (columnId: string) => void
		onCellClick?: (
			rowIndex: number,
			columnId: string,
			event?: React.MouseEvent,
		) => void
		onCellDoubleClick?: (rowIndex: number, columnId: string) => void
		onCellMouseDown?: (
			rowIndex: number,
			columnId: string,
			event: React.MouseEvent,
		) => void
		onCellMouseEnter?: (rowIndex: number, columnId: string) => void
		onCellMouseUp?: () => void
		onCellContextMenu?: (
			rowIndex: number,
			columnId: string,
			event: React.MouseEvent,
		) => void
		onCellEditingStart?: (rowIndex: number, columnId: string) => void
		onCellEditingStop?: (opts?: {
			direction?: NavigationDirection
			moveToNextRow?: boolean
		}) => void
		onCellsCopy?: () => void
		onCellsCut?: () => void
		onCellsPaste?: (expand?: boolean) => void
		onSelectionClear?: () => void
		onFilesUpload?: (params: {
			files: File[]
			rowIndex: number
			columnId: string
		}) => Promise<FileCellData[]>
		onFilesDelete?: (params: {
			fileIds: string[]
			rowIndex: number
			columnId: string
		}) => void | Promise<void>
		onFilterMenuRequest?: (columnId: string) => void
		contextMenu?: ContextMenuState
		onContextMenuOpenChange?: (open: boolean) => void
		pasteDialog?: PasteDialogState
		onPasteDialogOpenChange?: (open: boolean) => void
		readOnly?: boolean
	}
}

export interface SearchState {
	searchMatches: CellPosition[]
	matchIndex: number
	searchOpen: boolean
	onSearchOpenChange: (open: boolean) => void
	searchQuery: string
	onSearchQueryChange: (query: string) => void
	onSearch: (query: string) => void
	replaceQuery: string
	onReplaceQueryChange: (query: string) => void
	onReplaceNext: () => void
	onReplaceAll: () => void
	replaceEnabled: boolean
	searchCaseSensitive: boolean
	searchWholeWord: boolean
	searchRegex: boolean
	searchRegexError: string | null
	searchInSelection: boolean
	onSearchCaseSensitiveChange: (enabled: boolean) => void
	onSearchWholeWordChange: (enabled: boolean) => void
	onSearchRegexChange: (enabled: boolean) => void
	onSearchInSelectionChange: (enabled: boolean) => void
	onNavigateToNextMatch: () => void
	onNavigateToPrevMatch: () => void
}

export interface DataGridCellProps<TData> {
	cell: Cell<TData, unknown>
	tableMeta: TableMeta<TData>
	rowIndex: number
	columnId: string
	rowHeight: RowHeightValue
	isEditing: boolean
	isFocused: boolean
	isSelected: boolean
	isSearchMatch: boolean
	isActiveSearchMatch: boolean
	readOnly: boolean
	tableVariant?: TableVariant
}

export interface FileCellData {
	id: string
	name: string
	size: number
	type: string
	url?: string
}

export type TextFilterOperator =
	| 'contains'
	| 'notContains'
	| 'equals'
	| 'notEquals'
	| 'startsWith'
	| 'endsWith'
	| 'isEmpty'
	| 'isNotEmpty'

export type NumberFilterOperator =
	| 'equals'
	| 'notEquals'
	| 'lessThan'
	| 'lessThanOrEqual'
	| 'greaterThan'
	| 'greaterThanOrEqual'
	| 'isBetween'
	| 'isEmpty'
	| 'isNotEmpty'

export type DateFilterOperator =
	| 'equals'
	| 'notEquals'
	| 'before'
	| 'after'
	| 'onOrBefore'
	| 'onOrAfter'
	| 'isBetween'
	| 'isEmpty'
	| 'isNotEmpty'

export type SelectFilterOperator =
	| 'is'
	| 'isNot'
	| 'isAnyOf'
	| 'isNoneOf'
	| 'isEmpty'
	| 'isNotEmpty'

export type BooleanFilterOperator = 'isTrue' | 'isFalse'

export type FilterOperator =
	| TextFilterOperator
	| NumberFilterOperator
	| DateFilterOperator
	| SelectFilterOperator
	| BooleanFilterOperator

export interface FilterValue {
	operator: FilterOperator
	value?: string | number | string[]
	endValue?: string | number
}

export interface ColumnFilter<T> {
	columnId: string
	label: string
	value?: string | number | string[] | Date | null
	operator?: FilterOperator
	dataType?: string
	options?: T[]
	color?: string
	icon?: React.ReactNode
}
