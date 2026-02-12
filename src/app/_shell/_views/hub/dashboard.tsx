import {
	AlertTriangle,
	Bell,
	CheckCircle2,
	ClipboardList,
	Loader2,
	ShieldAlert,
} from 'lucide-react'
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

interface OperationTask {
	id: string
	taskNo: string
	moduleId: string
	title: string
	description?: string | null
	status: 'OPEN' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE'
	priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
	assigneeUserId?: string | null
	dueDate?: string | null
}

interface ModuleNotification {
	id: string
	moduleId: string
	title: string
	body?: string | null
	status: 'UNREAD' | 'READ' | 'ARCHIVED'
	severity: 'INFO' | 'WARNING' | 'ERROR'
}

export default function Dashboard() {
	const { items: tasks, isLoading: tasksLoading } = useModuleData<
		'hub',
		OperationTask
	>('hub', 'operationTasks', 'all')

	const { items: notifications, isLoading: notificationsLoading } =
		useModuleData<'hub', ModuleNotification>('hub', 'notifications', 'all')

	const totalTasks = tasks.length
	const completedTasks = tasks.filter((task) => task.status === 'DONE').length
	const blockedTasks = tasks.filter((task) => task.status === 'BLOCKED').length
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

	const kpis = React.useMemo<KpiCardDef[]>(
		() => [
			{
				title: 'Total Tasks',
				value: totalTasks,
				icon: ClipboardList,
			},
			{
				title: 'Completion Rate',
				value: formatPercent(completedTasks, totalTasks),
				icon: CheckCircle2,
			},
			{
				title: 'Blocked Tasks',
				value: blockedTasks,
				icon: ShieldAlert,
			},
			{
				title: 'Unread Alerts',
				value: unreadNotifications,
				icon: Bell,
			},
		],
		[blockedTasks, completedTasks, totalTasks, unreadNotifications],
	)

	const monthlyTaskVolume = React.useMemo(
		() => buildMonthlySeries(tasks, (task) => task.dueDate),
		[tasks],
	)

	const taskStatusMix = React.useMemo(
		() => buildCategorySeries(tasks.map((task) => task.status)),
		[tasks],
	)

	const recentTasks = React.useMemo(() => tasks.slice(0, 5), [tasks])

	const recentNotifications = React.useMemo(
		() => notifications.slice(0, 5),
		[notifications],
	)

	const isLoading = tasksLoading || notificationsLoading

	return (
		<div className='space-y-6'>
			<PageHeader
				title='Hub Dashboard'
				description='Central operations command view with task flow and notification health.'
			/>

			<KpiCards cards={kpis} />

			<DashboardSectionGrid>
				<DashboardTrendChart
					className='xl:col-span-2'
					title='Task Due Volume Trend'
					description='Tasks with due dates by month'
					data={monthlyTaskVolume}
					metricKey='count'
					metricLabel='Tasks'
				/>
				<DashboardDistributionChart
					title='Task Status Mix'
					description='Current task distribution by status'
					data={taskStatusMix}
				/>
			</DashboardSectionGrid>

			<DashboardStatsPanel
				title='Operations Statistics'
				description='Signals that highlight execution risk and workload balance'
				items={[
					{
						label: 'Critical Tasks',
						value: criticalTasks.toLocaleString(),
						description: `${formatPercent(criticalTasks, totalTasks)} of task queue`,
					},
					{
						label: 'Average Tasks Per Module',
						value: avgTasksPerModule.toFixed(1),
						description: 'Distribution of workload by module',
					},
					{
						label: 'Error Notifications',
						value: errorNotifications.toLocaleString(),
						description: `${formatPercent(errorNotifications, notifications.length)} of total alerts`,
					},
				]}
			/>

			<div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
				<Card>
					<CardHeader className='border-b'>
						<CardTitle>Recent Tasks</CardTitle>
						<CardDescription>Latest operational tasks</CardDescription>
					</CardHeader>
					<CardContent className='pt-4'>
						{isLoading ? (
							<div className='flex items-center justify-center py-8 text-muted-foreground'>
								<Loader2
									aria-hidden='true'
									className='mr-2 size-4 motion-safe:animate-spin'
								/>
								Loading…
							</div>
						) : recentTasks.length === 0 ? (
							<p className='py-4 text-center text-muted-foreground text-sm'>
								No tasks found.
							</p>
						) : (
							<ul className='divide-y'>
								{recentTasks.map((task) => (
									<li
										key={task.id}
										className='flex items-center justify-between gap-2 py-2'
									>
										<div className='min-w-0 flex-1'>
											<p className='truncate font-medium text-sm'>
												{task.title}
											</p>
											<p className='text-muted-foreground text-xs'>
												{task.taskNo} &middot; {task.moduleId}
											</p>
										</div>
										<div className='flex shrink-0 items-center gap-2'>
											<StatusBadge status={task.priority} />
											<StatusBadge status={task.status} />
										</div>
									</li>
								))}
							</ul>
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader className='border-b'>
						<CardTitle>Recent Notifications</CardTitle>
						<CardDescription>Latest alerts from all modules</CardDescription>
					</CardHeader>
					<CardContent className='pt-4'>
						{isLoading ? (
							<div className='flex items-center justify-center py-8 text-muted-foreground'>
								<Loader2
									aria-hidden='true'
									className='mr-2 size-4 motion-safe:animate-spin'
								/>
								Loading…
							</div>
						) : recentNotifications.length === 0 ? (
							<p className='py-4 text-center text-muted-foreground text-sm'>
								No notifications found.
							</p>
						) : (
							<ul className='divide-y'>
								{recentNotifications.map((notification) => (
									<li
										key={notification.id}
										className='flex items-center justify-between gap-2 py-2'
									>
										<div className='min-w-0 flex-1'>
											<div className='flex items-center gap-2'>
												{notification.severity === 'ERROR' && (
													<AlertTriangle
														aria-hidden='true'
														className='size-3.5 shrink-0 text-destructive'
													/>
												)}
												{notification.severity === 'WARNING' && (
													<AlertTriangle
														aria-hidden='true'
														className='size-3.5 shrink-0 text-yellow-600'
													/>
												)}
												{notification.severity === 'INFO' && (
													<CheckCircle2
														aria-hidden='true'
														className='size-3.5 shrink-0 text-blue-600'
													/>
												)}
												<p className='truncate font-medium text-sm'>
													{notification.title}
												</p>
											</div>
											<p className='text-muted-foreground text-xs'>
												{notification.moduleId}
											</p>
										</div>
										<StatusBadge status={notification.status} />
									</li>
								))}
							</ul>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
