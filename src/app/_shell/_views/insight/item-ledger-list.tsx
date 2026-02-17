import { useModuleData } from '../../hooks/use-data'
import { PageHeader } from '../_shared/page-header'

export default function ItemLedgerList() {
	const { DataGrid, windowSize } = useModuleData('insight', 'itemLedgerEntries')

	return (
		<div className='space-y-4'>
			<PageHeader
				title='Item Ledger Entries'
				description='Track all inventory movements including sales, purchases, adjustments, and transfers.'
			/>

			<DataGrid variant='lined' height={Math.max(windowSize.height - 190, 390)}>
				<DataGrid.Header>
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
								{ label: 'Positive Adjustment', value: 'POSITIVE_ADJUSTMENT' },
								{ label: 'Negative Adjustment', value: 'NEGATIVE_ADJUSTMENT' },
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
			</DataGrid>
		</div>
	)
}
