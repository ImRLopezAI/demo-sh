import type { Table } from '@tanstack/react-table'
import type { SelectionState } from '@/components/data-grid/types/data-grid'

export function resolveSelectedIds<TData extends { _id: string }>(
	table: Table<TData>,
	selectionState?: SelectionState,
): string[] {
	const selectedByRows = table
		.getSelectedRowModel()
		.rows.map((row) => row.original._id)
		.filter(Boolean)

	if (selectedByRows.length > 0) return selectedByRows
	if (!selectionState || selectionState.selectedCells.size === 0) return []

	const rowModel = table.getRowModel().rows
	const selectedIds = new Set<string>()

	for (const cellKey of selectionState.selectedCells) {
		const [rowIndexRaw] = cellKey.split(':')
		const rowIndex = Number.parseInt(rowIndexRaw ?? '', 10)
		if (!Number.isFinite(rowIndex) || rowIndex < 0) continue
		const rowId = rowModel[rowIndex]?.original?._id
		if (rowId) selectedIds.add(rowId)
	}

	return Array.from(selectedIds)
}
