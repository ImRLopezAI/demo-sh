import { parseRouterSearch, stringifyRouterSearch } from '@lib/router/search'
import { $rpc, useMutation, useQueryClient } from '@lib/rpc'
import { Plus } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { useModuleData } from '@/app/_shell/hooks/use-data'
import { PageHeader } from '@/components/ui/json-render/dashboard-sections'
import { ReportActionItems } from '@/lib/json-render/components/report-action-items'
import { resolveSelectedIds } from '@/lib/json-render/components/resolve-selected-ids'
import { SpecBulkActionItems } from '@/lib/json-render/components/spec-bulk-actions'
import { extractSpecCardProps } from '@/lib/json-render/components/spec-card-helpers'
import {
	renderSpecColumns,
	type SpecListProps,
	useSpecFilters,
} from '@/lib/json-render/components/spec-list-helpers'
import { StatusBadge } from '@/components/ui/json-render/status-badge'
import { SalesOrderCard } from './sales-order-card'

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

interface SalesOrdersListProps {
	specProps?: SpecListProps
}

export default function SalesOrdersList({
	specProps,
}: SalesOrdersListProps = {}) {
	const router = useRouter()
	const pathname = usePathname() || '/market/sales-orders'
	const searchParams = useSearchParams()
	const locationSearch = React.useMemo(
		() => parseRouterSearch(searchParams.toString()),
		[searchParams],
	)

	const queryClient = useQueryClient()

	const specFilters = useSpecFilters(specProps)
	const specCardProps = extractSpecCardProps(specProps)

	const { DataGrid, windowSize } = useModuleData<'market', SalesOrder>(
		'market',
		'salesOrders',
		'all',
		{ filters: specFilters },
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

	const handleBulkTransition = React.useCallback(
		async (ids: string[], toStatus: string) => {
			for (const id of ids) {
				switch (toStatus) {
					case 'PENDING_APPROVAL':
						await submitForApproval.mutateAsync({ id })
						break
					case 'CANCELED':
						await cancelWithRelease.mutateAsync({ id })
						break
					default:
						await transitionStatus.mutateAsync({ id, toStatus })
				}
			}
		},
		[submitForApproval, transitionStatus, cancelWithRelease],
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
					specCardProps={specCardProps}
					presentation='page'
				/>
			</div>
		)
	}

	return (
		<div className='space-y-8 pb-8'>
			<PageHeader
				title={specProps?.title ?? 'Sales Orders'}
				description={
					specProps?.description ??
					'Manage customer orders, quotes, and returns'
				}
				actions={
					specProps?.enableNew !== false ? (
						<Button
							size='sm'
							onClick={handleNew}
							data-testid='sales-order-new-button'
							className='shadow-sm transition-all hover:shadow-md'
						>
							<Plus className='mr-1.5 size-4' aria-hidden='true' />
							{specProps?.newLabel ?? 'New Order'}
						</Button>
					) : undefined
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
						{specProps?.columns ? (
							renderSpecColumns<SalesOrder>(
								DataGrid.Column as unknown as React.ComponentType<{
							accessorKey: string
							title: string
							cellVariant?: string
							handleEdit?: ((row: any) => void) | undefined
							[key: string]: unknown
						}>,
								specProps.columns,
								handleEdit,
							)
						) : (
							<>
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
									cell={({ row }) => (
										<StatusBadge status={row.original.status} />
									)}
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
							{(table, state) => {
								const isBusy =
									submitForApproval.isPending ||
									transitionStatus.isPending ||
									cancelWithRelease.isPending

								return (
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
											entityId='salesOrders'
											isBusy={isBusy}
										/>
									</SpecBulkActionItems>
								)
							}}
						</DataGrid.ActionBar.Group>
					</DataGrid.ActionBar>
				</DataGrid>
			</div>
		</div>
	)
}
