import { $rpc, useMutation, useQueryClient } from '@lib/rpc'
import { Ban, CheckCircle, Plus, XCircle } from 'lucide-react'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { useModuleData } from '../../hooks/use-data'
import { PageHeader } from '../_shared/page-header'
import { ReportActionItems } from '../_shared/report-action-items'
import {
	resolveSelectedIds,
	resolveSelectedRecords,
} from '../_shared/resolve-selected-ids'
import { StatusBadge } from '../_shared/status-badge'
import { useRecordSearchState } from '../_shared/use-record-search-state'
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
	const { close, openCreate, openDetail, selectedId } = useRecordSearchState()
	const queryClient = useQueryClient()

	const { DataGrid, windowSize } = useModuleData<'flow', BankAccount>(
		'flow',
		'bankAccounts',
		'all',
	)

	const invalidate = React.useCallback(() => {
		void queryClient.invalidateQueries({
			queryKey: $rpc.flow.bankAccounts.key(),
		})
	}, [queryClient])

	const transitionStatus = useMutation({
		...$rpc.flow.bankAccounts.transitionStatus.mutationOptions({
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
		(row: BankAccount) => openDetail(row._id),
		[openDetail],
	)
	const handleNew = openCreate

	if (selectedId !== null) {
		return (
			<div className='space-y-8 pb-8'>
				<BankAccountCard
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
					height={Math.max(windowSize.height - 150, 400)}
					withSelect
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
								const allInactive = records.every(
									(r) => r.status === 'INACTIVE',
								)
								const allActive = records.every((r) => r.status === 'ACTIVE')

								return (
									<>
										<DataGrid.ActionBar.Item
											disabled={!hasSelection || isBusy || !allInactive}
											onClick={() => {
												void handleBulkTransition(ids, 'ACTIVE')
											}}
										>
											<CheckCircle className='size-3.5' aria-hidden='true' />
											Activate
										</DataGrid.ActionBar.Item>
										<DataGrid.ActionBar.Item
											disabled={!hasSelection || isBusy || !allActive}
											onClick={() => {
												void handleBulkTransition(ids, 'BLOCKED')
											}}
										>
											<Ban className='size-3.5' aria-hidden='true' />
											Block
										</DataGrid.ActionBar.Item>
										<DataGrid.ActionBar.Item
											disabled={!hasSelection || isBusy || !allActive}
											onClick={() => {
												void handleBulkTransition(ids, 'INACTIVE')
											}}
										>
											<XCircle className='size-3.5' aria-hidden='true' />
											Deactivate
										</DataGrid.ActionBar.Item>
										<ReportActionItems
											table={table}
											selectionState={state.selectionState}
											moduleId='flow'
											entityId='bankAccounts'
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
