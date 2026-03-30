import { $rpc, useMutation, useQueryClient } from '@lib/rpc'
import { Ban, Plus, ShieldCheck } from 'lucide-react'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { useModuleData } from '@/app/_shell/hooks/use-data'
import { PageHeader } from '@/components/ui/json-render/dashboard-sections'
import { ReportActionItems } from '@/lib/json-render/components/report-action-items'
import {
	resolveSelectedIds,
	resolveSelectedRecords,
} from '@/lib/json-render/components/resolve-selected-ids'
import { SpecBulkActionItems } from '@/lib/json-render/components/spec-bulk-actions'
import { extractSpecCardProps } from '@/lib/json-render/components/spec-card-helpers'
import {
	renderSpecColumns,
	type SpecListProps,
} from '@/lib/json-render/components/spec-list-helpers'
import { useRecordSearchState } from '@/lib/json-render/components/use-record-search-state'
import { CustomerCard } from './customer-card'

interface Customer {
	_id: string
	customerNo: string
	name: string
	email: string
	phone: string
	address: string
	city: string
	country: string
	blocked: boolean
	orderCount: number
	totalBalance: number
}

interface CustomersListProps {
	specProps?: SpecListProps
}

export default function CustomersList({ specProps }: CustomersListProps = {}) {
	const { close, openCreate, openDetail, selectedId } = useRecordSearchState()
	const queryClient = useQueryClient()
	const specCardProps = extractSpecCardProps(specProps)

	const { DataGrid, windowSize } = useModuleData<'market', Customer>(
		'market',
		'customers',
		'all',
	)

	const invalidate = React.useCallback(() => {
		void queryClient.invalidateQueries({
			queryKey: $rpc.market.customers.key(),
		})
	}, [queryClient])

	const updateCustomer = useMutation({
		...$rpc.market.customers.update.mutationOptions({
			onSuccess: invalidate,
		}),
	})

	const handleBulkBlock = React.useCallback(
		async (ids: string[]) => {
			for (const id of ids) {
				await updateCustomer.mutateAsync({ id, data: { blocked: true } })
			}
		},
		[updateCustomer],
	)

	const handleBulkUnblock = React.useCallback(
		async (ids: string[]) => {
			for (const id of ids) {
				await updateCustomer.mutateAsync({ id, data: { blocked: false } })
			}
		},
		[updateCustomer],
	)

	const handleEdit = React.useCallback(
		(row: Customer) => openDetail(row._id),
		[openDetail],
	)
	const handleNew = openCreate

	if (selectedId !== null) {
		return (
			<div className='space-y-8 pb-8'>
				<CustomerCard
					selectedId={selectedId}
					onClose={close}
					specCardProps={specCardProps}
					presentation='page'
				/>
			</div>
		)
	}

	return (
		<div className='space-y-8 pb-8'>
			<PageHeader
				title={specProps?.title ?? 'Customers'}
				description={
					specProps?.description ??
					'Customer profiles, contacts, and order history'
				}
				actions={
					specProps?.enableNew !== false ? (
						<Button
							size='sm'
							onClick={handleNew}
							className='shadow-sm transition-all hover:shadow-md'
						>
							<Plus className='mr-1.5 size-4' aria-hidden='true' />
							{specProps?.newLabel ?? 'New Customer'}
						</Button>
					) : undefined
				}
			/>

			<div className='overflow-hidden rounded-xl border border-border/50 bg-background/50 shadow-sm backdrop-blur-xl'>
				<DataGrid
					variant='relaxed'
					height={Math.max(windowSize.height - 150, 400)}
					withSelect
				>
					<DataGrid.Header className='border-border/50 border-b bg-muted/20 px-6 py-4'>
						<DataGrid.Toolbar filter sort search export />
					</DataGrid.Header>
					<DataGrid.Columns>
						{specProps?.columns ? (
							renderSpecColumns<Customer>(
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
									accessorKey='customerNo'
									title='Customer No.'
									handleEdit={handleEdit}
								/>
								<DataGrid.Column accessorKey='name' title='Name' />
								<DataGrid.Column accessorKey='email' title='Email' />
								<DataGrid.Column accessorKey='phone' title='Phone' />
								<DataGrid.Column accessorKey='city' title='City' />
								<DataGrid.Column accessorKey='country' title='Country' />
								<DataGrid.Column
									accessorKey='blocked'
									title='Blocked'
									cellVariant='checkbox'
								/>
								<DataGrid.Column
									accessorKey='orderCount'
									title='Orders'
									cellVariant='number'
								/>
								<DataGrid.Column
									accessorKey='totalBalance'
									title='Balance'
									cellVariant='number'
									formatter={(v, f) => f.currency(v.totalBalance)}
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
								const records = resolveSelectedRecords(
									table,
									state.selectionState,
								)
								const ids = records.map((r) => r._id)
								const hasSelection = ids.length > 0
								const isBusy = updateCustomer.isPending
								const someNotBlocked = records.some((r) => !r.blocked)
								const someBlocked = records.some((r) => r.blocked)

								return (
									<SpecBulkActionItems
										specBulkActions={specProps?.bulkActions}
										table={table}
										selectionState={state.selectionState}
										onTransition={() => {}}
										isBusy={isBusy}
									>
										<DataGrid.ActionBar.Item
											disabled={!hasSelection || isBusy || !someNotBlocked}
											onClick={() => {
												void handleBulkBlock(ids)
											}}
										>
											<Ban className='size-3.5' aria-hidden='true' />
											Block
										</DataGrid.ActionBar.Item>
										<DataGrid.ActionBar.Item
											disabled={!hasSelection || isBusy || !someBlocked}
											onClick={() => {
												void handleBulkUnblock(ids)
											}}
										>
											<ShieldCheck className='size-3.5' aria-hidden='true' />
											Unblock
										</DataGrid.ActionBar.Item>
										<ReportActionItems
											table={table}
											selectionState={state.selectionState}
											moduleId='market'
											entityId='customers'
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
