import { Minus, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { CartItem } from './use-pos-terminal'
import type { Action } from './terminal-types'

interface CartLineItemProps {
	line: CartItem
	lineNo: number
	isSelected: boolean
	dispatch: React.Dispatch<Action>
}

export function CartLineItem({
	line,
	lineNo,
	isSelected,
	dispatch,
}: CartLineItemProps) {
	return (
		<div
			role='button'
			tabIndex={0}
			className={`flex w-full cursor-pointer items-center gap-3 px-4 py-2 text-left text-sm transition-colors ${
				isSelected
					? 'bg-primary/10 ring-1 ring-primary ring-inset'
					: 'hover:bg-muted/50'
			}`}
			onClick={() => dispatch({ type: 'SELECT_LINE', lineId: line.id })}
			onKeyDown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault()
					dispatch({ type: 'SELECT_LINE', lineId: line.id })
				}
			}}
		>
			<span className='w-5 shrink-0 text-muted-foreground text-xs'>
				{lineNo}
			</span>

			<div className='min-w-0 flex-1'>
				<p className='truncate font-medium'>{line.description}</p>
				<p className='text-muted-foreground text-xs'>
					{line.quantity} x ${line.unitPrice.toFixed(2)}
					{line.discountPercent > 0 && (
						<span className='ml-1 text-destructive'>
							-{line.discountPercent}%
						</span>
					)}
				</p>
			</div>

			<div className='flex items-center gap-1'>
				<Button
					size='icon-xs'
					variant='ghost'
					aria-label='Decrease quantity'
					onClick={(e) => {
						e.stopPropagation()
						dispatch({
							type: 'UPDATE_LINE_QUANTITY',
							lineId: line.id,
							quantity: line.quantity - 1,
						})
					}}
					disabled={line.quantity <= 1}
				>
					<Minus className='size-3' aria-hidden='true' />
				</Button>
				<span className='w-6 text-center text-xs tabular-nums'>
					{line.quantity}
				</span>
				<Button
					size='icon-xs'
					variant='ghost'
					aria-label='Increase quantity'
					onClick={(e) => {
						e.stopPropagation()
						dispatch({
							type: 'UPDATE_LINE_QUANTITY',
							lineId: line.id,
							quantity: line.quantity + 1,
						})
					}}
				>
					<Plus className='size-3' aria-hidden='true' />
				</Button>
			</div>

			<span className='w-20 text-right font-medium tabular-nums'>
				${line.lineAmount.toFixed(2)}
			</span>

			<Button
				size='icon-xs'
				variant='ghost'
				className='text-destructive hover:text-destructive'
				aria-label='Remove item'
				onClick={(e) => {
					e.stopPropagation()
					dispatch({ type: 'REMOVE_LINE', lineId: line.id })
				}}
			>
				<Trash2 className='size-3' aria-hidden='true' />
			</Button>
		</div>
	)
}
