import { Plus } from 'lucide-react'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { useModuleData } from '../../hooks/use-data'
import { PageHeader } from '../_shared/page-header'
import { StatusBadge } from '../_shared/status-badge'
import { BankAccountCard } from './components/bank-account-card'

export default function BankAccountsList() {
	const [selectedId, setSelectedId] = React.useState<string | null>(null)

	const { DataGrid, windowSize } = useModuleData('flow', 'bankAccounts')

	const handleEdit = React.useCallback((row) => setSelectedId(row._id), [])
	const handleNew = () => setSelectedId('new')

	return (
		<div className='space-y-6'>
			<PageHeader
				title='Bank Accounts'
				description='Manage bank accounts, balances, and integration settings.'
				actions={
					<Button size='sm' onClick={handleNew}>
						<Plus className='mr-1.5 size-3.5' aria-hidden='true' />
						New Account
					</Button>
				}
			/>

			<DataGrid
				variant='relaxed'
				height={Math.max(windowSize.height - 200, 380)}
			>
				<DataGrid.Header>
					<DataGrid.Toolbar filter sort search export />
				</DataGrid.Header>
				<DataGrid.Columns>
					<DataGrid.Column
						accessorKey='accountNo'
						title='Account No.'
						handleEdit={handleEdit}
					/>
					<DataGrid.Column accessorKey='name' title='Name' />
					<DataGrid.Column accessorKey='bankName' title='Bank Name' />
					<DataGrid.Column accessorKey='iban' title='IBAN' />
					<DataGrid.Column accessorKey='swiftCode' title='SWIFT Code' />
					<DataGrid.Column accessorKey='currency' title='Currency' />
					<DataGrid.Column
						accessorKey='status'
						title='Status'
						cell={({ row }) => <StatusBadge status={row.original.status} />}
					/>
					<DataGrid.Column
						accessorKey='entryCount'
						title='Entries'
						cellVariant='number'
					/>
					<DataGrid.Column
						accessorKey='currentBalance'
						title='Current Balance'
						cellVariant='number'
						formatter={(v, f) => f.currency(v.currentBalance)}
					/>
				</DataGrid.Columns>
			</DataGrid>

			<BankAccountCard
				selectedId={selectedId}
				onClose={() => setSelectedId(null)}
			/>
		</div>
	)
}
