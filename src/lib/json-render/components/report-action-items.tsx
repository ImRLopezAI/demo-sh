'use client'

import type { Table } from '@tanstack/react-table'
import { Download, Eye } from 'lucide-react'
import * as React from 'react'
import type { SelectionState } from '@/components/data-grid/types/data-grid'
import { ActionBarItem } from '@/components/data-grid/ui/action-bar'
import { useReportActions } from '@/hooks/use-report-actions'
import { resolveSelectedIds } from './resolve-selected-ids'

export function ReportActionItems<TData extends { _id: string }>({
	table,
	selectionState,
	moduleId,
	entityId,
	isBusy,
}: {
	table: Table<TData>
	selectionState?: SelectionState
	moduleId: string
	entityId: string
	isBusy?: boolean
}) {
	const { handleDownload, handlePreview, isPending } = useReportActions(
		moduleId,
		entityId,
	)
	const disabled =
		resolveSelectedIds(table, selectionState).length === 0 ||
		isPending ||
		(isBusy ?? false)

	const onDownload = React.useCallback(() => {
		void handleDownload(resolveSelectedIds(table, selectionState))
	}, [handleDownload, selectionState, table])

	const onPreview = React.useCallback(() => {
		void handlePreview(resolveSelectedIds(table, selectionState))
	}, [handlePreview, selectionState, table])

	return (
		<>
			<ActionBarItem disabled={disabled} onClick={onDownload}>
				<Download className='size-3.5' aria-hidden='true' />
				Download Report
			</ActionBarItem>
			<ActionBarItem disabled={disabled} onClick={onPreview}>
				<Eye className='size-3.5' aria-hidden='true' />
				Preview
			</ActionBarItem>
		</>
	)
}
