import { parseRouterSearch, stringifyRouterSearch } from '@lib/router/search'
import { $rpc, useMutation, useQueryClient } from '@lib/rpc'
import { Ban, Plus, Send, Unlock } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { useModuleData } from '../../hooks/use-data'
import { PageHeader } from '../_shared/page-header'
import { ReportActionItems } from '../_shared/report-action-items'
import {
	resolveSelectedIds,
	resolveSelectedRecords,
} from '../_shared/resolve-selected-ids'
import { StatusBadge } from '../_shared/status-badge'
import { SalesOrderCard } from './components/sales-order-card'

interface SalesOrder {
	_id: string
	documentNo: string
	documentType: string
	status: string
	customerId: string
	customerName: string
	orderDate: string
	currency: string
	lineCount: number
	totalAmount: number
}

export default function SalesOrdersList() {
	const router = useRouter()
	const pathname = usePathname() || '/market/sales-orders'
	const searchParams = useSearchParams()
	const locationSearch = React.useMemo(
		() => parseRouterSearch(searchParams.toString()),
		[searchParams],
	)

	const queryClient = useQueryClient()

	const { DataGrid, windowSize } = useModuleData<'market', SalesOrder>(
		'market',
		'salesOrders',
		'all',
	)

	const invalidate = React.useCallback(() => {
		void queryClient.invalidateQueries({
			queryKey: $rpc.market.salesOrders.key(),
		})
	}, [queryClient])

	const submitForApproval = useMutation({
		...$rpc.market.salesOrders.submitForApproval.mutationOptions({
			onSuccess: invalidate,
		}),
	})

	const transitionStatus = useMutation({
		...$rpc.market.salesOrders.transitionStatus.mutationOptions({
			onSuccess: invalidate,
		}),
	})

	const cancelWithRelease = useMutation({
		...$rpc.market.salesOrders.cancelWithRelease.mutationOptions({
			onSuccess: invalidate,
		}),
	})

	const handleBulkSubmit = React.useCallback(
		async (ids: string[]) => {
			for (const id of ids) {
				await submitForApproval.mutateAsync({ id })
			}
		},
		[submitForApproval],
	)

	const handleBulkRelease = React.useCallback(
		async (ids: string[]) => {
			for (const id of ids) {
				await transitionStatus.mutateAsync({ id, toStatus: 'RELEASED' })
			}
		},
		[transitionStatus],
	)

	const handleBulkCancel = React.useCallback(
		async (ids: string[]) => {
			for (const id of ids) {
				await cancelWithRelease.mutateAsync({ id })
			}
		},
		[cancelWithRelease],
	)

	const pushWithSearch = React.useCallback(
		(
			searchUpdater: (
				previous: Record<string, unknown>,
			) => Record<string, unknown>,
		) => {
			const nextSearch = searchUpdater(locationSearch)
			router.push(`/market/sales-orders${stringifyRouterSearch(nextSearch)}`)
		},
		[locationSearch, router],
	)

	const selectedId = React.useMemo(() => {
		const searchRecord = locationSearch as Record<string, unknown>
		const scopeValue = searchRecord._recordScope
		const modeValue = searchRecord.mode
		const recordIdValue = searchRecord.recordId

		if (typeof scopeValue === 'string' && scopeValue !== pathname) {
			return null
		}

		if (modeValue === 'new') {
			return 'new'
		}

		if (
			modeValue === 'detail' &&
			typeof recordIdValue === 'string' &&
			recordIdValue.trim().length > 0
		) {
			return recordIdValue
		}

		return null
	}, [locationSearch, pathname])

	const clearRecordSearchState = React.useCallback((previous: unknown) => {
		if (!previous || typeof previous !== 'object' || Array.isArray(previous)) {
			return {}
		}

		const nextSearch = { ...(previous as Record<string, unknown>) }
		delete nextSearch.mode
		delete nextSearch.recordId
		delete nextSearch._recordScope
		return nextSearch
	}, [])

	const handleEdit = React.useCallback(
		(row: SalesOrder) => {
			pushWithSearch((previous) => ({
				...previous,
				mode: 'detail',
				recordId: row._id,
				_recordScope: '/market/sales-orders',
			}))
		},
		[pushWithSearch],
	)
	const handleNew = React.useCallback(() => {
		pushWithSearch((previous) => {
			const nextSearch = { ...previous }
			delete nextSearch.recordId
			return {
				...nextSearch,
				mode: 'new',
				_recordScope: '/market/sales-orders',
			}
		})
	}, [pushWithSearch])

	const handleClose = React.useCallback(() => {
		pushWithSearch(clearRecordSearchState)
	}, [clearRecordSearchState, pushWithSearch])

	const handleCreated = React.useCallback(
		(recordId: string) => {
			if (!recordId) {
				pushWithSearch(clearRecordSearchState)
				return
			}

			pushWithSearch((previous) => ({
				...previous,
				mode: 'detail',
				recordId,
				_recordScope: '/market/sales-orders',
			}))
		},
		[clearRecordSearchState, pushWithSearch],
	)

	if (selectedId !== null) {
		return (
			<div className='space-y-8 pb-8'>
				<SalesOrderCard
					selectedId={selectedId}
					onClose={handleClose}
					onCreated={handleCreated}
					presentation='page'
				/>
			</div>
		)
	}

	return (
		<div className='space-y-8 pb-8'>
			<PageHeader
				title='Sales Orders'
				description='Manage customer orders, quotes, and returns'
				actions={
					<Button
						size='sm'
						onClick={handleNew}
						data-testid='sales-order-new-button'
						className='shadow-sm transition-all hover:shadow-md'
					>
						<Plus className='mr-1.5 size-4' aria-hidden='true' />
						New Order
					</Button>
				}
			/>

			<div className='overflow-hidden rounded-xl border border-border/50 bg-background/50 shadow-sm backdrop-blur-xl'>
				<DataGrid
					variant='lined'
					height={Math.max(windowSize.height - 150, 400)}
					withSelect
				>
					<DataGrid.Header className='border-border/50 border-b bg-muted/20 px-6 py-4'>
						<DataGrid.Toolbar filter sort search export />
					</DataGrid.Header>
					<DataGrid.Columns>
						<DataGrid.Column
							accessorKey='documentNo'
							title='Document No.'
							handleEdit={handleEdit}
						/>
						<DataGrid.Column
							accessorKey='documentType'
							title='Type'
							cellVariant='select'
						/>
						<DataGrid.Column
							accessorKey='status'
							title='Status'
							cell={({ row }) => <StatusBadge status={row.original.status} />}
						/>
						<DataGrid.Column accessorKey='customerName' title='Customer' />
						<DataGrid.Column
							accessorKey='orderDate'
							title='Order Date'
							cellVariant='date'
							formatter={(v, f) => f.date(v.orderDate, { format: 'P' })}
						/>
						<DataGrid.Column accessorKey='currency' title='Currency' />
						<DataGrid.Column
							accessorKey='lineCount'
							title='Lines'
							cellVariant='number'
						/>
						<DataGrid.Column
							accessorKey='totalAmount'
							title='Total Amount'
							cellVariant='number'
							formatter={(v, f) => f.currency(v.totalAmount)}
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
									submitForApproval.isPending ||
									transitionStatus.isPending ||
									cancelWithRelease.isPending
								const allDraft = records.every((r) => r.status === 'DRAFT')
								const allApproved = records.every(
									(r) => r.status === 'APPROVED',
								)
								const allCancellable = records.every(
									(r) =>
										r.status === 'DRAFT' || r.status === 'PENDING_APPROVAL',
								)

								return (
									<>
										<DataGrid.ActionBar.Item
											disabled={!hasSelection || isBusy || !allDraft}
											onClick={() => {
												void handleBulkSubmit(ids)
											}}
										>
											<Send className='size-3.5' aria-hidden='true' />
											Submit for Approval
										</DataGrid.ActionBar.Item>
										<DataGrid.ActionBar.Item
											disabled={!hasSelection || isBusy || !allApproved}
											onClick={() => {
												void handleBulkRelease(ids)
											}}
										>
											<Unlock className='size-3.5' aria-hidden='true' />
											Release
										</DataGrid.ActionBar.Item>
										<DataGrid.ActionBar.Item
											disabled={!hasSelection || isBusy || !allCancellable}
											onClick={() => {
												void handleBulkCancel(ids)
											}}
										>
											<Ban className='size-3.5' aria-hidden='true' />
											Cancel
										</DataGrid.ActionBar.Item>
										<ReportActionItems
											table={table}
											selectionState={state.selectionState}
											moduleId='market'
											entityId='salesOrders'
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
