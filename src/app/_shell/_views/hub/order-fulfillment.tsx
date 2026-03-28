import { $rpc, useMutation, useQuery, useQueryClient } from '@lib/rpc'
import {
	Activity,
	AlertTriangle,
	Play,
	RefreshCcw,
	Save,
	Shield,
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
import { Textarea } from '@/components/ui/textarea'
import { PageHeader } from '../_shared/page-header'
import type { SpecWorkbenchProps } from '../_shared/spec-workbench-helpers'
import { StatusBadge } from '../_shared/status-badge'

type OrderFulfillmentStep = {
	stage?: string | null
	status?: string | null
	startedAt?: string | null
	completedAt?: string | null
	errorMessage?: string | null
	_createdAt?: number
}

type HubTask = {
	_id: string
	title: string
	description?: string | null
	status: string
	priority: string
	dueDate?: string | null
}

type HubNotification = {
	_id: string
	title: string
	body?: string | null
	status: string
	severity: string
	_updatedAt?: string
}

type HubAuditLog = {
	_id: string
	action: string
	status: string
	message?: string | null
	occurredAt?: string | null
}

type SettingRevision = {
	_id: string
	revisionNo?: number
	changedAt?: string | null
	_updatedAt?: number
}

const MODULE_OPTIONS = [
	'hub',
	'market',
	'insight',
	'replenishment',
	'ledger',
	'flow',
	'payroll',
	'pos',
	'trace',
] as const

const SETTING_KEY = 'sla_policy'

interface OrderFulfillmentViewProps {
	specProps?: SpecWorkbenchProps
}

export default function OrderFulfillmentView({
	specProps,
}: OrderFulfillmentViewProps = {}) {
	const queryClient = useQueryClient()
	const [orderId, setOrderId] = React.useState('')
	const [workflowId, setWorkflowId] = React.useState('')
	const [policyModuleId, setPolicyModuleId] = React.useState('hub')
	const [policyRevisionNo, setPolicyRevisionNo] = React.useState('')
	const [policyJson, setPolicyJson] = React.useState(
		JSON.stringify(
			{
				lookAheadHours: 4,
				dueWindowHours: 24,
				escalationThresholdPct: 20,
			},
			null,
			2,
		),
	)
	const [policyError, setPolicyError] = React.useState<string | null>(null)

	const invalidateHub = React.useCallback(() => {
		void queryClient.invalidateQueries({
			queryKey: $rpc.hub.orderFulfillment.key(),
		})
		void queryClient.invalidateQueries({
			queryKey: $rpc.hub.operationTasks.key(),
		})
		void queryClient.invalidateQueries({
			queryKey: $rpc.hub.notifications.key(),
		})
		void queryClient.invalidateQueries({ queryKey: $rpc.hub.auditLogs.key() })
		void queryClient.invalidateQueries({
			queryKey: $rpc.hub.moduleSettings.key(),
		})
		void queryClient.invalidateQueries({
			queryKey: $rpc.hub.moduleSettingRevisions.key(),
		})
	}, [queryClient])

	const startWorkflow = useMutation({
		...$rpc.hub.orderFulfillment.startOrderFulfillment.mutationOptions({
			onSuccess: (result) => {
				setWorkflowId(result.workflowId)
				invalidateHub()
			},
		}),
	})

	const resumeWorkflow = useMutation({
		...$rpc.hub.orderFulfillment.resumeOrderFulfillment.mutationOptions({
			onSuccess: (result) => {
				setWorkflowId(result.workflowId)
				invalidateHub()
			},
		}),
	})

	const upsertModuleSetting = useMutation({
		...$rpc.hub.moduleSettings.upsertModuleSetting.mutationOptions({
			onSuccess: () => {
				setPolicyError(null)
				invalidateHub()
			},
		}),
	})

	const rollbackModuleSetting = useMutation({
		...$rpc.hub.moduleSettings.rollbackModuleSetting.mutationOptions({
			onSuccess: () => {
				invalidateHub()
			},
		}),
	})

	const statusQuery = useQuery({
		...$rpc.hub.orderFulfillment.getOrderFulfillmentStatus.queryOptions({
			input: { workflowId: workflowId || 'unknown-workflow-id' },
		}),
		enabled: workflowId.trim().length > 0,
		refetchInterval: (query) =>
			query.state.data?.status === 'RUNNING' ? 4000 : false,
	})

	const settingQuery = useQuery({
		...$rpc.hub.moduleSettings.list.queryOptions({
			input: {
				limit: 20,
				offset: 0,
				filters: {
					moduleId: policyModuleId,
					settingKey: SETTING_KEY,
				},
			},
		}),
	})

	const settingRevisionsQuery = useQuery({
		...$rpc.hub.moduleSettingRevisions.list.queryOptions({
			input: {
				moduleId: policyModuleId,
				settingKey: SETTING_KEY,
				limit: 20,
				offset: 0,
			},
		}),
	})

	const activeWorkflowId = workflowId.trim()
	const activeOrderNo = statusQuery.data?.salesOrderNo?.trim() ?? ''
	const incidentSearch = activeWorkflowId || activeOrderNo || undefined

	const taskQuery = useQuery({
		...$rpc.hub.operationTasks.list.queryOptions({
			input: {
				limit: 50,
				offset: 0,
				search: incidentSearch,
			},
		}),
		enabled: Boolean(incidentSearch),
	})
	const notificationQuery = useQuery({
		...$rpc.hub.notifications.list.queryOptions({
			input: {
				limit: 50,
				offset: 0,
				search: incidentSearch,
			},
		}),
		enabled: Boolean(incidentSearch),
	})
	const auditQuery = useQuery({
		...$rpc.hub.auditLogs.list.queryOptions({
			input: {
				moduleId: 'hub',
				action: incidentSearch,
				limit: 50,
				offset: 0,
			},
		}),
		enabled: Boolean(incidentSearch),
	})

	const tasks = (taskQuery.data?.items ?? []) as HubTask[]
	const notifications = (notificationQuery.data?.items ??
		[]) as HubNotification[]
	const auditLogs = (auditQuery.data?.items ?? []) as HubAuditLog[]

	const currentSetting = settingQuery.data?.items?.[0] as
		| {
				_id: string
				revisionNo?: number
				value?: unknown
				valueJson?: string
		  }
		| undefined

	React.useEffect(() => {
		if (!currentSetting) return
		const nextValue =
			currentSetting.value ??
			(() => {
				try {
					return JSON.parse(String(currentSetting.valueJson ?? '{}'))
				} catch {
					return {}
				}
			})()
		setPolicyJson(JSON.stringify(nextValue, null, 2))
	}, [currentSetting])

	const handleStartWorkflow = React.useCallback(async () => {
		const normalizedOrderId = orderId.trim()
		if (!normalizedOrderId) return
		const result = await startWorkflow.mutateAsync({
			orderId: normalizedOrderId,
		})
		setWorkflowId(result.workflowId)
	}, [orderId, startWorkflow])

	const handleResumeWorkflow = React.useCallback(async () => {
		const normalizedWorkflowId = workflowId.trim()
		if (!normalizedWorkflowId) return
		const result = await resumeWorkflow.mutateAsync({
			workflowId: normalizedWorkflowId,
		})
		setWorkflowId(result.workflowId)
	}, [resumeWorkflow, workflowId])

	const handleSavePolicy = React.useCallback(async () => {
		try {
			const parsedValue = JSON.parse(policyJson)
			await upsertModuleSetting.mutateAsync({
				moduleId: policyModuleId,
				settingKey: SETTING_KEY,
				value: parsedValue,
				schemaVersion: 'v2',
				changeReason: 'Updated from order-fulfillment control room',
			})
			setPolicyError(null)
		} catch {
			setPolicyError('Policy JSON is invalid')
		}
	}, [policyJson, policyModuleId, upsertModuleSetting])

	const handleRollback = React.useCallback(async () => {
		const revisionNo = Number.parseInt(policyRevisionNo, 10)
		if (!Number.isFinite(revisionNo)) return
		await rollbackModuleSetting.mutateAsync({
			moduleId: policyModuleId,
			settingKey: SETTING_KEY,
			revisionNo,
			changeReason: 'Rollback from control room',
		})
	}, [policyModuleId, policyRevisionNo, rollbackModuleSetting])

	return (
		<div className='space-y-8 pb-8'>
			<PageHeader
				title={specProps?.title ?? 'Order Fulfillment Control Room'}
				description={
					specProps?.description ??
					'Start, resume, and inspect cross-module fulfillment runs with SLA policy controls.'
				}
			/>

			<div className='grid gap-6 lg:grid-cols-2'>
				<Card className='border-primary/30 bg-gradient-to-br from-primary/10 via-background to-background'>
					<CardHeader>
						<CardTitle className='flex items-center gap-2'>
							<Play className='size-4' />
							Workflow Commands
						</CardTitle>
						<CardDescription>
							Run idempotent order orchestration commands from Hub.
						</CardDescription>
					</CardHeader>
					<CardContent className='space-y-4'>
						<div className='space-y-2'>
							<Label htmlFor='order-id'>Sales Order ID</Label>
							<Input
								id='order-id'
								value={orderId}
								onChange={(event) => setOrderId(event.target.value)}
								placeholder='sales header _id'
							/>
						</div>
						<div className='space-y-2'>
							<Label htmlFor='workflow-id'>Workflow ID</Label>
							<Input
								id='workflow-id'
								value={workflowId}
								onChange={(event) => setWorkflowId(event.target.value)}
								placeholder='workflow _id'
							/>
						</div>
						<div className='flex flex-wrap gap-2'>
							<Button
								onClick={() => {
									void handleStartWorkflow()
								}}
								disabled={
									startWorkflow.isPending || orderId.trim().length === 0
								}
							>
								<Play className='mr-1.5 size-4' />
								{startWorkflow.isPending ? 'Starting...' : 'Start Workflow'}
							</Button>
							<Button
								variant='outline'
								onClick={() => {
									void handleResumeWorkflow()
								}}
								disabled={
									resumeWorkflow.isPending || workflowId.trim().length === 0
								}
							>
								<RefreshCcw className='mr-1.5 size-4' />
								{resumeWorkflow.isPending ? 'Resuming...' : 'Resume Workflow'}
							</Button>
						</div>
						{statusQuery.data ? (
							<div className='rounded-lg border border-border/70 bg-background/80 p-3'>
								<div className='flex items-center gap-2'>
									<StatusBadge status={statusQuery.data.status} />
									<span className='text-muted-foreground text-xs'>
										{statusQuery.data.workflowNo} · retry{' '}
										{statusQuery.data.retryCount ?? 0}
									</span>
								</div>
								<p className='mt-2 text-sm'>
									Current stage:{' '}
									<strong>{statusQuery.data.currentStage}</strong>
								</p>
								{statusQuery.data.failureMessage ? (
									<p className='mt-1 text-destructive text-sm'>
										{statusQuery.data.failureMessage}
									</p>
								) : null}
							</div>
						) : null}
					</CardContent>
				</Card>

				<Card className='border-border/70 bg-gradient-to-br from-amber-500/10 via-background to-background'>
					<CardHeader>
						<CardTitle className='flex items-center gap-2'>
							<Shield className='size-4' />
							SLA Policy Editor
						</CardTitle>
						<CardDescription>
							Tune module-level SLA settings and rollback by revision.
						</CardDescription>
					</CardHeader>
					<CardContent className='space-y-4'>
						<div className='space-y-2'>
							<Label>Module</Label>
							<Select
								value={policyModuleId}
								onValueChange={(value) => setPolicyModuleId(value ?? 'hub')}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{MODULE_OPTIONS.map((moduleId) => (
										<SelectItem key={moduleId} value={moduleId}>
											{moduleId}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className='space-y-2'>
							<Label>Policy JSON</Label>
							<Textarea
								rows={8}
								value={policyJson}
								onChange={(event) => setPolicyJson(event.target.value)}
							/>
							{policyError ? (
								<p className='text-destructive text-xs'>{policyError}</p>
							) : null}
						</div>
						<div className='flex flex-wrap gap-2'>
							<Button
								onClick={() => {
									void handleSavePolicy()
								}}
								disabled={upsertModuleSetting.isPending}
							>
								<Save className='mr-1.5 size-4' />
								{upsertModuleSetting.isPending ? 'Saving...' : 'Save Policy'}
							</Button>
							<Input
								value={policyRevisionNo}
								onChange={(event) => setPolicyRevisionNo(event.target.value)}
								placeholder='Revision no'
								className='w-28'
							/>
							<Button
								variant='outline'
								onClick={() => {
									void handleRollback()
								}}
								disabled={rollbackModuleSetting.isPending}
							>
								Rollback
							</Button>
						</div>
						<div className='rounded-lg border border-border/70 bg-background/80 p-3'>
							<p className='font-medium text-xs'>Recent revisions</p>
							<ul className='mt-2 space-y-1 text-muted-foreground text-xs'>
								{(
									(settingRevisionsQuery.data?.items ?? []) as SettingRevision[]
								)
									.slice(0, 5)
									.map((row) => (
										<li key={row._id}>
											r{row.revisionNo} · {row.changedAt ?? row._updatedAt}
										</li>
									))}
								{(settingRevisionsQuery.data?.items ?? []).length === 0 ? (
									<li>No revisions yet.</li>
								) : null}
							</ul>
						</div>
					</CardContent>
				</Card>
			</div>

			<div className='grid gap-6 lg:grid-cols-2'>
				<Card className='border-border/70'>
					<CardHeader>
						<CardTitle className='flex items-center gap-2'>
							<Activity className='size-4' />
							Stage Timeline
						</CardTitle>
						<CardDescription>
							Live stage progression from persisted workflow records.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<ul className='space-y-2'>
							{((statusQuery.data?.steps ?? []) as OrderFulfillmentStep[]).map(
								(step) => (
									<li
										key={`${step.stage ?? 'stage'}-${step.startedAt ?? step._createdAt ?? ''}`}
										className='rounded-lg border border-border/60 p-3 text-sm'
									>
										<div className='flex items-center justify-between gap-2'>
											<span className='font-medium'>
												{step.stage ?? 'Unknown stage'}
											</span>
											<StatusBadge status={step.status ?? 'PENDING'} />
										</div>
										{step.errorMessage ? (
											<p className='mt-1 text-destructive text-xs'>
												{step.errorMessage}
											</p>
										) : null}
									</li>
								),
							)}
							{!statusQuery.data?.steps?.length ? (
								<li className='text-muted-foreground text-sm'>
									Enter a workflow ID to inspect stage progress.
								</li>
							) : null}
						</ul>
					</CardContent>
				</Card>

				<Card className='border-border/70'>
					<CardHeader>
						<CardTitle className='flex items-center gap-2'>
							<AlertTriangle className='size-4' />
							Incident Correlation
						</CardTitle>
						<CardDescription>
							Cross-links tasks, notifications, and audit logs for active
							workflow markers.
						</CardDescription>
					</CardHeader>
					<CardContent className='space-y-3'>
						{tasks.slice(0, 3).map((task) => (
							<div
								key={task._id}
								className='rounded-lg border border-border/60 p-3'
							>
								<p className='font-medium text-sm'>{task.title}</p>
								<div className='mt-1 flex items-center gap-2'>
									<StatusBadge status={task.status} />
									<StatusBadge status={task.priority} />
								</div>
							</div>
						))}
						{notifications.slice(0, 3).map((notification) => (
							<div
								key={notification._id}
								className='rounded-lg border border-border/60 bg-muted/20 p-3'
							>
								<p className='font-medium text-sm'>{notification.title}</p>
								<p className='text-muted-foreground text-xs'>
									{notification.body ?? 'No detail'}
								</p>
							</div>
						))}
						{auditLogs.slice(0, 3).map((log) => (
							<div
								key={log._id}
								className='rounded-lg border border-border/60 p-3'
							>
								<p className='text-sm'>
									<span className='font-medium'>{log.action}</span> ·{' '}
									{log.status}
								</p>
								{log.message ? (
									<p className='text-muted-foreground text-xs'>{log.message}</p>
								) : null}
							</div>
						))}
						{tasks.length + notifications.length + auditLogs.length === 0 ? (
							<p className='text-muted-foreground text-sm'>
								No correlated incidents yet. Start or select a workflow to load
								context.
							</p>
						) : null}
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
