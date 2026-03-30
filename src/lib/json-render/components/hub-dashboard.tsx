'use client'

import { Bell, ClipboardList } from 'lucide-react'
import * as React from 'react'
import { useModuleData } from '@/app/_shell/hooks/use-data'
import {
	MetricStrip,
	RecordListPanel,
	StackedDistributionPanel,
	StatRowsPanel,
} from '@/components/ui/json-render/dashboard-sections'
import {
	DashboardDistributionChart,
	DashboardTrendChart,
} from '@/components/ui/json-render/dashboard-widgets'
import {
	average,
	buildCategorySeries,
	buildMonthlySeries,
	formatPercent,
} from '@/lib/json-render/dashboard-utils'

interface OperationTask {
	_id: string
	taskNo: string
	moduleId: string
	title: string
	description?: string | null
	status: 'OPEN' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE'
	priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
	assigneeUserId?: string | null
	dueDate?: string | null
	slaTargetAt?: string | null
	slaStatus?: 'ON_TRACK' | 'AT_RISK' | 'BREACHED'
	escalationLevel?: 'NONE' | 'L1' | 'L2'
}

interface ModuleNotification {
	_id: string
	moduleId: string
	title: string
	body?: string | null
	status: 'UNREAD' | 'READ' | 'ARCHIVED'
	severity: 'INFO' | 'WARNING' | 'ERROR'
}

type HubDashboardContextValue = {
	isLoading: boolean
	metricItems: Array<{ label: string; value: string; icon: string }>
	taskStatusMix: Array<{ name: string; value: number }>
	monthlyTaskVolume: Array<{ month: string; count: number; amount: number }>
	operationsStatItems: Array<{
		label: string
		value: string
		description: string
	}>
	recentTasks: Array<{
		id: string
		title: string
		subtitle: string
		status: string
	}>
	recentNotifications: Array<{
		id: string
		title: string
		subtitle: string
		status: string
	}>
}

const HubDashboardContext =
	React.createContext<HubDashboardContextValue | null>(null)

const TASK_STATUS_COLORS: Record<string, string> = {
	OPEN: 'bg-sky-500',
	IN_PROGRESS: 'bg-amber-500',
	BLOCKED: 'bg-rose-500',
	DONE: 'bg-emerald-500',
}

function useHubDashboardData() {
	const { items: tasks, isLoading: tasksLoading } = useModuleData<
		'hub',
		OperationTask
	>('hub', 'operationTasks', 'all')

	const { items: notifications, isLoading: notificationsLoading } =
		useModuleData<'hub', ModuleNotification>('hub', 'notifications', 'all')

	const isLoading = tasksLoading || notificationsLoading

	return React.useMemo<HubDashboardContextValue>(() => {
		const totalTasks = tasks.length
		const completedTasks = tasks.filter((task) => task.status === 'DONE').length
		const blockedTasks = tasks.filter(
			(task) => task.status === 'BLOCKED',
		).length
		const unreadNotifications = notifications.filter(
			(notification) => notification.status === 'UNREAD',
		).length
		const criticalTasks = tasks.filter(
			(task) => task.priority === 'CRITICAL',
		).length
		const errorNotifications = notifications.filter(
			(notification) => notification.severity === 'ERROR',
		).length
		const tasksByModule = tasks.reduce<Record<string, number>>((acc, task) => {
			const moduleId = task.moduleId?.trim() || 'unknown'
			acc[moduleId] = (acc[moduleId] ?? 0) + 1
			return acc
		}, {})
		const avgTasksPerModule = average(Object.values(tasksByModule))

		return {
			isLoading,
			metricItems: [
				{
					label: 'Total Tasks',
					value: totalTasks.toLocaleString(),
					icon: 'package',
				},
				{
					label: 'Completion Rate',
					value: formatPercent(completedTasks, totalTasks),
					icon: 'chart',
				},
				{
					label: 'Blocked Tasks',
					value: blockedTasks.toLocaleString(),
					icon: 'package',
				},
				{
					label: 'Unread Alerts',
					value: unreadNotifications.toLocaleString(),
					icon: 'package',
				},
				{
					label: 'Critical Tasks',
					value: criticalTasks.toLocaleString(),
					icon: 'package',
				},
				{
					label: 'Error Alerts',
					value: errorNotifications.toLocaleString(),
					icon: 'package',
				},
			],
			taskStatusMix: buildCategorySeries(tasks.map((task) => task.status)),
			monthlyTaskVolume: buildMonthlySeries(tasks, (task) => task.dueDate),
			operationsStatItems: [
				{
					label: 'Critical Tasks',
					value: criticalTasks.toLocaleString(),
					description: `${formatPercent(criticalTasks, totalTasks)} of task queue`,
				},
				{
					label: 'Avg Tasks Per Module',
					value: avgTasksPerModule.toFixed(1),
					description: 'Distribution of workload by module',
				},
				{
					label: 'Error Notifications',
					value: errorNotifications.toLocaleString(),
					description: `${formatPercent(errorNotifications, notifications.length)} of total alerts`,
				},
				{
					label: 'Blocked Tasks',
					value: blockedTasks.toLocaleString(),
					description: `${formatPercent(blockedTasks, totalTasks)} of all tasks`,
				},
			],
			recentTasks: tasks.slice(0, 8).map((task) => ({
				id: task._id,
				title: task.title,
				subtitle: `${task.taskNo} · ${task.moduleId}`,
				status: task.status,
			})),
			recentNotifications: notifications.slice(0, 8).map((notification) => ({
				id: notification._id,
				title: notification.title,
				subtitle: notification.moduleId,
				status: notification.status,
			})),
		}
	}, [isLoading, tasks, notifications])
}

function useHubDashboardContext() {
	const value = React.useContext(HubDashboardContext)
	if (!value) {
		throw new Error('Hub dashboard section must be used within provider')
	}
	return value
}

export function HubDashboardData({ children }: { children?: React.ReactNode }) {
	const value = useHubDashboardData()
	return (
		<HubDashboardContext.Provider value={value}>
			{children}
		</HubDashboardContext.Provider>
	)
}

export function HubKpiStrip() {
	const { metricItems } = useHubDashboardContext()
	return <MetricStrip items={metricItems} />
}

export function HubTaskStatusDistribution() {
	const { taskStatusMix } = useHubDashboardContext()
	return (
		<StackedDistributionPanel
			title='Task Status Distribution'
			description='Current task breakdown by status'
			items={taskStatusMix}
			colorMap={TASK_STATUS_COLORS}
			emptyMessage='No task data available.'
		/>
	)
}

export function HubTaskStatusChart() {
	const { taskStatusMix } = useHubDashboardContext()
	return (
		<DashboardDistributionChart
			className='shadow-sm transition-shadow hover:shadow-md'
			title='Task Status Mix'
			description='Current task distribution by status'
			data={taskStatusMix}
		/>
	)
}

export function HubTaskVolumeTrend() {
	const { monthlyTaskVolume } = useHubDashboardContext()
	return (
		<DashboardTrendChart
			className='shadow-sm transition-shadow hover:shadow-md'
			title='Task Due Volume Trend'
			description='Tasks with due dates by month'
			data={monthlyTaskVolume}
			metricKey='count'
			metricLabel='Tasks'
		/>
	)
}

export function HubOperationsStats() {
	const { operationsStatItems } = useHubDashboardContext()
	return (
		<StatRowsPanel title='Operations Statistics' items={operationsStatItems} />
	)
}

export function HubRecentTasks() {
	const { isLoading, recentTasks } = useHubDashboardContext()
	return (
		<RecordListPanel
			title='Recent Tasks'
			items={recentTasks}
			isLoading={isLoading}
			emptyMessage='No tasks found.'
			emptyIcon={
				<ClipboardList className='mb-3 h-8 w-8 text-muted-foreground/50' />
			}
		/>
	)
}

export function HubRecentNotifications() {
	const { isLoading, recentNotifications } = useHubDashboardContext()
	return (
		<RecordListPanel
			title='Recent Notifications'
			items={recentNotifications}
			isLoading={isLoading}
			emptyMessage='No notifications found.'
			emptyIcon={<Bell className='mb-3 h-8 w-8 text-muted-foreground/50' />}
		/>
	)
}
