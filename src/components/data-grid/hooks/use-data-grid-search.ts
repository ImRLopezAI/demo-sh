import type { useReactTable } from '@tanstack/react-table'
import type { Virtualizer } from '@tanstack/react-virtual'
import * as React from 'react'
import { getCellKey } from '../lib/data-grid'
import type { CellPosition, CellUpdate, SearchState } from '../types/data-grid'

interface DataGridState {
	sorting: import('@tanstack/react-table').SortingState
	columnFilters: import('@tanstack/react-table').ColumnFiltersState
	rowHeight: import('../types/data-grid').RowHeightValue
	rowSelection: import('@tanstack/react-table').RowSelectionState
	expanded: import('@tanstack/react-table').ExpandedState
	selectionState: import('../types/data-grid').SelectionState
	focusedCell: CellPosition | null
	editingCell: CellPosition | null
	cutCells: Set<string>
	contextMenu: import('../types/data-grid').ContextMenuState
	searchQuery: string
	replaceQuery: string
	searchCaseSensitive: boolean
	searchWholeWord: boolean
	searchRegex: boolean
	searchRegexError: string | null
	searchInSelection: boolean
	searchMatches: CellPosition[]
	matchIndex: number
	searchOpen: boolean
	lastClickedRowIndex: number | null
	pasteDialog: import('../types/data-grid').PasteDialogState
}

interface DataGridStore {
	subscribe: (callback: () => void) => () => void
	getState: () => DataGridState
	setState: <K extends keyof DataGridState>(
		key: K,
		value: DataGridState[K],
	) => void
	notify: () => void
	batch: (fn: () => void) => void
}

function useStore<T>(
	store: DataGridStore,
	selector: (state: DataGridState) => T,
): T {
	const getSnapshot = React.useCallback(
		() => selector(store.getState()),
		[store, selector],
	)

	return React.useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot)
}

export interface UseDataGridSearchParams<TData> {
	store: DataGridStore
	tableRef: React.RefObject<ReturnType<typeof useReactTable<TData>> | null>
	dataGridRef: React.RefObject<HTMLDivElement | null>
	rowVirtualizerRef: React.RefObject<Virtualizer<
		HTMLDivElement,
		Element
	> | null>
	columnIds: string[]
	focusCell: (rowIndex: number, columnId: string) => void
	onDataUpdate: (updates: CellUpdate | Array<CellUpdate>) => void
	enableSearch: boolean
	readOnly: boolean
}

export interface UseDataGridSearchReturn {
	searchState: SearchState | undefined
	searchMatchesByRow: Map<number, Set<string>> | null
	activeSearchMatch: CellPosition | null
	onSearchOpenChange: (open: boolean) => void
	onSearch: (query: string) => void
	onSearchQueryChange: (query: string) => void
	onNavigateToNextMatch: () => void
	onNavigateToPrevMatch: () => void
	getIsSearchMatch: (rowIndex: number, columnId: string) => boolean
	getIsActiveSearchMatch: (rowIndex: number, columnId: string) => boolean
}

const escapeRegExp = (value: string) =>
	value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

type SearchOptions = {
	caseSensitive: boolean
	wholeWord: boolean
	regex: boolean
}

type CompiledSearchRegexResult =
	| {
			error: string
	  }
	| {
			matcher: RegExp
			replacer: RegExp
	  }

const buildPattern = (query: string, options: SearchOptions) => {
	if (options.regex) return query

	const escapedQuery = escapeRegExp(query)
	if (options.wholeWord) {
		return `\\b${escapedQuery}\\b`
	}

	return escapedQuery
}

const buildCompiledRegex = (
	query: string,
	options: SearchOptions,
): CompiledSearchRegexResult => {
	const pattern = buildPattern(query, options)
	const matcherFlags = options.caseSensitive ? '' : 'i'
	const replaceFlags = options.caseSensitive ? 'g' : 'gi'

	try {
		return {
			matcher: new RegExp(pattern, matcherFlags),
			replacer: new RegExp(pattern, replaceFlags),
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Invalid pattern'
		return {
			error: `Invalid regex: ${message}`,
		}
	}
}

export function useDataGridSearch<TData>({
	store,
	tableRef,
	dataGridRef,
	rowVirtualizerRef,
	columnIds,
	focusCell,
	onDataUpdate,
	enableSearch,
	readOnly,
}: UseDataGridSearchParams<TData>): UseDataGridSearchReturn {
	const searchQuery = useStore(store, (state) => state.searchQuery)
	const replaceQuery = useStore(store, (state) => state.replaceQuery)
	const searchCaseSensitive = useStore(
		store,
		(state) => state.searchCaseSensitive,
	)
	const searchWholeWord = useStore(store, (state) => state.searchWholeWord)
	const searchRegex = useStore(store, (state) => state.searchRegex)
	const searchRegexError = useStore(store, (state) => state.searchRegexError)
	const searchInSelection = useStore(store, (state) => state.searchInSelection)
	const selectedCells = useStore(
		store,
		(state) => state.selectionState.selectedCells,
	)
	const rowSelection = useStore(store, (state) => state.rowSelection)
	const searchMatches = useStore(store, (state) => state.searchMatches)
	const matchIndex = useStore(store, (state) => state.matchIndex)
	const searchOpen = useStore(store, (state) => state.searchOpen)
	const hasRowSelection = React.useMemo(
		() => Object.keys(rowSelection).length > 0,
		[rowSelection],
	)

	const onSearchOpenChange = React.useCallback(
		(open: boolean) => {
			if (open) {
				store.setState('searchOpen', true)
				return
			}

			const currentState = store.getState()
			const currentMatch =
				currentState.matchIndex >= 0 &&
				currentState.searchMatches[currentState.matchIndex]

			store.batch(() => {
				store.setState('searchOpen', false)
				store.setState('searchQuery', '')
				store.setState('replaceQuery', '')
				store.setState('searchRegexError', null)
				store.setState('searchMatches', [])
				store.setState('matchIndex', -1)

				if (currentMatch) {
					store.setState('focusedCell', {
						rowIndex: currentMatch.rowIndex,
						columnId: currentMatch.columnId,
					})
				}
			})

			if (
				dataGridRef.current &&
				document.activeElement !== dataGridRef.current
			) {
				dataGridRef.current.focus()
			}
		},
		[store],
	)

	const compileCurrentQuery = React.useCallback(
		(query: string) => {
			const trimmedQuery = query.trim()
			if (!trimmedQuery) {
				return {
					query: trimmedQuery,
					compiled: null as CompiledSearchRegexResult | null,
				}
			}

			const compiled = buildCompiledRegex(trimmedQuery, {
				caseSensitive: searchCaseSensitive,
				wholeWord: searchWholeWord,
				regex: searchRegex,
			})

			return {
				query: trimmedQuery,
				compiled,
			}
		},
		[searchCaseSensitive, searchWholeWord, searchRegex],
	)

	const collectMatches = React.useCallback(
		(matcher: RegExp) => {
			const matches: CellPosition[] = []
			const currentTable = tableRef.current
			const rows = currentTable?.getRowModel().rows ?? []
			const hasCellSelection = selectedCells.size > 0

			for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
				const row = rows[rowIndex]
				if (!row) continue
				const isRowSelectedForSearch = hasRowSelection
					? rowSelection[row.id] === true
					: false

				for (const columnId of columnIds) {
					if (searchInSelection) {
						if (hasCellSelection) {
							const cellKey = getCellKey(rowIndex, columnId)
							if (!selectedCells.has(cellKey)) continue
						} else if (hasRowSelection) {
							if (!isRowSelectedForSearch) continue
						} else {
							continue
						}
					}
					const cell = row
						.getVisibleCells()
						.find((c) => c.column.id === columnId)
					if (!cell) continue

					const value = cell.getValue()
					const stringValue = String(value ?? '')

					if (matcher.test(stringValue)) {
						matches.push({ rowIndex, columnId })
					}
				}
			}

			return matches
		},
		[
			columnIds,
			searchInSelection,
			selectedCells,
			hasRowSelection,
			rowSelection,
			tableRef,
		],
	)

	const scrollToMatch = React.useCallback(
		(match: CellPosition | null) => {
			if (!match) return
			rowVirtualizerRef.current?.scrollToIndex(match.rowIndex, {
				align: 'center',
			})
		},
		[rowVirtualizerRef],
	)

	const refreshMatches = React.useCallback(
		(preferredIndex: number) => {
			const query = store.getState().searchQuery
			const { query: trimmedQuery, compiled } = compileCurrentQuery(query)

			if (!trimmedQuery) {
				store.batch(() => {
					store.setState('searchRegexError', null)
					store.setState('searchMatches', [])
					store.setState('matchIndex', -1)
				})
				return
			}

			if (searchInSelection && selectedCells.size === 0 && !hasRowSelection) {
				store.batch(() => {
					store.setState('searchRegexError', null)
					store.setState('searchMatches', [])
					store.setState('matchIndex', -1)
				})
				return
			}

			if (!compiled) return
			if ('error' in compiled) {
				store.setState('searchRegexError', compiled.error)
				return
			}

			const matches = collectMatches(compiled.matcher)
			const nextIndex =
				matches.length > 0 ? Math.min(preferredIndex, matches.length - 1) : -1

			store.batch(() => {
				store.setState('searchRegexError', null)
				store.setState('searchMatches', matches)
				store.setState('matchIndex', nextIndex)
			})

			if (nextIndex >= 0) {
				scrollToMatch(matches[nextIndex] ?? null)
			}
		},
		[
			collectMatches,
			compileCurrentQuery,
			hasRowSelection,
			scrollToMatch,
			searchInSelection,
			selectedCells,
			store,
		],
	)

	const getCellValue = React.useCallback(
		(match: CellPosition) => {
			const currentTable = tableRef.current
			const row = currentTable?.getRowModel().rows[match.rowIndex]
			if (!row) return undefined

			const cell = row
				.getVisibleCells()
				.find((c) => c.column.id === match.columnId)
			return cell?.getValue()
		},
		[tableRef],
	)

	const onSearch = React.useCallback(
		(query: string) => {
			const { query: trimmedQuery, compiled } = compileCurrentQuery(query)
			if (!trimmedQuery) {
				store.batch(() => {
					store.setState('searchRegexError', null)
					store.setState('searchMatches', [])
					store.setState('matchIndex', -1)
				})
				return
			}

			if (searchInSelection && selectedCells.size === 0 && !hasRowSelection) {
				store.batch(() => {
					store.setState('searchRegexError', null)
					store.setState('searchMatches', [])
					store.setState('matchIndex', -1)
				})
				return
			}

			if (!compiled) return
			if ('error' in compiled) {
				store.setState('searchRegexError', compiled.error)
				return
			}

			const matches = collectMatches(compiled.matcher)
			store.batch(() => {
				store.setState('searchRegexError', null)
				store.setState('searchMatches', matches)
				store.setState('matchIndex', matches.length > 0 ? 0 : -1)
			})

			if (matches.length > 0) {
				scrollToMatch(matches[0] ?? null)
			}
		},
		[
			collectMatches,
			compileCurrentQuery,
			hasRowSelection,
			scrollToMatch,
			searchInSelection,
			selectedCells,
			store,
		],
	)

	const onSearchQueryChange = React.useCallback(
		(query: string) => store.setState('searchQuery', query),
		[store],
	)

	const onSearchCaseSensitiveChange = React.useCallback(
		(enabled: boolean) => store.setState('searchCaseSensitive', enabled),
		[store],
	)

	const onSearchWholeWordChange = React.useCallback(
		(enabled: boolean) => store.setState('searchWholeWord', enabled),
		[store],
	)

	const onSearchRegexChange = React.useCallback(
		(enabled: boolean) => {
			store.batch(() => {
				store.setState('searchRegex', enabled)
				store.setState('searchRegexError', null)
				if (enabled) {
					store.setState('searchWholeWord', false)
				}
			})
		},
		[store],
	)

	const onSearchInSelectionChange = React.useCallback(
		(enabled: boolean) => store.setState('searchInSelection', enabled),
		[store],
	)

	const onNavigateToPrevMatch = React.useCallback(() => {
		const currentState = store.getState()
		if (currentState.searchMatches.length === 0) return

		const prevIndex =
			currentState.matchIndex - 1 < 0
				? currentState.searchMatches.length - 1
				: currentState.matchIndex - 1
		const match = currentState.searchMatches[prevIndex]

		if (match) {
			rowVirtualizerRef.current?.scrollToIndex(match.rowIndex, {
				align: 'center',
			})

			requestAnimationFrame(() => {
				store.setState('matchIndex', prevIndex)
				requestAnimationFrame(() => {
					focusCell(match.rowIndex, match.columnId)
				})
			})
		}
	}, [store, focusCell])

	const onNavigateToNextMatch = React.useCallback(() => {
		const currentState = store.getState()
		if (currentState.searchMatches.length === 0) return

		const nextIndex =
			(currentState.matchIndex + 1) % currentState.searchMatches.length
		const match = currentState.searchMatches[nextIndex]

		if (match) {
			rowVirtualizerRef.current?.scrollToIndex(match.rowIndex, {
				align: 'center',
			})

			requestAnimationFrame(() => {
				store.setState('matchIndex', nextIndex)
				requestAnimationFrame(() => {
					focusCell(match.rowIndex, match.columnId)
				})
			})
		}
	}, [store, focusCell])

	const onReplaceQueryChange = React.useCallback(
		(query: string) => store.setState('replaceQuery', query),
		[store],
	)

	const onReplaceNext = React.useCallback(() => {
		if (readOnly) return
		const currentState = store.getState()
		const query = currentState.searchQuery.trim()
		if (!query || currentState.searchMatches.length === 0) return

		const { compiled } = compileCurrentQuery(query)
		if (!compiled) return
		if ('error' in compiled) {
			store.setState('searchRegexError', compiled.error)
			return
		}

		const currentIndex =
			currentState.matchIndex >= 0 ? currentState.matchIndex : 0
		const match = currentState.searchMatches[currentIndex]
		if (!match) return

		const value = getCellValue(match)
		if (typeof value !== 'string') {
			onNavigateToNextMatch()
			return
		}

		store.setState('searchRegexError', null)
		const nextValue = value.replace(compiled.replacer, replaceQuery)
		if (nextValue === value) {
			onNavigateToNextMatch()
			return
		}

		onDataUpdate({
			rowIndex: match.rowIndex,
			columnId: match.columnId,
			value: nextValue,
		})

		requestAnimationFrame(() => {
			refreshMatches(currentIndex)
		})
	}, [
		getCellValue,
		compileCurrentQuery,
		onDataUpdate,
		onNavigateToNextMatch,
		readOnly,
		replaceQuery,
		refreshMatches,
		store,
	])

	const onReplaceAll = React.useCallback(() => {
		if (readOnly) return
		const currentState = store.getState()
		const query = currentState.searchQuery.trim()
		if (!query || currentState.searchMatches.length === 0) return

		const { compiled } = compileCurrentQuery(query)
		if (!compiled) return
		if ('error' in compiled) {
			store.setState('searchRegexError', compiled.error)
			return
		}

		const updates: CellUpdate[] = []
		store.setState('searchRegexError', null)

		for (const match of currentState.searchMatches) {
			const value = getCellValue(match)
			if (typeof value !== 'string') continue
			const nextValue = value.replace(compiled.replacer, replaceQuery)
			if (nextValue === value) continue
			updates.push({
				rowIndex: match.rowIndex,
				columnId: match.columnId,
				value: nextValue,
			})
		}

		if (updates.length === 0) return

		onDataUpdate(updates)
		requestAnimationFrame(() => {
			refreshMatches(0)
		})
	}, [
		getCellValue,
		compileCurrentQuery,
		onDataUpdate,
		readOnly,
		replaceQuery,
		refreshMatches,
		store,
	])

	React.useEffect(() => {
		if (!enableSearch) return
		const query = store.getState().searchQuery
		if (!query.trim()) return

		const currentIndex = Math.max(store.getState().matchIndex, 0)
		refreshMatches(currentIndex)
	}, [
		enableSearch,
		refreshMatches,
		searchCaseSensitive,
		searchRegex,
		searchInSelection,
		searchWholeWord,
		hasRowSelection,
		selectedCells,
		store,
	])

	const getIsSearchMatch = React.useCallback(
		(rowIndex: number, columnId: string) => {
			const currentSearchMatches = store.getState().searchMatches
			return currentSearchMatches.some(
				(match) => match.rowIndex === rowIndex && match.columnId === columnId,
			)
		},
		[store],
	)

	const getIsActiveSearchMatch = React.useCallback(
		(rowIndex: number, columnId: string) => {
			const currentState = store.getState()
			if (currentState.matchIndex < 0) return false
			const currentMatch = currentState.searchMatches[currentState.matchIndex]
			return (
				currentMatch?.rowIndex === rowIndex &&
				currentMatch?.columnId === columnId
			)
		},
		[store],
	)

	// Compute search match data for targeted row re-renders
	// Maps rowIndex -> Set of columnIds that have matches in that row
	const searchMatchesByRow = React.useMemo(() => {
		if (searchMatches.length === 0) return null
		const rowMap = new Map<number, Set<string>>()
		for (const match of searchMatches) {
			let columnSet = rowMap.get(match.rowIndex)
			if (!columnSet) {
				columnSet = new Set<string>()
				rowMap.set(match.rowIndex, columnSet)
			}
			columnSet.add(match.columnId)
		}
		return rowMap
	}, [searchMatches])

	const activeSearchMatch = React.useMemo<CellPosition | null>(() => {
		if (matchIndex < 0 || searchMatches.length === 0) return null
		return searchMatches[matchIndex] ?? null
	}, [searchMatches, matchIndex])

	const searchState = React.useMemo<SearchState | undefined>(() => {
		if (!enableSearch) return undefined

		return {
			searchMatches,
			matchIndex,
			searchOpen,
			onSearchOpenChange,
			searchQuery,
			onSearchQueryChange,
			onSearch,
			replaceQuery,
			onReplaceQueryChange,
			onReplaceNext,
			onReplaceAll,
			replaceEnabled: !readOnly,
			searchCaseSensitive,
			searchWholeWord,
			searchRegex,
			searchRegexError,
			searchInSelection,
			onSearchCaseSensitiveChange,
			onSearchWholeWordChange,
			onSearchRegexChange,
			onSearchInSelectionChange,
			onNavigateToNextMatch,
			onNavigateToPrevMatch,
		}
	}, [
		enableSearch,
		searchMatches,
		matchIndex,
		searchOpen,
		onSearchOpenChange,
		searchQuery,
		onSearchQueryChange,
		onSearch,
		replaceQuery,
		onReplaceQueryChange,
		onReplaceNext,
		onReplaceAll,
		readOnly,
		searchCaseSensitive,
		searchWholeWord,
		searchRegex,
		searchRegexError,
		searchInSelection,
		onSearchCaseSensitiveChange,
		onSearchWholeWordChange,
		onSearchRegexChange,
		onSearchInSelectionChange,
		onNavigateToNextMatch,
		onNavigateToPrevMatch,
	])

	return {
		searchState,
		searchMatchesByRow,
		activeSearchMatch,
		onSearchOpenChange,
		onSearch,
		onSearchQueryChange,
		onNavigateToNextMatch,
		onNavigateToPrevMatch,
		getIsSearchMatch,
		getIsActiveSearchMatch,
	}
}
