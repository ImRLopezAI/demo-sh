import { useModuleData } from '../../hooks/use-data'
import { PageHeader } from '../_shared/page-header'
import { ReportActionItems } from '../_shared/report-action-items'
import { resolveSelectedIds } from '../_shared/resolve-selected-ids'

interface ItemLedgerEntry {
	_id: string
	entryNo: number
	entryType:
		| 'SALE'
		| 'PURCHASE'
		| 'POSITIVE_ADJUSTMENT'
		| 'NEGATIVE_ADJUSTMENT'
		| 'TRANSFER'
	itemId: string
	itemDescription: string
	locationCode: string
	postingDate: string
	quantity: number
	remainingQty: number
	open: boolean
}

export default function ItemLedgerList() {
	const { DataGrid, windowSize } = useModuleData<'insight', ItemLedgerEntry>(
		'insight',
		'itemLedgerEntries',
		'all',
	)

	return (
		<div className='space-y-8 pb-8'>
			<PageHeader
				title='Item Ledger Entries'
				description='Track all inventory movements including sales, purchases, adjustments, and transfers.'
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
						<DataGrid.Column
							accessorKey='entryNo'
							title='Entry No.'
							cellVariant='number'
						/>
						<DataGrid.Column
							accessorKey='entryType'
							title='Entry Type'
							cellVariant='select'
							opts={{
								options: [
									{ label: 'Sale', value: 'SALE' },
									{ label: 'Purchase', value: 'PURCHASE' },
									{
										label: 'Positive Adjustment',
										value: 'POSITIVE_ADJUSTMENT',
									},
									{
										label: 'Negative Adjustment',
										value: 'NEGATIVE_ADJUSTMENT',
									},
									{ label: 'Transfer', value: 'TRANSFER' },
								],
							}}
						/>
						<DataGrid.Column accessorKey='itemDescription' title='Item' />
						<DataGrid.Column accessorKey='locationCode' title='Location Code' />
						<DataGrid.Column
							accessorKey='postingDate'
							title='Posting Date'
							cellVariant='date'
							formatter={(v, f) => f.date(v.postingDate, { format: 'P' })}
						/>
						<DataGrid.Column
							accessorKey='quantity'
							title='Quantity'
							cellVariant='number'
						/>
						<DataGrid.Column
							accessorKey='remainingQty'
							title='Remaining Qty'
							cellVariant='number'
						/>
						<DataGrid.Column
							accessorKey='open'
							title='Open'
							cellVariant='checkbox'
						/>
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
									entityId='itemLedger'
								/>
							)}
						</DataGrid.ActionBar.Group>
					</DataGrid.ActionBar>
				</DataGrid>
			</div>
		</div>
	)
}
