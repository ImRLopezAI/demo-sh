import { useMutation, useQueryClient } from '@lib/rpc'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { $rpc } from '@/lib/rpc'
import { useModuleData } from '../../hooks/use-data'
import { PageHeader } from '../_shared/page-header'
import { StatusBadge } from '../_shared/status-badge'

interface Cart {
	_id: string
	customerId: string
	customerName: string
	status: string
	currency: string
	itemCount: number
	totalAmount: number
}

export default function CartsList() {
	const { DataGrid, windowSize } = useModuleData<'market', Cart>(
		'market',
		'carts',
		'all',
	)
	const queryClient = useQueryClient()
	const [activeCheckoutId, setActiveCheckoutId] = React.useState<string | null>(
		null,
	)
	const checkoutCart = useMutation({
		...$rpc.market.carts.checkout.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: $rpc.market.carts.key(),
				})
				queryClient.invalidateQueries({
					queryKey: $rpc.market.cartLines.key(),
				})
				queryClient.invalidateQueries({
					queryKey: $rpc.market.salesOrders.key(),
				})
				queryClient.invalidateQueries({
					queryKey: $rpc.market.salesLines.key(),
				})
			},
		}),
	})

	const handleCheckout = async (cartId: string) => {
		setActiveCheckoutId(cartId)
		try {
			await checkoutCart.mutateAsync({ cartId })
		} finally {
			setActiveCheckoutId(null)
		}
	}

	return (
		<div className='space-y-8 pb-8'>
			<PageHeader
				title='Carts'
				description='Active and abandoned shopping carts'
			/>

			<div className='overflow-hidden rounded-xl border border-border/50 bg-background/50 shadow-sm backdrop-blur-xl'>
				<DataGrid
					variant='flat'
					height={Math.max(windowSize.height - 150, 400)}
				>
					<DataGrid.Header className='border-border/50 border-b bg-muted/20 px-6 py-4'>
						<DataGrid.Toolbar filter sort search export />
					</DataGrid.Header>
					<DataGrid.Columns>
						<DataGrid.Column accessorKey='customerName' title='Customer' />
						<DataGrid.Column
							accessorKey='status'
							title='Status'
							cell={({ row }) => <StatusBadge status={row.original.status} />}
						/>
						<DataGrid.Column accessorKey='currency' title='Currency' />
						<DataGrid.Column
							accessorKey='itemCount'
							title='Items'
							cellVariant='number'
						/>
						<DataGrid.Column
							accessorKey='totalAmount'
							title='Total Amount'
							cellVariant='number'
							formatter={(v, f) => f.currency(v.totalAmount)}
						/>
						<DataGrid.Column
							accessorKey='_id'
							title='Actions'
							cell={({ row }) =>
								row.original.status === 'OPEN' ? (
									<Button
										size='sm'
										variant='outline'
										onClick={() => {
											void handleCheckout(row.original._id)
										}}
										disabled={
											checkoutCart.isPending &&
											activeCheckoutId === row.original._id
										}
									>
										{checkoutCart.isPending &&
										activeCheckoutId === row.original._id
											? 'Checking out...'
											: 'Checkout'}
									</Button>
								) : (
									<span className='text-muted-foreground text-xs'>-</span>
								)
							}
						/>
					</DataGrid.Columns>
				</DataGrid>
			</div>
		</div>
	)
}
