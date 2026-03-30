import { $rpc, useMutation, useQuery, useQueryClient } from '@lib/rpc'
import {
	AlertTriangle,
	Bell,
	CheckCircle2,
	ClipboardList,
	Clock3,
	Play,
	Power,
	Search,
	ShieldAlert,
} from 'lucide-react'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { useHydrateState } from '@/lib/json-render/use-hydrate-state'
import { useModuleData, useModuleList } from '../../hooks/use-data'
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

interface SlaScoreboard {
	summary: {
		moduleCount: number
		openTasks: number
		breachedTasks: number
		atRiskTasks: number
		blockedTasks: number
		escalationNotifications: number
	}
	moduleHealth: Array<{
		moduleId: string
		totalTasks: number
		openTasks: number
		doneTasks: number
		blockedTasks: number
		breachedTasks: number
		atRiskTasks: number
		onTrackTasks: number
		completionRate: number
		breachRate: number
		healthScore: number
	}>
	breachTrend: Array<{
		day: string
		count: number
	}>
}

interface ScheduledJob {
	_id: string
	jobCode: string
	name: string
	moduleId: string
	cadenceType: 'HOURLY' | 'DAILY'
	cadenceInterval: number
	runHourUtc?: number | null
	runMinuteUtc?: number | null
	enabled: boolean
	nextRunAt?: string | null
	lastRunAt?: string | null
	lastRunStatus?: 'IDLE' | 'SUCCESS' | 'FAILED' | null
	lastRunError?: string | null
}

interface ScheduledJobRun {
	_id: string
	jobCode: string
	status: 'RUNNING' | 'SUCCESS' | 'FAILED' | 'SKIPPED'
	startedAt?: string | null
	finishedAt?: string | null
	errorSummary?: string | null
	attemptNo?: number | null
}

const BASE_ROLE_CODES = ['VIEWER', 'AGENT', 'MANAGER', 'ADMIN'] as const

export default function Dashboard() {
	const queryClient = useQueryClient()
	const autoSlaRunRef = React.useRef(false)

	const { items: tasks, isLoading: tasksLoading } = useModuleData<
		'hub',
		OperationTask
	>('hub', 'operationTasks', 'all')

	const { items: notifications, isLoading: notificationsLoading } =
		useModuleData<'hub', ModuleNotification>('hub', 'notifications', 'all')

	const { data: slaScoreboard, isLoading: slaScoreboardLoading } =
		useQuery<SlaScoreboard>(
			$rpc.hub.operationTasks.slaScoreboard.queryOptions({
				input: { windowDays: 14 },
			}),
		)

	const evaluateSlaBreaches = useMutation({
		...$rpc.hub.operationTasks.evaluateSlaBreaches.mutationOptions({
			onSuccess: () => {
				void queryClient.invalidateQueries({
					queryKey: $rpc.hub.operationTasks.key(),
				})
				void queryClient.invalidateQueries({
					queryKey: $rpc.hub.notifications.key(),
				})
				void queryClient.invalidateQueries({
					queryKey: $rpc.hub.operationTasks.slaScoreboard.key(),
				})
			},
		}),
	})

	React.useEffect(() => {
		if (autoSlaRunRef.current) return
		autoSlaRunRef.current = true
		void evaluateSlaBreaches.mutateAsync({
			lookAheadHours: 4,
			limit: 300,
		})
	}, [evaluateSlaBreaches])

	const [assignmentUserId, setAssignmentUserId] = React.useState('')
	const [assignmentRoleCode, setAssignmentRoleCode] = React.useState('VIEWER')
	const [permissionsLookupUserId, setPermissionsLookupUserId] =
		React.useState('')

	const hubRolesList = useModuleList('hub', 'roles', { limit: 200 })
	const normalizedPermissionsLookupUserId = permissionsLookupUserId.trim()

	const effectivePermissionsQuery = useQuery<{
		userId: string
		found: boolean
		roleCodes: string[]
		permissionCodes: string[]
	}>({
		...$rpc.hub.users.getEffectivePermissions.queryOptions({
			input: {
				userId: normalizedPermissionsLookupUserId || 'unconfigured-user',
			},
		}),
		enabled: normalizedPermissionsLookupUserId.length > 0,
	})

	const assignRoleToUser = useMutation({
		...$rpc.hub.users.assignRoleToUser.mutationOptions({
			onSuccess: (_, variables) => {
				setPermissionsLookupUserId(variables.userId)
				void queryClient.invalidateQueries({
					queryKey: $rpc.hub.users.key(),
				})
				void queryClient.invalidateQueries({
					queryKey: $rpc.hub.userRoles.key(),
				})
				void queryClient.invalidateQueries({
					queryKey: $rpc.hub.users.getEffectivePermissions.key(),
				})
			},
		}),
	})

	const availableRoleCodes = React.useMemo(() => {
		const roleCodes = new Set<string>(BASE_ROLE_CODES)
		for (const role of hubRolesList.data?.items ?? []) {
			if (typeof (role as { roleCode?: unknown }).roleCode !== 'string')
				continue
			const normalized = (role as { roleCode: string }).roleCode
				.trim()
				.toUpperCase()
			if (!normalized) continue
			roleCodes.add(normalized)
		}
		return Array.from(roleCodes).sort()
	}, [hubRolesList.data?.items])

	React.useEffect(() => {
		if (availableRoleCodes.length === 0) return
		if (availableRoleCodes.includes(assignmentRoleCode)) return
		setAssignmentRoleCode(availableRoleCodes[0] ?? 'VIEWER')
	}, [availableRoleCodes, assignmentRoleCode])

	const handleAssignRole = React.useCallback(
		async (active: boolean) => {
			const normalizedUserId = assignmentUserId.trim()
			if (!normalizedUserId) return
			await assignRoleToUser.mutateAsync({
				userId: normalizedUserId,
				roleCode: assignmentRoleCode,
				active,
			})
		},
		[assignRoleToUser, assignmentRoleCode, assignmentUserId],
	)

	const setScheduledJobEnabled = useMutation({
		...$rpc.hub.scheduledJobs.setEnabled.mutationOptions({
			onSuccess: () => {
				void queryClient.invalidateQueries({
					queryKey: $rpc.hub.scheduledJobs.key(),
				})
			},
		}),
	})

	const runDueScheduledJobs = useMutation({
		...$rpc.hub.scheduledJobs.runDueJobs.mutationOptions({
			onSuccess: () => {
				void queryClient.invalidateQueries({
					queryKey: $rpc.hub.scheduledJobs.key(),
				})
				void queryClient.invalidateQueries({
					queryKey: $rpc.hub.scheduledJobRuns.key(),
				})
				void queryClient.invalidateQueries({
					queryKey: $rpc.hub.notifications.key(),
				})
				void queryClient.invalidateQueries({
					queryKey: $rpc.hub.operationTasks.key(),
				})
			},
		}),
	})

	const runScheduledJobNow = useMutation({
		...$rpc.hub.scheduledJobs.runJobNow.mutationOptions({
			onSuccess: () => {
				void queryClient.invalidateQueries({
					queryKey: $rpc.hub.scheduledJobs.key(),
				})
				void queryClient.invalidateQueries({
					queryKey: $rpc.hub.scheduledJobRuns.key(),
				})
				void queryClient.invalidateQueries({
					queryKey: $rpc.hub.notifications.key(),
				})
				void queryClient.invalidateQueries({
					queryKey: $rpc.hub.operationTasks.key(),
				})
			},
		}),
	})

	const scheduledJobsQuery = useQuery(
		$rpc.hub.scheduledJobs.list.queryOptions({
			input: {
				limit: 50,
				offset: 0,
			},
		}),
	)
	const scheduledJobs = (scheduledJobsQuery.data?.items ?? []) as ScheduledJob[]

	const scheduledJobRunsQuery = useQuery(
		$rpc.hub.scheduledJobRuns.list.queryOptions({
			input: {
				limit: 20,
				offset: 0,
			},
		}),
	)
	const scheduledJobRuns = (scheduledJobRunsQuery.data?.items ??
		[]) as ScheduledJobRun[]

	const handleToggleScheduledJob = React.useCallback(
		async (jobCode: string, enabled: boolean) => {
			await setScheduledJobEnabled.mutateAsync({
				jobCode,
				enabled,
			})
		},
		[setScheduledJobEnabled],
	)

	const handleRunScheduledJobNow = React.useCallback(
		async (jobCode: string) => {
			await runScheduledJobNow.mutateAsync({
				jobCode,
			})
		},
		[runScheduledJobNow],
	)

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

	/* ── Hydrate json-render state for spec-driven KPIs ── */
	const openTasks = tasks.filter((t) => t.status === 'OPEN').length
	const inProgressTasks = tasks.filter((t) => t.status === 'IN_PROGRESS').length
	const doneTasks = tasks.filter((t) => t.status === 'DONE').length
	const moduleSet = new Set(tasks.map((t) => t.moduleId).filter(Boolean))

	const notificationsBySeverity = React.useMemo(() => {
		const severity: Record<string, number> = {
			critical: 0,
			warning: 0,
			info: 0,
			resolved: 0,
		}
		for (const n of notifications) {
			if (n.severity === 'ERROR') severity.critical++
			else if (n.severity === 'WARNING') severity.warning++
			else severity.info++
			if (n.status === 'ARCHIVED') severity.resolved++
		}
		return severity
	}, [notifications])

	useHydrateState(
		'/hub/dashboard',
		React.useMemo(
			() => ({
				lastRefresh: new Date().toLocaleTimeString(),
				openTasks,
				tasksDelta: '+0',
				slaOnTime: slaScoreboard
					? slaScoreboard.summary.openTasks -
						slaScoreboard.summary.breachedTasks
					: 0,
				slaTotal: slaScoreboard?.summary.openTasks ?? 0,
				activeModules: moduleSet.size,
				unreadAlerts: unreadNotifications,
				criticalAlerts: errorNotifications,
				'tasksByStatus/open': openTasks,
				'tasksByStatus/inProgress': inProgressTasks,
				'tasksByStatus/blocked': blockedTasks,
				'tasksByStatus/done': doneTasks,
				'alertsBySeverity/critical': notificationsBySeverity.critical,
				'alertsBySeverity/warning': notificationsBySeverity.warning,
				'alertsBySeverity/info': notificationsBySeverity.info,
				'alertsBySeverity/resolved': notificationsBySeverity.resolved,
			}),
			[
				openTasks,
				inProgressTasks,
				blockedTasks,
				doneTasks,
				unreadNotifications,
				errorNotifications,
				moduleSet.size,
				slaScoreboard,
				notificationsBySeverity,
			],
		),
	)

	const isLoading = tasksLoading || notificationsLoading
	const breachTrend = React.useMemo(
		() =>
			(slaScoreboard?.breachTrend ?? []).map((point) => ({
				month: point.day,
				count: point.count,
				amount: 0,
			})),
		[slaScoreboard?.breachTrend],
	)
	const moduleHealthRows = slaScoreboard?.moduleHealth ?? []
	const skeletonRows = ['row-1', 'row-2', 'row-3', 'row-4', 'row-5'] as const

	return (
		<div className='space-y-8 pb-8'>
			<PageHeader
				title='Hub Dashboard'
				description='Central operations command view with task flow and notification health.'
			/>

			<KpiCards cards={kpis} />

			<DashboardSectionGrid>
				<DashboardTrendChart
					className='shadow-sm transition-shadow duration-300 hover:shadow-md xl:col-span-2'
					title='SLA Breach Trend (14 Days)'
					description='Daily count of SLA breach notifications'
					data={breachTrend}
					metricKey='count'
					metricLabel='Breaches'
				/>
				<DashboardStatsPanel
					className='shadow-sm transition-shadow duration-300 hover:shadow-md'
					title='SLA Scoreboard'
					description='Cross-module SLA pressure and escalation signal'
					items={[
						{
							label: 'Breached Tasks',
							value: slaScoreboard?.summary.breachedTasks ?? 0,
							description: `${slaScoreboard?.summary.atRiskTasks ?? 0} tasks at risk`,
						},
						{
							label: 'Blocked Tasks',
							value: slaScoreboard?.summary.blockedTasks ?? 0,
							description: `${slaScoreboard?.summary.openTasks ?? 0} open tasks`,
						},
						{
							label: 'Escalation Alerts',
							value: slaScoreboard?.summary.escalationNotifications ?? 0,
							description: `${slaScoreboard?.summary.moduleCount ?? 0} modules monitored`,
						},
					]}
				/>
			</DashboardSectionGrid>

			<Card className='shadow-sm transition-shadow duration-300 hover:shadow-md'>
				<CardHeader className='border-border/50 border-b bg-muted/20'>
					<CardTitle>Module SLA Health</CardTitle>
					<CardDescription>
						Operations score, breach pressure, and completion posture by module
					</CardDescription>
				</CardHeader>
				<CardContent className='pt-6'>
					{slaScoreboardLoading ? (
						<div className='space-y-3' aria-live='polite'>
							{skeletonRows.map((key) => (
								<div
									key={`sla-skeleton-${key}`}
									className='h-12 rounded-lg bg-muted/50 motion-safe:animate-pulse'
								/>
							))}
						</div>
					) : moduleHealthRows.length === 0 ? (
						<div className='flex flex-col items-center justify-center py-8 text-center'>
							<ShieldAlert className='mb-3 h-8 w-8 text-muted-foreground/50' />
							<p className='text-muted-foreground text-sm'>
								No SLA-tracked modules found.
							</p>
						</div>
					) : (
						<ul className='space-y-3'>
							{moduleHealthRows.map((moduleHealth) => (
								<li
									key={moduleHealth.moduleId}
									className='flex items-center justify-between gap-3 rounded-lg border border-border/40 bg-background/30 p-3 transition-colors hover:bg-muted/50'
								>
									<div className='min-w-0 flex-1'>
										<p className='font-medium text-sm'>
											{moduleHealth.moduleId.toUpperCase()}
										</p>
										<p className='mt-0.5 text-muted-foreground text-xs'>
											{moduleHealth.openTasks} open &middot;{' '}
											{moduleHealth.breachedTasks} breached &middot;{' '}
											{moduleHealth.atRiskTasks} at risk
										</p>
									</div>
									<div className='flex shrink-0 items-center gap-2'>
										<StatusBadge
											status={
												moduleHealth.breachedTasks > 0
													? 'BREACHED'
													: moduleHealth.atRiskTasks > 0
														? 'AT_RISK'
														: 'ON_TRACK'
											}
										/>
										<span className='font-semibold text-sm tabular-nums'>
											{moduleHealth.healthScore}
										</span>
									</div>
								</li>
							))}
						</ul>
					)}
				</CardContent>
			</Card>

			<DashboardSectionGrid>
				<DashboardTrendChart
					className='shadow-sm transition-shadow duration-300 hover:shadow-md xl:col-span-2'
					title='Task Due Volume Trend'
					description='Tasks with due dates by month'
					data={monthlyTaskVolume}
					metricKey='count'
					metricLabel='Tasks'
				/>
				<DashboardDistributionChart
					className='shadow-sm transition-shadow duration-300 hover:shadow-md'
					title='Task Status Mix'
					description='Current task distribution by status'
					data={taskStatusMix}
				/>
			</DashboardSectionGrid>

			<DashboardStatsPanel
				className='shadow-sm transition-shadow duration-300 hover:shadow-md'
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

			<div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
				<Card className='shadow-sm transition-shadow duration-300 hover:shadow-md'>
					<CardHeader className='border-border/50 border-b bg-muted/20'>
						<CardTitle>Recent Tasks</CardTitle>
						<CardDescription>Latest operational tasks</CardDescription>
					</CardHeader>
					<CardContent className='pt-6'>
						{isLoading ? (
							<div className='space-y-3' aria-live='polite'>
								{skeletonRows.map((key) => (
									<div
										key={`task-skeleton-${key}`}
										className='h-12 rounded-lg bg-muted/50 motion-safe:animate-pulse'
									/>
								))}
							</div>
						) : recentTasks.length === 0 ? (
							<div className='flex flex-col items-center justify-center py-8 text-center'>
								<ClipboardList className='mb-3 h-8 w-8 text-muted-foreground/50' />
								<p className='text-muted-foreground text-sm'>No tasks found.</p>
							</div>
						) : (
							<ul className='space-y-3'>
								{recentTasks.map((task, idx) => (
									<li
										key={task._id ?? `task-${idx}`}
										className='flex items-center justify-between gap-3 rounded-lg border border-border/40 bg-background/30 p-3 transition-colors hover:bg-muted/50'
									>
										<div className='min-w-0 flex-1'>
											<p className='truncate font-medium text-sm'>
												{task.title}
											</p>
											<p className='mt-0.5 text-muted-foreground text-xs'>
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

				<Card className='shadow-sm transition-shadow duration-300 hover:shadow-md'>
					<CardHeader className='border-border/50 border-b bg-muted/20'>
						<CardTitle>Recent Notifications</CardTitle>
						<CardDescription>Latest alerts from all modules</CardDescription>
					</CardHeader>
					<CardContent className='pt-6'>
						{isLoading ? (
							<div className='space-y-3' aria-live='polite'>
								{skeletonRows.map((key) => (
									<div
										key={`notification-skeleton-${key}`}
										className='h-12 rounded-lg bg-muted/50 motion-safe:animate-pulse'
									/>
								))}
							</div>
						) : recentNotifications.length === 0 ? (
							<div className='flex flex-col items-center justify-center py-8 text-center'>
								<Bell className='mb-3 h-8 w-8 text-muted-foreground/50' />
								<p className='text-muted-foreground text-sm'>
									No notifications found.
								</p>
							</div>
						) : (
							<ul className='space-y-3'>
								{recentNotifications.map((notification, idx) => (
									<li
										key={notification._id ?? `notif-${idx}`}
										className='flex items-center justify-between gap-3 rounded-lg border border-border/40 bg-background/30 p-3 transition-colors hover:bg-muted/50'
									>
										<div className='min-w-0 flex-1'>
											<div className='flex items-center gap-2'>
												{notification.severity === 'ERROR' && (
													<AlertTriangle
														aria-hidden='true'
														className='size-4 shrink-0 text-destructive'
													/>
												)}
												{notification.severity === 'WARNING' && (
													<AlertTriangle
														aria-hidden='true'
														className='size-4 shrink-0 text-yellow-600'
													/>
												)}
												{notification.severity === 'INFO' && (
													<CheckCircle2
														aria-hidden='true'
														className='size-4 shrink-0 text-blue-600'
													/>
												)}
												<p className='truncate font-medium text-sm'>
													{notification.title}
												</p>
											</div>
											<p className='mt-0.5 ml-6 text-muted-foreground text-xs'>
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

			<div className='grid grid-cols-1 gap-6 xl:grid-cols-2'>
				<Card className='shadow-sm transition-shadow duration-300 hover:shadow-md'>
					<CardHeader className='border-border/50 border-b bg-muted/20'>
						<CardTitle>Role Assignment</CardTitle>
						<CardDescription>
							Assign or deactivate RBAC roles for a user.
						</CardDescription>
					</CardHeader>
					<CardContent className='space-y-4 pt-6'>
						<div className='grid gap-4 md:grid-cols-2'>
							<div className='space-y-1.5'>
								<Label htmlFor='hub-role-assignment-user'>User ID</Label>
								<Input
									id='hub-role-assignment-user'
									value={assignmentUserId}
									onChange={(event) => setAssignmentUserId(event.target.value)}
									placeholder='ops-user'
								/>
							</div>
							<div className='space-y-1.5'>
								<Label htmlFor='hub-role-assignment-role'>Role</Label>
								<Select
									value={assignmentRoleCode}
									onValueChange={(value) =>
										setAssignmentRoleCode(value ?? 'VIEWER')
									}
								>
									<SelectTrigger id='hub-role-assignment-role'>
										<SelectValue placeholder='Select role' />
									</SelectTrigger>
									<SelectContent>
										{availableRoleCodes.map((roleCode) => (
											<SelectItem key={roleCode} value={roleCode}>
												{roleCode}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
						<div className='flex flex-wrap items-center gap-2'>
							<Button
								onClick={() => {
									void handleAssignRole(true)
								}}
								disabled={
									assignRoleToUser.isPending ||
									assignmentUserId.trim().length === 0
								}
							>
								Grant Role
							</Button>
							<Button
								variant='outline'
								onClick={() => {
									void handleAssignRole(false)
								}}
								disabled={
									assignRoleToUser.isPending ||
									assignmentUserId.trim().length === 0
								}
							>
								Deactivate Role
							</Button>
						</div>
						{assignRoleToUser.error ? (
							<p className='text-destructive text-sm'>
								Unable to update assignment.
							</p>
						) : null}
					</CardContent>
				</Card>

				<Card className='shadow-sm transition-shadow duration-300 hover:shadow-md'>
					<CardHeader className='border-border/50 border-b bg-muted/20'>
						<CardTitle>Effective Permissions</CardTitle>
						<CardDescription>
							Review active role codes and permission grants for a user.
						</CardDescription>
					</CardHeader>
					<CardContent className='space-y-4 pt-6'>
						<div className='flex flex-col gap-3 md:flex-row'>
							<div className='flex-1 space-y-1.5'>
								<Label htmlFor='hub-permissions-user'>User ID</Label>
								<Input
									id='hub-permissions-user'
									value={permissionsLookupUserId}
									onChange={(event) =>
										setPermissionsLookupUserId(event.target.value)
									}
									placeholder='ops-user'
								/>
							</div>
							<div className='flex items-end'>
								<Button
									variant='outline'
									onClick={() => {
										if (!permissionsLookupUserId.trim()) return
										void effectivePermissionsQuery.refetch()
									}}
									disabled={permissionsLookupUserId.trim().length === 0}
								>
									<Search className='mr-1.5 size-3.5' />
									Load
								</Button>
							</div>
						</div>

						{effectivePermissionsQuery.isFetching ? (
							<p className='text-muted-foreground text-sm'>
								Loading permissions...
							</p>
						) : effectivePermissionsQuery.data ? (
							<div className='space-y-4'>
								<div className='space-y-2'>
									<p className='font-medium text-sm'>Roles</p>
									{effectivePermissionsQuery.data.roleCodes.length === 0 ? (
										<p className='text-muted-foreground text-sm'>
											No active roles assigned.
										</p>
									) : (
										<div className='flex flex-wrap gap-2'>
											{effectivePermissionsQuery.data.roleCodes.map(
												(roleCode) => (
													<span
														key={roleCode}
														className='rounded-full border border-border/60 px-3 py-1 text-xs'
													>
														{roleCode}
													</span>
												),
											)}
										</div>
									)}
								</div>
								<div className='space-y-2'>
									<p className='font-medium text-sm'>Permissions</p>
									{effectivePermissionsQuery.data.permissionCodes.length ===
									0 ? (
										<p className='text-muted-foreground text-sm'>
											No effective permissions.
										</p>
									) : (
										<ul className='max-h-48 space-y-1 overflow-auto rounded-lg border border-border/40 bg-background/30 p-3'>
											{effectivePermissionsQuery.data.permissionCodes.map(
												(permissionCode) => (
													<li
														key={permissionCode}
														className='font-mono text-xs'
													>
														{permissionCode}
													</li>
												),
											)}
										</ul>
									)}
								</div>
							</div>
						) : (
							<p className='text-muted-foreground text-sm'>
								Provide a user ID to inspect effective permissions.
							</p>
						)}
						{effectivePermissionsQuery.error ? (
							<p className='text-destructive text-sm'>
								Unable to load effective permissions.
							</p>
						) : null}
					</CardContent>
				</Card>
			</div>

			<div className='grid grid-cols-1 gap-6 xl:grid-cols-2'>
				<Card className='shadow-sm transition-shadow duration-300 hover:shadow-md xl:col-span-2'>
					<CardHeader className='border-border/50 border-b bg-muted/20'>
						<div className='flex flex-wrap items-center justify-between gap-3'>
							<div>
								<CardTitle>Scheduled Jobs</CardTitle>
								<CardDescription>
									Enable/disable recurring jobs and trigger due runs.
								</CardDescription>
							</div>
							<Button
								variant='outline'
								onClick={() => {
									void runDueScheduledJobs.mutateAsync({})
								}}
								disabled={runDueScheduledJobs.isPending}
							>
								<Play className='mr-1.5 size-3.5' />
								{runDueScheduledJobs.isPending ? 'Running...' : 'Run Due Jobs'}
							</Button>
						</div>
					</CardHeader>
					<CardContent className='space-y-3 pt-6'>
						{scheduledJobsQuery.isFetching && scheduledJobs.length === 0 ? (
							<p className='text-muted-foreground text-sm'>
								Loading scheduled jobs...
							</p>
						) : scheduledJobs.length === 0 ? (
							<p className='text-muted-foreground text-sm'>
								No scheduled jobs found.
							</p>
						) : (
							<ul className='space-y-2'>
								{scheduledJobs.map((job, idx) => (
									<li
										key={job._id ?? `job-${idx}`}
										className='flex flex-col gap-3 rounded-lg border border-border/40 bg-background/30 p-3 lg:flex-row lg:items-center lg:justify-between'
									>
										<div className='min-w-0 flex-1'>
											<div className='flex flex-wrap items-center gap-2'>
												<p className='font-medium text-sm'>{job.name}</p>
												<span className='rounded-full border border-border/50 px-2 py-0.5 font-mono text-[10px]'>
													{job.jobCode}
												</span>
												<StatusBadge
													status={job.enabled ? 'ACTIVE' : 'INACTIVE'}
												/>
											</div>
											<p className='mt-1 text-muted-foreground text-xs'>
												{job.cadenceType} every {job.cadenceInterval}{' '}
												{job.cadenceType === 'DAILY' ? 'day(s)' : 'hour(s)'} |
												next :{' '}
												{job.nextRunAt
													? new Date(job.nextRunAt).toLocaleString()
													: 'n/a'}
											</p>
											<p className='text-muted-foreground text-xs'>
												Last run:{' '}
												{job.lastRunAt
													? new Date(job.lastRunAt).toLocaleString()
													: 'never'}{' '}
												({job.lastRunStatus ?? 'IDLE'})
											</p>
										</div>
										<div className='flex shrink-0 items-center gap-2'>
											<Button
												size='sm'
												variant='outline'
												onClick={() => {
													void handleToggleScheduledJob(
														job.jobCode,
														!job.enabled,
													)
												}}
												disabled={setScheduledJobEnabled.isPending}
											>
												<Power className='mr-1.5 size-3.5' />
												{job.enabled ? 'Disable' : 'Enable'}
											</Button>
											<Button
												size='sm'
												onClick={() => {
													void handleRunScheduledJobNow(job.jobCode)
												}}
												disabled={runScheduledJobNow.isPending}
											>
												<Clock3 className='mr-1.5 size-3.5' />
												Run now
											</Button>
										</div>
									</li>
								))}
							</ul>
						)}
					</CardContent>
				</Card>

				<Card className='shadow-sm transition-shadow duration-300 hover:shadow-md xl:col-span-2'>
					<CardHeader className='border-border/50 border-b bg-muted/20'>
						<CardTitle>Recent Job Runs</CardTitle>
						<CardDescription>
							Run status, timing, and retry attempts for scheduler windows.
						</CardDescription>
					</CardHeader>
					<CardContent className='pt-6'>
						{scheduledJobRunsQuery.isFetching &&
						scheduledJobRuns.length === 0 ? (
							<p className='text-muted-foreground text-sm'>
								Loading run history...
							</p>
						) : scheduledJobRuns.length === 0 ? (
							<p className='text-muted-foreground text-sm'>
								No scheduled runs found.
							</p>
						) : (
							<ul className='space-y-2'>
								{scheduledJobRuns.map((run, idx) => (
									<li
										key={run._id ?? `run-${idx}`}
										className='rounded-lg border border-border/40 bg-background/30 p-3'
									>
										<div className='flex flex-wrap items-center gap-2'>
											<StatusBadge status={run.status} />
											<span className='font-mono text-xs'>{run.jobCode}</span>
											<span className='text-muted-foreground text-xs'>
												attempt {Number(run.attemptNo ?? 1)}
											</span>
										</div>
										<p className='mt-1 text-muted-foreground text-xs'>
											Started:{' '}
											{run.startedAt
												? new Date(run.startedAt).toLocaleString()
												: 'n/a'}{' '}
											| Finished:{' '}
											{run.finishedAt
												? new Date(run.finishedAt).toLocaleString()
												: 'n/a'}
										</p>
										{run.errorSummary ? (
											<p className='mt-1 text-destructive text-xs'>
												{run.errorSummary}
											</p>
										) : null}
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
