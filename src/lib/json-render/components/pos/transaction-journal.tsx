import { ShoppingCart } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import type { CartItem, Totals } from './use-pos-terminal'
import { CartLineItem } from './cart-line-item'
import type { Action } from './terminal-types'

interface TransactionJournalProps {
	cart: CartItem[]
	selectedLineId: string | null
	totals: Totals
	dispatch: React.Dispatch<Action>
}

export function TransactionJournal({
	cart,
	selectedLineId,
	totals,
	dispatch,
}: TransactionJournalProps) {
	return (
		<div className='flex w-[380px] shrink-0 flex-col border-r bg-card'>
			<div className='flex items-center gap-2 border-b px-4 py-2'>
				<ShoppingCart
					className='size-4 text-muted-foreground'
					aria-hidden='true'
				/>
				<span className='font-medium text-sm'>Transaction</span>
				{totals.lineCount > 0 && (
					<span className='text-muted-foreground text-xs'>
						({totals.itemCount} item{totals.itemCount !== 1 ? 's' : ''})
					</span>
				)}
			</div>

			<ScrollArea className='flex-1'>
				{cart.length === 0 ? (
					<div className='flex h-48 flex-col items-center justify-center gap-2 text-muted-foreground'>
						<ShoppingCart className='size-8 opacity-40' aria-hidden='true' />
						<p className='text-sm'>Scan or select items to begin</p>
					</div>
				) : (
					<div className='divide-y'>
						{cart.map((line, i) => (
							<CartLineItem
								key={line.id}
								line={line}
								lineNo={i + 1}
								isSelected={line.id === selectedLineId}
								dispatch={dispatch}
							/>
						))}
					</div>
				)}
			</ScrollArea>

			<Separator />

			<div className='space-y-1 px-4 py-3'>
				<div className='flex justify-between text-sm'>
					<span className='text-muted-foreground'>Subtotal</span>
					<span className='tabular-nums'>${totals.subtotal.toFixed(2)}</span>
				</div>
				{totals.discountTotal > 0 && (
					<div className='flex justify-between text-sm'>
						<span className='text-muted-foreground'>Discount</span>
						<span className='text-destructive tabular-nums'>
							-${totals.discountTotal.toFixed(2)}
						</span>
					</div>
				)}
				<div className='flex justify-between text-sm'>
					<span className='text-muted-foreground'>Tax (16%)</span>
					<span className='tabular-nums'>${totals.taxAmount.toFixed(2)}</span>
				</div>
				<Separator />
				<div className='flex justify-between pt-1'>
					<span className='font-bold text-lg'>TOTAL</span>
					<span className='font-bold text-lg tabular-nums'>
						${totals.total.toFixed(2)}
					</span>
				</div>
			</div>
		</div>
	)
}
