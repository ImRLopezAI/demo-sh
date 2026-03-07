import { Banknote, Briefcase, Clock, DollarSign, Users } from 'lucide-react'
import * as React from 'react'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useModuleData } from '../../hooks/use-data'
import {
	average,
	buildMonthlySeries,
	formatPercent,
} from '../_shared/dashboard-utils'
import { DashboardTrendChart } from '../_shared/dashboard-widgets'
import { PageHeader } from '../_shared/page-header'

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

const EMPLOYMENT_TYPE_STYLES: Record<string, string> = {
	FULL_TIME: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
	PART_TIME: 'bg-sky-500/10 text-sky-700 dark:text-sky-400',
	CONTRACTOR: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
	TEMPORARY: 'bg-violet-500/10 text-violet-700 dark:text-violet-400',
}

const STATUS_DOT_COLORS: Record<string, string> = {
	ACTIVE: 'bg-emerald-500',
	ON_LEAVE: 'bg-amber-500',
	TERMINATED: 'bg-slate-400',
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
	const terminated = employees.filter(
		(employee) => employee.status === 'TERMINATED',
	).length
	const totalOutstanding = employees.reduce(
		(sum, employee) => sum + (employee.outstandingAmount ?? 0),
		0,
	)
	const avgSalary = average(
		employees.map((employee) => employee.baseSalary ?? 0),
	)
	const maxSalary = Math.max(0, ...employees.map((e) => e.baseSalary ?? 0))
	const minSalary =
		employees.length > 0
			? Math.min(...employees.map((e) => e.baseSalary ?? 0))
			: 0
	const contractorCount = employees.filter(
		(employee) => employee.employmentType === 'CONTRACTOR',
	).length
	const fullTimeCount = employees.filter(
		(employee) => employee.employmentType === 'FULL_TIME',
	).length
	const partTimeCount = employees.filter(
		(employee) => employee.employmentType === 'PART_TIME',
	).length
	const temporaryCount = employees.filter(
		(employee) => employee.employmentType === 'TEMPORARY',
	).length

	const departmentCounts = employees.reduce<Record<string, number>>(
		(acc, employee) => {
			const department = employee.department?.trim() || 'Unassigned'
			acc[department] = (acc[department] ?? 0) + 1
			return acc
		},
		{},
	)
	const sortedDepartments = Object.entries(departmentCounts)
		.sort((a, b) => b[1] - a[1])
		.slice(0, 8)
	const deptMax = Math.max(1, ...sortedDepartments.map(([, c]) => c))

	const payFrequencyCounts = employees.reduce<Record<string, number>>(
		(acc, employee) => {
			acc[employee.payFrequency] = (acc[employee.payFrequency] ?? 0) + 1
			return acc
		},
		{},
	)

	const monthlyHiringTrend = React.useMemo(
		() => buildMonthlySeries(employees, (employee) => employee.hireDate),
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
				.slice(0, 8),
		[employees],
	)

	const DEPT_BAR_COLORS = [
		'bg-sky-500',
		'bg-emerald-500',
		'bg-violet-500',
		'bg-amber-500',
		'bg-rose-500',
		'bg-teal-500',
		'bg-indigo-500',
		'bg-orange-500',
	]

	return (
		<div className='space-y-6 pb-8'>
			<PageHeader
				title='Payroll Dashboard'
				description='Workforce composition, compensation dynamics, and payroll readiness.'
			/>

			{/* ── People Hero ── */}
			<div className='rounded-2xl border border-border/50 bg-gradient-to-br from-violet-500/8 via-background to-rose-500/5 p-8'>
				<div className='flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between'>
					<div>
						<p className='font-medium text-muted-foreground text-xs uppercase tracking-[0.2em]'>
							Workforce
						</p>
						<p className='mt-2 font-bold text-5xl tabular-nums tracking-tight'>
							{totalEmployees.toLocaleString()}
						</p>
						<p className='mt-2 text-muted-foreground text-sm'>
							employees across {Object.keys(departmentCounts).length}{' '}
							departments
						</p>
					</div>

					{/* Status pills */}
					<div className='flex flex-wrap gap-3'>
						{[
							{
								label: 'Active',
								count: activeEmployees,
								dot: 'bg-emerald-500',
							},
							{ label: 'On Leave', count: onLeave, dot: 'bg-amber-500' },
							{ label: 'Terminated', count: terminated, dot: 'bg-slate-400' },
						].map((status) => (
							<div
								key={status.label}
								className='flex items-center gap-2 rounded-full border border-border/40 bg-background/60 px-4 py-2'
							>
								<div className={cn('h-2.5 w-2.5 rounded-full', status.dot)} />
								<span className='font-semibold text-sm tabular-nums'>
									{status.count}
								</span>
								<span className='text-muted-foreground text-xs'>
									{status.label}
								</span>
							</div>
						))}
					</div>
				</div>
			</div>

			{/* ── Employment Type + Pay Frequency Row ── */}
			<div className='grid grid-cols-2 gap-3 md:grid-cols-4'>
				{[
					{ label: 'Full-Time', count: fullTimeCount, type: 'FULL_TIME' },
					{ label: 'Part-Time', count: partTimeCount, type: 'PART_TIME' },
					{ label: 'Contractor', count: contractorCount, type: 'CONTRACTOR' },
					{ label: 'Temporary', count: temporaryCount, type: 'TEMPORARY' },
				].map((item) => (
					<div
						key={item.label}
						className={cn(
							'rounded-xl border border-border/30 p-4',
							EMPLOYMENT_TYPE_STYLES[item.type],
						)}
					>
						<p className='font-bold text-2xl tabular-nums'>{item.count}</p>
						<p className='mt-0.5 text-xs opacity-70'>{item.label}</p>
						<p className='text-[10px] opacity-50'>
							{formatPercent(item.count, totalEmployees)}
						</p>
					</div>
				))}
			</div>

			{/* ── Two-Column: Department Breakdown + Compensation ── */}
			<div className='grid grid-cols-1 gap-5 lg:grid-cols-2'>
				{/* Department Breakdown */}
				<Card className='shadow-sm transition-shadow hover:shadow-md'>
					<CardHeader className='border-border/50 border-b bg-muted/20'>
						<div className='flex items-center gap-2'>
							<Briefcase className='size-4 text-muted-foreground' />
							<CardTitle className='text-base'>Department Breakdown</CardTitle>
						</div>
					</CardHeader>
					<CardContent className='space-y-3 pt-5'>
						{sortedDepartments.length === 0 ? (
							<p className='py-6 text-center text-muted-foreground text-sm'>
								No department data.
							</p>
						) : (
							sortedDepartments.map(([dept, count], i) => (
								<div key={dept} className='space-y-1'>
									<div className='flex items-center justify-between'>
										<span className='truncate text-sm'>{dept}</span>
										<span className='font-medium text-sm tabular-nums'>
											{count}
										</span>
									</div>
									<div className='h-2.5 w-full overflow-hidden rounded-full bg-muted/60'>
										<div
											className={cn(
												'h-full rounded-full transition-all',
												DEPT_BAR_COLORS[i % DEPT_BAR_COLORS.length],
											)}
											style={{
												width: `${(count / deptMax) * 100}%`,
											}}
										/>
									</div>
								</div>
							))
						)}
					</CardContent>
				</Card>

				{/* Compensation Panel */}
				<Card className='shadow-sm transition-shadow hover:shadow-md'>
					<CardHeader className='border-border/50 border-b bg-muted/20'>
						<div className='flex items-center gap-2'>
							<DollarSign className='size-4 text-muted-foreground' />
							<CardTitle className='text-base'>Compensation Overview</CardTitle>
						</div>
					</CardHeader>
					<CardContent className='space-y-5 pt-5'>
						{/* Salary range visualization */}
						<div>
							<p className='mb-2 text-muted-foreground text-xs'>
								Base Salary Range
							</p>
							<div className='relative h-10 w-full rounded-lg bg-muted/40'>
								{/* Min marker */}
								<div className='absolute bottom-full left-0 mb-1 text-[10px] text-muted-foreground tabular-nums'>
									$
									{minSalary.toLocaleString('en-US', {
										maximumFractionDigits: 0,
									})}
								</div>
								{/* Max marker */}
								<div className='absolute right-0 bottom-full mb-1 text-[10px] text-muted-foreground tabular-nums'>
									$
									{maxSalary.toLocaleString('en-US', {
										maximumFractionDigits: 0,
									})}
								</div>
								{/* Average marker */}
								{maxSalary > 0 && (
									<div
										className='absolute top-0 bottom-0 flex flex-col items-center'
										style={{
											left: `${Math.min(100, (avgSalary / maxSalary) * 100)}%`,
										}}
									>
										<div className='h-full w-0.5 bg-violet-500' />
										<div className='mt-1 whitespace-nowrap rounded-md bg-violet-500/10 px-2 py-0.5 text-[10px] text-violet-600 tabular-nums'>
											avg $
											{avgSalary.toLocaleString('en-US', {
												maximumFractionDigits: 0,
											})}
										</div>
									</div>
								)}
								{/* Filled range */}
								<div className='h-full rounded-lg bg-gradient-to-r from-violet-500/20 to-violet-500/5' />
							</div>
						</div>

						{/* Outstanding payroll */}
						<div className='rounded-xl border border-amber-200/50 bg-amber-500/5 p-4 dark:border-amber-800/40'>
							<div className='flex items-center gap-2'>
								<Banknote className='size-4 text-amber-600' />
								<p className='font-medium text-amber-700 text-sm dark:text-amber-400'>
									Outstanding Payroll
								</p>
							</div>
							<p className='mt-2 font-bold text-2xl tabular-nums'>
								{totalOutstanding.toLocaleString('en-US', {
									style: 'currency',
									currency: 'USD',
								})}
							</p>
						</div>

						{/* Pay frequency breakdown */}
						<div>
							<p className='mb-2 text-muted-foreground text-xs'>
								Pay Frequency
							</p>
							<div className='grid grid-cols-2 gap-2'>
								{Object.entries(payFrequencyCounts)
									.sort((a, b) => b[1] - a[1])
									.map(([freq, count]) => (
										<div
											key={freq}
											className='flex items-center justify-between rounded-lg border border-border/30 bg-background/50 px-3 py-2'
										>
											<span className='text-xs'>{freq.replace(/_/g, ' ')}</span>
											<span className='font-semibold text-xs tabular-nums'>
												{count}
											</span>
										</div>
									))}
							</div>
						</div>

						{/* Contractor share */}
						<div className='flex items-center justify-between rounded-lg border border-border/30 bg-background/50 px-4 py-3'>
							<span className='text-muted-foreground text-xs'>
								Contractor Share
							</span>
							<span className='font-semibold text-sm tabular-nums'>
								{formatPercent(contractorCount, totalEmployees)}
							</span>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* ── Hiring Trend ── */}
			<DashboardTrendChart
				className='shadow-sm transition-shadow hover:shadow-md'
				title='Hiring Trend'
				description='New hires per month'
				data={monthlyHiringTrend}
				metricKey='count'
				metricLabel='Hires'
			/>

			{/* ── Recent Employees — Profile Cards ── */}
			<Card className='shadow-sm transition-shadow hover:shadow-md'>
				<CardHeader className='border-border/50 border-b bg-muted/20'>
					<div className='flex items-center gap-2'>
						<Users className='size-4 text-muted-foreground' />
						<div>
							<CardTitle className='text-base'>Recent Hires</CardTitle>
							<CardDescription>Latest employees by hire date</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent className='pt-4'>
					{employeesLoading ? (
						<div
							className='grid grid-cols-1 gap-3 md:grid-cols-2'
							role='status'
							aria-label='Loading'
						>
							{Array.from({ length: 4 }).map((_, i) => (
								<div
									key={`skeleton-${i}`}
									className='h-24 rounded-xl bg-muted/50 motion-safe:animate-pulse'
								/>
							))}
						</div>
					) : recentEmployees.length === 0 ? (
						<div className='flex flex-col items-center justify-center py-10 text-center'>
							<Users className='mb-3 h-10 w-10 text-muted-foreground/30' />
							<p className='text-muted-foreground text-sm'>
								No employees found.
							</p>
						</div>
					) : (
						<div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
							{recentEmployees.map((employee) => (
								<div
									key={employee.id}
									className='rounded-xl border border-border/40 bg-background/40 p-4 transition-colors hover:bg-muted/20'
								>
									<div className='flex items-start gap-3'>
										{/* Avatar placeholder */}
										<div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-500/10 font-bold text-sm text-violet-600'>
											{employee.firstName?.[0]}
											{employee.lastName?.[0]}
										</div>
										<div className='min-w-0 flex-1'>
											<div className='flex items-center justify-between gap-2'>
												<p className='truncate font-semibold text-sm'>
													{employee.firstName} {employee.lastName}
												</p>
												<div
													className={cn(
														'h-2 w-2 shrink-0 rounded-full',
														STATUS_DOT_COLORS[employee.status] ??
															'bg-slate-400',
													)}
												/>
											</div>
											<p className='truncate text-muted-foreground text-xs'>
												{employee.jobTitle ?? employee.department ?? 'No title'}
											</p>
											<div className='mt-2 flex flex-wrap items-center gap-2'>
												<span className='font-medium text-xs tabular-nums'>
													{employee.baseSalary?.toLocaleString('en-US', {
														style: 'currency',
														currency: 'USD',
														maximumFractionDigits: 0,
													}) ?? '$0'}
												</span>
												<span className='text-[10px] text-muted-foreground'>
													{employee.payFrequency?.replace(/_/g, ' ')}
												</span>
												<span
													className={cn(
														'rounded-md px-1.5 py-0.5 font-medium text-[9px]',
														EMPLOYMENT_TYPE_STYLES[employee.employmentType] ??
															'bg-slate-100 text-slate-600',
													)}
												>
													{employee.employmentType?.replace(/_/g, ' ')}
												</span>
											</div>
											{employee.hireDate && (
												<p className='mt-1 text-[10px] text-muted-foreground/60'>
													<Clock className='mr-1 inline size-3' />
													Hired{' '}
													{new Date(employee.hireDate).toLocaleDateString()}
												</p>
											)}
										</div>
									</div>
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	)
}
