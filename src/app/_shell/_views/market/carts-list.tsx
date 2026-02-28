import { $rpc, useMutation, useQueryClient } from '@lib/rpc'
import { ShoppingCart, XCircle } from 'lucide-react'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { useModuleData } from '../../hooks/use-data'
import { PageHeader } from '../_shared/page-header'
import {
	resolveSelectedIds,
	resolveSelectedRecords,
} from '../_shared/resolve-selected-ids'
import { ReportActionItems } from '../_shared/report-action-items'
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

	const transitionStatus = useMutation({
		...$rpc.market.carts.transitionStatus.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: $rpc.market.carts.key(),
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

	const handleBulkCheckout = React.useCallback(
		async (ids: string[]) => {
			for (const id of ids) {
				await checkoutCart.mutateAsync({ cartId: id })
			}
		},
		[checkoutCart],
	)

	const handleBulkAbandon = React.useCallback(
		async (ids: string[]) => {
			for (const id of ids) {
				await transitionStatus.mutateAsync({ id, toStatus: 'ABANDONED' })
			}
		},
		[transitionStatus],
	)

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
					withSelect
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
					<DataGrid.ActionBar>
						<DataGrid.ActionBar.Selection>
							{(table, state) => (
								<span>
									{resolveSelectedIds(table, state.selectionState).length}{' '}
									selected
								</span>
							)}
						</DataGrid.ActionBar.Selection>
						<DataGrid.ActionBar.Separator />
						<DataGrid.ActionBar.Group>
							{(table, state) => {
								const records = resolveSelectedRecords(
									table,
									state.selectionState,
								)
								const ids = records.map((r) => r._id)
								const hasSelection = ids.length > 0
								const isBusy =
									checkoutCart.isPending || transitionStatus.isPending
								const allOpen = records.every((r) => r.status === 'OPEN')

								return (
									<>
										<DataGrid.ActionBar.Item
											disabled={!hasSelection || isBusy || !allOpen}
											onClick={() => {
												void handleBulkCheckout(ids)
											}}
										>
											<ShoppingCart className='size-3.5' aria-hidden='true' />
											Checkout
										</DataGrid.ActionBar.Item>
										<DataGrid.ActionBar.Item
											disabled={!hasSelection || isBusy || !allOpen}
											onClick={() => {
												void handleBulkAbandon(ids)
											}}
										>
											<XCircle className='size-3.5' aria-hidden='true' />
											Abandon
										</DataGrid.ActionBar.Item>
										<ReportActionItems
											table={table}
											selectionState={state.selectionState}
											moduleId="market"
											entityId="carts"
											isBusy={isBusy}
										/>
									</>
								)
							}}
						</DataGrid.ActionBar.Group>
					</DataGrid.ActionBar>
				</DataGrid>
			</div>
		</div>
	)
}
