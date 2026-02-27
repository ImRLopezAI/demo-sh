import * as React from 'react'
import { useModuleData } from '../../hooks/use-data'
import { PageHeader } from '../_shared/page-header'
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

	const { DataGrid, windowSize } = useModuleData<'pos', PosSession>(
		'pos',
		'sessions',
		'all',
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
				</DataGrid>
			</div>
		</div>
	)
}
