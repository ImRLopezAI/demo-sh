import { Delete } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { TerminalState } from '../hooks/use-pos-terminal'
import type { Action } from './terminal-types'

interface NumpadProps {
	numpadTarget: TerminalState['numpadTarget']
	numpadBuffer: string
	hasSelectedLine: boolean
	dispatch: React.Dispatch<Action>
}

const DIGIT_KEYS = [
	['7', '8', '9'],
	['4', '5', '6'],
	['1', '2', '3'],
	['0', '.'],
] as const

const FUNCTION_KEYS = [
	{ label: 'QTY', target: 'quantity' as const },
	{ label: 'PRICE', target: 'price' as const },
	{ label: 'DISC%', target: 'discount' as const },
] as const

export function Numpad({
	numpadTarget,
	numpadBuffer,
	hasSelectedLine,
	dispatch,
}: NumpadProps) {
	const targetLabel =
		numpadTarget === 'quantity'
			? 'Quantity'
			: numpadTarget === 'price'
				? 'Price'
				: numpadTarget === 'discount'
					? 'Discount %'
					: ''

	return (
		<div className='shrink-0 border-t bg-card p-3'>
			{/* Buffer display */}
			<div className='mb-2 flex h-8 items-center justify-between rounded-md bg-muted px-3'>
				<span className='text-muted-foreground text-xs'>
					{targetLabel || 'Select a field'}
				</span>
				<span className='font-medium font-mono text-sm tabular-nums'>
					{numpadBuffer || '—'}
				</span>
			</div>

			{/* Grid: 4 columns */}
			<div className='grid grid-cols-4 gap-1.5'>
				{/* Row 1: 7 8 9 QTY */}
				{DIGIT_KEYS[0].map((key) => (
					<Button
						key={key}
						variant='outline'
						className='h-12 font-medium text-base'
						disabled={!hasSelectedLine || !numpadTarget}
						onClick={() => dispatch({ type: 'NUMPAD_INPUT', key })}
					>
						{key}
					</Button>
				))}
				<Button
					variant={numpadTarget === 'quantity' ? 'default' : 'outline'}
					className='h-12 font-bold text-xs'
					disabled={!hasSelectedLine}
					onClick={() =>
						dispatch({ type: 'SET_NUMPAD_TARGET', target: 'quantity' })
					}
				>
					{FUNCTION_KEYS[0].label}
				</Button>

				{/* Row 2: 4 5 6 PRICE */}
				{DIGIT_KEYS[1].map((key) => (
					<Button
						key={key}
						variant='outline'
						className='h-12 font-medium text-base'
						disabled={!hasSelectedLine || !numpadTarget}
						onClick={() => dispatch({ type: 'NUMPAD_INPUT', key })}
					>
						{key}
					</Button>
				))}
				<Button
					variant={numpadTarget === 'price' ? 'default' : 'outline'}
					className='h-12 font-bold text-xs'
					disabled={!hasSelectedLine}
					onClick={() =>
						dispatch({ type: 'SET_NUMPAD_TARGET', target: 'price' })
					}
				>
					{FUNCTION_KEYS[1].label}
				</Button>

				{/* Row 3: 1 2 3 DISC% */}
				{DIGIT_KEYS[2].map((key) => (
					<Button
						key={key}
						variant='outline'
						className='h-12 font-medium text-base'
						disabled={!hasSelectedLine || !numpadTarget}
						onClick={() => dispatch({ type: 'NUMPAD_INPUT', key })}
					>
						{key}
					</Button>
				))}
				<Button
					variant={numpadTarget === 'discount' ? 'default' : 'outline'}
					className='h-12 font-bold text-xs'
					disabled={!hasSelectedLine}
					onClick={() =>
						dispatch({ type: 'SET_NUMPAD_TARGET', target: 'discount' })
					}
				>
					{FUNCTION_KEYS[2].label}
				</Button>

				{/* Row 4: 0 . BKSP ENTER */}
				{DIGIT_KEYS[3].map((key) => (
					<Button
						key={key}
						variant='outline'
						className='h-12 font-medium text-base'
						disabled={!hasSelectedLine || !numpadTarget}
						onClick={() => dispatch({ type: 'NUMPAD_INPUT', key })}
					>
						{key}
					</Button>
				))}
				<Button
					variant='outline'
					className='h-12'
					aria-label='Backspace'
					disabled={!hasSelectedLine || !numpadBuffer}
					onClick={() => dispatch({ type: 'NUMPAD_BACKSPACE' })}
				>
					<Delete className='size-4' aria-hidden='true' />
				</Button>
				<Button
					variant='default'
					className='h-12 font-bold text-xs'
					disabled={!hasSelectedLine || !numpadTarget || !numpadBuffer}
					onClick={() => dispatch({ type: 'NUMPAD_ENTER' })}
				>
					ENTER
				</Button>
			</div>
		</div>
	)
}
