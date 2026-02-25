import { Plus } from 'lucide-react'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { useModuleData } from '../../hooks/use-data'
import { PageHeader } from '../_shared/page-header'
import { StatusBadge } from '../_shared/status-badge'
import { useRecordSearchState } from '../_shared/use-record-search-state'
import { TransferCard } from './components/transfer-card'

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

export default function TransfersList() {
	const { close, openCreate, openDetail, selectedId } = useRecordSearchState()

	const { DataGrid, windowSize } = useModuleData<'replenishment', Transfer>(
		'replenishment',
		'transfers',
		'all',
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
					presentation='page'
				/>
			</div>
		)
	}

	return (
		<div className='space-y-8 pb-8'>
			<PageHeader
				title='Transfers'
				description='Manage internal inventory movement between locations'
				actions={
					<Button
						size='sm'
						onClick={handleNew}
						className='shadow-sm transition-all hover:shadow-md'
					>
						<Plus className='mr-1.5 size-4' aria-hidden='true' />
						New Transfer
					</Button>
				}
			/>

			<div className='overflow-hidden rounded-xl border border-border/50 bg-background/50 shadow-sm backdrop-blur-xl'>
				<DataGrid
					variant='flat'
					height={Math.max(windowSize.height - 240, 400)}
				>
					<DataGrid.Header className='border-border/50 border-b bg-muted/20 px-6 py-4'>
						<DataGrid.Toolbar filter sort search export />
					</DataGrid.Header>
					<DataGrid.Columns>
						<DataGrid.Column<Transfer>
							accessorKey='transferNo'
							title='Transfer No.'
							handleEdit={handleEdit}
						/>
						<DataGrid.Column<Transfer>
							accessorKey='status'
							title='Status'
							cell={({ row }) => <StatusBadge status={row.original.status} />}
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
					</DataGrid.Columns>
				</DataGrid>
			</div>
		</div>
	)
}
