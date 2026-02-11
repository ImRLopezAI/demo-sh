import { Plus } from 'lucide-react'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { useModuleData } from '../../hooks/use-data'
import { PageHeader } from '../_shared/page-header'
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

export default function ItemsList() {
	const [selectedId, setSelectedId] = React.useState<string | null>(null)

	const { DataGrid, windowSize } = useModuleData<'market', Item>(
		'market',
		'items',
		'all',
	)

	const handleEdit = React.useCallback(
		(row: Item) => setSelectedId(row._id),
		[],
	)
	const handleNew = () => setSelectedId('new')

	return (
		<div className='space-y-6'>
			<PageHeader
				title='Items'
				description='Product catalog and inventory management'
				actions={
					<Button size='sm' onClick={handleNew}>
						<Plus className='mr-1.5 size-3.5' aria-hidden='true' />
						New Item
					</Button>
				}
			/>

			<DataGrid variant='card' height={Math.max(windowSize.height - 200, 380)}>
				<DataGrid.Header>
					<DataGrid.Toolbar filter sort search export />
				</DataGrid.Header>
				<DataGrid.Columns>
					<DataGrid.Column
						accessorKey='itemNo'
						title='Item No.'
						handleEdit={handleEdit}
					/>
					<DataGrid.Column accessorKey='description' title='Description' />
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
				</DataGrid.Columns>
			</DataGrid>

			<ItemCard selectedId={selectedId} onClose={() => setSelectedId(null)} />
		</div>
	)
}
