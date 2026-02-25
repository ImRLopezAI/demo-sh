import * as React from 'react'
import { useModuleData } from '../../hooks/use-data'
import { PageHeader } from '../_shared/page-header'
import { StatusBadge } from '../_shared/status-badge'
import { useRecordSearchState } from '../_shared/use-record-search-state'
import { TransactionCard } from './components/transaction-card'

interface PosTransaction {
	_id: string
	receiptNo: string
	posSessionId: string
	status: 'OPEN' | 'COMPLETED' | 'VOIDED' | 'REFUNDED'
	customerId: string
	customerName: string
	totalAmount: number
	taxAmount: number
	discountAmount: number
	paidAmount: number
	paymentMethod: 'CASH' | 'CARD' | 'MOBILE' | 'MIXED'
	transactionAt: string
	lineCount: number
}

export default function TransactionsList() {
	const { close, openDetail, selectedId } = useRecordSearchState()

	const { DataGrid, windowSize } = useModuleData<'pos', PosTransaction>(
		'pos',
		'transactions',
		'all',
	)

	const handleEdit = React.useCallback(
		(row: PosTransaction) => {
			openDetail(row._id)
		},
		[openDetail],
	)

	if (selectedId !== null) {
		return (
			<div className='space-y-8 pb-8'>
				<TransactionCard
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
				title='Transactions'
				description='View POS transaction history and details.'
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
						<DataGrid.Column<PosTransaction>
							accessorKey='receiptNo'
							title='Receipt No.'
							handleEdit={handleEdit}
						/>
						<DataGrid.Column<PosTransaction>
							accessorKey='status'
							title='Status'
							cell={({ row }) => <StatusBadge status={row.original.status} />}
						/>
						<DataGrid.Column<PosTransaction>
							accessorKey='customerName'
							title='Customer'
						/>
						<DataGrid.Column<PosTransaction>
							accessorKey='totalAmount'
							title='Total'
							cellVariant='number'
							formatter={(v, f) => f.currency(v.totalAmount)}
						/>
						<DataGrid.Column<PosTransaction>
							accessorKey='taxAmount'
							title='Tax'
							cellVariant='number'
							formatter={(v, f) => f.currency(v.taxAmount)}
						/>
						<DataGrid.Column<PosTransaction>
							accessorKey='discountAmount'
							title='Discount'
							cellVariant='number'
							formatter={(v, f) => f.currency(v.discountAmount)}
						/>
						<DataGrid.Column<PosTransaction>
							accessorKey='paidAmount'
							title='Paid'
							cellVariant='number'
							formatter={(v, f) => f.currency(v.paidAmount)}
						/>
						<DataGrid.Column<PosTransaction>
							accessorKey='paymentMethod'
							title='Payment'
							cellVariant='select'
							opts={{
								options: [
									{ label: 'Cash', value: 'CASH' },
									{ label: 'Card', value: 'CARD' },
									{ label: 'Mobile', value: 'MOBILE' },
									{ label: 'Mixed', value: 'MIXED' },
								],
							}}
						/>
						<DataGrid.Column<PosTransaction>
							accessorKey='transactionAt'
							title='Date'
							cellVariant='date'
							formatter={(v, f) => f.date(v.transactionAt, { format: 'Pp' })}
						/>
						<DataGrid.Column<PosTransaction>
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
