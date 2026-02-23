import { db } from '@server/db'
import { beforeEach, describe, expect, test } from 'vitest'
import { createCaller } from './helpers'

describe.sequential('hub module', () => {
	beforeEach(async () => {
		await db._internals.reset()
	})

	test('registers hub tables on db.schemas', () => {
		expect(Object.keys(db.schemas)).toEqual(
			expect.arrayContaining([
				'operationTasks',
				'moduleNotifications',
				'hubUsers',
				'hubRoles',
				'hubPermissions',
				'hubUserRoles',
				'hubRolePermissions',
				'hubModuleSettings',
				'hubModuleSettingsRevisions',
				'hubAuditLogs',
			]),
		)
	})

	test('exposes callable hub rpc surface', async () => {
		const caller = createCaller()

		const tasks = await caller.hub.operationTasks.list({
			limit: 5,
			offset: 0,
		})
		expect(Array.isArray(tasks.items)).toBe(true)

		const notifications = await caller.hub.notifications.list({
			limit: 5,
			offset: 0,
		})
		expect(Array.isArray(notifications.items)).toBe(true)

		const users = await caller.hub.users.list({
			limit: 5,
			offset: 0,
		})
		expect(Array.isArray(users.items)).toBe(true)
	})

	test('registers scheduler jobs and stores run status with timestamps', async () => {
		const caller = createCaller({ role: 'ADMIN' })
		const registered = await caller.hub.scheduledJobs.registerDefaults({})
		expect(registered.count).toBeGreaterThanOrEqual(4)

		const runResult = await caller.hub.scheduledJobs.runDueJobs({
			asOf: '2026-02-23T10:05:00.000Z',
			jobCodes: ['hub.evaluateSlaBreaches'],
		})
		expect(runResult.scannedJobs).toBe(1)
		expect(runResult.executed + runResult.failed + runResult.skipped).toBe(1)

		const runHistory = await caller.hub.scheduledJobRuns.list({
			jobCode: 'hub.evaluateSlaBreaches',
			limit: 10,
			offset: 0,
		})
		expect(runHistory.items.length).toBeGreaterThan(0)
		const latestRun = runHistory.items[0]
		expect(latestRun?.startedAt).toBeTruthy()
		expect(latestRun?.finishedAt).toBeTruthy()
		expect(['SUCCESS', 'FAILED']).toContain(String(latestRun?.status))
	})

	test('blocks duplicate manual execution for the same scheduler cadence window', async () => {
		const caller = createCaller({ role: 'ADMIN' })
		await caller.hub.scheduledJobs.registerDefaults({})

		const first = await caller.hub.scheduledJobs.runJobNow({
			jobCode: 'hub.evaluateSlaBreaches',
			asOf: '2026-02-23T11:05:00.000Z',
		})
		expect(['SUCCESS', 'FAILED']).toContain(first.status)

		const second = await caller.hub.scheduledJobs.runJobNow({
			jobCode: 'hub.evaluateSlaBreaches',
			asOf: '2026-02-23T11:05:00.000Z',
		})
		expect(second.status).toBe('SKIPPED')
		expect(second.reason).toBe('DUPLICATE_WINDOW')
	})

	test('supports retry attempts for failed scheduler jobs and creates escalations', async () => {
		const caller = createCaller({ role: 'ADMIN' })
		const jobCode = 'hub.unsupported.job'
		await caller.hub.scheduledJobs.create({
			jobCode,
			name: 'Unsupported test job',
			moduleId: 'hub',
			cadenceType: 'HOURLY',
			cadenceInterval: 1,
			runHourUtc: 0,
			runMinuteUtc: 0,
			enabled: true,
			retryLimit: 2,
			configJson: '{}',
		})

		const firstAttempt = await caller.hub.scheduledJobs.runJobNow({
			jobCode,
			asOf: '2026-02-23T12:00:00.000Z',
		})
		expect(firstAttempt.status).toBe('FAILED')

		const skippedWithoutRetry = await caller.hub.scheduledJobs.runJobNow({
			jobCode,
			asOf: '2026-02-23T12:00:00.000Z',
			retryFailed: false,
		})
		expect(skippedWithoutRetry.status).toBe('SKIPPED')
		expect(skippedWithoutRetry.reason).toBe('FAILED_ALREADY')

		const retryAttempt = await caller.hub.scheduledJobs.runJobNow({
			jobCode,
			asOf: '2026-02-23T12:00:00.000Z',
			retryFailed: true,
		})
		expect(retryAttempt.status).toBe('FAILED')
		expect(Number(retryAttempt.attemptNo ?? 0)).toBeGreaterThanOrEqual(2)

		const runDetail = await caller.hub.scheduledJobRuns.getById({
			id: String(retryAttempt.runId),
		})
		expect(runDetail.status).toBe('FAILED')
		expect(Number(runDetail.attemptNo ?? 0)).toBeGreaterThanOrEqual(2)

		const runHistory = await caller.hub.scheduledJobRuns.list({
			jobCode,
			limit: 20,
			offset: 0,
		})
		expect(runHistory.items).toHaveLength(1)

		const escalationTasks = db.schemas.operationTasks.findMany({
			where: (row) =>
				Boolean(
					row.description?.includes(
						`[scheduled-run:${String(retryAttempt.runId)}]`,
					),
				),
		})
		expect(escalationTasks.length).toBeGreaterThan(0)

		const escalationNotifications = db.schemas.moduleNotifications.findMany({
			where: (row) =>
				Boolean(
					row.body?.includes(
						`[scheduled-run:${String(retryAttempt.runId)}]`,
					),
				),
		})
		expect(escalationNotifications.length).toBeGreaterThan(0)
	})

	test('assigns roles, sets permissions, and resolves effective user permissions', async () => {
		const caller = createCaller({ role: 'ADMIN' })
		const userId = 'rbac-user'

		const assigned = await caller.hub.users.assignRoleToUser({
			userId,
			roleCode: 'VIEWER',
			active: true,
		})
		expect(assigned.assignment.active).toBe(true)
		expect(assigned.role.roleCode).toBe('VIEWER')

		const permissions = ['market.cart.checkout', 'ledger.invoice.post']
		const rolePermissionUpdate = await caller.hub.roles.setRolePermissions({
			roleCode: 'VIEWER',
			permissionCodes: permissions,
		})
		expect(rolePermissionUpdate.permissionCodes).toEqual(
			expect.arrayContaining(permissions),
		)

		const effective = await caller.hub.users.getEffectivePermissions({
			userId,
		})
		expect(effective.found).toBe(true)
		expect(effective.roleCodes).toContain('VIEWER')
		expect(effective.permissionCodes).toEqual(expect.arrayContaining(permissions))
	})

	test('upserts and rolls back module settings while preserving revisions', async () => {
		const caller = createCaller({ role: 'ADMIN' })

		await caller.hub.moduleSettings.upsertModuleSetting({
			moduleId: 'market',
			settingKey: 'approval.policy',
			value: { mode: 'strict', threshold: 1000 },
			schemaVersion: 'v1',
			changeReason: 'Initial policy',
		})
		await caller.hub.moduleSettings.upsertModuleSetting({
			moduleId: 'market',
			settingKey: 'approval.policy',
			value: { mode: 'flex', threshold: 1200 },
			schemaVersion: 'v1',
			changeReason: 'Relax threshold',
		})

		const revisionsBeforeRollback = await caller.hub.moduleSettingRevisions.list({
			moduleId: 'market',
			settingKey: 'approval.policy',
			limit: 20,
			offset: 0,
		})
		expect(revisionsBeforeRollback.items.length).toBeGreaterThanOrEqual(2)
		const oldestRevision = revisionsBeforeRollback.items
			.map((revision) => Number(revision.revisionNo))
			.sort((a, b) => a - b)[0]
		expect(Number.isFinite(oldestRevision)).toBe(true)

		await caller.hub.moduleSettings.rollbackModuleSetting({
			moduleId: 'market',
			settingKey: 'approval.policy',
			revisionNo: oldestRevision,
			changeReason: 'Restore baseline',
		})

		const settings = await caller.hub.moduleSettings.list({
			limit: 10,
			offset: 0,
			filters: { moduleId: 'market', settingKey: 'approval.policy' },
		})
		expect(settings.items).toHaveLength(1)
		expect(settings.items[0]?.revisionNo).toBeGreaterThanOrEqual(3)
		expect(settings.items[0]?.valueJson).toContain('strict')

		const revisionsAfterRollback = await caller.hub.moduleSettingRevisions.list({
			moduleId: 'market',
			settingKey: 'approval.policy',
			limit: 20,
			offset: 0,
		})
		expect(revisionsAfterRollback.items.length).toBeGreaterThanOrEqual(3)
		expect(
			revisionsAfterRollback.items.some(
				(revision) => Number(revision.rollbackOfRevisionNo ?? -1) >= 0,
			),
		).toBe(true)
	})

	test('exposes audit logs as read-only with filters and export', async () => {
		const caller = createCaller({ role: 'ADMIN' })
		await caller.hub.users.assignRoleToUser({
			userId: 'audit-user',
			roleCode: 'AGENT',
			active: true,
		})

		const listResult = await caller.hub.auditLogs.list({
			moduleId: 'hub',
			action: 'hub.rbac',
			limit: 50,
			offset: 0,
		})
		expect(listResult.items.length).toBeGreaterThan(0)

		const exportResult = await caller.hub.auditLogs.exportLogs({
			moduleId: 'hub',
			action: 'hub.rbac',
			limit: 50,
		})
		expect(exportResult.count).toBeGreaterThan(0)

		const auditSurface = caller.hub.auditLogs as unknown as Record<
			string,
			unknown
		>
		expect(auditSurface.create).toBeUndefined()
		expect(auditSurface.update).toBeUndefined()
		expect(auditSurface.delete).toBeUndefined()
	})

	test('enforces operation task reason requirements for blocked transitions', async () => {
		const caller = createCaller()
		const task = db.schemas.operationTasks.toArray()[0]
		expect(task?._id).toBeDefined()

		db.schemas.operationTasks.update(task?._id, { status: 'OPEN' })

		await expect(
			caller.hub.operationTasks.transitionStatus({
				id: task?._id,
				toStatus: 'BLOCKED',
			}),
		).rejects.toThrow('A reason is required')
	})

	test('supports valid notification transition', async () => {
		const caller = createCaller()
		const notification = db.schemas.moduleNotifications.toArray()[0]
		expect(notification?._id).toBeDefined()

		db.schemas.moduleNotifications.update(notification?._id, {
			status: 'UNREAD',
		})

		const updated = await caller.hub.notifications.transitionStatus({
			id: notification?._id,
			toStatus: 'READ',
		})
		expect(updated?.status).toBe('READ')
	})

	test('supports bulk notification transition with per-record outcomes', async () => {
		const caller = createCaller()
		const unreadOne = db.schemas.moduleNotifications.insert({
			moduleId: 'hub',
			title: 'Bulk transition test A',
			status: 'UNREAD',
			severity: 'ERROR',
		})
		const unreadTwo = db.schemas.moduleNotifications.insert({
			moduleId: 'hub',
			title: 'Bulk transition test B',
			status: 'UNREAD',
			severity: 'WARNING',
		})
		const alreadyRead = db.schemas.moduleNotifications.insert({
			moduleId: 'hub',
			title: 'Bulk transition test C',
			status: 'READ',
			severity: 'INFO',
		})

		const result = await caller.hub.notifications.bulkTransition({
			ids: [unreadOne._id, unreadTwo._id, alreadyRead._id, 'missing-id'],
			toStatus: 'READ',
		})

		expect(result.transitioned).toBe(2)
		expect(result.skipped).toBe(1)
		expect(result.failed).toBe(1)
		expect(result.transitionedIds).toEqual(
			expect.arrayContaining([unreadOne._id, unreadTwo._id]),
		)
		expect(result.skippedEntries[0]?.id).toBe(alreadyRead._id)
		expect(result.failedEntries[0]?.id).toBe('missing-id')
		expect(db.schemas.moduleNotifications.get(unreadOne._id)?.status).toBe(
			'READ',
		)
		expect(db.schemas.moduleNotifications.get(unreadTwo._id)?.status).toBe(
			'READ',
		)
		expect(db.schemas.moduleNotifications.get(alreadyRead._id)?.status).toBe(
			'READ',
		)
	})

	test('escalates critical notifications into tasks and remains idempotent', async () => {
		const caller = createCaller()
		const errorNotification = db.schemas.moduleNotifications.insert({
			moduleId: 'trace',
			title: 'Critical shipment failure',
			body: 'Carrier webhook failed repeatedly.',
			status: 'UNREAD',
			severity: 'ERROR',
		})
		const warningNotification = db.schemas.moduleNotifications.insert({
			moduleId: 'trace',
			title: 'Shipment delay warning',
			body: 'SLA likely to breach within 4 hours.',
			status: 'UNREAD',
			severity: 'WARNING',
		})
		db.schemas.moduleNotifications.insert({
			moduleId: 'trace',
			title: 'Already read critical',
			status: 'READ',
			severity: 'ERROR',
		})
		db.schemas.moduleNotifications.insert({
			moduleId: 'market',
			title: 'Different module critical',
			status: 'UNREAD',
			severity: 'ERROR',
		})

		const firstRun = await caller.hub.notifications.escalateCritical({
			moduleId: 'trace',
			minSeverity: 'WARNING',
			assignToUserId: 'ops-user',
			dueInHours: 6,
			limit: 20,
		})
		expect(firstRun.scanned).toBe(2)
		expect(firstRun.escalated).toBe(2)
		expect(firstRun.skipped).toBe(0)
		expect(firstRun.failed).toBe(0)

		const escalationTasks = db.schemas.operationTasks.findMany({
			where: (row) =>
				Boolean(
					row.description?.includes(
						`[notification:${errorNotification._id}]`,
					) ||
						row.description?.includes(
							`[notification:${warningNotification._id}]`,
						),
				),
		})
		expect(escalationTasks).toHaveLength(2)

		const errorTask = escalationTasks.find((task) =>
			task.description?.includes(`[notification:${errorNotification._id}]`),
		)
		const warningTask = escalationTasks.find((task) =>
			task.description?.includes(`[notification:${warningNotification._id}]`),
		)
		expect(errorTask?.priority).toBe('CRITICAL')
		expect(warningTask?.priority).toBe('HIGH')
		expect(errorTask?.assigneeUserId).toBe('ops-user')
		expect(warningTask?.assigneeUserId).toBe('ops-user')
		expect(errorTask?.dueDate).toBeTruthy()
		expect(warningTask?.dueDate).toBeTruthy()

		const secondRun = await caller.hub.notifications.escalateCritical({
			moduleId: 'trace',
			minSeverity: 'WARNING',
			assignToUserId: 'ops-user',
			dueInHours: 6,
			limit: 20,
		})
		expect(secondRun.scanned).toBe(2)
		expect(secondRun.escalated).toBe(0)
		expect(secondRun.skipped).toBe(2)
		expect(secondRun.failed).toBe(0)

		const escalationTasksAfterSecondRun = db.schemas.operationTasks.findMany({
			where: (row) =>
				Boolean(
					row.description?.includes(
						`[notification:${errorNotification._id}]`,
					) ||
						row.description?.includes(
							`[notification:${warningNotification._id}]`,
						),
				),
		})
		expect(escalationTasksAfterSecondRun).toHaveLength(2)
	})

	test('evaluates SLA breaches and creates escalation notifications idempotently', async () => {
		const caller = createCaller()
		const overdueTarget = new Date(
			Date.now() - 2 * 60 * 60 * 1000,
		).toISOString()
		const riskTarget = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
		const safeTarget = new Date(Date.now() + 30 * 60 * 60 * 1000).toISOString()

		const breachedTask = db.schemas.operationTasks.insert({
			taskNo: 'TASK9300001',
			moduleId: 'flow',
			title: 'Investigate payout gateway timeout',
			status: 'OPEN',
			priority: 'HIGH',
			dueDate: overdueTarget,
			slaTargetAt: overdueTarget,
		})
		const atRiskTask = db.schemas.operationTasks.insert({
			taskNo: 'TASK9300002',
			moduleId: 'flow',
			title: 'Confirm bank settlement window',
			status: 'IN_PROGRESS',
			priority: 'MEDIUM',
			dueDate: riskTarget,
			slaTargetAt: riskTarget,
		})
		const onTrackTask = db.schemas.operationTasks.insert({
			taskNo: 'TASK9300003',
			moduleId: 'flow',
			title: 'Prepare monthly treasury report',
			status: 'OPEN',
			priority: 'LOW',
			dueDate: safeTarget,
			slaTargetAt: safeTarget,
		})

		const firstRun = await caller.hub.operationTasks.evaluateSlaBreaches({
			moduleId: 'flow',
			lookAheadHours: 4,
			limit: 25,
		})
		expect(firstRun.evaluated).toBe(3)
		expect(firstRun.breached).toBe(1)
		expect(firstRun.atRisk).toBe(1)
		expect(firstRun.onTrack).toBe(1)
		expect(firstRun.notificationsCreated).toBe(1)

		const breachedTaskAfter = db.schemas.operationTasks.get(breachedTask._id)
		const atRiskTaskAfter = db.schemas.operationTasks.get(atRiskTask._id)
		const onTrackTaskAfter = db.schemas.operationTasks.get(onTrackTask._id)
		expect(breachedTaskAfter?.slaStatus).toBe('BREACHED')
		expect(breachedTaskAfter?.escalationLevel).toBe('L1')
		expect(atRiskTaskAfter?.slaStatus).toBe('AT_RISK')
		expect(onTrackTaskAfter?.slaStatus).toBe('ON_TRACK')

		const createdNotifications = db.schemas.moduleNotifications.findMany({
			where: (row) =>
				row.body?.includes(`[sla-task:${breachedTask._id}]`) ?? false,
		})
		expect(createdNotifications).toHaveLength(1)

		const secondRun = await caller.hub.operationTasks.evaluateSlaBreaches({
			moduleId: 'flow',
			lookAheadHours: 4,
			limit: 25,
		})
		expect(secondRun.notificationsCreated).toBe(0)

		const notificationsAfterSecondRun = db.schemas.moduleNotifications.findMany(
			{
				where: (row) =>
					row.body?.includes(`[sla-task:${breachedTask._id}]`) ?? false,
			},
		)
		expect(notificationsAfterSecondRun).toHaveLength(1)
	})

	test('builds SLA scoreboard with module health and breach trends', async () => {
		const caller = createCaller()
		const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

		const breachedTask = db.schemas.operationTasks.insert({
			taskNo: 'TASK9300010',
			moduleId: 'market',
			title: 'Checkout latency incident',
			status: 'OPEN',
			priority: 'CRITICAL',
			dueDate: yesterday,
			slaTargetAt: yesterday,
			slaStatus: 'BREACHED',
			escalationLevel: 'L1',
		})
		db.schemas.moduleNotifications.insert({
			moduleId: 'market',
			title: 'SLA breach: checkout latency incident',
			body: `[sla-task:${breachedTask._id}] checkout flow breached target.`,
			status: 'UNREAD',
			severity: 'ERROR',
		})

		const scoreboard = await caller.hub.operationTasks.slaScoreboard({
			windowDays: 14,
		})
		expect(scoreboard.summary.moduleCount).toBeGreaterThan(0)
		expect(scoreboard.summary.breachedTasks).toBeGreaterThan(0)
		expect(scoreboard.breachTrend.some((point) => point.count > 0)).toBe(true)

		const marketHealth = scoreboard.moduleHealth.find(
			(entry) => entry.moduleId === 'market',
		)
		expect(marketHealth).toBeDefined()
		expect(marketHealth?.breachedTasks).toBeGreaterThan(0)
		expect(marketHealth?.openTasks).toBeGreaterThan(0)
	})

	test('keeps 25-row hub pagination within acceptable latency', async () => {
		const caller = createCaller()
		const maxDurationMs = 2000
		const startedAt = Date.now()
		const result = await caller.hub.notifications.list({
			limit: 25,
			offset: 0,
		})
		const durationMs = Date.now() - startedAt

		expect(Array.isArray(result.items)).toBe(true)
		expect(result.items.length).toBeLessThanOrEqual(25)
		expect(durationMs).toBeLessThan(maxDurationMs)
	})
})
