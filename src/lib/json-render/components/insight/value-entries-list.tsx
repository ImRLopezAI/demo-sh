import { useModuleData } from '@/app/_shell/hooks/use-data'
import { PageHeader } from '@/components/ui/json-render/dashboard-sections'
import { ReportActionItems } from '@/lib/json-render/components/report-action-items'
import { resolveSelectedIds } from '@/lib/json-render/components/resolve-selected-ids'
import {
	renderSpecColumns,
	type SpecListProps,
} from '@/lib/json-render/components/spec-list-helpers'

interface ValueEntry {
	_id: string
	entryNo: number
	itemId: string
	itemDescription: string
	postingDate: string
	entryType:
		| 'DIRECT_COST'
		| 'REVALUATION'
		| 'ROUNDING'
		| 'INDIRECT_COST'
		| 'VARIANCE'
	costAmountActual: number
	salesAmountActual: number
	costPerUnit: number
}

interface ValueEntriesListProps {
	specProps?: SpecListProps
}

export default function ValueEntriesList({
	specProps,
}: ValueEntriesListProps = {}) {
	const { DataGrid, windowSize } = useModuleData<'insight', ValueEntry>(
		'insight',
		'valueEntries',
		'all',
	)

	return (
		<div className='space-y-8 pb-8'>
			<PageHeader
				title={specProps?.title ?? 'Value Entries'}
				description={
					specProps?.description ??
					'View cost and sales value entries for inventory items.'
				}
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
						{specProps?.columns ? (
							renderSpecColumns<ValueEntry>(DataGrid.Column as unknown as React.ComponentType<{
							accessorKey: string
							title: string
							cellVariant?: string
							handleEdit?: ((row: any) => void) | undefined
							[key: string]: unknown
						}>, specProps.columns)
						) : (
							<>
								<DataGrid.Column
									accessorKey='entryNo'
									title='Entry No.'
									cellVariant='number'
								/>
								<DataGrid.Column accessorKey='itemDescription' title='Item' />
								<DataGrid.Column
									accessorKey='postingDate'
									title='Posting Date'
									cellVariant='date'
									formatter={(v, f) =>
										f.date(v.postingDate, {
											format: 'Pp',
										})
									}
								/>
								<DataGrid.Column
									accessorKey='entryType'
									title='Entry Type'
									cellVariant='select'
									opts={{
										options: [
											{ label: 'Direct Cost', value: 'DIRECT_COST' },
											{ label: 'Revaluation', value: 'REVALUATION' },
											{ label: 'Rounding', value: 'ROUNDING' },
											{ label: 'Indirect Cost', value: 'INDIRECT_COST' },
											{ label: 'Variance', value: 'VARIANCE' },
										],
									}}
								/>
								<DataGrid.Column
									accessorKey='costAmountActual'
									title='Cost Amount (Actual)'
									cellVariant='number'
									formatter={(v, f) => f.currency(v.costAmountActual)}
								/>
								<DataGrid.Column
									accessorKey='salesAmountActual'
									title='Sales Amount (Actual)'
									cellVariant='number'
									formatter={(v, f) => f.currency(v.salesAmountActual)}
								/>
								<DataGrid.Column
									accessorKey='costPerUnit'
									title='Cost Per Unit'
									cellVariant='number'
									formatter={(v, f) => f.currency(v.costPerUnit)}
								/>
							</>
						)}
					</DataGrid.Columns>
					<DataGrid.ActionBar>
						<DataGrid.ActionBar.Selection>
							{(table, state) => (
								<span>
									{resolveSelectedIds(table, state.selectionState).length}{' '}
									selected
								</span>
							)}
						</DataGrid.ActionBar.Selection>
						<DataGrid.ActionBar.Separator />
						<DataGrid.ActionBar.Group>
							{(table, state) => (
								<ReportActionItems
									table={table}
									selectionState={state.selectionState}
									moduleId='insight'
									entityId='valueEntries'
								/>
							)}
						</DataGrid.ActionBar.Group>
					</DataGrid.ActionBar>
				</DataGrid>
			</div>
		</div>
	)
}
