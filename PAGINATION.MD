```tsx

'use client'

import { useGrid, useWindowSize } from '@components/data-grid'
import { $rpc, useInfiniteQuery, useQuery } from '@lib/rpc'
import { Badge } from '@ui/badge'
import { EmptyList } from '@ui/blocks/empty'
import { Button } from '@ui/button'
import { ChevronDown, ChevronUp, FileText } from 'lucide-react'

const PAGE_SIZE = 25

export function PurchaseHeadersTable() {
	const {
		data,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
		isLoading,
	} = useInfiniteQuery(
		$rpc.purchase.listHeaders.infiniteOptions({
			input: (context) => ({
				limit: PAGE_SIZE,
				offset: context,
			}),
			initialPageParam: 0,
			getNextPageParam: (lastPage) => lastPage.nextOffset ?? undefined,
		}),
	)
	const items = data?.pages.flatMap((p) => p.items) ?? []
	const { height } = useWindowSize({
		defaultHeight: 800,
	})
	const Table = useGrid(
		() => ({
			data: items,
			isLoading,
			getRowCanExpand: (row) => (row.original.lineCount ?? 0) > 0,
			infiniteScroll: {
				loadMore: () => {
					fetchNextPage()
				},
				hasMore: hasNextPage,
				isLoading: isFetchingNextPage,
			},
			emptyMessage: (
				<EmptyList
					Icon={<FileText />}
					title='No Purchase Headers'
					description='No purchase documents found in the collection.'
					content='There are no purchase headers to display.'
				/>
			),
		}),
		[items, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage],
	)

	return (
		<Table withSelect variant='minimal' height={Math.max(height - 150 , 400)}>
			<Table.Header>
				<Table.Toolbar>
					<Table.Toolbar search filter export sort />
				</Table.Toolbar>
			</Table.Header>
			<Table.Columns>
				<Table.Column accessorKey='documentNo' title='Document No' />
				<Table.Column
					accessorKey='documentType'
					title='Type'
					cellVariant='select'
				>
					{({ getValue }) => (
						<Badge variant='outline'>
							{getValue<string>().replace(/_/g, ' ')}
						</Badge>
					)}
				</Table.Column>
				<Table.Column accessorKey='status' title='Status' cellVariant='select'>
					{({ getValue }) => {
						const status = getValue<string>()
						const variantMap: Record<
							string,
							'success' | 'warning' | 'info' | 'destructive' | 'default'
						> = {
							DRAFT: 'default',
							PENDING_APPROVAL: 'warning',
							APPROVED: 'success',
							REJECTED: 'destructive',
							CANCELED: 'destructive',
							COMPLETED: 'info',
						}
						return (
							<Badge variant={variantMap[status] ?? 'default'}>
								{status.replace(/_/g, ' ')}
							</Badge>
						)
					}}
				</Table.Column>
				<Table.Column
					accessorKey='postingDate'
					title='Posting Date'
					formatter={(r, f) => f.date(r.postingDate, { format: 'medium' })}
				/>
				<Table.Column
					accessorKey='totalAmount'
					title='Total Amount'
					formatter={(r, f) =>
						f.currency(r.totalAmount ?? 0, {
							currency: 'USD',
							minimumFractionDigits: 2,
						})
					}
				/>
				<Table.Column
					accessorKey='totalTax'
					title='Tax'
					formatter={(r, f) =>
						f.currency(r.totalTax ?? 0, {
							currency: 'USD',
							minimumFractionDigits: 2,
						})
					}
				/>
				<Table.Column
					accessorKey='grandTotal'
					title='Grand Total'
					formatter={(r, f) =>
						f.currency(r.grandTotal ?? 0, {
							currency: 'USD',
							minimumFractionDigits: 2,
						})
					}
				/>
				<Table.Column
					accessorKey='paymentMethod'
					title='Payment Method'
					accessorFn={(row) => row.paymentMethod?.card}
					formatter={(r, f) =>
						f.mask(r.paymentMethod?.card ?? '', {
							preset: 'creditCard',
						})
					}
				/>
				<Table.Column
					accessorKey='store'
					title='Store'
					cellVariant='long-text'
					accessorFn={(row) => row.store?.description}
				/>
				<Table.Column
					id='expand'
					size={40}
					header={() => null}
					enableResizing={false}
					expandedContent={(row) => (
						<PurchaseLinesSubTable headerId={row._id} />
					)}
				>
					{({ row }) =>
						row.getCanExpand() ? (
							<Button
								variant='ghost'
								size='icon-sm'
								className='transition-transform'
								onClick={row.getToggleExpandedHandler()}
							>
								{row.getIsExpanded() ? (
									<ChevronUp className='size-4' />
								) : (
									<ChevronDown className='size-4' />
								)}
							</Button>
						) : null
					}
				</Table.Column>
			</Table.Columns>
		</Table>
	)
}

function PurchaseLinesSubTable({ headerId }: { headerId?: string }) {
	const { data: lines = [], isLoading } = useQuery({
		...$rpc.purchase.getLinesByHeaderId.queryOptions({
			input: { headerId: headerId! },
		}),
		enabled: !!headerId,
	})
	const Table = useGrid(
		() => ({
			data: lines,
			dnd: true,
			enablePagination: true,
			tableOptions: {
				initialState: {
					pagination: { pageIndex: 0, pageSize: 5 },
				},
			},
			paginationOptions: {
				sizes: [5, 10],
			},
		}),
		[lines, isLoading],
	)

	return (
		<div className='bg-none px-4 py-2'>
			<Table variant='striped'>
				<Table.Columns>
					<Table.Column accessorKey='lineNo' title='Line #' size={60} />
					<Table.Column accessorKey='itemNo' title='Item No' />
					<Table.Column accessorKey='description' title='Description'>
						{({ getValue }) => getValue<string | undefined>() ?? '-'}
					</Table.Column>
					<Table.Column
						accessorKey='quantity'
						title='Qty'
						size={60}
						formatter={(r, f) => f.number(r.quantity)}
					/>
					<Table.Column
						accessorKey='rate'
						title='Unit Price'
						formatter={(r, f) =>
							f.currency(r.rate, {
								currency: 'USD',
								minimumFractionDigits: 2,
							})
						}
					/>
					<Table.Column
						accessorKey='discountRate'
						title='Discount %'
						size={80}
						formatter={(r, f) =>
							f.percent((r.discountRate ?? 0) / 100, {
								maximumFractionDigits: 1,
							})
						}
					/>
					<Table.Column
						accessorKey='taxRate'
						title='Tax %'
						size={70}
						formatter={(r, f) =>
							f.percent((r.taxRate ?? 0) / 100, { maximumFractionDigits: 1 })
						}
					/>
					<Table.Column
						accessorKey='amount'
						title='Amount'
						formatter={(r, f) =>
							f.currency(r.amount ?? 0, {
								currency: 'USD',
								minimumFractionDigits: 2,
							})
						}
					/>
					<Table.Column
						accessorKey='lineAmount'
						title='Line Total'
						formatter={(r, f) =>
							f.currency(r.netAmount ?? 0, {
								currency: 'USD',
								minimumFractionDigits: 2,
							})
						}
					/>
				</Table.Columns>
			</Table>
		</div>
	)
}


```