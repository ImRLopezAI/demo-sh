import * as React from 'react'
import { useModuleData } from '../../hooks/use-data'
import { PageHeader } from '../_shared/page-header'
import { StatusBadge } from '../_shared/status-badge'
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
	const [selectedId, setSelectedId] = React.useState<string | null>(null)

	const { DataGrid, windowSize } = useModuleData<'pos', PosTransaction>(
		'pos',
		'transactions',
		'all',
	)

	const handleEdit = React.useCallback((row: PosTransaction) => {
		setSelectedId(row._id)
	}, [])

	return (
		<div className='space-y-4'>
			<PageHeader
				title='Transactions'
				description='View POS transaction history and details.'
			/>

			<DataGrid variant='lined' height={Math.max(windowSize.height - 190, 390)}>
				<DataGrid.Header>
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

			<TransactionCard
				selectedId={selectedId}
				onClose={() => setSelectedId(null)}
			/>
		</div>
	)
}
