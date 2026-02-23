import { Plus } from 'lucide-react'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { useModuleData } from '../../hooks/use-data'
import { PageHeader } from '../_shared/page-header'
import { StatusBadge } from '../_shared/status-badge'
import { BankAccountCard } from './components/bank-account-card'

interface BankAccount {
	_id: string
	accountNo: string
	name: string
	bankName: string
	iban: string
	swiftCode: string
	currency: string
	status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED'
	entryCount: number
	currentBalance: number
}

export default function BankAccountsList() {
	const [selectedId, setSelectedId] = React.useState<string | null>(null)

	const { DataGrid, windowSize } = useModuleData<'flow', BankAccount>(
		'flow',
		'bankAccounts',
		'all',
	)

	const handleEdit = React.useCallback(
		(row: BankAccount) => setSelectedId(row._id),
		[],
	)
	const handleNew = () => setSelectedId('new')

	return (
		<div className='space-y-8 pb-8'>
			<PageHeader
				title='Bank Accounts'
				description='Manage bank accounts, balances, and integration settings.'
				actions={
					<Button
						size='sm'
						onClick={handleNew}
						className='shadow-sm transition-all hover:shadow-md'
					>
						<Plus className='mr-1.5 size-3.5' aria-hidden='true' />
						New Account
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
			</div>

			<BankAccountCard
				selectedId={selectedId}
				onClose={() => setSelectedId(null)}
			/>
		</div>
	)
}
