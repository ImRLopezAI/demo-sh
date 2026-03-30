import { $rpc, useMutation, useQueryClient } from '@lib/rpc'
import { Plus } from 'lucide-react'
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
import { useRecordSearchState } from '@/lib/json-render/components/use-record-search-state'
import { TransferCard } from './transfer-card'

interface Transfer {
	_id: string
	transferNo: string
	status: 'DRAFT' | 'RELEASED' | 'IN_TRANSIT' | 'RECEIVED' | 'CANCELED'
	fromLocationCode: string
	toLocationCode: string
	shipmentDate: string
	receiptDate: string
	lineCount: number
}

interface TransfersListProps {
	specProps?: SpecListProps
}

export default function TransfersList({ specProps }: TransfersListProps = {}) {
	const { close, openCreate, openDetail, selectedId } = useRecordSearchState()
	const queryClient = useQueryClient()

	const specFilters = useSpecFilters(specProps)
	const specCardProps = extractSpecCardProps(specProps)

	const { DataGrid, windowSize } = useModuleData<'replenishment', Transfer>(
		'replenishment',
		'transfers',
		'all',
		{ filters: specFilters },
	)

	const invalidate = React.useCallback(() => {
		void queryClient.invalidateQueries({
			queryKey: $rpc.replenishment.transfers.key(),
		})
	}, [queryClient])

	const transitionStatus = useMutation({
		...$rpc.replenishment.transfers.transitionStatus.mutationOptions({
			onSuccess: invalidate,
		}),
	})

	const handleBulkTransition = React.useCallback(
		async (ids: string[], toStatus: string) => {
			for (const id of ids) {
				await transitionStatus.mutateAsync({ id, toStatus })
			}
		},
		[transitionStatus],
	)

	const handleEdit = React.useCallback(
		(row: Transfer) => {
			openDetail(row._id)
		},
		[openDetail],
	)
	const handleNew = openCreate

	if (selectedId !== null) {
		return (
			<div className='space-y-8 pb-8'>
				<TransferCard
					recordId={selectedId}
					onClose={close}
					onCreated={openDetail}
					specCardProps={specCardProps}
					presentation='page'
				/>
			</div>
		)
	}

	return (
		<div className='space-y-8 pb-8'>
			<PageHeader
				title={specProps?.title ?? 'Transfers'}
				description={
					specProps?.description ??
					'Manage internal inventory movement between locations'
				}
				actions={
					specProps?.enableNew !== false ? (
						<Button
							size='sm'
							onClick={handleNew}
							className='shadow-sm transition-all hover:shadow-md'
						>
							<Plus className='mr-1.5 size-4' aria-hidden='true' />
							{specProps?.newLabel ?? 'New Transfer'}
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
							renderSpecColumns<Transfer>(
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
								<DataGrid.Column<Transfer>
									accessorKey='transferNo'
									title='Transfer No.'
									handleEdit={handleEdit}
								/>
								<DataGrid.Column<Transfer>
									accessorKey='status'
									title='Status'
									cell={({ row }) => (
										<StatusBadge status={row.original.status} />
									)}
								/>
								<DataGrid.Column<Transfer>
									accessorKey='fromLocationCode'
									title='From Location'
								/>
								<DataGrid.Column<Transfer>
									accessorKey='toLocationCode'
									title='To Location'
								/>
								<DataGrid.Column<Transfer>
									accessorKey='shipmentDate'
									title='Shipment Date'
									cellVariant='date'
									formatter={(v, f) => f.date(v.shipmentDate, { format: 'P' })}
								/>
								<DataGrid.Column<Transfer>
									accessorKey='receiptDate'
									title='Receipt Date'
									cellVariant='date'
									formatter={(v, f) => f.date(v.receiptDate, { format: 'P' })}
								/>
								<DataGrid.Column<Transfer>
									accessorKey='lineCount'
									title='Lines'
									cellVariant='number'
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
									isBusy={transitionStatus.isPending}
								>
									<ReportActionItems
										table={table}
										selectionState={state.selectionState}
										moduleId='replenishment'
										entityId='transfers'
										isBusy={transitionStatus.isPending}
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
