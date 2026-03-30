import { Search, ShoppingCart } from 'lucide-react'
import * as React from 'react'
import { useGrid } from '@/components/data-grid'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { TerminalState } from './use-pos-terminal'
import type { Action } from './terminal-types'

interface CatalogItem {
	_id: string
	itemNo?: string
	description?: string
	unitPrice?: number
	type?: string
	barcode?: string
}

interface ProductGridProps {
	items: CatalogItem[]
	isLoading: boolean
	searchQuery: string
	categoryFilter: TerminalState['categoryFilter']
	dispatch: React.Dispatch<Action>
	onAddItem: (item: {
		itemId: string
		itemNo: string
		description: string
		unitPrice: number
	}) => void
}

const CATEGORY_TABS = [
	{ value: 'ALL', label: 'All' },
	{ value: 'ITEM', label: 'Items' },
	{ value: 'SERVICE', label: 'Services' },
	{ value: 'BUNDLE', label: 'Bundles' },
] as const

export function ProductGrid({
	items,
	isLoading,
	searchQuery,
	categoryFilter,
	dispatch,
	onAddItem,
}: ProductGridProps) {
	const searchRef = React.useRef<HTMLInputElement>(null)

	React.useEffect(() => {
		searchRef.current?.focus()
	}, [])

	const filteredItems = React.useMemo(() => {
		let list = items
		if (categoryFilter !== 'ALL') {
			list = list.filter(
				(item) => (item.type ?? 'ITEM').toUpperCase() === categoryFilter,
			)
		}
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase()
			list = list.filter(
				(item) =>
					item.description?.toLowerCase().includes(q) ||
					item.itemNo?.toLowerCase().includes(q) ||
					item.barcode?.toLowerCase().includes(q),
			)
		}
		return list
	}, [items, categoryFilter, searchQuery])

	const handleSearchKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter' && filteredItems.length === 1) {
			const item = filteredItems[0]
			onAddItem({
				itemId: item._id,
				itemNo: item.itemNo ?? '',
				description: item.description ?? 'Unknown Item',
				unitPrice: item.unitPrice ?? 0,
			})
			dispatch({ type: 'SET_SEARCH', query: '' })
		}
	}

	const handleAddItem = React.useCallback(
		(item: CatalogItem) => {
			onAddItem({
				itemId: item._id,
				itemNo: item.itemNo ?? '',
				description: item.description ?? 'Unknown Item',
				unitPrice: item.unitPrice ?? 0,
			})
		},
		[onAddItem],
	)

	const DataGrid = useGrid<CatalogItem>(
		() => ({
			data: filteredItems,
			readOnly: true,
			enablePagination: false,
			enableSearch: false,
			withSelect: true,
			isLoading,
			emptyMessage: 'No items found',
			getRowId: (row) => row._id,
		}),
		[filteredItems, isLoading],
	)

	return (
		<div className='flex flex-1 flex-col overflow-hidden'>
			<div className='relative shrink-0 border-b px-4 py-2'>
				<Search
					className='pointer-events-none absolute top-1/2 left-7 size-4 -translate-y-1/2 text-muted-foreground'
					aria-hidden='true'
				/>
				<Input
					ref={searchRef}
					aria-label='Search products'
					name='productSearch'
					autoComplete='off'
					placeholder='Search by barcode or description\u2026'
					className='pl-8'
					value={searchQuery}
					onChange={(e) =>
						dispatch({ type: 'SET_SEARCH', query: e.target.value })
					}
					onKeyDown={handleSearchKeyDown}
				/>
			</div>

			<Tabs
				value={categoryFilter}
				onValueChange={(v) =>
					dispatch({
						type: 'SET_CATEGORY',
						category: v as TerminalState['categoryFilter'],
					})
				}
				className='flex min-h-0 flex-1 flex-col'
			>
				<div className='shrink-0 border-b px-4'>
					<TabsList variant='line'>
						{CATEGORY_TABS.map((tab) => (
							<TabsTrigger key={tab.value} value={tab.value}>
								{tab.label}
							</TabsTrigger>
						))}
					</TabsList>
				</div>

				<div className='min-h-0 flex-1 overflow-hidden'>
					<DataGrid height={320} stretchColumns variant='minimal'>
						<DataGrid.Columns>
							<DataGrid.Column
								accessorKey='itemNo'
								title='SKU'
								size={100}
								handleEdit={handleAddItem}
							/>
							<DataGrid.Column
								accessorKey='description'
								title='Description'
								size={220}
								handleEdit={handleAddItem}
							/>
							<DataGrid.Column
								accessorKey='type'
								title='Type'
								size={80}
								handleEdit={handleAddItem}
							/>
							<DataGrid.Column
								accessorKey='unitPrice'
								title='Price'
								cellVariant='number'
								size={100}
								handleEdit={handleAddItem}
								formatter={(row, f) => f.currency(row.unitPrice ?? 0)}
							/>
						</DataGrid.Columns>

						<DataGrid.ActionBar>
							<DataGrid.ActionBar.Selection>
								{(table) => {
									const count = Object.keys(
										table.getState().rowSelection,
									).length
									return <span>{count} selected</span>
								}}
							</DataGrid.ActionBar.Selection>
							<DataGrid.ActionBar.Separator />
							<DataGrid.ActionBar.Group>
								{(table) => {
									const selectedRows = table.getSelectedRowModel().rows
									return (
										<DataGrid.ActionBar.Item
											disabled={selectedRows.length === 0}
											onClick={() => {
												for (const row of selectedRows) {
													handleAddItem(row.original)
												}
												table.toggleAllRowsSelected(false)
											}}
										>
											<ShoppingCart className='size-3.5' aria-hidden='true' />
											Add to Cart
										</DataGrid.ActionBar.Item>
									)
								}}
							</DataGrid.ActionBar.Group>
						</DataGrid.ActionBar>
					</DataGrid>
				</div>
			</Tabs>
		</div>
	)
}
