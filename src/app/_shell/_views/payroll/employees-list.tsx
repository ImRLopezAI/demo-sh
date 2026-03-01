import { $rpc, useMutation, useQueryClient } from '@lib/rpc'
import { Calendar, Plus, UserCheck, UserX } from 'lucide-react'
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
import { EmployeeCard } from './components/employee-card'

interface Employee {
	_id: string
	employeeNo: string
	firstName: string
	lastName: string
	email?: string | null
	phone?: string | null
	department?: string | null
	jobTitle?: string | null
	employmentType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACTOR' | 'TEMPORARY'
	status: 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED'
	hireDate?: string | null
	baseSalary: number
	payFrequency: 'WEEKLY' | 'BIWEEKLY' | 'SEMI_MONTHLY' | 'MONTHLY'
}

export default function EmployeesList() {
	const { close, openCreate, openDetail, selectedId } = useRecordSearchState()
	const queryClient = useQueryClient()

	const { DataGrid, windowSize } = useModuleData<'payroll', Employee>(
		'payroll',
		'employees',
		'overview',
	)

	const invalidate = React.useCallback(() => {
		void queryClient.invalidateQueries({
			queryKey: $rpc.payroll.employees.key(),
		})
	}, [queryClient])

	const transitionStatus = useMutation({
		...$rpc.payroll.employees.transitionStatus.mutationOptions({
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
		(row: Employee) => openDetail(row._id),
		[openDetail],
	)
	const handleNew = openCreate

	if (selectedId !== null) {
		return (
			<div className='space-y-8 pb-8'>
				<EmployeeCard
					recordId={selectedId}
					open
					onOpenChange={(open) => {
						if (!open) close()
					}}
					presentation='page'
				/>
			</div>
		)
	}

	return (
		<div className='space-y-8 pb-8'>
			<PageHeader
				title='Employees'
				description='Manage employee records, contracts, and compensation.'
				actions={
					<Button
						size='sm'
						onClick={handleNew}
						className='shadow-sm transition-all hover:shadow-md'
					>
						<Plus className='mr-1.5 size-3.5' aria-hidden='true' />
						New Employee
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
							accessorKey='employeeNo'
							title='Employee No.'
							handleEdit={handleEdit}
						/>
						<DataGrid.Column accessorKey='firstName' title='First Name' />
						<DataGrid.Column accessorKey='lastName' title='Last Name' />
						<DataGrid.Column accessorKey='email' title='Email' />
						<DataGrid.Column accessorKey='phone' title='Phone' />
						<DataGrid.Column accessorKey='department' title='Department' />
						<DataGrid.Column accessorKey='jobTitle' title='Job Title' />
						<DataGrid.Column
							accessorKey='employmentType'
							title='Employment Type'
							cellVariant='select'
							opts={{
								options: [
									{ label: 'Full Time', value: 'FULL_TIME' },
									{ label: 'Part Time', value: 'PART_TIME' },
									{ label: 'Contractor', value: 'CONTRACTOR' },
									{ label: 'Temporary', value: 'TEMPORARY' },
								],
							}}
						/>
						<DataGrid.Column
							accessorKey='status'
							title='Status'
							cell={({ row }) => <StatusBadge status={row.original.status} />}
						/>
						<DataGrid.Column
							accessorKey='hireDate'
							title='Hire Date'
							cellVariant='date'
							formatter={(v, f) => f.date(v.hireDate, { format: 'P' })}
						/>
						<DataGrid.Column
							accessorKey='baseSalary'
							title='Base Salary'
							cellVariant='number'
							formatter={(v, f) => f.currency(v.baseSalary)}
						/>
						<DataGrid.Column
							accessorKey='payFrequency'
							title='Pay Frequency'
							cellVariant='select'
							opts={{
								options: [
									{ label: 'Weekly', value: 'WEEKLY' },
									{ label: 'Biweekly', value: 'BIWEEKLY' },
									{ label: 'Semi-Monthly', value: 'SEMI_MONTHLY' },
									{ label: 'Monthly', value: 'MONTHLY' },
								],
							}}
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
								const allActive = records.every((r) => r.status === 'ACTIVE')
								const allOnLeave = records.every((r) => r.status === 'ON_LEAVE')
								const allNotTerminated = records.every(
									(r) => r.status !== 'TERMINATED',
								)

								return (
									<>
										<DataGrid.ActionBar.Item
											disabled={!hasSelection || isBusy || !allActive}
											onClick={() => {
												void handleBulkTransition(ids, 'ON_LEAVE')
											}}
										>
											<Calendar className='size-3.5' aria-hidden='true' />
											Set On Leave
										</DataGrid.ActionBar.Item>
										<DataGrid.ActionBar.Item
											disabled={!hasSelection || isBusy || !allOnLeave}
											onClick={() => {
												void handleBulkTransition(ids, 'ACTIVE')
											}}
										>
											<UserCheck className='size-3.5' aria-hidden='true' />
											Reactivate
										</DataGrid.ActionBar.Item>
										<DataGrid.ActionBar.Item
											disabled={!hasSelection || isBusy || !allNotTerminated}
											onClick={() => {
												void handleBulkTransition(ids, 'TERMINATED')
											}}
										>
											<UserX className='size-3.5' aria-hidden='true' />
											Terminate
										</DataGrid.ActionBar.Item>
										<ReportActionItems
											table={table}
											selectionState={state.selectionState}
											moduleId='payroll'
											entityId='employees'
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
