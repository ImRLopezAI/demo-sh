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
import { EmployeeCard } from './employee-card'

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

interface EmployeesListProps {
	specProps?: SpecListProps
}

export default function EmployeesList({ specProps }: EmployeesListProps = {}) {
	const { close, openCreate, openDetail, selectedId } = useRecordSearchState()
	const queryClient = useQueryClient()

	const specFilters = useSpecFilters(specProps)
	const specCardProps = extractSpecCardProps(specProps)

	const { DataGrid, windowSize } = useModuleData<'payroll', Employee>(
		'payroll',
		'employees',
		'overview',
		{ filters: specFilters },
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
					specCardProps={specCardProps}
					presentation='page'
				/>
			</div>
		)
	}

	return (
		<div className='space-y-8 pb-8'>
			<PageHeader
				title={specProps?.title ?? 'Employees'}
				description={
					specProps?.description ??
					'Manage employee records, contracts, and compensation.'
				}
				actions={
					specProps?.enableNew !== false ? (
						<Button
							size='sm'
							onClick={handleNew}
							className='shadow-sm transition-all hover:shadow-md'
						>
							<Plus className='mr-1.5 size-3.5' aria-hidden='true' />
							{specProps?.newLabel ?? 'New Employee'}
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
							renderSpecColumns<Employee>(
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
									cell={({ row }) => (
										<StatusBadge status={row.original.status} />
									)}
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
										moduleId='payroll'
										entityId='employees'
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
