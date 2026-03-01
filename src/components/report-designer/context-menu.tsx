'use client'

import type * as React from 'react'
import { useShallow } from 'zustand/react/shallow'
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { useReportDesignerStore } from './store'

export function DesignerContextMenu({
	children,
}: {
	children: React.ReactNode
}) {
	const {
		selectedBandId,
		selectedElementIds,
		copy,
		cut,
		paste,
		removeElements,
		duplicateElements,
	} = useReportDesignerStore(
		useShallow((state) => ({
			selectedBandId: state.selectedBandId,
			selectedElementIds: state.selectedElementIds,
			copy: state.copy,
			cut: state.cut,
			paste: state.paste,
			removeElements: state.removeElements,
			duplicateElements: state.duplicateElements,
		})),
	)

	return (
		<ContextMenu>
			<ContextMenuTrigger>{children}</ContextMenuTrigger>
			<ContextMenuContent>
				<ContextMenuItem onClick={copy}>Copy</ContextMenuItem>
				<ContextMenuItem onClick={cut}>Cut</ContextMenuItem>
				<ContextMenuItem
					onClick={() => selectedBandId && paste(selectedBandId)}
				>
					Paste
				</ContextMenuItem>
				<ContextMenuItem onClick={() => duplicateElements(selectedElementIds)}>
					Duplicate
				</ContextMenuItem>
				<ContextMenuSeparator />
				<ContextMenuItem
					variant='destructive'
					onClick={() => removeElements(selectedElementIds)}
				>
					Delete
				</ContextMenuItem>
			</ContextMenuContent>
		</ContextMenu>
	)
}
