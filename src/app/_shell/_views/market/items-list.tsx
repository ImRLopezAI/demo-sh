import { Plus } from 'lucide-react'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { useModuleData } from '../../hooks/use-data'
import { PageHeader } from '../_shared/page-header'
import { ReportActionItems } from '../_shared/report-action-items'
import { resolveSelectedIds } from '../_shared/resolve-selected-ids'
import { SpecBulkActionItems } from '../_shared/spec-bulk-actions'
import { extractSpecCardProps } from '../_shared/spec-card-helpers'
import {
	renderSpecColumns,
	type SpecListProps,
} from '../_shared/spec-list-helpers'
import { useRecordSearchState } from '../_shared/use-record-search-state'
import { ItemCard } from './components/item-card'

interface Item {
	_id: string
	itemNo: string
	description: string
	type: string
	unitPrice: number
	unitCost: number
	inventory: number
	uom: string
	barcode: string
}

interface ItemsListProps {
	specProps?: SpecListProps
}

export default function ItemsList({ specProps }: ItemsListProps = {}) {
	const { close, openCreate, openDetail, selectedId } = useRecordSearchState()
	const specCardProps = extractSpecCardProps(specProps)

	const { DataGrid, windowSize } = useModuleData<'market', Item>(
		'market',
		'items',
		'all',
	)

	const handleEdit = React.useCallback(
		(row: Item) => openDetail(row._id),
		[openDetail],
	)
	const handleNew = openCreate

	if (selectedId !== null) {
		return (
			<div className='space-y-8 pb-8'>
				<ItemCard
					selectedId={selectedId}
					onClose={close}
					specCardProps={specCardProps}
					presentation='page'
				/>
			</div>
		)
	}

	return (
		<div className='space-y-8 pb-8'>
			<PageHeader
				title={specProps?.title ?? 'Items'}
				description={
					specProps?.description ?? 'Product catalog and inventory management'
				}
				actions={
					specProps?.enableNew !== false ? (
						<Button
							size='sm'
							onClick={handleNew}
							className='shadow-sm transition-all hover:shadow-md'
						>
							<Plus className='mr-1.5 size-4' aria-hidden='true' />
							{specProps?.newLabel ?? 'New Item'}
						</Button>
					) : undefined
				}
			/>

			<div className='overflow-hidden rounded-xl border border-border/50 bg-background/50 shadow-sm backdrop-blur-xl'>
				<DataGrid
					variant='card'
					height={Math.max(windowSize.height - 150, 400)}
					withSelect
				>
					<DataGrid.Header className='border-border/50 border-b bg-muted/20 px-6 py-4'>
						<DataGrid.Toolbar filter sort search export />
					</DataGrid.Header>
					<DataGrid.Columns>
						{specProps?.columns ? (
							renderSpecColumns<Item>(
								DataGrid.Column,
								specProps.columns,
								handleEdit,
							)
						) : (
							<>
								<DataGrid.Column
									accessorKey='itemNo'
									title='Item No.'
									handleEdit={handleEdit}
								/>
								<DataGrid.Column
									accessorKey='description'
									title='Description'
								/>
								<DataGrid.Column
									accessorKey='type'
									title='Type'
									cellVariant='select'
								/>
								<DataGrid.Column
									accessorKey='unitPrice'
									title='Unit Price'
									cellVariant='number'
									formatter={(v, f) => f.currency(v.unitPrice)}
								/>
								<DataGrid.Column
									accessorKey='unitCost'
									title='Unit Cost'
									cellVariant='number'
									formatter={(v, f) => f.currency(v.unitCost)}
								/>
								<DataGrid.Column
									accessorKey='inventory'
									title='Inventory'
									cellVariant='number'
								/>
								<DataGrid.Column accessorKey='uom' title='UOM' />
								<DataGrid.Column accessorKey='barcode' title='Barcode' />
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
								<SpecBulkActionItems
									specBulkActions={specProps?.bulkActions}
									table={table}
									selectionState={state.selectionState}
									onTransition={() => {}}
									isBusy={false}
								>
									<ReportActionItems
										table={table}
										selectionState={state.selectionState}
										moduleId='market'
										entityId='items'
										isBusy={false}
									/>
								</SpecBulkActionItems>
							)}
						</DataGrid.ActionBar.Group>
					</DataGrid.ActionBar>
				</DataGrid>
			</div>
		</div>
	)
}
