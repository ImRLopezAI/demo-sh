import { Search } from 'lucide-react'
import * as React from 'react'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { TerminalState } from '../hooks/use-pos-terminal'
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

const TILE_COLORS: Record<string, string> = {
	ITEM: 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/20',
	SERVICE: 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20',
	BUNDLE: 'bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/20',
}

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

	const handleTileClick = (item: CatalogItem) => {
		onAddItem({
			itemId: item._id,
			itemNo: item.itemNo ?? '',
			description: item.description ?? 'Unknown Item',
			unitPrice: item.unitPrice ?? 0,
		})
	}

	return (
		<div className='flex flex-1 flex-col'>
			<div className='relative border-b px-4 py-2'>
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
			>
				<div className='border-b px-4'>
					<TabsList variant='line'>
						{CATEGORY_TABS.map((tab) => (
							<TabsTrigger key={tab.value} value={tab.value}>
								{tab.label}
							</TabsTrigger>
						))}
					</TabsList>
				</div>

				<TabsContent value={categoryFilter} className='mt-0 flex-1'>
					<ScrollArea className='h-full'>
						<div className='grid grid-cols-3 gap-2 p-4 md:grid-cols-4 lg:grid-cols-5'>
							{isLoading
								? Array.from({ length: 12 }).map((_, i) => (
										<div
											key={`skel-${i}`}
											className='h-20 rounded-lg bg-muted motion-safe:animate-pulse'
										/>
									))
								: filteredItems.map((item) => (
										<button
											key={item._id}
											type='button'
											className={`flex h-20 flex-col items-center justify-center rounded-lg border p-2 text-center transition-colors ${
												TILE_COLORS[(item.type ?? 'ITEM').toUpperCase()] ??
												TILE_COLORS.ITEM
											}`}
											onClick={() => handleTileClick(item)}
										>
											<span className='line-clamp-2 font-medium text-xs'>
												{item.description ?? item.itemNo}
											</span>
											<span className='mt-1 font-bold text-xs tabular-nums'>
												${(item.unitPrice ?? 0).toFixed(2)}
											</span>
										</button>
									))}
							{!isLoading && filteredItems.length === 0 && (
								<div className='col-span-full flex h-32 items-center justify-center text-muted-foreground text-sm'>
									No items found
								</div>
							)}
						</div>
					</ScrollArea>
				</TabsContent>
			</Tabs>
		</div>
	)
}
