import { $rpc, useMutation, useQuery, useQueryClient } from '@lib/rpc'
import {
	AlertTriangle,
	Archive,
	BellRing,
	Check,
	RotateCcw,
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
import { useModuleData } from '../../hooks/use-data'
import { PageHeader } from '../_shared/page-header'
import { resolveSelectedIds } from '../_shared/resolve-selected-ids'
import { StatusBadge } from '../_shared/status-badge'

interface ModuleNotification {
	_id: string
	moduleId: string
	title: string
	body?: string | null
	status: 'UNREAD' | 'READ' | 'ARCHIVED'
	severity: 'INFO' | 'WARNING' | 'ERROR'
}

interface BulkTransitionResult {
	requested: number
	toStatus: 'READ' | 'ARCHIVED'
	transitioned: number
	skipped: number
	failed: number
}

interface EscalationResult {
	scanned: number
	escalated: number
	skipped: number
	failed: number
}

interface HubModuleSetting {
	_id: string
	moduleId: string
	settingKey: string
	valueJson: string
	revisionNo: number
	schemaVersion?: string | null
}

interface HubModuleSettingRevision {
	_id: string
	moduleId: string
	settingKey: string
	revisionNo: number
	value?: unknown
}

interface HubAuditLog {
	_id: string
	moduleId: string
	action: string
	status: 'SUCCESS' | 'DENIED' | 'FAILED'
	actorUserId?: string | null
	occurredAt?: string | null
	message?: string | null
}

const MODULE_OPTIONS = [
	'hub',
	'market',
	'insight',
	'replenishment',
	'ledger',
	'pos',
	'trace',
	'flow',
	'payroll',
] as const

const NOTIFICATION_TRANSITIONS: Record<
	ModuleNotification['status'],
	Array<'READ' | 'ARCHIVED'>
> = {
	UNREAD: ['READ', 'ARCHIVED'],
	READ: ['ARCHIVED'],
	ARCHIVED: [],
}

const canTransitionTo = (
	status: ModuleNotification['status'],
	toStatus: 'READ' | 'ARCHIVED',
) => NOTIFICATION_TRANSITIONS[status].includes(toStatus)

export default function NotificationsList() {
	const queryClient = useQueryClient()
	const [bulkResult, setBulkResult] =
		React.useState<BulkTransitionResult | null>(null)
	const [escalationResult, setEscalationResult] =
		React.useState<EscalationResult | null>(null)

	const [moduleFilter, setModuleFilter] = React.useState<string>('all')
	const [assigneeUserId, setAssigneeUserId] = React.useState('')
	const [dueInHours, setDueInHours] = React.useState('24')
	const [minSeverity, setMinSeverity] = React.useState<'ERROR' | 'WARNING'>(
		'ERROR',
	)
	const [settingModuleId, setSettingModuleId] = React.useState<string>('hub')
	const [settingKey, setSettingKey] = React.useState('')
	const [settingValueJson, setSettingValueJson] = React.useState('{}')
	const [settingSchemaVersion, setSettingSchemaVersion] = React.useState('v1')
	const [settingChangeReason, setSettingChangeReason] = React.useState('')
	const [rollbackRevisionNo, setRollbackRevisionNo] = React.useState('')
	const [auditModuleFilter, setAuditModuleFilter] =
		React.useState<string>('all')
	const [auditActionFilter, setAuditActionFilter] = React.useState('')

	const { DataGrid, windowSize } = useModuleData<'hub', ModuleNotification>(
		'hub',
		'notifications',
		'all',
	)

	const invalidateHubViews = React.useCallback(() => {
		void queryClient.invalidateQueries({
			queryKey: $rpc.hub.notifications.key(),
		})
		void queryClient.invalidateQueries({
			queryKey: $rpc.hub.operationTasks.key(),
		})
		void queryClient.invalidateQueries({
			queryKey: $rpc.hub.moduleSettings.key(),
		})
		void queryClient.invalidateQueries({
			queryKey: $rpc.hub.moduleSettingRevisions.key(),
		})
		void queryClient.invalidateQueries({
			queryKey: $rpc.hub.auditLogs.key(),
		})
	}, [queryClient])

	const normalizedSettingKey = settingKey.trim()

	const moduleSettingsQuery = useQuery({
		...$rpc.hub.moduleSettings.list.queryOptions({
			input: {
				limit: 100,
				offset: 0,
				filters: {
					moduleId: settingModuleId,
					...(normalizedSettingKey ? { settingKey: normalizedSettingKey } : {}),
				},
			},
		}),
	})
	const moduleSettingItems = (moduleSettingsQuery.data?.items ??
		[]) as HubModuleSetting[]

	const currentSetting = React.useMemo(() => {
		const items = moduleSettingItems
		if (normalizedSettingKey) {
			return (
				items.find((item) => item.settingKey === normalizedSettingKey) ?? null
			)
		}
		return items[0] ?? null
	}, [moduleSettingItems, normalizedSettingKey])

	const revisionSettingKey =
		currentSetting?.settingKey ?? (normalizedSettingKey || undefined)

	const settingRevisionsQuery = useQuery({
		...$rpc.hub.moduleSettingRevisions.list.queryOptions({
			input: {
				moduleId: settingModuleId,
				settingKey: revisionSettingKey,
				limit: 100,
				offset: 0,
			},
		}),
		enabled: Boolean(revisionSettingKey),
	})
	const settingRevisionItems = (settingRevisionsQuery.data?.items ??
		[]) as HubModuleSettingRevision[]

	const auditLogsQuery = useQuery({
		...$rpc.hub.auditLogs.list.queryOptions({
			input: {
				moduleId: auditModuleFilter === 'all' ? undefined : auditModuleFilter,
				action: auditActionFilter.trim() || undefined,
				limit: 40,
				offset: 0,
			},
		}),
	})
	const auditLogItems = (auditLogsQuery.data?.items ?? []) as HubAuditLog[]

	const transitionNotification = useMutation({
		...$rpc.hub.notifications.transitionStatus.mutationOptions({
			onSuccess: invalidateHubViews,
		}),
	})

	const upsertModuleSetting = useMutation({
		...$rpc.hub.moduleSettings.upsertModuleSetting.mutationOptions({
			onSuccess: invalidateHubViews,
		}),
	})

	const rollbackModuleSetting = useMutation({
		...$rpc.hub.moduleSettings.rollbackModuleSetting.mutationOptions({
			onSuccess: invalidateHubViews,
		}),
	})

	const bulkTransition = useMutation({
		...$rpc.hub.notifications.bulkTransition.mutationOptions({
			onSuccess: (result) => {
				setBulkResult(result as BulkTransitionResult)
				invalidateHubViews()
			},
		}),
	})

	const escalateCritical = useMutation({
		...$rpc.hub.notifications.escalateCritical.mutationOptions({
			onSuccess: (result) => {
				setEscalationResult(result as EscalationResult)
				invalidateHubViews()
			},
		}),
	})

	const handleSingleTransition = React.useCallback(
		async (notificationId: string, toStatus: 'READ' | 'ARCHIVED') => {
			await transitionNotification.mutateAsync({
				id: notificationId,
				toStatus,
			})
		},
		[transitionNotification],
	)

	const handleBulkTransition = React.useCallback(
		async (ids: string[], toStatus: 'READ' | 'ARCHIVED') => {
			if (ids.length === 0) return
			setEscalationResult(null)
			await bulkTransition.mutateAsync({
				ids,
				toStatus,
			})
		},
		[bulkTransition],
	)

	const handleEscalateCritical = React.useCallback(async () => {
		setBulkResult(null)
		const parsedDueInHours = Number.parseInt(dueInHours, 10)
		const normalizedDueInHours =
			Number.isFinite(parsedDueInHours) && parsedDueInHours > 0
				? parsedDueInHours
				: 24

		await escalateCritical.mutateAsync({
			moduleId: moduleFilter === 'all' ? undefined : moduleFilter,
			assignToUserId: assigneeUserId.trim() || undefined,
			dueInHours: normalizedDueInHours,
			minSeverity,
		})
	}, [escalateCritical, moduleFilter, assigneeUserId, dueInHours, minSeverity])

	const handleUpsertModuleSetting = React.useCallback(async () => {
		const moduleId = settingModuleId.trim().toLowerCase()
		const normalizedSettingKey = settingKey.trim()
		if (!moduleId || !normalizedSettingKey) return

		let parsedValue: unknown = settingValueJson
		try {
			parsedValue = JSON.parse(settingValueJson)
		} catch {
			parsedValue = settingValueJson
		}

		await upsertModuleSetting.mutateAsync({
			moduleId,
			settingKey: normalizedSettingKey,
			value: parsedValue,
			schemaVersion: settingSchemaVersion.trim() || undefined,
			changeReason: settingChangeReason.trim() || undefined,
		})
	}, [
		settingModuleId,
		settingKey,
		settingValueJson,
		settingSchemaVersion,
		settingChangeReason,
		upsertModuleSetting,
	])

	const handleRollbackModuleSetting = React.useCallback(async () => {
		const moduleId = settingModuleId.trim().toLowerCase()
		const normalizedSettingKey =
			currentSetting?.settingKey ?? (settingKey.trim() || '')
		const parsedRevisionNo = Number.parseInt(rollbackRevisionNo, 10)
		if (
			!moduleId ||
			!normalizedSettingKey ||
			!Number.isFinite(parsedRevisionNo)
		) {
			return
		}

		await rollbackModuleSetting.mutateAsync({
			moduleId,
			settingKey: normalizedSettingKey,
			revisionNo: parsedRevisionNo,
			changeReason: settingChangeReason.trim() || undefined,
		})
	}, [
		settingModuleId,
		currentSetting?.settingKey,
		settingKey,
		rollbackRevisionNo,
		settingChangeReason,
		rollbackModuleSetting,
	])

	return (
		<div className='space-y-8 pb-8'>
			<PageHeader
				title='Notifications'
				description='Module notifications and alerts across the platform.'
			/>

			<div className='space-y-4 rounded-xl border border-border/50 bg-muted/20 p-4'>
				<div className='flex items-center gap-2'>
					<ShieldAlert className='size-4 text-muted-foreground' />
					<p className='font-medium text-sm'>Critical Alert Escalation</p>
				</div>
				<div className='grid gap-3 md:grid-cols-5'>
					<div className='space-y-1.5'>
						<Label htmlFor='notifications-escalation-module'>
							Module scope
						</Label>
						<Select
							value={moduleFilter}
							onValueChange={(value) => setModuleFilter(value ?? 'all')}
						>
							<SelectTrigger
								id='notifications-escalation-module'
								className='w-full'
							>
								<SelectValue placeholder='All modules' />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value='all'>All modules</SelectItem>
								{MODULE_OPTIONS.map((moduleId) => (
									<SelectItem key={moduleId} value={moduleId}>
										{moduleId.toUpperCase()}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className='space-y-1.5'>
						<Label htmlFor='notifications-escalation-severity'>
							Minimum severity
						</Label>
						<Select
							value={minSeverity}
							onValueChange={(value) =>
								setMinSeverity((value ?? 'ERROR') as 'ERROR' | 'WARNING')
							}
						>
							<SelectTrigger
								id='notifications-escalation-severity'
								className='w-full'
							>
								<SelectValue placeholder='ERROR' />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value='ERROR'>ERROR only</SelectItem>
								<SelectItem value='WARNING'>WARNING and ERROR</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className='space-y-1.5'>
						<Label htmlFor='notifications-escalation-assignee'>
							Assignee user ID
						</Label>
						<Input
							id='notifications-escalation-assignee'
							placeholder='ops-user'
							value={assigneeUserId}
							onChange={(event) => setAssigneeUserId(event.target.value)}
						/>
					</div>

					<div className='space-y-1.5'>
						<Label htmlFor='notifications-escalation-due-hours'>
							Due in (hours)
						</Label>
						<Input
							id='notifications-escalation-due-hours'
							type='number'
							min={1}
							max={336}
							value={dueInHours}
							onChange={(event) => setDueInHours(event.target.value)}
						/>
					</div>

					<div className='flex items-end'>
						<Button
							className='w-full'
							onClick={() => {
								void handleEscalateCritical()
							}}
							disabled={escalateCritical.isPending}
						>
							<BellRing className='mr-1.5 size-3.5' aria-hidden='true' />
							{escalateCritical.isPending ? 'Escalating...' : 'Escalate'}
						</Button>
					</div>
				</div>
			</div>

			<div className='grid grid-cols-1 gap-6 xl:grid-cols-2'>
				<Card className='shadow-sm transition-shadow duration-300 hover:shadow-md'>
					<CardHeader className='border-border/50 border-b bg-muted/20'>
						<CardTitle>Module Settings</CardTitle>
						<CardDescription>
							Update tenant module settings and rollback by revision number.
						</CardDescription>
					</CardHeader>
					<CardContent className='space-y-4 pt-6'>
						<div className='grid gap-3 md:grid-cols-2'>
							<div className='space-y-1.5'>
								<Label htmlFor='hub-setting-module'>Module</Label>
								<Select
									value={settingModuleId}
									onValueChange={(value) => setSettingModuleId(value ?? 'hub')}
								>
									<SelectTrigger id='hub-setting-module'>
										<SelectValue placeholder='Select module' />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value='hub'>HUB</SelectItem>
										{MODULE_OPTIONS.map((moduleId) => (
											<SelectItem key={moduleId} value={moduleId}>
												{moduleId.toUpperCase()}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className='space-y-1.5'>
								<Label htmlFor='hub-setting-key'>Setting Key</Label>
								<Input
									id='hub-setting-key'
									placeholder='approval.policy'
									value={settingKey}
									onChange={(event) => setSettingKey(event.target.value)}
								/>
							</div>
							<div className='space-y-1.5'>
								<Label htmlFor='hub-setting-schema-version'>
									Schema Version
								</Label>
								<Input
									id='hub-setting-schema-version'
									placeholder='v1'
									value={settingSchemaVersion}
									onChange={(event) =>
										setSettingSchemaVersion(event.target.value)
									}
								/>
							</div>
							<div className='space-y-1.5'>
								<Label htmlFor='hub-setting-revision-rollback'>
									Rollback Revision No.
								</Label>
								<Input
									id='hub-setting-revision-rollback'
									type='number'
									min={0}
									value={rollbackRevisionNo}
									onChange={(event) =>
										setRollbackRevisionNo(event.target.value)
									}
								/>
							</div>
						</div>

						<div className='space-y-1.5'>
							<Label htmlFor='hub-setting-value-json'>
								Value (JSON preferred)
							</Label>
							<textarea
								id='hub-setting-value-json'
								className='min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 font-mono text-xs shadow-xs outline-none ring-ring/20 transition-shadow focus-visible:ring-3'
								value={settingValueJson}
								onChange={(event) => setSettingValueJson(event.target.value)}
							/>
						</div>
						<div className='space-y-1.5'>
							<Label htmlFor='hub-setting-change-reason'>Change Reason</Label>
							<Input
								id='hub-setting-change-reason'
								placeholder='Reason for update or rollback'
								value={settingChangeReason}
								onChange={(event) => setSettingChangeReason(event.target.value)}
							/>
						</div>

						<div className='flex flex-wrap items-center gap-2'>
							<Button
								onClick={() => {
									void handleUpsertModuleSetting()
								}}
								disabled={
									upsertModuleSetting.isPending ||
									!settingModuleId.trim() ||
									!settingKey.trim()
								}
							>
								{upsertModuleSetting.isPending ? 'Saving...' : 'Save Setting'}
							</Button>
							<Button
								variant='outline'
								onClick={() => {
									void handleRollbackModuleSetting()
								}}
								disabled={
									rollbackModuleSetting.isPending ||
									!settingModuleId.trim() ||
									!rollbackRevisionNo.trim()
								}
							>
								<RotateCcw className='mr-1.5 size-3.5' aria-hidden='true' />
								{rollbackModuleSetting.isPending
									? 'Rolling back...'
									: 'Rollback'}
							</Button>
						</div>

						{(upsertModuleSetting.error || rollbackModuleSetting.error) && (
							<p className='text-destructive text-sm'>
								Unable to update module setting.
							</p>
						)}

						<div className='space-y-2'>
							<p className='font-medium text-sm'>Current setting snapshot</p>
							{moduleSettingsQuery.isFetching ? (
								<p className='text-muted-foreground text-sm'>
									Loading setting...
								</p>
							) : currentSetting ? (
								<div className='rounded-lg border border-border/40 bg-background/30 p-3'>
									<p className='font-medium text-sm'>
										{currentSetting.moduleId}.{currentSetting.settingKey}
									</p>
									<p className='text-muted-foreground text-xs'>
										Revision {currentSetting.revisionNo}
									</p>
									<pre className='mt-2 overflow-auto rounded bg-background/60 p-2 text-xs'>
										{currentSetting.valueJson}
									</pre>
								</div>
							) : (
								<p className='text-muted-foreground text-sm'>
									No setting found for this filter.
								</p>
							)}
						</div>

						<div className='space-y-2'>
							<p className='font-medium text-sm'>Revision history</p>
							{settingRevisionsQuery.isFetching ? (
								<p className='text-muted-foreground text-sm'>
									Loading revisions...
								</p>
							) : (
								<ul className='max-h-44 space-y-1 overflow-auto rounded-lg border border-border/40 bg-background/30 p-2'>
									{settingRevisionItems.slice(0, 15).map((revision) => (
										<li
											key={revision._id}
											className='flex items-center justify-between gap-2 rounded px-2 py-1 hover:bg-muted/40'
										>
											<span className='text-xs'>
												r{revision.revisionNo} {revision.settingKey}
											</span>
											<Button
												size='sm'
												variant='ghost'
												onClick={() =>
													setRollbackRevisionNo(String(revision.revisionNo))
												}
											>
												Use
											</Button>
										</li>
									))}
									{settingRevisionItems.length === 0 ? (
										<li className='px-2 py-1 text-muted-foreground text-xs'>
											No revisions found.
										</li>
									) : null}
								</ul>
							)}
						</div>
					</CardContent>
				</Card>

				<Card className='shadow-sm transition-shadow duration-300 hover:shadow-md'>
					<CardHeader className='border-border/50 border-b bg-muted/20'>
						<CardTitle>Audit Trail</CardTitle>
						<CardDescription>
							Search privileged actions captured in immutable audit logs.
						</CardDescription>
					</CardHeader>
					<CardContent className='space-y-4 pt-6'>
						<div className='grid gap-3 md:grid-cols-[180px_1fr_auto]'>
							<div className='space-y-1.5'>
								<Label htmlFor='hub-audit-module'>Module</Label>
								<Select
									value={auditModuleFilter}
									onValueChange={(value) =>
										setAuditModuleFilter(value ?? 'all')
									}
								>
									<SelectTrigger id='hub-audit-module'>
										<SelectValue placeholder='All modules' />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value='all'>All modules</SelectItem>
										<SelectItem value='hub'>HUB</SelectItem>
										{MODULE_OPTIONS.map((moduleId) => (
											<SelectItem key={moduleId} value={moduleId}>
												{moduleId.toUpperCase()}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className='space-y-1.5'>
								<Label htmlFor='hub-audit-action'>Action contains</Label>
								<Input
									id='hub-audit-action'
									placeholder='hub.settings'
									value={auditActionFilter}
									onChange={(event) => setAuditActionFilter(event.target.value)}
								/>
							</div>
							<div className='flex items-end'>
								<Button
									variant='outline'
									onClick={() => {
										void auditLogsQuery.refetch()
									}}
								>
									<Search className='mr-1.5 size-3.5' aria-hidden='true' />
									Search
								</Button>
							</div>
						</div>

						{auditLogsQuery.isFetching ? (
							<p className='text-muted-foreground text-sm'>
								Loading audit records...
							</p>
						) : auditLogsQuery.error ? (
							<p className='text-destructive text-sm'>
								Unable to load audit records.
							</p>
						) : (
							<ul className='max-h-96 space-y-2 overflow-auto rounded-lg border border-border/40 bg-background/30 p-3'>
								{auditLogItems.map((record) => (
									<li
										key={record._id}
										className='rounded-md border border-border/30 bg-background/40 p-2'
									>
										<div className='flex flex-wrap items-center gap-2'>
											<span className='rounded-full border border-border/60 px-2 py-0.5 font-medium text-[10px]'>
												{record.status}
											</span>
											<span className='font-mono text-[11px]'>
												{record.moduleId}.{record.action}
											</span>
										</div>
										<p className='mt-1 text-muted-foreground text-xs'>
											Actor: {record.actorUserId ?? 'unknown'} |{' '}
											{record.occurredAt
												? new Date(record.occurredAt).toLocaleString()
												: 'No timestamp'}
										</p>
										{record.message ? (
											<p className='mt-1 text-xs'>{record.message}</p>
										) : null}
									</li>
								))}
								{auditLogItems.length === 0 ? (
									<li className='text-muted-foreground text-sm'>
										No audit records for this filter.
									</li>
								) : null}
							</ul>
						)}
					</CardContent>
				</Card>
			</div>

			{bulkResult && (
				<div className='rounded-xl border border-border/50 bg-background/50 p-4'>
					<p className='font-medium text-sm'>Bulk Notification Result</p>
					<p className='text-muted-foreground text-sm'>
						{bulkResult.transitioned} moved to {bulkResult.toStatus},{' '}
						{bulkResult.skipped} skipped, {bulkResult.failed} failed out of{' '}
						{bulkResult.requested} selected notifications.
					</p>
				</div>
			)}

			{escalationResult && (
				<div className='rounded-xl border border-border/50 bg-background/50 p-4'>
					<p className='font-medium text-sm'>Escalation Result</p>
					<p className='text-muted-foreground text-sm'>
						{escalationResult.escalated} tasks created,{' '}
						{escalationResult.skipped} skipped, {escalationResult.failed} failed
						after scanning {escalationResult.scanned} eligible notifications.
					</p>
				</div>
			)}

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
						<DataGrid.Column<ModuleNotification>
							accessorKey='moduleId'
							title='Module'
						/>
						<DataGrid.Column<ModuleNotification>
							accessorKey='title'
							title='Title'
						/>
						<DataGrid.Column<ModuleNotification>
							accessorKey='body'
							title='Body'
						/>
						<DataGrid.Column<ModuleNotification>
							accessorKey='status'
							title='Status'
							cell={({ row }) => <StatusBadge status={row.original.status} />}
						/>
						<DataGrid.Column<ModuleNotification>
							accessorKey='severity'
							title='Severity'
							cell={({ row }) => <StatusBadge status={row.original.severity} />}
						/>
						<DataGrid.Column<ModuleNotification>
							id='actions'
							title='Actions'
							cell={({ row }) => {
								const notification = row.original
								const canMarkRead = canTransitionTo(notification.status, 'READ')
								const canArchive = canTransitionTo(
									notification.status,
									'ARCHIVED',
								)
								const isBusy =
									transitionNotification.isPending || bulkTransition.isPending

								return (
									<div className='flex items-center gap-1.5'>
										<Button
											size='sm'
											variant='outline'
											disabled={!canMarkRead || isBusy}
											onClick={(event) => {
												event.stopPropagation()
												void handleSingleTransition(notification._id, 'READ')
											}}
										>
											<Check className='size-3.5' aria-hidden='true' />
											Read
										</Button>
										<Button
											size='sm'
											variant='outline'
											disabled={!canArchive || isBusy}
											onClick={(event) => {
												event.stopPropagation()
												void handleSingleTransition(
													notification._id,
													'ARCHIVED',
												)
											}}
										>
											<Archive className='size-3.5' aria-hidden='true' />
											Archive
										</Button>
									</div>
								)
							}}
						/>
					</DataGrid.Columns>
					<DataGrid.ActionBar>
						<DataGrid.ActionBar.Selection>
							{(table, state) => (
								<span data-testid='notifications-selected-count'>
									{resolveSelectedIds(table, state.selectionState).length}{' '}
									selected
								</span>
							)}
						</DataGrid.ActionBar.Selection>
						<DataGrid.ActionBar.Separator />
						<DataGrid.ActionBar.Group>
							{(table, state) => {
								const selectedIds = resolveSelectedIds(
									table,
									state.selectionState,
								)
								const hasSelection = selectedIds.length > 0
								const hasBusyState =
									bulkTransition.isPending || transitionNotification.isPending
								const disabled = !hasSelection || hasBusyState

								return (
									<>
										<DataGrid.ActionBar.Item
											data-testid='notifications-bulk-mark-read'
											disabled={disabled}
											onClick={() => {
												void handleBulkTransition(selectedIds, 'READ')
											}}
										>
											<Check className='size-3.5' aria-hidden='true' />
											Mark read
										</DataGrid.ActionBar.Item>
										<DataGrid.ActionBar.Item
											data-testid='notifications-bulk-archive'
											disabled={disabled}
											onClick={() => {
												void handleBulkTransition(selectedIds, 'ARCHIVED')
											}}
										>
											<Archive className='size-3.5' aria-hidden='true' />
											Archive
										</DataGrid.ActionBar.Item>
									</>
								)
							}}
						</DataGrid.ActionBar.Group>
					</DataGrid.ActionBar>
				</DataGrid>
			</div>

			{(transitionNotification.error ||
				bulkTransition.error ||
				escalateCritical.error) && (
				<div className='rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-destructive text-sm'>
					<div className='flex items-center gap-2'>
						<AlertTriangle className='size-4' />
						<p className='font-medium'>
							Unable to complete notification action.
						</p>
					</div>
				</div>
			)}
		</div>
	)
}
