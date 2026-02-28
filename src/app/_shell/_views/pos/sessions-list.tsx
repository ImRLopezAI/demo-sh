import { $rpc, useMutation, useQueryClient } from '@lib/rpc'
import { Lock, Pause } from 'lucide-react'
import * as React from 'react'
import { useModuleData } from '../../hooks/use-data'
import { PageHeader } from '../_shared/page-header'
import {
	resolveSelectedIds,
	resolveSelectedRecords,
} from '../_shared/resolve-selected-ids'
import { ReportActionItems } from '../_shared/report-action-items'
import { StatusBadge } from '../_shared/status-badge'
import { useRecordSearchState } from '../_shared/use-record-search-state'
import { SessionCard } from './components/session-card'

interface PosSession {
	_id: string
	sessionNo: string
	terminalId: string
	terminalName: string
	cashierId: string
	status: 'OPEN' | 'PAUSED' | 'CLOSED'
	openedAt: string
	closedAt: string
	openingBalance: number
	closingBalance: number
	transactionCount: number
	totalSales: number
}

export default function SessionsList() {
	const { close, openDetail, selectedId } = useRecordSearchState()
	const queryClient = useQueryClient()

	const { DataGrid, windowSize } = useModuleData<'pos', PosSession>(
		'pos',
		'sessions',
		'all',
	)

	const invalidate = React.useCallback(() => {
		void queryClient.invalidateQueries({
			queryKey: $rpc.pos.sessions.key(),
		})
	}, [queryClient])

	const transitionStatus = useMutation({
		...$rpc.pos.sessions.transitionStatus.mutationOptions({
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
		(row: PosSession) => {
			openDetail(row._id)
		},
		[openDetail],
	)

	if (selectedId !== null) {
		return (
			<div className='space-y-8 pb-8'>
				<SessionCard
					selectedId={selectedId}
					onClose={close}
					presentation='page'
				/>
			</div>
		)
	}

	return (
		<div className='space-y-8 pb-8'>
			<PageHeader
				title='Sessions'
				description='View and manage POS terminal sessions.'
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
						<DataGrid.Column<PosSession>
							accessorKey='sessionNo'
							title='Session No.'
							handleEdit={handleEdit}
						/>
						<DataGrid.Column<PosSession>
							accessorKey='terminalName'
							title='Terminal'
						/>
						<DataGrid.Column<PosSession>
							accessorKey='status'
							title='Status'
							cell={({ row }) => <StatusBadge status={row.original.status} />}
						/>
						<DataGrid.Column<PosSession>
							accessorKey='openedAt'
							title='Opened'
							cellVariant='date'
							formatter={(v, f) => f.date(v.openedAt, { format: 'Pp' })}
						/>
						<DataGrid.Column<PosSession>
							accessorKey='closedAt'
							title='Closed'
							cellVariant='date'
							formatter={(v, f) => f.date(v.closedAt, { format: 'Pp' })}
						/>
						<DataGrid.Column<PosSession>
							accessorKey='openingBalance'
							title='Opening Bal.'
							cellVariant='number'
							formatter={(v, f) => f.currency(v.openingBalance)}
						/>
						<DataGrid.Column<PosSession>
							accessorKey='closingBalance'
							title='Closing Bal.'
							cellVariant='number'
							formatter={(v, f) => f.currency(v.closingBalance)}
						/>
						<DataGrid.Column<PosSession>
							accessorKey='transactionCount'
							title='Transactions'
							cellVariant='number'
						/>
						<DataGrid.Column<PosSession>
							accessorKey='totalSales'
							title='Total Sales'
							cellVariant='number'
							formatter={(v, f) => f.currency(v.totalSales)}
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
								const isBusy = transitionStatus.isPending
								const allOpenOrPaused = records.every(
									(r) => r.status === 'OPEN' || r.status === 'PAUSED',
								)
								const allOpen = records.every((r) => r.status === 'OPEN')

								return (
									<>
										<DataGrid.ActionBar.Item
											disabled={!hasSelection || isBusy || !allOpenOrPaused}
											onClick={() => {
												void handleBulkTransition(ids, 'CLOSED')
											}}
										>
											<Lock className='size-3.5' aria-hidden='true' />
											Close Shift
										</DataGrid.ActionBar.Item>
										<DataGrid.ActionBar.Item
											disabled={!hasSelection || isBusy || !allOpen}
											onClick={() => {
												void handleBulkTransition(ids, 'PAUSED')
											}}
										>
											<Pause className='size-3.5' aria-hidden='true' />
											Pause
										</DataGrid.ActionBar.Item>
										<ReportActionItems
											table={table}
											selectionState={state.selectionState}
											moduleId="pos"
											entityId="sessions"
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
