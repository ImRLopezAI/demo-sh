import { Banknote, CreditCard, Smartphone } from 'lucide-react'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import type { Totals } from '../hooks/use-pos-terminal'

interface PaymentDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	totals: Totals
	onComplete: (method: 'CASH' | 'CARD' | 'MOBILE') => Promise<void>
}

const METHODS = [
	{ key: 'CASH' as const, label: 'Cash', icon: Banknote },
	{ key: 'CARD' as const, label: 'Card', icon: CreditCard },
	{ key: 'MOBILE' as const, label: 'Mobile', icon: Smartphone },
]

export function PaymentDialog({
	open,
	onOpenChange,
	totals,
	onComplete,
}: PaymentDialogProps) {
	const [method, setMethod] = React.useState<'CASH' | 'CARD' | 'MOBILE' | null>(
		null,
	)
	const [tendered, setTendered] = React.useState('')
	const [isProcessing, setIsProcessing] = React.useState(false)

	const tenderedAmount = Number.parseFloat(tendered) || 0
	const change =
		method === 'CASH' ? Math.max(0, tenderedAmount - totals.total) : 0
	const canComplete =
		method !== null && (method !== 'CASH' || tenderedAmount >= totals.total)

	React.useEffect(() => {
		if (open) {
			setMethod(null)
			setTendered('')
			setIsProcessing(false)
		}
	}, [open])

	const handleComplete = async () => {
		if (!method || isProcessing) return
		setIsProcessing(true)
		try {
			await onComplete(method)
		} finally {
			setIsProcessing(false)
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className='sm:max-w-md'>
				<DialogHeader>
					<DialogTitle>Payment</DialogTitle>
					<DialogDescription>
						Select a payment method and complete the sale.
					</DialogDescription>
				</DialogHeader>

				<div className='space-y-4'>
					<div className='text-center'>
						<p className='text-muted-foreground text-sm'>Total Amount</p>
						<p className='font-bold text-3xl tabular-nums'>
							${totals.total.toFixed(2)}
						</p>
					</div>

					<Separator />

					<div className='grid grid-cols-3 gap-2'>
						{METHODS.map((m) => (
							<button
								key={m.key}
								type='button'
								className={`flex h-20 flex-col items-center justify-center gap-1.5 rounded-lg border-2 transition-colors ${
									method === m.key
										? 'border-primary bg-primary/10'
										: 'border-border hover:border-primary/50'
								}`}
								onClick={() => setMethod(m.key)}
							>
								<m.icon className='size-6' aria-hidden='true' />
								<span className='font-medium text-sm'>{m.label}</span>
							</button>
						))}
					</div>

					{method === 'CASH' && (
						<div className='space-y-2'>
							<label htmlFor='amount-tendered' className='font-medium text-sm'>
								Amount Tendered
							</label>
							<Input
								id='amount-tendered'
								name='amountTendered'
								type='number'
								step='0.01'
								min={0}
								autoComplete='off'
								placeholder='0.00'
								value={tendered}
								onChange={(e) => setTendered(e.target.value)}
								className='text-lg'
								autoFocus
							/>
							{tenderedAmount > 0 && tenderedAmount >= totals.total && (
								<div className='flex justify-between rounded-md bg-muted p-2'>
									<span className='text-muted-foreground text-sm'>Change</span>
									<span className='font-bold text-emerald-600 tabular-nums'>
										${change.toFixed(2)}
									</span>
								</div>
							)}
						</div>
					)}

					<Button
						className='w-full'
						size='lg'
						disabled={!canComplete || isProcessing}
						onClick={handleComplete}
					>
						{isProcessing ? 'Processing...' : 'Complete Sale'}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	)
}
