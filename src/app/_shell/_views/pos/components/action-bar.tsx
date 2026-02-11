import { Ban, PauseCircle, Percent, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Totals } from '../hooks/use-pos-terminal'
import type { Action } from './terminal-types'

interface ActionBarProps {
	totals: Totals
	dispatch: React.Dispatch<Action>
	onVoid: () => void
	onCustomerSearch: () => void
}

export function ActionBar({
	totals,
	dispatch,
	onVoid,
	onCustomerSearch,
}: ActionBarProps) {
	const isEmpty = totals.lineCount === 0

	return (
		<div className='flex shrink-0 items-center gap-3 border-t bg-card px-4 py-3'>
			<div className='flex items-center gap-2'>
				<Button
					variant='destructive'
					size='sm'
					disabled={isEmpty}
					onClick={onVoid}
				>
					<Ban className='mr-1.5 size-3.5' aria-hidden='true' />
					Void
				</Button>
				<Button
					variant='outline'
					size='sm'
					disabled={isEmpty}
					onClick={() =>
						dispatch({ type: 'SET_NUMPAD_TARGET', target: 'discount' })
					}
				>
					<Percent className='mr-1.5 size-3.5' aria-hidden='true' />
					Discount
				</Button>
				<Button variant='outline' size='sm' onClick={onCustomerSearch}>
					<User className='mr-1.5 size-3.5' aria-hidden='true' />
					Customer
				</Button>
				<Button variant='outline' size='sm' disabled>
					<PauseCircle className='mr-1.5 size-3.5' aria-hidden='true' />
					Hold
				</Button>
			</div>

			<div className='flex-1' />

			<span className='font-bold text-xl tabular-nums'>
				${totals.total.toFixed(2)}
			</span>

			<Button
				size='lg'
				className='ml-2 min-w-[120px] font-bold text-base'
				disabled={isEmpty}
				onClick={() => dispatch({ type: 'OPEN_PAYMENT' })}
			>
				PAY &raquo;
			</Button>
		</div>
	)
}
