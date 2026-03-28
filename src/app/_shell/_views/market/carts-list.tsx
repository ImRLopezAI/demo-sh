import { $rpc, useMutation, useQueryClient } from '@lib/rpc'
import { Plus } from 'lucide-react'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { useHydrateState } from '@/lib/json-render/use-hydrate-state'
import { useModuleData } from '../../hooks/use-data'
import { PageHeader } from '../_shared/page-header'
import { ReportActionItems } from '../_shared/report-action-items'
import { resolveSelectedIds } from '../_shared/resolve-selected-ids'
import { SpecBulkActionItems } from '../_shared/spec-bulk-actions'
import {
	renderSpecColumns,
	type SpecListProps,
} from '../_shared/spec-list-helpers'
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

interface CartsListProps {
	specProps?: SpecListProps
}

export default function CartsList({ specProps }: CartsListProps = {}) {
	const {
		DataGrid,
		windowSize,
		items: cartItems,
	} = useModuleData<'market', Cart>('market', 'carts', 'all')
	const queryClient = useQueryClient()

	// ── Hydrate abandonedCount for the spec alert banner visibility ──
	const abandonedCount = React.useMemo(
		() => cartItems.filter((c) => c.status === 'ABANDONED').length,
		[cartItems],
	)

	useHydrateState(
		'/market/carts',
		React.useMemo(() => ({ abandonedCount }), [abandonedCount]),
	)

	// ── Mutations ──
	const invalidate = React.useCallback(() => {
		void queryClient.invalidateQueries({
			queryKey: $rpc.market.carts.key(),
		})
		void queryClient.invalidateQueries({
			queryKey: $rpc.market.cartLines.key(),
		})
		void queryClient.invalidateQueries({
			queryKey: $rpc.market.salesOrders.key(),
		})
		void queryClient.invalidateQueries({
			queryKey: $rpc.market.salesLines.key(),
		})
	}, [queryClient])

	const checkoutCart = useMutation({
		...$rpc.market.carts.checkout.mutationOptions({
			onSuccess: invalidate,
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

	// ── Unified bulk transition handler ──
	// Routes 'CHECKED_OUT' to the checkout endpoint, everything else to transitionStatus
	const handleBulkTransition = React.useCallback(
		async (ids: string[], toStatus: string) => {
			for (const id of ids) {
				if (toStatus === 'CHECKED_OUT') {
					await checkoutCart.mutateAsync({ cartId: id })
				} else {
					await transitionStatus.mutateAsync({ id, toStatus })
				}
			}
		},
		[checkoutCart, transitionStatus],
	)

	const isBusy = checkoutCart.isPending || transitionStatus.isPending

	return (
		<div className='space-y-8 pb-8'>
			<PageHeader
				title={specProps?.title ?? 'Carts'}
				description={
					specProps?.description ?? 'Active and abandoned shopping carts'
				}
				actions={
					specProps?.enableNew === true ? (
						<Button
							size='sm'
							className='shadow-sm transition-all hover:shadow-md'
						>
							<Plus className='mr-1.5 size-3.5' aria-hidden='true' />
							{specProps?.newLabel ?? 'New Cart'}
						</Button>
					) : undefined
				}
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
						{specProps?.columns ? (
							renderSpecColumns<Cart>(DataGrid.Column, specProps.columns)
						) : (
							<>
								<DataGrid.Column accessorKey='customerName' title='Customer' />
								<DataGrid.Column
									accessorKey='status'
									title='Status'
									cell={({ row }) => (
										<StatusBadge status={row.original.status} />
									)}
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
							</>
						)}
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
							{(table, state) => (
								<SpecBulkActionItems
									specBulkActions={specProps?.bulkActions}
									table={table}
									selectionState={state.selectionState}
									onTransition={handleBulkTransition}
									isBusy={isBusy}
								>
									<ReportActionItems
										table={table}
										selectionState={state.selectionState}
										moduleId='market'
										entityId='carts'
										isBusy={isBusy}
									/>
								</SpecBulkActionItems>
							)}
						</DataGrid.ActionBar.Group>
					</DataGrid.ActionBar>
				</DataGrid>
			</div>
		</div>
	)
}
