'use client'

import type { $rpc } from '@lib/rpc'
import type { Table } from '@tanstack/react-table'
import { useModuleData } from '@/app/_shell/hooks/use-data'
import { PageHeader } from '@/components/ui/json-render/dashboard-sections'
import { ReportActionItems } from './report-action-items'
import { resolveSelectedIds } from './resolve-selected-ids'
import {
	renderSpecColumns,
	type SpecListProps,
	useSpecFilters,
} from './spec-list-helpers'

type UplinkModule = Exclude<keyof typeof $rpc, 'key' | 'health'>
type ListRecord = { _id: string }

export function GenericModuleListView({
	specProps,
}: {
	specProps: SpecListProps
}) {
	const specFilters = useSpecFilters(specProps)
	const moduleId = (specProps.moduleId ?? 'hub') as UplinkModule
	const entityId = (specProps.entityId ?? 'operationTasks') as never
	const { DataGrid, windowSize } = useModuleData(moduleId, entityId, 'all', {
		filters: specFilters,
	})
	const asSelectableTable = (table: unknown) => table as Table<ListRecord>

	return (
		<div className='space-y-8 pb-8'>
			<PageHeader
				title={specProps.title ?? 'Records'}
				description={specProps.description ?? undefined}
			/>

			<div className='overflow-hidden rounded-xl border border-border/50 bg-background/50 shadow-sm backdrop-blur-xl'>
				<DataGrid
					withSelect
					variant='flat'
					height={Math.max(windowSize.height - 150, 400)}
				>
					<DataGrid.Header className='border-border/50 border-b bg-muted/20 px-6 py-4'>
						<DataGrid.Toolbar filter sort search export />
					</DataGrid.Header>

					<DataGrid.Columns>
						{renderSpecColumns(
							DataGrid.Column as unknown as React.ComponentType<{
								accessorKey: string
								title: string
								cellVariant?: string
								handleEdit?: ((row: object) => void) | undefined
								[key: string]: unknown
							}>,
							specProps.columns ?? [],
						)}
					</DataGrid.Columns>

					<DataGrid.ActionBar>
						<DataGrid.ActionBar.Selection>
							{(table, state) => (
								<span>
									{
										resolveSelectedIds(
											asSelectableTable(table),
											state.selectionState,
										).length
									}{' '}
									selected
								</span>
							)}
						</DataGrid.ActionBar.Selection>
						<DataGrid.ActionBar.Separator />
						<DataGrid.ActionBar.Group>
							{(table, state) => (
								<ReportActionItems
									table={asSelectableTable(table)}
									selectionState={state.selectionState}
									moduleId={specProps.moduleId ?? ''}
									entityId={specProps.entityId ?? ''}
								/>
							)}
						</DataGrid.ActionBar.Group>
					</DataGrid.ActionBar>
				</DataGrid>
			</div>
		</div>
	)
}
