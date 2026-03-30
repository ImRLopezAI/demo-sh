'use client'

/**
 * SpecBulkActionItems — Renders DataGrid ActionBar items from json-render spec definitions.
 *
 * Instead of each list component hardcoding its own bulk action buttons,
 * this component reads the `bulkActions` array from the spec's `ModuleListView`
 * props and generates the corresponding ActionBar.Items with proper status
 * constraint checking.
 *
 * Usage inside a DataGrid.ActionBar.Group render function:
 *
 *   <DataGrid.ActionBar.Group>
 *     {(table, state) => (
 *       <SpecBulkActionItems
 *         specBulkActions={specProps?.bulkActions}
 *         table={table}
 *         selectionState={state.selectionState}
 *         onTransition={handleBulkTransition}
 *         isBusy={transitionStatus.isPending}
 *       />
 *     )}
 *   </DataGrid.ActionBar.Group>
 */
import type { Table } from '@tanstack/react-table'
import { AlertTriangle } from 'lucide-react'
import type * as React from 'react'
import type { SelectionState } from '@/components/data-grid/types/data-grid'
import { cn } from '@/lib/utils'
import { resolveSelectedRecords } from '@/lib/json-render/components/resolve-selected-ids'

/** Shape of a bulk action definition from the json-render spec */
export interface SpecBulkAction {
	id: string
	label: string
	toStatus: string
	requireAllStatus?: string | null
	variant?: 'default' | 'destructive' | null
}

interface SpecBulkActionItemsProps<
	TData extends { _id: string; status?: string },
> {
	/** Bulk action definitions from specProps.bulkActions */
	specBulkActions: SpecBulkAction[] | null | undefined
	/** The TanStack table instance */
	table: Table<TData>
	/** Current selection state */
	selectionState?: SelectionState
	/** Handler for executing a bulk status transition */
	onTransition: (ids: string[], toStatus: string) => void
	/** Whether a mutation is currently in flight */
	isBusy?: boolean
	/** Optional additional action items to render after spec-driven ones */
	children?: React.ReactNode
}

export function SpecBulkActionItems<
	TData extends { _id: string; status?: string },
>({
	specBulkActions,
	table,
	selectionState,
	onTransition,
	isBusy = false,
	children,
}: SpecBulkActionItemsProps<TData>) {
	const records = resolveSelectedRecords(table, selectionState)
	const ids = records.map((r) => r._id)
	const hasSelection = ids.length > 0

	if (!specBulkActions || specBulkActions.length === 0) {
		return <>{children}</>
	}

	return (
		<>
			{specBulkActions.map((action) => {
				const meetsRequirement = action.requireAllStatus
					? (() => {
							const allowed = action.requireAllStatus
								.split(',')
								.map((s) => s.trim())
							return records.every(
								(r) => r.status != null && allowed.includes(r.status),
							)
						})()
					: true

				return (
					<button
						key={action.id}
						type='button'
						disabled={!hasSelection || isBusy || !meetsRequirement}
						onClick={() => onTransition(ids, action.toStatus)}
						className={cn(
							'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-medium text-sm transition-colors',
							'disabled:pointer-events-none disabled:opacity-50',
							action.variant === 'destructive'
								? 'text-destructive hover:bg-destructive/10'
								: 'text-foreground hover:bg-accent',
						)}
					>
						{action.variant === 'destructive' && (
							<AlertTriangle className='size-3.5' aria-hidden='true' />
						)}
						{action.label}
					</button>
				)
			})}
			{children}
		</>
	)
}
