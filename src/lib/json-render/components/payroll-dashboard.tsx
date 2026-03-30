'use client'

import { Users } from 'lucide-react'
import * as React from 'react'
import { useModuleData } from '@/app/_shell/hooks/use-data'
import {
	MetricStrip,
	RecordListPanel,
	StackedDistributionPanel,
	StatRowsPanel,
} from '@/components/ui/json-render/dashboard-sections'
import { DashboardTrendChart } from '@/components/ui/json-render/dashboard-widgets'
import {
	average,
	buildCategorySeries,
	buildMonthlySeries,
	formatPercent,
} from '@/lib/json-render/dashboard-utils'

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

type PayrollDashboardContextValue = {
	isLoading: boolean
	metricItems: Array<{ label: string; value: string; icon: string }>
	employmentTypeMix: Array<{ name: string; value: number }>
	departmentMix: Array<{ name: string; value: number }>
	monthlyHiringTrend: Array<{ month: string; count: number; amount: number }>
	compensationStatItems: Array<{
		label: string
		value: string
		description: string
	}>
	recentHires: Array<{
		id: string
		title: string
		subtitle: string
		status: string
		leadingBadge: string
		leadingBadgeClassName: string
	}>
	statusBadges: Array<{ label: string; count: string }>
}

const PayrollDashboardContext =
	React.createContext<PayrollDashboardContextValue | null>(null)

const EMPLOYMENT_TYPE_COLORS: Record<string, string> = {
	FULL_TIME: 'bg-emerald-500',
	PART_TIME: 'bg-sky-500',
	CONTRACTOR: 'bg-amber-500',
	TEMPORARY: 'bg-violet-500',
}

const EMPLOYMENT_TYPE_STYLES: Record<
	string,
	{ badge: string; className: string }
> = {
	FULL_TIME: {
		badge: 'FT',
		className: 'bg-emerald-500/10 text-emerald-600',
	},
	PART_TIME: {
		badge: 'PT',
		className: 'bg-sky-500/10 text-sky-600',
	},
	CONTRACTOR: {
		badge: 'CT',
		className: 'bg-amber-500/10 text-amber-600',
	},
	TEMPORARY: {
		badge: 'TM',
		className: 'bg-violet-500/10 text-violet-600',
	},
}

const DEPARTMENT_COLORS: Record<string, string> = {
	Engineering: 'bg-sky-500',
	Sales: 'bg-emerald-500',
	Marketing: 'bg-violet-500',
	Finance: 'bg-amber-500',
	HR: 'bg-rose-500',
	Operations: 'bg-teal-500',
	Support: 'bg-indigo-500',
	Unassigned: 'bg-slate-400',
}

function usePayrollDashboardData() {
	const { items: employees, isLoading: employeesLoading } = useModuleData<
		'payroll',
		Employee
	>('payroll', 'employees', 'overview')

	const isLoading = employeesLoading

	return React.useMemo<PayrollDashboardContextValue>(() => {
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
		const avgSalary = average(
			employees.map((employee) => employee.baseSalary ?? 0),
		)
		const totalPayroll = employees.reduce(
			(sum, employee) => sum + (employee.baseSalary ?? 0),
			0,
		)
		const totalOutstanding = employees.reduce(
			(sum, employee) => sum + (employee.outstandingAmount ?? 0),
			0,
		)
		const maxSalary = Math.max(0, ...employees.map((e) => e.baseSalary ?? 0))
		const minSalary =
			employees.length > 0
				? Math.min(...employees.map((e) => e.baseSalary ?? 0))
				: 0
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
		const departments = Object.keys(departmentCounts).length

		const payFrequencyCounts = employees.reduce<Record<string, number>>(
			(acc, employee) => {
				acc[employee.payFrequency] = (acc[employee.payFrequency] ?? 0) + 1
				return acc
			},
			{},
		)

		const recentSorted = [...employees]
			.sort((a, b) => {
				const dateA = a.hireDate ? new Date(a.hireDate).getTime() : 0
				const dateB = b.hireDate ? new Date(b.hireDate).getTime() : 0
				return dateB - dateA
			})
			.slice(0, 8)

		return {
			isLoading,
			metricItems: [
				{
					label: 'Total Employees',
					value: totalEmployees.toLocaleString(),
					icon: 'package',
				},
				{
					label: 'Active',
					value: activeEmployees.toLocaleString(),
					icon: 'chart',
				},
				{
					label: 'On Leave',
					value: onLeave.toLocaleString(),
					icon: 'map',
				},
				{
					label: 'Avg Salary',
					value: avgSalary.toLocaleString('en-US', {
						style: 'currency',
						currency: 'USD',
						maximumFractionDigits: 0,
					}),
					icon: 'dollar',
				},
				{
					label: 'Total Payroll',
					value: totalPayroll.toLocaleString('en-US', {
						style: 'currency',
						currency: 'USD',
						maximumFractionDigits: 0,
					}),
					icon: 'dollar',
				},
				{
					label: 'Departments',
					value: departments.toLocaleString(),
					icon: 'map',
				},
			],
			employmentTypeMix: buildCategorySeries(
				employees.map((employee) => employee.employmentType),
			),
			departmentMix: buildCategorySeries(
				employees.map(
					(employee) => employee.department?.trim() || 'Unassigned',
				),
				8,
			),
			monthlyHiringTrend: buildMonthlySeries(
				employees,
				(employee) => employee.hireDate,
			),
			compensationStatItems: [
				{
					label: 'Salary Range',
					value: `$${minSalary.toLocaleString('en-US', { maximumFractionDigits: 0 })} - $${maxSalary.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
					description: `Average $${avgSalary.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
				},
				{
					label: 'Outstanding Payroll',
					value: totalOutstanding.toLocaleString('en-US', {
						style: 'currency',
						currency: 'USD',
					}),
					description: 'Pending disbursement',
				},
				{
					label: 'Contractor Share',
					value: formatPercent(contractorCount, totalEmployees),
					description: `${contractorCount} contractors of ${totalEmployees} total`,
				},
				{
					label: 'Pay Frequencies',
					value: Object.keys(payFrequencyCounts).length.toLocaleString(),
					description: Object.entries(payFrequencyCounts)
						.sort((a, b) => b[1] - a[1])
						.map(([freq, count]) => `${freq.replace(/_/g, ' ')}: ${count}`)
						.join(', '),
				},
			],
			recentHires: recentSorted.map((employee) => ({
				id: employee.id,
				title: `${employee.firstName} ${employee.lastName}`,
				subtitle: `${employee.jobTitle ?? employee.department ?? 'No title'} · ${employee.baseSalary?.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }) ?? '$0'}`,
				status: employee.status,
				leadingBadge:
					EMPLOYMENT_TYPE_STYLES[employee.employmentType]?.badge ?? '??',
				leadingBadgeClassName:
					EMPLOYMENT_TYPE_STYLES[employee.employmentType]?.className ??
					'bg-slate-100 text-slate-600',
			})),
			statusBadges: [
				{ label: 'Active', count: activeEmployees.toString() },
				{ label: 'Leave', count: onLeave.toString() },
				{ label: 'Term', count: terminated.toString() },
			],
		}
	}, [isLoading, employees])
}

function usePayrollDashboardContext() {
	const value = React.useContext(PayrollDashboardContext)
	if (!value) {
		throw new Error('Payroll dashboard section must be used within provider')
	}
	return value
}

export function PayrollDashboardData({
	children,
}: {
	children?: React.ReactNode
}) {
	const value = usePayrollDashboardData()
	return (
		<PayrollDashboardContext.Provider value={value}>
			{children}
		</PayrollDashboardContext.Provider>
	)
}

export function PayrollKpiStrip() {
	const { metricItems } = usePayrollDashboardContext()
	return <MetricStrip items={metricItems} />
}

export function PayrollEmploymentTypeDistribution() {
	const { employmentTypeMix } = usePayrollDashboardContext()
	return (
		<StackedDistributionPanel
			title='Employment Type Distribution'
			description='Breakdown by employment classification'
			items={employmentTypeMix}
			colorMap={EMPLOYMENT_TYPE_COLORS}
			emptyMessage='No employee data available.'
		/>
	)
}

export function PayrollDepartmentBreakdown() {
	const { departmentMix } = usePayrollDashboardContext()
	return (
		<StackedDistributionPanel
			title='Department Breakdown'
			description='Headcount distribution across departments'
			items={departmentMix}
			colorMap={DEPARTMENT_COLORS}
			emptyMessage='No department data available.'
		/>
	)
}

export function PayrollCompensationOverview() {
	const { compensationStatItems } = usePayrollDashboardContext()
	return (
		<StatRowsPanel
			title='Compensation Overview'
			items={compensationStatItems}
		/>
	)
}

export function PayrollHiringTrend() {
	const { monthlyHiringTrend } = usePayrollDashboardContext()
	return (
		<DashboardTrendChart
			className='shadow-sm transition-shadow hover:shadow-md'
			title='Hiring Trend'
			description='New hires per month'
			data={monthlyHiringTrend}
			metricKey='count'
			metricLabel='Hires'
		/>
	)
}

export function PayrollRecentHires() {
	const { isLoading, statusBadges, recentHires } = usePayrollDashboardContext()
	return (
		<RecordListPanel
			title='Recent Hires'
			items={recentHires}
			isLoading={isLoading}
			metaBadges={statusBadges}
			emptyMessage='No employees found.'
			emptyIcon={<Users className='mb-3 h-8 w-8 text-muted-foreground/50' />}
		/>
	)
}
