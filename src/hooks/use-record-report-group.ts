'use client'

import { Download, Eye } from 'lucide-react'
import * as React from 'react'
import type { RecordDialogActionGroup } from '@/lib/json-render/components/record-dialog'
import { useReportActions } from './use-report-actions'

export function useRecordReportGroup(params: {
	moduleId: string
	entityId: string
	recordId: string | null
	isNew: boolean
}): RecordDialogActionGroup | null {
	const { moduleId, entityId, recordId, isNew } = params
	const { handleDownload, handlePreview, isPending } = useReportActions(
		moduleId,
		entityId,
	)

	return React.useMemo<RecordDialogActionGroup | null>(() => {
		if (isNew || !recordId) return null
		const ids = [recordId]
		return {
			label: 'Report',
			items: [
				{
					label: 'Download Report',
					icon: React.createElement(Download, {
						className: 'size-3.5',
						'aria-hidden': 'true',
					}),
					onClick: () => void handleDownload(ids),
					disabled: isPending,
				},
				{
					label: 'Preview',
					icon: React.createElement(Eye, {
						className: 'size-3.5',
						'aria-hidden': 'true',
					}),
					onClick: () => void handlePreview(ids),
					disabled: isPending,
				},
			],
		}
	}, [isNew, recordId, handleDownload, handlePreview, isPending])
}
