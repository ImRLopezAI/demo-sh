import { Banknote, Clock, DollarSign, Users } from 'lucide-react'
import * as React from 'react'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { useModuleData } from '../../hooks/use-data'
import {
	average,
	buildCategorySeries,
	buildMonthlySeries,
	formatPercent,
} from '../_shared/dashboard-utils'
import {
	DashboardDistributionChart,
	DashboardSectionGrid,
	DashboardStatsPanel,
	DashboardTrendChart,
} from '../_shared/dashboard-widgets'
import { type KpiCardDef, KpiCards } from '../_shared/kpi-cards'
import { PageHeader } from '../_shared/page-header'
import { StatusBadge } from '../_shared/status-badge'

interface Employee {
	id: string
	employeeNo: string
	firstName: string
	lastName: string
	email?: string | null
	department?: string | null
	jobTitle?: string | null
	employmentType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACTOR' | 'TEMPORARY'
	status: 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED'
	hireDate?: string | null
	baseSalary: number
	payFrequency: 'WEEKLY' | 'BIWEEKLY' | 'SEMI_MONTHLY' | 'MONTHLY'
	outstandingAmount: number
}

export default function PayrollDashboard() {
	const { items: employees, isLoading: employeesLoading } = useModuleData<
		'payroll',
		Employee
	>('payroll', 'employees', 'overview')

	const totalEmployees = employees.length
	const activeEmployees = employees.filter(
		(employee) => employee.status === 'ACTIVE',
	).length
	const onLeave = employees.filter(
		(employee) => employee.status === 'ON_LEAVE',
	).length
	const totalOutstanding = employees.reduce(
		(sum, employee) => sum + (employee.outstandingAmount ?? 0),
		0,
	)
	const avgSalary = average(
		employees.map((employee) => employee.baseSalary ?? 0),
	)
	const contractorCount = employees.filter(
		(employee) => employee.employmentType === 'CONTRACTOR',
	).length
	const departmentCounts = employees.reduce<Record<string, number>>(
		(acc, employee) => {
			const department = employee.department?.trim() || 'Unassigned'
			acc[department] = (acc[department] ?? 0) + 1
			return acc
		},
		{},
	)
	const topDepartment = Object.entries(departmentCounts).sort(
		(a, b) => b[1] - a[1],
	)[0]

	const kpis = React.useMemo<KpiCardDef[]>(
		() => [
			{
				title: 'Total Employees',
				value: totalEmployees,
				description: 'All employee records',
				icon: Users,
			},
			{
				title: 'Active Rate',
				value: formatPercent(activeEmployees, totalEmployees),
				description: 'Employees currently active',
				icon: Banknote,
			},
			{
				title: 'On Leave',
				value: onLeave,
				description: 'Currently on leave',
				icon: Clock,
			},
			{
				title: 'Outstanding Payroll',
				value: totalOutstanding.toLocaleString('en-US', {
					style: 'currency',
					currency: 'USD',
				}),
				description: 'Outstanding amount',
				icon: DollarSign,
			},
		],
		[activeEmployees, onLeave, totalEmployees, totalOutstanding],
	)

	const monthlyHiringTrend = React.useMemo(
		() => buildMonthlySeries(employees, (employee) => employee.hireDate),
		[employees],
	)

	const employeeStatusMix = React.useMemo(
		() => buildCategorySeries(employees.map((employee) => employee.status)),
		[employees],
	)

	const recentEmployees = React.useMemo(
		() =>
			[...employees]
				.sort((a, b) => {
					const dateA = a.hireDate ? new Date(a.hireDate).getTime() : 0
					const dateB = b.hireDate ? new Date(b.hireDate).getTime() : 0
					return dateB - dateA
				})
				.slice(0, 10),
		[employees],
	)

	return (
		<div className='space-y-8 pb-8'>
			<PageHeader
				title='Payroll Dashboard'
				description='Workforce composition, compensation exposure, and hiring velocity.'
			/>

			<KpiCards cards={kpis} />

			<DashboardSectionGrid>
				<DashboardTrendChart
					className='shadow-sm transition-shadow duration-300 hover:shadow-md xl:col-span-2'
					title='Hiring Trend'
					description='Employees hired per month'
					data={monthlyHiringTrend}
					metricKey='count'
					metricLabel='Hires'
				/>
				<DashboardDistributionChart
					className='shadow-sm transition-shadow duration-300 hover:shadow-md'
					title='Employee Status Mix'
					description='Distribution by employment status'
					data={employeeStatusMix}
				/>
			</DashboardSectionGrid>

			<DashboardStatsPanel
				className='shadow-sm transition-shadow duration-300 hover:shadow-md'
				title='Workforce Statistics'
				description='Critical staffing and cost structure indicators'
				items={[
					{
						label: 'Average Base Salary',
						value: avgSalary.toLocaleString('en-US', {
							style: 'currency',
							currency: 'USD',
						}),
						description: 'Average salary across employees',
					},
					{
						label: 'Contractor Share',
						value: formatPercent(contractorCount, totalEmployees),
						description: `${contractorCount.toLocaleString()} contractors`,
					},
					{
						label: 'Top Department',
						value: topDepartment?.[0] ?? 'N/A',
						description: topDepartment
							? `${topDepartment[1].toLocaleString()} employees`
							: 'No department data',
					},
				]}
			/>

			<Card className='shadow-sm transition-shadow duration-300 hover:shadow-md'>
				<CardHeader className='border-border/50 border-b bg-muted/20'>
					<CardTitle>Recent Employees</CardTitle>
					<CardDescription>
						Latest employee records by hire date
					</CardDescription>
				</CardHeader>
				<CardContent className='pt-6'>
					{employeesLoading ? (
						<div className='space-y-3' role='status' aria-label='Loading'>
							{Array.from({ length: 5 }).map((_, i) => (
								<div
									key={`skeleton-${i}`}
									className='h-12 rounded-lg bg-muted/50 motion-safe:animate-pulse'
								/>
							))}
						</div>
					) : recentEmployees.length === 0 ? (
						<div className='flex flex-col items-center justify-center py-8 text-center'>
							<Users className='mb-3 h-8 w-8 text-muted-foreground/50' />
							<p className='text-muted-foreground text-sm'>
								No employees found.
							</p>
						</div>
					) : (
						<ul className='space-y-3'>
							{recentEmployees.map((employee) => (
								<li
									key={employee.id}
									className='flex items-center justify-between gap-3 rounded-lg border border-border/40 bg-background/30 p-3 transition-colors hover:bg-muted/50'
								>
									<div className='min-w-0 flex-1'>
										<p className='truncate font-medium text-sm'>
											{employee.firstName} {employee.lastName}
										</p>
										<p className='mt-0.5 text-muted-foreground text-xs'>
											{employee.employeeNo} &middot;{' '}
											{employee.department ?? 'No department'}
										</p>
									</div>
									<div className='flex shrink-0 items-center gap-3'>
										<span className='text-muted-foreground text-xs tabular-nums'>
											{employee.baseSalary?.toLocaleString('en-US', {
												style: 'currency',
												currency: 'USD',
											}) ?? '$0.00'}
										</span>
										<StatusBadge status={employee.status} />
									</div>
								</li>
							))}
						</ul>
					)}
				</CardContent>
			</Card>
		</div>
	)
}
