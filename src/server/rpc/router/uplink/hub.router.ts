import {
	NOTIFICATION_TRANSITIONS,
	OPERATION_TASK_REASON_REQUIRED,
	OPERATION_TASK_TRANSITIONS,
} from '@server/db/constants'
import { createRPCRouter, publicProcedure } from '@server/rpc/init'
import z from 'zod'
import {
	appendAuditLog,
	assertPermission,
	assertRole,
	listEffectivePermissionCodes,
} from '../authz'
import { createTenantScopedCrudRouter } from '../helpers'
import { reportingRouter } from './reporting.router'

const operationTasksCrudRouter = createTenantScopedCrudRouter({
	moduleName: 'hub',
	prefix: 'operation-tasks',
	primaryTable: 'operationTasks',
	viewTables: {
		overview: 'operationTasks',
		operations: 'operationTasks',
		notifications: 'moduleNotifications',
	},
	statusField: 'status',
	transitions: OPERATION_TASK_TRANSITIONS,
	reasonRequiredStatuses: OPERATION_TASK_REASON_REQUIRED,
	statusRoleRequirements: {
		BLOCKED: 'MANAGER',
		DONE: 'MANAGER',
	},
})

const notificationsCrudRouter = createTenantScopedCrudRouter({
	moduleName: 'hub',
	prefix: 'notifications',
	primaryTable: 'moduleNotifications',
	viewTables: { overview: 'moduleNotifications' },
	statusField: 'status',
	transitions: NOTIFICATION_TRANSITIONS,
	statusRoleRequirements: {
		ARCHIVED: 'MANAGER',
	},
})

const hubUsersCrudRouter = createTenantScopedCrudRouter({
	moduleName: 'hub',
	prefix: 'users',
	primaryTable: 'hubUsers',
	viewTables: { overview: 'hubUsers' },
})

const hubRolesCrudRouter = createTenantScopedCrudRouter({
	moduleName: 'hub',
	prefix: 'roles',
	primaryTable: 'hubRoles',
	viewTables: { overview: 'hubRoles' },
})

const hubPermissionsCrudRouter = createTenantScopedCrudRouter({
	moduleName: 'hub',
	prefix: 'permissions',
	primaryTable: 'hubPermissions',
	viewTables: { overview: 'hubPermissions' },
})

const hubUserRolesCrudRouter = createTenantScopedCrudRouter({
	moduleName: 'hub',
	prefix: 'user-roles',
	primaryTable: 'hubUserRoles',
	viewTables: { overview: 'hubUserRoles' },
})

const hubRolePermissionsCrudRouter = createTenantScopedCrudRouter({
	moduleName: 'hub',
	prefix: 'role-permissions',
	primaryTable: 'hubRolePermissions',
	viewTables: { overview: 'hubRolePermissions' },
})

const hubModuleSettingsCrudRouter = createTenantScopedCrudRouter({
	moduleName: 'hub',
	prefix: 'module-settings',
	primaryTable: 'hubModuleSettings',
	viewTables: { overview: 'hubModuleSettings' },
})

const scheduledJobsCrudRouter = createTenantScopedCrudRouter({
	moduleName: 'hub',
	prefix: 'scheduled-jobs',
	primaryTable: 'scheduledJobs',
	viewTables: { overview: 'scheduledJobs' },
})

const notificationStatusTransitions: Record<
	'UNREAD' | 'READ' | 'ARCHIVED',
	Array<'READ' | 'ARCHIVED'>
> = {
	UNREAD: ['READ', 'ARCHIVED'],
	READ: ['ARCHIVED'],
	ARCHIVED: [],
}

const notificationSeverityRank: Record<'INFO' | 'WARNING' | 'ERROR', number> = {
	INFO: 1,
	WARNING: 2,
	ERROR: 3,
}

const bulkTransitionInputSchema = z.object({
	ids: z.array(z.string()).min(1).max(200),
	toStatus: z.enum(['READ', 'ARCHIVED']),
})

const evaluateSlaBreachesInputSchema = z.object({
	moduleId: z.string().optional(),
	lookAheadHours: z.number().int().min(1).max(72).default(4),
	asOf: z.string().optional(),
	limit: z.number().int().min(1).max(500).default(200),
})

const slaScoreboardInputSchema = z.object({
	windowDays: z.number().int().min(7).max(90).default(14),
})

const escalateCriticalInputSchema = z.object({
	moduleId: z.string().optional(),
	assignToUserId: z.string().optional(),
	dueInHours: z
		.number()
		.int()
		.min(1)
		.max(24 * 14)
		.default(24),
	minSeverity: z.enum(['WARNING', 'ERROR']).default('ERROR'),
	limit: z.number().int().min(1).max(100).default(50),
})

const startOrderFulfillmentInputSchema = z.object({
	orderId: z.string(),
})

const resumeOrderFulfillmentInputSchema = z.object({
	workflowId: z.string(),
})

const getOrderFulfillmentStatusInputSchema = z.object({
	workflowId: z.string(),
})

const assignRoleToUserInputSchema = z.object({
	userId: z.string(),
	roleCode: z.string(),
	active: z.boolean().default(true),
})

const setRolePermissionsInputSchema = z.object({
	roleCode: z.string(),
	permissionCodes: z.array(z.string()).default([]),
})

const getEffectivePermissionsInputSchema = z.object({
	userId: z.string(),
})

const upsertModuleSettingInputSchema = z.object({
	moduleId: z.string(),
	settingKey: z.string(),
	value: z.unknown(),
	schemaVersion: z.string().optional(),
	changeReason: z.string().optional(),
})

const rollbackModuleSettingInputSchema = z.object({
	moduleId: z.string(),
	settingKey: z.string(),
	revisionNo: z.number().int().min(0),
	changeReason: z.string().optional(),
})

const exportAuditLogsInputSchema = z.object({
	moduleId: z.string().optional(),
	action: z.string().optional(),
	status: z.enum(['SUCCESS', 'DENIED', 'FAILED']).optional(),
	limit: z.number().int().min(1).max(5000).default(500),
})

const listAuditLogsInputSchema = z.object({
	moduleId: z.string().optional(),
	action: z.string().optional(),
	status: z.enum(['SUCCESS', 'DENIED', 'FAILED']).optional(),
	actorUserId: z.string().optional(),
	limit: z.number().int().min(1).max(500).default(100),
	offset: z.number().int().min(0).default(0),
})

const runDueScheduledJobsInputSchema = z.object({
	asOf: z.string().optional(),
	jobCodes: z.array(z.string()).optional(),
})

const runScheduledJobNowInputSchema = z.object({
	jobCode: z.string(),
	asOf: z.string().optional(),
	retryFailed: z.boolean().default(false),
})

const setScheduledJobEnabledInputSchema = z.object({
	jobCode: z.string(),
	enabled: z.boolean(),
})

const listScheduledJobRunsInputSchema = z.object({
	jobCode: z.string().optional(),
	status: z.enum(['RUNNING', 'SUCCESS', 'FAILED', 'SKIPPED']).optional(),
	limit: z.number().int().min(1).max(500).default(100),
	offset: z.number().int().min(0).default(0),
})

const readTenantId = (row: unknown) =>
	(row as { tenantId?: string }).tenantId ?? 'demo-tenant'

const notificationMarkerPattern = /\[notification:([^\]]+)\]/
const slaTaskMarkerPattern = /\[sla-task:([^\]]+)\]/
const taskNoPattern = /^TASK(\d+)$/i
const DAY_IN_MS = 24 * 60 * 60 * 1000
const BUILTIN_ROLE_CODES = new Set(['VIEWER', 'AGENT', 'MANAGER', 'ADMIN'])
const HOUR_IN_MS = 60 * 60 * 1000

type ScheduledJobCatalogEntry = {
	jobCode: string
	name: string
	moduleId: 'replenishment' | 'hub' | 'flow'
	cadenceType: 'HOURLY' | 'DAILY'
	cadenceInterval: number
	runHourUtc: number
	runMinuteUtc: number
	retryLimit: number
	config: Record<string, unknown>
}

const SCHEDULED_JOB_CATALOG: ScheduledJobCatalogEntry[] = [
	{
		jobCode: 'replenishment.generatePurchaseProposals',
		name: 'Generate replenishment purchase proposals',
		moduleId: 'replenishment',
		cadenceType: 'DAILY',
		cadenceInterval: 1,
		runHourUtc: 5,
		runMinuteUtc: 0,
		retryLimit: 1,
		config: { limit: 25 },
	},
	{
		jobCode: 'replenishment.generateTransferProposals',
		name: 'Generate replenishment transfer proposals',
		moduleId: 'replenishment',
		cadenceType: 'DAILY',
		cadenceInterval: 1,
		runHourUtc: 5,
		runMinuteUtc: 15,
		retryLimit: 1,
		config: { limit: 25 },
	},
	{
		jobCode: 'hub.evaluateSlaBreaches',
		name: 'Evaluate Hub SLA breaches',
		moduleId: 'hub',
		cadenceType: 'HOURLY',
		cadenceInterval: 1,
		runHourUtc: 0,
		runMinuteUtc: 5,
		retryLimit: 2,
		config: { lookAheadHours: 4, limit: 500 },
	},
	{
		jobCode: 'flow.analytics.cashForecast',
		name: 'Build daily cash forecast snapshot',
		moduleId: 'flow',
		cadenceType: 'DAILY',
		cadenceInterval: 1,
		runHourUtc: 6,
		runMinuteUtc: 0,
		retryLimit: 1,
		config: {
			horizonDays: 30,
			lookbackDays: 60,
			adverseVarianceThresholdPct: 15,
		},
	},
]

const ORDER_WORKFLOW_STAGE_SEQUENCE = [
	'VALIDATE_ORDER',
	'CREATE_AND_POST_INVOICE',
	'CREATE_SHIPMENT',
] as const
type OrderWorkflowStage = (typeof ORDER_WORKFLOW_STAGE_SEQUENCE)[number]

const ORDER_WORKFLOW_STAGE_ORDER: Record<OrderWorkflowStage, number> = {
	VALIDATE_ORDER: 1,
	CREATE_AND_POST_INVOICE: 2,
	CREATE_SHIPMENT: 3,
}

const nextEntryNo = (rows: Array<{ entryNo?: number }>) =>
	rows.reduce((max, row) => Math.max(max, Number(row.entryNo ?? 0)), 0) + 1

const normalizeRoleCode = (roleCode: string) => roleCode.trim().toUpperCase()
const normalizePermissionCode = (permissionCode: string) =>
	permissionCode.trim().toLowerCase()

const toJsonString = (value: unknown) => {
	try {
		return JSON.stringify(value ?? null)
	} catch {
		return JSON.stringify({ serialization: 'failed' })
	}
}

const fromJsonString = (value: string | null | undefined) => {
	if (!value) return null
	try {
		return JSON.parse(value)
	} catch {
		return value
	}
}

const parsePermissionCode = (permissionCode: string) => {
	const normalizedPermissionCode = normalizePermissionCode(permissionCode)
	const [moduleIdRaw, ...actionParts] = normalizedPermissionCode.split('.')
	return {
		normalizedPermissionCode,
		moduleId: moduleIdRaw || 'hub',
		action: actionParts.join('.') || 'action',
	}
}

const ensureHubUser = ({
	context,
	tenantId,
	userId,
}: {
	context: any
	tenantId: string
	userId: string
}) => {
	const existing = context.db.schemas.hubUsers.findMany({
		where: (row: any) =>
			readTenantId(row) === tenantId && row.userId === userId,
		limit: 1,
	})[0]
	if (existing) return existing

	return context.db.schemas.hubUsers.insert({
		userId,
		displayName: userId,
		active: true,
	})
}

const ensureHubRole = ({
	context,
	tenantId,
	roleCode,
}: {
	context: any
	tenantId: string
	roleCode: string
}) => {
	const normalizedRoleCode = normalizeRoleCode(roleCode)
	const existing = context.db.schemas.hubRoles.findMany({
		where: (row: any) =>
			readTenantId(row) === tenantId &&
			String(row.roleCode ?? '').toUpperCase() === normalizedRoleCode,
		limit: 1,
	})[0]
	if (existing) return existing

	const minBaseRole =
		normalizedRoleCode === 'VIEWER' ||
		normalizedRoleCode === 'AGENT' ||
		normalizedRoleCode === 'MANAGER' ||
		normalizedRoleCode === 'ADMIN'
			? normalizedRoleCode
			: 'VIEWER'

	return context.db.schemas.hubRoles.insert({
		roleCode: normalizedRoleCode,
		name: normalizedRoleCode.replace(/_/g, ' '),
		description: 'Auto-provisioned role',
		minBaseRole,
		builtIn: BUILTIN_ROLE_CODES.has(normalizedRoleCode),
	})
}

const ensureHubPermission = ({
	context,
	tenantId,
	permissionCode,
}: {
	context: any
	tenantId: string
	permissionCode: string
}) => {
	const { normalizedPermissionCode, moduleId, action } =
		parsePermissionCode(permissionCode)
	const existing = context.db.schemas.hubPermissions.findMany({
		where: (row: any) =>
			readTenantId(row) === tenantId &&
			normalizePermissionCode(String(row.permissionCode ?? '')) ===
				normalizedPermissionCode,
		limit: 1,
	})[0]
	if (existing) return existing

	return context.db.schemas.hubPermissions.insert({
		permissionCode: normalizedPermissionCode,
		moduleId,
		action,
		description: `Auto-provisioned permission ${normalizedPermissionCode}`,
		builtIn: false,
	})
}

const findModuleSetting = ({
	context,
	tenantId,
	moduleId,
	settingKey,
}: {
	context: any
	tenantId: string
	moduleId: string
	settingKey: string
}) =>
	context.db.schemas.hubModuleSettings.findMany({
		where: (row: any) =>
			readTenantId(row) === tenantId &&
			row.moduleId === moduleId &&
			row.settingKey === settingKey,
		limit: 1,
	})[0]

const readRoleCodeById = ({
	context,
	tenantId,
	roleIds,
}: {
	context: any
	tenantId: string
	roleIds: string[]
}) => {
	if (roleIds.length === 0) return new Map<string, string>()
	const roleIdSet = new Set(roleIds)
	const roles = context.db.schemas.hubRoles.findMany({
		where: (row: any) =>
			readTenantId(row) === tenantId && roleIdSet.has(row._id),
	})
	return new Map<string, string>(
		roles.map((role: any) => [role._id, String(role.roleCode ?? '')]),
	)
}

const readPermissionCodeById = ({
	context,
	tenantId,
	permissionIds,
}: {
	context: any
	tenantId: string
	permissionIds: string[]
}) => {
	if (permissionIds.length === 0) return new Map<string, string>()
	const permissionIdSet = new Set(permissionIds)
	const permissions = context.db.schemas.hubPermissions.findMany({
		where: (row: any) =>
			readTenantId(row) === tenantId && permissionIdSet.has(row._id),
	})
	return new Map<string, string>(
		permissions.map((permission: any) => [
			permission._id,
			String(permission.permissionCode ?? ''),
		]),
	)
}

type SlaStatus = 'ON_TRACK' | 'AT_RISK' | 'BREACHED'
type EscalationLevel = 'NONE' | 'L1' | 'L2'

const isSlaStatus = (value: unknown): value is SlaStatus =>
	value === 'ON_TRACK' || value === 'AT_RISK' || value === 'BREACHED'

const readTimestamp = (value: unknown) => {
	if (!value) return null
	if (typeof value === 'string') {
		const parsed = Date.parse(value)
		return Number.isFinite(parsed) ? parsed : null
	}
	if (typeof value === 'number' && Number.isFinite(value)) return value
	if (value instanceof Date) {
		const parsed = value.getTime()
		return Number.isFinite(parsed) ? parsed : null
	}
	return null
}

const toUtcDayKey = (timestamp: number) => {
	const date = new Date(timestamp)
	const year = date.getUTCFullYear()
	const month = String(date.getUTCMonth() + 1).padStart(2, '0')
	const day = String(date.getUTCDate()).padStart(2, '0')
	return `${year}-${month}-${day}`
}

const toDayLabel = (timestamp: number) =>
	new Date(timestamp).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
	})

const deriveSlaStatus = (
	targetTimestamp: number,
	referenceTimestamp: number,
	lookAheadMs: number,
): SlaStatus => {
	const delta = targetTimestamp - referenceTimestamp
	if (delta < 0) return 'BREACHED'
	if (delta <= lookAheadMs) return 'AT_RISK'
	return 'ON_TRACK'
}

const selectSlaTargetTimestamp = (task: {
	slaTargetAt?: string | null
	dueDate?: string | null
}) => readTimestamp(task.slaTargetAt) ?? readTimestamp(task.dueDate)

type WorkflowStepRow = {
	_id: string
	stage: string
	status: string
	attemptNo?: number
	_createdAt?: number
	_updatedAt?: number
	[key: string]: unknown
}

const sortWorkflowSteps = (steps: WorkflowStepRow[]) =>
	[...steps].sort((a, b) => {
		const stageA =
			ORDER_WORKFLOW_STAGE_ORDER[a.stage as OrderWorkflowStage] ?? 999
		const stageB =
			ORDER_WORKFLOW_STAGE_ORDER[b.stage as OrderWorkflowStage] ?? 999
		if (stageA !== stageB) return stageA - stageB
		return (
			Number(a._createdAt ?? a._updatedAt ?? 0) -
			Number(b._createdAt ?? b._updatedAt ?? 0)
		)
	})

const getWorkflowSteps = (context: any, tenantId: string, workflowId: string) =>
	sortWorkflowSteps(
		context.db.schemas.orderWorkflowSteps.findMany({
			where: (row: any) =>
				readTenantId(row) === tenantId && row.workflowId === workflowId,
		}) as WorkflowStepRow[],
	)

const ensureWorkflowSteps = (
	context: any,
	tenantId: string,
	workflowId: string,
) => {
	const existingSteps = getWorkflowSteps(context, tenantId, workflowId)
	const existingStageSet = new Set(existingSteps.map((step) => step.stage))
	for (const stage of ORDER_WORKFLOW_STAGE_SEQUENCE) {
		if (existingStageSet.has(stage)) continue
		try {
			context.db.schemas.orderWorkflowSteps.insert({
				workflowId,
				stage,
				status: 'PENDING',
				attemptNo: 0,
			})
		} catch {
			// Concurrent starts may race to create these deterministic rows.
		}
	}
	return getWorkflowSteps(context, tenantId, workflowId)
}

const createWorkflowFailureEscalation = ({
	context,
	tenantId,
	workflowId,
	orderNo,
	stage,
	errorMessage,
}: {
	context: any
	tenantId: string
	workflowId: string
	orderNo: string
	stage: OrderWorkflowStage
	errorMessage: string
}) => {
	const marker = `[workflow:${workflowId}]`
	const existingTask = context.db.schemas.operationTasks.findMany({
		where: (row: any) =>
			readTenantId(row) === tenantId &&
			typeof row.description === 'string' &&
			row.description.includes(marker) &&
			row.status !== 'DONE',
		limit: 1,
	})[0]
	const existingNotification = context.db.schemas.moduleNotifications.findMany({
		where: (row: any) =>
			readTenantId(row) === tenantId &&
			typeof row.body === 'string' &&
			row.body.includes(marker) &&
			row.status !== 'ARCHIVED',
		limit: 1,
	})[0]

	const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
	const task =
		existingTask ??
		context.db.schemas.operationTasks.insert({
			taskNo: '',
			moduleId: 'hub',
			title: `Fulfillment failed for ${orderNo}`,
			description: `${marker} Stage ${stage} failed: ${errorMessage}`,
			status: 'OPEN',
			priority: 'HIGH',
			dueDate,
		})
	const notification =
		existingNotification ??
		context.db.schemas.moduleNotifications.insert({
			moduleId: 'hub',
			title: `Fulfillment failed for ${orderNo}`,
			body: `${marker} Stage ${stage} failed: ${errorMessage}`,
			status: 'UNREAD',
			severity: 'ERROR',
		})

	return {
		taskId: task?._id,
		notificationId: notification?._id,
	}
}

const ensurePostedSalesInvoice = ({
	context,
	tenantId,
	invoiceId,
}: {
	context: any
	tenantId: string
	invoiceId: string
}) => {
	const invoice = context.db.schemas.salesInvoiceHeaders.get(invoiceId)
	if (!invoice || readTenantId(invoice) !== tenantId) {
		throw new Error('Invoice not found')
	}
	if (!invoice.invoiceNo) {
		throw new Error('Invoice number is required before posting')
	}

	const lines = context.db.schemas.salesInvoiceLines.findMany({
		where: (row: any) =>
			readTenantId(row) === tenantId && row.invoiceNo === invoice.invoiceNo,
		orderBy: { field: 'lineNo', direction: 'asc' },
	})
	if (lines.length === 0) {
		throw new Error('Invoice has no lines to post')
	}

	const totalAmount = lines.reduce(
		(sum: number, line: Record<string, unknown>) => {
			const lineAmount = Number(
				line.lineAmount ??
					Number(line.quantity ?? 0) * Number(line.unitPrice ?? 0),
			)
			return sum + lineAmount
		},
		0,
	)
	if (totalAmount <= 0) {
		throw new Error('Invoice total must be greater than zero to post')
	}

	const existingCustLedgerEntries =
		context.db.schemas.custLedgerEntries.findMany({
			where: (row: any) =>
				readTenantId(row) === tenantId &&
				row.documentNo === invoice.invoiceNo &&
				row.documentType === 'INVOICE',
		})
	const existingGlEntries = context.db.schemas.glEntries.findMany({
		where: (row: any) =>
			readTenantId(row) === tenantId &&
			row.documentNo === invoice.invoiceNo &&
			row.documentType === 'INVOICE',
	})

	if (invoice.status === 'POSTED') {
		if (
			existingCustLedgerEntries.length === 0 ||
			existingGlEntries.length < 2
		) {
			throw new Error(
				'Invoice is POSTED but accounting side effects are incomplete',
			)
		}
		return {
			invoice,
			totalAmount,
			idempotent: true,
		}
	}

	if (invoice.status !== 'DRAFT') {
		throw new Error('Only DRAFT invoices can be posted')
	}
	if (existingCustLedgerEntries.length > 0 || existingGlEntries.length > 0) {
		throw new Error('Invoice already has accounting entries')
	}

	const postingDate = invoice.postingDate ?? new Date().toISOString()
	const description = `Sales Invoice ${invoice.invoiceNo}`
	const previousStatus = invoice.status
	const previousStatusReason = invoice.statusReason
	const previousStatusUpdatedAt = invoice.statusUpdatedAt
	const previousPostingDate = invoice.postingDate
	const createdGlEntryIds: string[] = []
	let createdCustomerLedgerEntryId: string | null = null

	try {
		const postedInvoice = context.db.schemas.salesInvoiceHeaders.update(
			invoice._id,
			{
				status: 'POSTED',
				postingDate,
				statusReason: undefined,
				statusUpdatedAt: new Date(),
			},
		)
		if (!postedInvoice) {
			throw new Error('Unable to update invoice status')
		}

		const nextCustEntry = nextEntryNo(
			context.db.schemas.custLedgerEntries.findMany({
				where: (row: any) => readTenantId(row) === tenantId,
			}),
		)
		const customerLedgerEntry = context.db.schemas.custLedgerEntries.insert({
			entryNo: nextCustEntry,
			customerId: invoice.customerId,
			postingDate,
			documentType: 'INVOICE',
			documentNo: invoice.invoiceNo,
			description,
			amount: totalAmount,
			remainingAmount: totalAmount,
			open: true,
			currency: invoice.currency ?? 'USD',
		})
		createdCustomerLedgerEntryId = customerLedgerEntry._id

		const nextGlEntry = nextEntryNo(
			context.db.schemas.glEntries.findMany({
				where: (row: any) => readTenantId(row) === tenantId,
			}),
		)
		const receivableEntry = context.db.schemas.glEntries.insert({
			entryNo: nextGlEntry,
			postingDate,
			accountNo: '1100',
			accountName: 'Accounts Receivable',
			documentType: 'INVOICE',
			documentNo: invoice.invoiceNo,
			description,
			debitAmount: totalAmount,
			creditAmount: 0,
		})
		createdGlEntryIds.push(receivableEntry._id)

		const revenueEntry = context.db.schemas.glEntries.insert({
			entryNo: nextGlEntry + 1,
			postingDate,
			accountNo: '4000',
			accountName: 'Sales Revenue',
			documentType: 'INVOICE',
			documentNo: invoice.invoiceNo,
			description,
			debitAmount: 0,
			creditAmount: totalAmount,
		})
		createdGlEntryIds.push(revenueEntry._id)

		return {
			invoice: postedInvoice,
			totalAmount,
			idempotent: false,
		}
	} catch (error) {
		for (const glEntryId of createdGlEntryIds) {
			context.db.schemas.glEntries.delete(glEntryId)
		}
		if (createdCustomerLedgerEntryId) {
			context.db.schemas.custLedgerEntries.delete(createdCustomerLedgerEntryId)
		}
		context.db.schemas.salesInvoiceHeaders.update(invoice._id, {
			status: previousStatus,
			statusReason: previousStatusReason,
			statusUpdatedAt: previousStatusUpdatedAt,
			postingDate: previousPostingDate,
		})
		throw error
	}
}

const ensureInvoiceForWorkflow = ({
	context,
	tenantId,
	workflow,
	order,
	orderLines,
}: {
	context: any
	tenantId: string
	workflow: Record<string, any>
	order: Record<string, any>
	orderLines: Array<Record<string, any>>
}) => {
	let invoice =
		(workflow.invoiceId
			? context.db.schemas.salesInvoiceHeaders.get(workflow.invoiceId)
			: undefined) ?? undefined
	if (invoice && readTenantId(invoice) !== tenantId) {
		throw new Error('Workflow invoice belongs to another tenant')
	}
	if (!invoice && workflow.invoiceNo) {
		invoice = context.db.schemas.salesInvoiceHeaders.findMany({
			where: (row: any) =>
				readTenantId(row) === tenantId && row.invoiceNo === workflow.invoiceNo,
			limit: 1,
		})[0]
	}
	if (!invoice) {
		invoice = context.db.schemas.salesInvoiceHeaders.findMany({
			where: (row: any) =>
				readTenantId(row) === tenantId && row.salesOrderNo === order.documentNo,
			orderBy: { field: '_updatedAt', direction: 'desc' },
			limit: 1,
		})[0]
	}

	let createdInvoiceId: string | null = null
	const createdLineIds: string[] = []

	try {
		if (!invoice) {
			invoice = context.db.schemas.salesInvoiceHeaders.insert({
				invoiceNo: '',
				status: 'DRAFT',
				customerId: order.customerId,
				salesOrderNo: order.documentNo,
				postingDate: new Date().toISOString(),
				currency: order.currency ?? 'USD',
				lineCount: 0,
				totalAmount: 0,
			})
			createdInvoiceId = invoice._id
		}

		const invoiceLines = context.db.schemas.salesInvoiceLines.findMany({
			where: (row: any) =>
				readTenantId(row) === tenantId && row.invoiceNo === invoice.invoiceNo,
			orderBy: { field: 'lineNo', direction: 'asc' },
		})
		if (invoiceLines.length === 0) {
			for (const [index, line] of orderLines.entries()) {
				const created = context.db.schemas.salesInvoiceLines.insert({
					invoiceNo: invoice.invoiceNo,
					lineNo: index + 1,
					itemId: line.itemId,
					quantity: Number(line.quantity ?? 0),
					unitPrice: Number(line.unitPrice ?? 0),
					lineAmount: Number(line.lineAmount ?? 0),
				})
				createdLineIds.push(created._id)
			}
		}

		const posted = ensurePostedSalesInvoice({
			context,
			tenantId,
			invoiceId: invoice._id,
		})
		return {
			invoice: posted.invoice,
			totalAmount: posted.totalAmount,
			idempotent: posted.idempotent,
		}
	} catch (error) {
		for (const lineId of createdLineIds) {
			context.db.schemas.salesInvoiceLines.delete(lineId)
		}
		if (createdInvoiceId) {
			const maybeInvoice =
				context.db.schemas.salesInvoiceHeaders.get(createdInvoiceId)
			if (maybeInvoice?.status !== 'POSTED') {
				context.db.schemas.salesInvoiceHeaders.delete(createdInvoiceId)
			}
		}
		throw error
	}
}

const ensureShipmentForWorkflow = ({
	context,
	tenantId,
	workflow,
	order,
	orderLines,
}: {
	context: any
	tenantId: string
	workflow: Record<string, any>
	order: Record<string, any>
	orderLines: Array<Record<string, any>>
}) => {
	let shipment =
		(workflow.shipmentId
			? context.db.schemas.shipments.get(workflow.shipmentId)
			: undefined) ?? undefined
	if (shipment && readTenantId(shipment) !== tenantId) {
		throw new Error('Workflow shipment belongs to another tenant')
	}
	if (!shipment && workflow.shipmentNo) {
		shipment = context.db.schemas.shipments.findMany({
			where: (row: any) =>
				readTenantId(row) === tenantId &&
				row.shipmentNo === workflow.shipmentNo,
			limit: 1,
		})[0]
	}
	if (!shipment) {
		shipment = context.db.schemas.shipments.findMany({
			where: (row: any) =>
				readTenantId(row) === tenantId &&
				row.sourceDocumentType === 'SALES_ORDER' &&
				row.sourceDocumentNo === order.documentNo,
			orderBy: { field: '_updatedAt', direction: 'desc' },
			limit: 1,
		})[0]
	}
	if (shipment) {
		return { shipment, idempotent: true }
	}

	const activeShipmentMethod = context.db.schemas.shipmentMethods.findMany({
		where: (row: any) => readTenantId(row) === tenantId && row.active === true,
		orderBy: { field: '_updatedAt', direction: 'desc' },
		limit: 1,
	})[0]
	if (!activeShipmentMethod?.code) {
		throw new Error('No active shipment method available for fulfillment')
	}

	const createdLineIds: string[] = []
	let createdShipmentId: string | null = null
	try {
		const createdShipment = context.db.schemas.shipments.insert({
			shipmentNo: '',
			status: 'PLANNED',
			sourceDocumentType: 'SALES_ORDER',
			sourceDocumentNo: order.documentNo,
			shipmentMethodCode: activeShipmentMethod.code,
			priority: 'NORMAL',
			plannedDispatchDate: new Date().toISOString(),
			trackingNo: `AUTO-${String(order.documentNo).replace(/[^A-Z0-9-]/gi, '')}`,
		})
		createdShipmentId = createdShipment._id

		for (const [index, line] of orderLines.entries()) {
			const createdLine = context.db.schemas.shipmentLines.insert({
				shipmentNo: createdShipment.shipmentNo,
				lineNo: index + 1,
				itemId: line.itemId,
				quantity: Number(line.quantity ?? 0),
				quantityShipped: 0,
			})
			createdLineIds.push(createdLine._id)
		}

		return {
			shipment: createdShipment,
			idempotent: false,
		}
	} catch (error) {
		for (const lineId of createdLineIds) {
			context.db.schemas.shipmentLines.delete(lineId)
		}
		if (createdShipmentId) {
			context.db.schemas.shipments.delete(createdShipmentId)
		}
		throw error
	}
}

const executeOrderFulfillmentWorkflow = ({
	context,
	workflowId,
}: {
	context: any
	workflowId: string
}) => {
	const tenantId = context.auth.tenantId
	const workflow = context.db.schemas.orderWorkflows.get(workflowId)
	if (!workflow || readTenantId(workflow) !== tenantId) {
		throw new Error('Order workflow not found')
	}

	const order = context.db.schemas.salesHeaders.get(workflow.salesOrderId)
	if (!order || readTenantId(order) !== tenantId) {
		throw new Error('Sales order not found for workflow')
	}
	const orderLines = context.db.schemas.salesLines.findMany({
		where: (row: any) =>
			readTenantId(row) === tenantId && row.documentNo === order.documentNo,
		orderBy: { field: 'lineNo', direction: 'asc' },
	})

	ensureWorkflowSteps(context, tenantId, workflow._id)

	for (const stage of ORDER_WORKFLOW_STAGE_SEQUENCE) {
		const step = getWorkflowSteps(context, tenantId, workflow._id).find(
			(row) => row.stage === stage,
		)
		if (step?.status === 'COMPLETED') {
			continue
		}

		const startedAt = new Date().toISOString()
		const attemptNo = Number(step?.attemptNo ?? 0) + 1
		if (step) {
			context.db.schemas.orderWorkflowSteps.update(step._id, {
				status: 'RUNNING',
				attemptNo,
				startedAt,
				finishedAt: undefined,
				errorMessage: undefined,
			})
		}

		context.db.schemas.orderWorkflows.update(workflow._id, {
			status: 'RUNNING',
			currentStage: stage,
			failedAt: undefined,
			failureCode: undefined,
			failureMessage: undefined,
			lastStepAt: startedAt,
		})

		try {
			if (stage === 'VALIDATE_ORDER') {
				if (order.status !== 'APPROVED' && order.status !== 'COMPLETED') {
					throw new Error('Sales order must be APPROVED before fulfillment')
				}
				if (orderLines.length === 0) {
					throw new Error('Sales order has no lines')
				}
				const customer = context.db.schemas.customers.get(order.customerId)
				if (!customer || readTenantId(customer) !== tenantId) {
					throw new Error('Sales order customer not found')
				}
			}

			if (stage === 'CREATE_AND_POST_INVOICE') {
				const invoiceResult = ensureInvoiceForWorkflow({
					context,
					tenantId,
					workflow,
					order,
					orderLines,
				})
				context.db.schemas.orderWorkflows.update(workflow._id, {
					invoiceId: invoiceResult.invoice._id,
					invoiceNo: invoiceResult.invoice.invoiceNo,
					lastStepAt: new Date().toISOString(),
				})
			}

			if (stage === 'CREATE_SHIPMENT') {
				const shipmentResult = ensureShipmentForWorkflow({
					context,
					tenantId,
					workflow,
					order,
					orderLines,
				})
				context.db.schemas.orderWorkflows.update(workflow._id, {
					shipmentId: shipmentResult.shipment._id,
					shipmentNo: shipmentResult.shipment.shipmentNo,
					lastStepAt: new Date().toISOString(),
				})
			}

			if (step) {
				context.db.schemas.orderWorkflowSteps.update(step._id, {
					status: 'COMPLETED',
					finishedAt: new Date().toISOString(),
					errorMessage: undefined,
				})
			}
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : 'Unknown workflow error'
			if (step) {
				context.db.schemas.orderWorkflowSteps.update(step._id, {
					status: 'FAILED',
					finishedAt: new Date().toISOString(),
					errorMessage,
				})
			}
			const escalation = createWorkflowFailureEscalation({
				context,
				tenantId,
				workflowId: workflow._id,
				orderNo: order.documentNo,
				stage,
				errorMessage,
			})
			const currentRetryCount = Number(
				context.db.schemas.orderWorkflows.get(workflow._id)?.retryCount ?? 0,
			)
			const failedWorkflow = context.db.schemas.orderWorkflows.update(
				workflow._id,
				{
					status: 'FAILED',
					currentStage: stage,
					failedAt: new Date().toISOString(),
					failureCode: stage,
					failureMessage: errorMessage,
					retryCount: currentRetryCount + 1,
					failureTaskId: escalation.taskId,
					failureNotificationId: escalation.notificationId,
					lastStepAt: new Date().toISOString(),
				},
			)
			return {
				workflow:
					failedWorkflow ?? context.db.schemas.orderWorkflows.get(workflow._id),
				steps: getWorkflowSteps(context, tenantId, workflow._id),
				completed: false,
				failed: true,
				failureStage: stage,
				failureMessage: errorMessage,
			}
		}
	}

	const completedWorkflow = context.db.schemas.orderWorkflows.update(
		workflow._id,
		{
			status: 'COMPLETED',
			currentStage: 'DONE',
			completedAt: new Date().toISOString(),
			failedAt: undefined,
			failureCode: undefined,
			failureMessage: undefined,
			lastStepAt: new Date().toISOString(),
		},
	)

	return {
		workflow:
			completedWorkflow ?? context.db.schemas.orderWorkflows.get(workflow._id),
		steps: getWorkflowSteps(context, tenantId, workflow._id),
		completed: true,
		failed: false,
	}
}

const evaluateSlaBreachesInternal = ({
	context,
	moduleId,
	lookAheadHours,
	asOf,
	limit,
}: {
	context: any
	moduleId?: string
	lookAheadHours: number
	asOf?: string
	limit: number
}) => {
	const tenantId = context.auth.tenantId
	const normalizedModuleId = moduleId?.trim()
	const referenceTimestamp = readTimestamp(asOf) ?? Date.now()
	const referenceIso = new Date(referenceTimestamp).toISOString()
	const lookAheadMs = lookAheadHours * HOUR_IN_MS

	const tasks = context.db.schemas.operationTasks.findMany({
		where: (row: any) => {
			if (readTenantId(row) !== tenantId) return false
			if (normalizedModuleId && row.moduleId !== normalizedModuleId)
				return false
			if (row.status === 'DONE') return false
			return Boolean(selectSlaTargetTimestamp(row))
		},
		orderBy: { field: '_updatedAt', direction: 'asc' },
		limit,
	})

	const existingSlaNotifications =
		context.db.schemas.moduleNotifications.findMany({
			where: (row: any) =>
				readTenantId(row) === tenantId &&
				typeof row.body === 'string' &&
				slaTaskMarkerPattern.test(row.body),
		})
	const alreadyNotifiedTaskIds = new Set<string>()
	for (const notification of existingSlaNotifications) {
		const match = slaTaskMarkerPattern.exec(notification.body ?? '')
		if (!match?.[1]) continue
		alreadyNotifiedTaskIds.add(match[1])
	}

	let evaluated = 0
	let breached = 0
	let atRisk = 0
	let onTrack = 0
	let notificationsCreated = 0
	const updatedTaskIds: string[] = []

	for (const task of tasks) {
		const targetTimestamp = selectSlaTargetTimestamp(task)
		if (!targetTimestamp) continue
		evaluated += 1

		const nextSlaStatus = deriveSlaStatus(
			targetTimestamp,
			referenceTimestamp,
			lookAheadMs,
		)
		const hoursOverdue = Math.max(
			0,
			(referenceTimestamp - targetTimestamp) / HOUR_IN_MS,
		)
		const nextEscalationLevel: EscalationLevel =
			nextSlaStatus === 'BREACHED' ? (hoursOverdue >= 24 ? 'L2' : 'L1') : 'NONE'

		const updates: Record<string, unknown> = {
			slaLastEvaluatedAt: referenceIso,
			escalationLevel: nextEscalationLevel,
		}
		if (!isSlaStatus(task.slaStatus) || task.slaStatus !== nextSlaStatus) {
			updates.slaStatus = nextSlaStatus
		}
		if (nextSlaStatus === 'BREACHED' && !task.slaBreachedAt) {
			updates.slaBreachedAt = referenceIso
		}

		if (Object.keys(updates).length > 0) {
			const updated = context.db.schemas.operationTasks.update(
				task._id,
				updates,
			)
			if (updated) {
				updatedTaskIds.push(task._id)
			}
		}

		if (nextSlaStatus === 'BREACHED') breached += 1
		if (nextSlaStatus === 'AT_RISK') atRisk += 1
		if (nextSlaStatus === 'ON_TRACK') onTrack += 1

		if (nextSlaStatus !== 'BREACHED') continue
		if (alreadyNotifiedTaskIds.has(task._id)) continue

		const targetIso = new Date(targetTimestamp).toISOString()
		context.db.schemas.moduleNotifications.insert({
			moduleId: task.moduleId ?? 'hub',
			title: `SLA breach: ${task.taskNo}`,
			body: `[sla-task:${task._id}] ${task.title} breached target ${targetIso}.`,
			status: 'UNREAD',
			severity: 'ERROR',
			targetUserId: task.assigneeUserId ?? undefined,
		})
		alreadyNotifiedTaskIds.add(task._id)
		notificationsCreated += 1
	}

	return {
		scanned: tasks.length,
		evaluated,
		breached,
		atRisk,
		onTrack,
		notificationsCreated,
		updatedTaskIds,
		config: {
			moduleId: normalizedModuleId ?? null,
			lookAheadHours,
			limit,
		},
		evaluatedAt: referenceIso,
	}
}

const startOfUtcDay = (timestamp: number) => {
	const date = new Date(timestamp)
	return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

const toIsoDay = (timestamp: number) => {
	const [date] = new Date(timestamp).toISOString().split('T')
	return date ?? new Date(timestamp).toISOString()
}

const normalizeScheduledJobCode = (jobCode: string) => jobCode.trim()

const parseConfigRecord = (configJson: string | null | undefined) => {
	const parsed = fromJsonString(configJson)
	if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
		return {} as Record<string, unknown>
	}
	return parsed as Record<string, unknown>
}

const readConfigNumber = ({
	config,
	key,
	fallback,
	min,
	max,
}: {
	config: Record<string, unknown>
	key: string
	fallback: number
	min: number
	max: number
}) => {
	const raw = config[key]
	const parsed = Number(raw)
	if (!Number.isFinite(parsed)) return fallback
	return Math.max(min, Math.min(max, parsed))
}

const getScheduledCadencePeriodMs = (job: {
	cadenceType?: string
	cadenceInterval?: number
}) => {
	const cadenceType = job.cadenceType === 'HOURLY' ? 'HOURLY' : 'DAILY'
	const cadenceInterval = Math.max(1, Number(job.cadenceInterval ?? 1))
	return cadenceType === 'HOURLY'
		? cadenceInterval * HOUR_IN_MS
		: cadenceInterval * DAY_IN_MS
}

const getScheduledCadenceOffsetMs = (job: {
	cadenceType?: string
	runHourUtc?: number
	runMinuteUtc?: number
}) => {
	const runHourUtc = Math.max(0, Math.min(23, Number(job.runHourUtc ?? 0)))
	const runMinuteUtc = Math.max(0, Math.min(59, Number(job.runMinuteUtc ?? 0)))
	if (job.cadenceType === 'HOURLY') {
		return runMinuteUtc * 60 * 1000
	}
	return (runHourUtc * 60 + runMinuteUtc) * 60 * 1000
}

const getScheduledJobWindow = (
	job: {
		cadenceType?: string
		cadenceInterval?: number
		runHourUtc?: number
		runMinuteUtc?: number
	},
	referenceTimestamp: number,
) => {
	const periodMs = getScheduledCadencePeriodMs(job)
	const offsetMs = getScheduledCadenceOffsetMs(job)
	const windowIndex = Math.floor((referenceTimestamp - offsetMs) / periodMs)
	const windowStart = windowIndex * periodMs + offsetMs
	const windowEnd = windowStart + periodMs
	return {
		windowStart,
		windowEnd,
		windowKey: String(windowStart),
	}
}

const nextScheduledRunTimestamp = (
	job: {
		cadenceType?: string
		cadenceInterval?: number
		runHourUtc?: number
		runMinuteUtc?: number
	},
	referenceTimestamp: number,
) => {
	const periodMs = getScheduledCadencePeriodMs(job)
	const offsetMs = getScheduledCadenceOffsetMs(job)
	const nextIndex = Math.floor((referenceTimestamp - offsetMs) / periodMs) + 1
	return nextIndex * periodMs + offsetMs
}

const findScheduledJobByCode = ({
	context,
	tenantId,
	jobCode,
}: {
	context: any
	tenantId: string
	jobCode: string
}) =>
	context.db.schemas.scheduledJobs.findMany({
		where: (row: any) =>
			readTenantId(row) === tenantId &&
			row.jobCode === normalizeScheduledJobCode(jobCode),
		limit: 1,
	})[0]

const ensureScheduledJobsRegistered = (context: any) => {
	const tenantId = context.auth.tenantId
	const now = Date.now()

	for (const entry of SCHEDULED_JOB_CATALOG) {
		const existing = findScheduledJobByCode({
			context,
			tenantId,
			jobCode: entry.jobCode,
		})
		const normalizedCode = normalizeScheduledJobCode(entry.jobCode)
		const nextRunAtIso = new Date(
			nextScheduledRunTimestamp(entry, now),
		).toISOString()

		if (!existing?._id) {
			context.db.schemas.scheduledJobs.insert({
				jobCode: normalizedCode,
				name: entry.name,
				moduleId: entry.moduleId,
				cadenceType: entry.cadenceType,
				cadenceInterval: entry.cadenceInterval,
				runHourUtc: entry.runHourUtc,
				runMinuteUtc: entry.runMinuteUtc,
				enabled: true,
				retryLimit: entry.retryLimit,
				nextRunAt: nextRunAtIso,
				lastRunStatus: 'IDLE',
				configJson: toJsonString(entry.config),
			})
			continue
		}

		const updates: Record<string, unknown> = {
			name: entry.name,
			moduleId: entry.moduleId,
			cadenceType: entry.cadenceType,
			cadenceInterval: entry.cadenceInterval,
			runHourUtc: entry.runHourUtc,
			runMinuteUtc: entry.runMinuteUtc,
			retryLimit:
				Number.isFinite(Number(existing.retryLimit)) &&
				Number(existing.retryLimit) >= 0
					? existing.retryLimit
					: entry.retryLimit,
			configJson: existing.configJson || toJsonString(entry.config),
		}
		if (!existing.nextRunAt) {
			updates.nextRunAt = nextRunAtIso
		}
		context.db.schemas.scheduledJobs.update(existing._id, updates)
	}
}

const executeReplenishmentPurchaseProposalJob = ({
	context,
	limit,
}: {
	context: any
	limit: number
}) => {
	type PurchaseProposal = {
		itemId: string
		itemNo?: string
		description?: string
		currentInventory: number
		demandSignal: number
		targetStock: number
		suggestedOrderQty: number
		preferredVendorId?: string
		preferredVendorNo?: string
		preferredVendorName?: string
		unitCost: number
		estimatedCost: number
		rankScore: number
	}
	const tenantId = context.auth.tenantId
	const activeVendors = context.db.schemas.vendors.findMany({
		where: (row: any) => readTenantId(row) === tenantId && !row.blocked,
	})
	const items = context.db.schemas.items.findMany({
		where: (row: any) => readTenantId(row) === tenantId && !row.blocked,
	})
	const salesLines = context.db.schemas.salesLines.findMany({
		where: (row: any) => readTenantId(row) === tenantId,
	})

	const demandByItem = new Map<string, number>()
	for (const line of salesLines) {
		const qty = Number(line.quantity ?? 0)
		demandByItem.set(line.itemId, (demandByItem.get(line.itemId) ?? 0) + qty)
	}

	const proposals: PurchaseProposal[] = items
		.map((item: any, index: number): PurchaseProposal | null => {
			const demandSignal = Math.max(1, demandByItem.get(item._id) ?? 0)
			const targetStock = Math.max(10, Math.ceil(demandSignal * 1.2))
			const currentInventory = Number(item.inventory ?? 0)
			const suggestedOrderQty = Math.max(0, targetStock - currentInventory)
			if (suggestedOrderQty <= 0) return null

			const preferredVendor =
				activeVendors.length > 0
					? activeVendors[index % activeVendors.length]
					: undefined
			const unitCost = Number(item.unitCost ?? 0)
			const estimatedCost = suggestedOrderQty * unitCost
			const rankScore = suggestedOrderQty * 100 + demandSignal

			return {
				itemId: item._id,
				itemNo: item.itemNo,
				description: item.description,
				currentInventory,
				demandSignal,
				targetStock,
				suggestedOrderQty,
				preferredVendorId: preferredVendor?._id,
				preferredVendorNo: preferredVendor?.vendorNo,
				preferredVendorName: preferredVendor?.name,
				unitCost,
				estimatedCost,
				rankScore,
			}
		})
		.filter((proposal: PurchaseProposal | null): proposal is PurchaseProposal =>
			Boolean(proposal),
		)
		.sort(
			(a: PurchaseProposal, b: PurchaseProposal) => b.rankScore - a.rankScore,
		)
		.slice(0, limit)

	return {
		generatedAt: new Date().toISOString(),
		proposalCount: proposals.length,
		proposals,
	}
}

const executeReplenishmentTransferProposalJob = ({
	context,
	limit,
}: {
	context: any
	limit: number
}) => {
	const tenantId = context.auth.tenantId
	const items = context.db.schemas.items.findMany({
		where: (row: any) => readTenantId(row) === tenantId && !row.blocked,
	})
	const itemLookup = new Map<
		string,
		{
			itemNo?: string
			description?: string
		}
	>(
		items.map((item: any) => [
			item._id,
			{ itemNo: item.itemNo, description: item.description },
		]),
	)

	const ledgerRows = context.db.schemas.itemLedgerEntries.findMany({
		where: (row: any) =>
			readTenantId(row) === tenantId && !!row.locationCode && !!row.itemId,
	})

	const stockByItemLocation = new Map<string, Map<string, number>>()
	for (const row of ledgerRows) {
		const locationCode = row.locationCode
		if (!locationCode) continue
		const perItem = stockByItemLocation.get(row.itemId) ?? new Map()
		perItem.set(
			locationCode,
			(perItem.get(locationCode) ?? 0) + Number(row.remainingQty ?? 0),
		)
		stockByItemLocation.set(row.itemId, perItem)
	}

	const proposals: Array<Record<string, unknown>> = []
	for (const [itemId, locationBalances] of stockByItemLocation.entries()) {
		const balances = [...locationBalances.entries()].map(
			([locationCode, qty]) => ({ locationCode, qty }),
		)
		const donors = balances
			.filter((entry) => entry.qty > 8)
			.sort((a, b) => b.qty - a.qty)
		const recipients = balances
			.filter((entry) => entry.qty < 3)
			.sort((a, b) => a.qty - b.qty)

		const donor = donors[0]
		const recipient = recipients[0]
		if (!donor || !recipient) continue
		if (donor.locationCode === recipient.locationCode) continue

		const availableQty = Math.max(0, donor.qty - 5)
		const shortageQty = Math.max(0, 8 - recipient.qty)
		const suggestedTransferQty = Math.min(availableQty, shortageQty)
		if (suggestedTransferQty <= 0) continue

		const item = itemLookup.get(itemId)
		proposals.push({
			itemId,
			itemNo: item?.itemNo,
			description: item?.description,
			fromLocationCode: donor.locationCode,
			toLocationCode: recipient.locationCode,
			availableQty,
			shortageQty,
			suggestedTransferQty,
			rankScore: suggestedTransferQty * 100 + shortageQty,
		})
	}

	proposals.sort((a, b) => Number(b.rankScore ?? 0) - Number(a.rankScore ?? 0))
	const sliced = proposals.slice(0, limit)
	return {
		generatedAt: new Date().toISOString(),
		proposalCount: sliced.length,
		proposals: sliced,
	}
}

const executeFlowCashForecastSnapshotJob = ({
	context,
	horizonDays,
	lookbackDays,
	adverseVarianceThresholdPct,
}: {
	context: any
	horizonDays: number
	lookbackDays: number
	adverseVarianceThresholdPct: number
}) => {
	const tenantId = context.auth.tenantId
	const now = Date.now()
	const todayStart = startOfUtcDay(now)
	const lookbackStart = todayStart - lookbackDays * DAY_IN_MS

	const bankAccounts = context.db.schemas.bankAccounts.findMany({
		where: (row: any) => readTenantId(row) === tenantId,
	})
	const ledgerEntries = context.db.schemas.bankAccountLedgerEntries.findMany({
		where: (row: any) => readTenantId(row) === tenantId,
	})

	const dailyActuals = new Map<string, number>()
	let lookbackInflow = 0
	let lookbackOutflow = 0

	for (const entry of ledgerEntries) {
		const entryMeta = entry as Record<string, unknown>
		const timestamp =
			readTimestamp(entry.postingDate) ??
			readTimestamp(entryMeta._createdAt) ??
			readTimestamp(entryMeta.createdAt) ??
			readTimestamp(entryMeta._creationTime)
		if (!timestamp) continue
		const dayKey = toUtcDayKey(timestamp)
		const amount = Number(entry.amount ?? 0)
		dailyActuals.set(dayKey, (dailyActuals.get(dayKey) ?? 0) + amount)

		if (timestamp < lookbackStart || timestamp > now) continue
		if (amount >= 0) {
			lookbackInflow += amount
		} else {
			lookbackOutflow += Math.abs(amount)
		}
	}

	const averageDailyInflow = lookbackInflow / lookbackDays
	const averageDailyOutflow = lookbackOutflow / lookbackDays
	const averageDailyNet = averageDailyInflow - averageDailyOutflow
	const startingBalance = bankAccounts.reduce(
		(sum: number, account: any) => sum + Number(account.currentBalance ?? 0),
		0,
	)

	const forecast: Array<{
		date: string
		forecastNet: number
		forecastBalance: number
	}> = []
	let rollingBalance = startingBalance
	for (let index = 1; index <= horizonDays; index += 1) {
		const dayTimestamp = todayStart + index * DAY_IN_MS
		rollingBalance += averageDailyNet
		forecast.push({
			date: toIsoDay(dayTimestamp),
			forecastNet: Number(averageDailyNet.toFixed(2)),
			forecastBalance: Number(rollingBalance.toFixed(2)),
		})
	}

	const variance: Array<{
		date: string
		forecastNet: number
		actualNet: number
		varianceAmount: number
		variancePct: number
		isAdverse: boolean
	}> = []
	for (let index = horizonDays; index >= 1; index -= 1) {
		const dayTimestamp = todayStart - index * DAY_IN_MS
		const dayKey = toUtcDayKey(dayTimestamp)
		const actualNet = dailyActuals.get(dayKey) ?? 0
		const varianceAmount = actualNet - averageDailyNet
		const denominator = Math.max(1, Math.abs(averageDailyNet))
		const variancePct = (varianceAmount / denominator) * 100
		const isAdverse = variancePct <= -adverseVarianceThresholdPct

		variance.push({
			date: toIsoDay(dayTimestamp),
			forecastNet: Number(averageDailyNet.toFixed(2)),
			actualNet: Number(actualNet.toFixed(2)),
			varianceAmount: Number(varianceAmount.toFixed(2)),
			variancePct: Number(variancePct.toFixed(2)),
			isAdverse,
		})
	}

	const alerts: Array<{
		type: 'NEGATIVE_CASH_FORECAST' | 'ADVERSE_VARIANCE'
		severity: 'WARNING' | 'ERROR'
		message: string
	}> = []
	const firstNegativeForecast = forecast.find(
		(point) => point.forecastBalance < 0,
	)
	if (firstNegativeForecast) {
		alerts.push({
			type: 'NEGATIVE_CASH_FORECAST',
			severity: 'ERROR',
			message: `Projected cash balance turns negative on ${firstNegativeForecast.date}.`,
		})
	}
	const adverseVarianceDays = variance.filter((point) => point.isAdverse)
	if (adverseVarianceDays.length > 0) {
		const worstVariance = adverseVarianceDays.reduce((worst, point) =>
			point.variancePct < worst.variancePct ? point : worst,
		)
		alerts.push({
			type: 'ADVERSE_VARIANCE',
			severity: 'WARNING',
			message: `${adverseVarianceDays.length} day(s) crossed adverse variance threshold. Worst variance: ${worstVariance.variancePct.toFixed(1)}%.`,
		})
	}

	return {
		config: {
			horizonDays,
			lookbackDays,
			adverseVarianceThresholdPct,
		},
		baseline: {
			startingBalance: Number(startingBalance.toFixed(2)),
			averageDailyInflow: Number(averageDailyInflow.toFixed(2)),
			averageDailyOutflow: Number(averageDailyOutflow.toFixed(2)),
			averageDailyNet: Number(averageDailyNet.toFixed(2)),
		},
		forecast,
		variance,
		alerts,
		generatedAt: new Date(now).toISOString(),
	}
}

const createScheduledRunFailureEscalation = ({
	context,
	job,
	run,
	errorMessage,
}: {
	context: any
	job: Record<string, any>
	run: Record<string, any>
	errorMessage: string
}) => {
	const tenantId = context.auth.tenantId
	const marker = `[scheduled-run:${run._id}]`
	const existingTask = context.db.schemas.operationTasks.findMany({
		where: (row: any) =>
			readTenantId(row) === tenantId &&
			typeof row.description === 'string' &&
			row.description.includes(marker) &&
			row.status !== 'DONE',
		limit: 1,
	})[0]
	const existingNotification = context.db.schemas.moduleNotifications.findMany({
		where: (row: any) =>
			readTenantId(row) === tenantId &&
			typeof row.body === 'string' &&
			row.body.includes(marker) &&
			row.status !== 'ARCHIVED',
		limit: 1,
	})[0]

	const dueDate = new Date(Date.now() + 8 * HOUR_IN_MS).toISOString()
	const task =
		existingTask ??
		context.db.schemas.operationTasks.insert({
			taskNo: '',
			moduleId: 'hub',
			title: `Scheduled job failed: ${job.name ?? job.jobCode}`,
			description: `${marker} ${job.jobCode} failed: ${errorMessage}`,
			status: 'OPEN',
			priority: 'HIGH',
			dueDate,
		})
	const notification =
		existingNotification ??
		context.db.schemas.moduleNotifications.insert({
			moduleId: 'hub',
			title: `Scheduled job failed: ${job.jobCode}`,
			body: `${marker} ${errorMessage}`,
			status: 'UNREAD',
			severity: 'ERROR',
		})

	return {
		taskId: task?._id,
		notificationId: notification?._id,
	}
}

const executeScheduledJobAdapter = ({
	context,
	job,
	referenceTimestamp,
}: {
	context: any
	job: Record<string, any>
	referenceTimestamp: number
}) => {
	const config = parseConfigRecord(job.configJson)
	const jobCode = normalizeScheduledJobCode(String(job.jobCode ?? ''))

	if (jobCode === 'replenishment.generatePurchaseProposals') {
		const limit = readConfigNumber({
			config,
			key: 'limit',
			fallback: 25,
			min: 1,
			max: 100,
		})
		return executeReplenishmentPurchaseProposalJob({ context, limit })
	}

	if (jobCode === 'replenishment.generateTransferProposals') {
		const limit = readConfigNumber({
			config,
			key: 'limit',
			fallback: 25,
			min: 1,
			max: 100,
		})
		return executeReplenishmentTransferProposalJob({ context, limit })
	}

	if (jobCode === 'hub.evaluateSlaBreaches') {
		const lookAheadHours = readConfigNumber({
			config,
			key: 'lookAheadHours',
			fallback: 4,
			min: 1,
			max: 72,
		})
		const limit = readConfigNumber({
			config,
			key: 'limit',
			fallback: 500,
			min: 1,
			max: 500,
		})
		return evaluateSlaBreachesInternal({
			context,
			lookAheadHours,
			limit,
			asOf: new Date(referenceTimestamp).toISOString(),
		})
	}

	if (jobCode === 'flow.analytics.cashForecast') {
		const horizonDays = readConfigNumber({
			config,
			key: 'horizonDays',
			fallback: 30,
			min: 7,
			max: 90,
		})
		const lookbackDays = readConfigNumber({
			config,
			key: 'lookbackDays',
			fallback: 60,
			min: 14,
			max: 180,
		})
		const adverseVarianceThresholdPct = readConfigNumber({
			config,
			key: 'adverseVarianceThresholdPct',
			fallback: 15,
			min: 5,
			max: 75,
		})
		return executeFlowCashForecastSnapshotJob({
			context,
			horizonDays,
			lookbackDays,
			adverseVarianceThresholdPct,
		})
	}

	throw new Error(`Unsupported scheduled job code: ${jobCode}`)
}

const executeScheduledJobForReference = ({
	context,
	job,
	referenceTimestamp,
	trigger,
	retryFailed,
}: {
	context: any
	job: Record<string, any>
	referenceTimestamp: number
	trigger: 'SCHEDULED' | 'MANUAL'
	retryFailed: boolean
}) => {
	const window = getScheduledJobWindow(job, referenceTimestamp)
	const retryLimit = Math.max(0, Number(job.retryLimit ?? 0))
	const maxAttempts = 1 + retryLimit

	const existingRun = context.db.schemas.scheduledJobRuns.findMany({
		where: (row: any) =>
			readTenantId(row) === context.auth.tenantId &&
			row.jobId === job._id &&
			row.cadenceWindowKey === window.windowKey,
		limit: 1,
	})[0]

	let runRecord = existingRun
	if (runRecord?.status === 'SUCCESS') {
		return {
			jobCode: job.jobCode,
			status: 'SKIPPED' as const,
			reason: 'DUPLICATE_WINDOW',
			windowKey: window.windowKey,
			runId: runRecord._id,
		}
	}
	if (runRecord?.status === 'RUNNING') {
		return {
			jobCode: job.jobCode,
			status: 'SKIPPED' as const,
			reason: 'ALREADY_RUNNING',
			windowKey: window.windowKey,
			runId: runRecord._id,
		}
	}

	const runStartedAtIso = new Date().toISOString()
	if (runRecord?.status === 'FAILED') {
		const currentAttemptNo = Number(runRecord.attemptNo ?? 1)
		if (!retryFailed) {
			return {
				jobCode: job.jobCode,
				status: 'SKIPPED' as const,
				reason: 'FAILED_ALREADY',
				windowKey: window.windowKey,
				runId: runRecord._id,
				attemptNo: currentAttemptNo,
			}
		}
		if (currentAttemptNo >= maxAttempts) {
			return {
				jobCode: job.jobCode,
				status: 'SKIPPED' as const,
				reason: 'RETRY_LIMIT_REACHED',
				windowKey: window.windowKey,
				runId: runRecord._id,
				attemptNo: currentAttemptNo,
			}
		}
		runRecord = context.db.schemas.scheduledJobRuns.update(runRecord._id, {
			status: 'RUNNING',
			startedAt: runStartedAtIso,
			finishedAt: undefined,
			errorSummary: undefined,
			trigger: 'RETRY',
			attemptNo: currentAttemptNo + 1,
		})
	} else if (!runRecord?._id) {
		try {
			runRecord = context.db.schemas.scheduledJobRuns.insert({
				runNo: '',
				jobId: job._id,
				jobCode: job.jobCode,
				moduleId: job.moduleId,
				cadenceWindowKey: window.windowKey,
				status: 'RUNNING',
				startedAt: runStartedAtIso,
				attemptNo: 1,
				trigger,
			})
		} catch {
			const racedRun = context.db.schemas.scheduledJobRuns.findMany({
				where: (row: any) =>
					readTenantId(row) === context.auth.tenantId &&
					row.jobId === job._id &&
					row.cadenceWindowKey === window.windowKey,
				limit: 1,
			})[0]
			if (!racedRun?._id) {
				throw new Error('Unable to start scheduled job run')
			}
			return {
				jobCode: job.jobCode,
				status: 'SKIPPED' as const,
				reason: 'DUPLICATE_WINDOW',
				windowKey: window.windowKey,
				runId: racedRun._id,
			}
		}
	}

	if (!runRecord?._id) {
		throw new Error('Unable to resolve scheduled job run state')
	}

	try {
		const result = executeScheduledJobAdapter({
			context,
			job,
			referenceTimestamp,
		})
		const finishedAtIso = new Date().toISOString()
		const updatedRun = context.db.schemas.scheduledJobRuns.update(
			runRecord._id,
			{
				status: 'SUCCESS',
				finishedAt: finishedAtIso,
				errorSummary: undefined,
				resultJson: toJsonString(result),
			},
		)
		const updatedJob = context.db.schemas.scheduledJobs.update(job._id, {
			lastRunAt: finishedAtIso,
			lastRunStatus: 'SUCCESS',
			lastRunError: undefined,
			nextRunAt: new Date(
				nextScheduledRunTimestamp(job, referenceTimestamp),
			).toISOString(),
		})

		appendAuditLog(context, {
			moduleId: 'hub',
			action: 'hub.scheduler.run',
			entityType: 'scheduledJob',
			entityId: job._id,
			status: 'SUCCESS',
			message: `Scheduled job ${job.jobCode} completed`,
			after: {
				runId: updatedRun?._id ?? runRecord._id,
				windowKey: window.windowKey,
				trigger,
			},
		})

		return {
			jobCode: job.jobCode,
			status: 'SUCCESS' as const,
			windowKey: window.windowKey,
			runId: updatedRun?._id ?? runRecord._id,
			attemptNo: Number(updatedRun?.attemptNo ?? runRecord.attemptNo ?? 1),
			finishedAt: updatedJob?.lastRunAt ?? finishedAtIso,
		}
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : 'Unknown scheduled job error'
		const finishedAtIso = new Date().toISOString()
		const updatedRun = context.db.schemas.scheduledJobRuns.update(
			runRecord._id,
			{
				status: 'FAILED',
				finishedAt: finishedAtIso,
				errorSummary: errorMessage,
			},
		)
		context.db.schemas.scheduledJobs.update(job._id, {
			lastRunAt: finishedAtIso,
			lastRunStatus: 'FAILED',
			lastRunError: errorMessage,
			nextRunAt: new Date(
				nextScheduledRunTimestamp(job, referenceTimestamp),
			).toISOString(),
		})
		const escalation = createScheduledRunFailureEscalation({
			context,
			job,
			run: updatedRun ?? runRecord,
			errorMessage,
		})

		appendAuditLog(context, {
			moduleId: 'hub',
			action: 'hub.scheduler.run',
			entityType: 'scheduledJob',
			entityId: job._id,
			status: 'FAILED',
			message: errorMessage,
			after: {
				runId: updatedRun?._id ?? runRecord._id,
				windowKey: window.windowKey,
				failureTaskId: escalation.taskId,
				failureNotificationId: escalation.notificationId,
			},
		})

		return {
			jobCode: job.jobCode,
			status: 'FAILED' as const,
			windowKey: window.windowKey,
			runId: updatedRun?._id ?? runRecord._id,
			attemptNo: Number(updatedRun?.attemptNo ?? runRecord.attemptNo ?? 1),
			error: errorMessage,
		}
	}
}

const runDueScheduledJobsInternal = ({
	context,
	asOf,
	jobCodes,
}: {
	context: any
	asOf?: string
	jobCodes?: string[]
}) => {
	ensureScheduledJobsRegistered(context)
	const tenantId = context.auth.tenantId
	const referenceTimestamp = readTimestamp(asOf) ?? Date.now()
	const hasExplicitAsOf = typeof asOf === 'string' && asOf.trim().length > 0
	const requestedJobCodeSet =
		jobCodes && jobCodes.length > 0
			? new Set(
					jobCodes
						.map((jobCode) => normalizeScheduledJobCode(jobCode))
						.filter(Boolean),
				)
			: null

	const jobs = context.db.schemas.scheduledJobs.findMany({
		where: (row: any) => {
			if (readTenantId(row) !== tenantId) return false
			if (!row.enabled) return false
			if (requestedJobCodeSet && !requestedJobCodeSet.has(row.jobCode)) {
				return false
			}
			return true
		},
		orderBy: { field: '_updatedAt', direction: 'asc' },
	})

	const outcomes: Array<Record<string, unknown>> = []
	for (const job of jobs) {
		const nextRunTimestamp = readTimestamp(job.nextRunAt)
		if (
			nextRunTimestamp &&
			referenceTimestamp < nextRunTimestamp &&
			!hasExplicitAsOf
		) {
			outcomes.push({
				jobCode: job.jobCode,
				status: 'SKIPPED',
				reason: 'NOT_DUE',
				nextRunAt: job.nextRunAt,
			})
			continue
		}
		outcomes.push(
			executeScheduledJobForReference({
				context,
				job,
				referenceTimestamp,
				trigger: 'SCHEDULED',
				retryFailed: false,
			}),
		)
	}

	return {
		asOf: new Date(referenceTimestamp).toISOString(),
		scannedJobs: jobs.length,
		executed: outcomes.filter((entry) => entry.status === 'SUCCESS').length,
		failed: outcomes.filter((entry) => entry.status === 'FAILED').length,
		skipped: outcomes.filter((entry) => entry.status === 'SKIPPED').length,
		outcomes,
	}
}

const operationTasksRouter = createRPCRouter({
	...operationTasksCrudRouter,
	evaluateSlaBreaches: publicProcedure
		.input(evaluateSlaBreachesInputSchema)
		.route({
			method: 'POST',
			summary:
				'Evaluate task SLA status and emit escalation notifications for breaches',
		})
		.handler(({ input, context }) => {
			assertRole(context, 'MANAGER', 'hub SLA breach evaluation')
			return evaluateSlaBreachesInternal({
				context,
				moduleId: input.moduleId,
				lookAheadHours: input.lookAheadHours,
				asOf: input.asOf,
				limit: input.limit,
			})
		}),
	slaScoreboard: publicProcedure
		.input(slaScoreboardInputSchema)
		.route({
			method: 'GET',
			summary: 'Build operations SLA scoreboard and breach trend analytics',
		})
		.handler(({ input, context }) => {
			assertRole(context, 'AGENT', 'hub SLA scoreboard read')
			const tenantId = context.auth.tenantId
			const now = Date.now()
			const startWindowTimestamp = now - (input.windowDays - 1) * DAY_IN_MS
			const lookAheadMs = 4 * 60 * 60 * 1000

			const tasks = context.db.schemas.operationTasks.findMany({
				where: (row: any) => readTenantId(row) === tenantId,
			})

			const moduleMetrics = new Map<
				string,
				{
					moduleId: string
					totalTasks: number
					openTasks: number
					doneTasks: number
					blockedTasks: number
					breachedTasks: number
					atRiskTasks: number
					onTrackTasks: number
				}
			>()

			for (const task of tasks) {
				const moduleId = task.moduleId?.trim() || 'unknown'
				if (!moduleMetrics.has(moduleId)) {
					moduleMetrics.set(moduleId, {
						moduleId,
						totalTasks: 0,
						openTasks: 0,
						doneTasks: 0,
						blockedTasks: 0,
						breachedTasks: 0,
						atRiskTasks: 0,
						onTrackTasks: 0,
					})
				}
				const metric = moduleMetrics.get(moduleId)
				if (!metric) continue

				metric.totalTasks += 1
				if (task.status === 'DONE') {
					metric.doneTasks += 1
					continue
				}

				metric.openTasks += 1
				if (task.status === 'BLOCKED') {
					metric.blockedTasks += 1
				}

				const targetTimestamp = selectSlaTargetTimestamp(task)
				const inferredStatus: SlaStatus = targetTimestamp
					? deriveSlaStatus(targetTimestamp, now, lookAheadMs)
					: 'ON_TRACK'
				const currentSlaStatus = isSlaStatus(task.slaStatus)
					? task.slaStatus
					: inferredStatus

				if (currentSlaStatus === 'BREACHED') metric.breachedTasks += 1
				if (currentSlaStatus === 'AT_RISK') metric.atRiskTasks += 1
				if (currentSlaStatus === 'ON_TRACK') metric.onTrackTasks += 1
			}

			const moduleHealth = Array.from(moduleMetrics.values())
				.map((metric) => {
					const completionRate =
						metric.totalTasks > 0
							? (metric.doneTasks / metric.totalTasks) * 100
							: 100
					const breachRate =
						metric.openTasks > 0
							? (metric.breachedTasks / metric.openTasks) * 100
							: 0
					const healthScore = Math.max(
						0,
						Math.min(
							100,
							Math.round(
								100 -
									metric.breachedTasks * 25 -
									metric.atRiskTasks * 10 -
									metric.blockedTasks * 8 +
									completionRate * 0.2,
							),
						),
					)
					return {
						...metric,
						completionRate: Number(completionRate.toFixed(1)),
						breachRate: Number(breachRate.toFixed(1)),
						healthScore,
					}
				})
				.sort((a, b) => b.healthScore - a.healthScore)

			const daySeeds = Array.from({ length: input.windowDays }, (_, index) => {
				const timestamp = startWindowTimestamp + index * DAY_IN_MS
				return {
					key: toUtcDayKey(timestamp),
					label: toDayLabel(timestamp),
				}
			})
			const breachTrendBuckets = new Map(daySeeds.map((seed) => [seed.key, 0]))
			const moduleTrendBuckets = new Map<string, Map<string, number>>()

			const breachNotifications =
				context.db.schemas.moduleNotifications.findMany({
					where: (row: any) =>
						readTenantId(row) === tenantId &&
						typeof row.body === 'string' &&
						slaTaskMarkerPattern.test(row.body),
				})

			for (const notification of breachNotifications) {
				const notificationMeta = notification as unknown as Record<
					string,
					unknown
				>
				const notificationTimestamp =
					readTimestamp(notificationMeta._createdAt) ??
					readTimestamp(notificationMeta.createdAt) ??
					readTimestamp(notificationMeta._creationTime)
				if (!notificationTimestamp) continue
				if (notificationTimestamp < startWindowTimestamp) continue

				const dayKey = toUtcDayKey(notificationTimestamp)
				if (!breachTrendBuckets.has(dayKey)) continue
				breachTrendBuckets.set(
					dayKey,
					(breachTrendBuckets.get(dayKey) ?? 0) + 1,
				)

				const moduleId = notification.moduleId?.trim() || 'unknown'
				if (!moduleTrendBuckets.has(moduleId)) {
					moduleTrendBuckets.set(
						moduleId,
						new Map(daySeeds.map((seed) => [seed.key, 0])),
					)
				}
				const moduleBuckets = moduleTrendBuckets.get(moduleId)
				if (!moduleBuckets) continue
				moduleBuckets.set(dayKey, (moduleBuckets.get(dayKey) ?? 0) + 1)
			}

			const breachTrend = daySeeds.map((seed) => ({
				day: seed.label,
				count: breachTrendBuckets.get(seed.key) ?? 0,
			}))

			const moduleBreachTrend = Array.from(moduleTrendBuckets.entries())
				.map(([moduleId, buckets]) => {
					const points = daySeeds.map((seed) => ({
						day: seed.label,
						count: buckets.get(seed.key) ?? 0,
					}))
					const total = points.reduce((sum, point) => sum + point.count, 0)
					return { moduleId, total, points }
				})
				.sort((a, b) => b.total - a.total)
				.slice(0, 5)

			const summary = {
				moduleCount: moduleHealth.length,
				openTasks: moduleHealth.reduce(
					(sum, module) => sum + module.openTasks,
					0,
				),
				breachedTasks: moduleHealth.reduce(
					(sum, module) => sum + module.breachedTasks,
					0,
				),
				atRiskTasks: moduleHealth.reduce(
					(sum, module) => sum + module.atRiskTasks,
					0,
				),
				blockedTasks: moduleHealth.reduce(
					(sum, module) => sum + module.blockedTasks,
					0,
				),
				escalationNotifications: breachNotifications.length,
			}

			return {
				summary,
				moduleHealth,
				breachTrend,
				moduleBreachTrend,
				windowDays: input.windowDays,
				generatedAt: new Date(now).toISOString(),
			}
		}),
})

const notificationsRouter = createRPCRouter({
	...notificationsCrudRouter,
	bulkTransition: publicProcedure
		.input(bulkTransitionInputSchema)
		.route({
			method: 'POST',
			summary: 'Bulk transition hub notifications with per-record outcomes',
		})
		.handler(({ input, context }) => {
			assertRole(context, 'AGENT', 'hub bulk notification transition')
			const tenantId = context.auth.tenantId
			const uniqueIds = Array.from(
				new Set(input.ids.map((id) => id.trim()).filter(Boolean)),
			)
			if (uniqueIds.length === 0) {
				throw new Error('At least one notification ID is required')
			}

			const transitionedIds: string[] = []
			const skippedEntries: Array<{
				id: string
				status: string
				reason: string
			}> = []
			const failedEntries: Array<{
				id: string
				status: string
				reason: string
			}> = []

			for (const id of uniqueIds) {
				const notification = context.db.schemas.moduleNotifications.get(id)
				if (!notification) {
					failedEntries.push({
						id,
						status: 'NOT_FOUND',
						reason: 'Notification not found',
					})
					continue
				}
				if (readTenantId(notification) !== tenantId) {
					failedEntries.push({
						id,
						status: String(notification.status ?? 'UNKNOWN'),
						reason: 'Cross-tenant access is not allowed',
					})
					continue
				}

				const currentStatus = String(notification.status ?? 'UNKNOWN')
				const allowed =
					notificationStatusTransitions[
						currentStatus as keyof typeof notificationStatusTransitions
					] ?? []
				if (!allowed.includes(input.toStatus)) {
					skippedEntries.push({
						id,
						status: currentStatus,
						reason: `Transition "${currentStatus}" -> "${input.toStatus}" is not allowed`,
					})
					continue
				}

				const updated = context.db.schemas.moduleNotifications.update(id, {
					status: input.toStatus,
				})
				if (!updated) {
					failedEntries.push({
						id,
						status: currentStatus,
						reason: 'Unable to update notification status',
					})
					continue
				}

				transitionedIds.push(updated._id)
			}

			return {
				requested: uniqueIds.length,
				toStatus: input.toStatus,
				transitioned: transitionedIds.length,
				skipped: skippedEntries.length,
				failed: failedEntries.length,
				transitionedIds,
				skippedEntries,
				failedEntries,
				transitionedAt: new Date().toISOString(),
			}
		}),
	escalateCritical: publicProcedure
		.input(escalateCriticalInputSchema)
		.route({
			method: 'POST',
			summary:
				'Escalate unread critical notifications into operation tasks (idempotent)',
		})
		.handler(({ input, context }) => {
			assertRole(context, 'MANAGER', 'hub critical notification escalation')
			const tenantId = context.auth.tenantId
			const normalizedModuleId = input.moduleId?.trim()
			const normalizedAssigneeId = input.assignToUserId?.trim()
			const dueDate = new Date(
				Date.now() + input.dueInHours * 60 * 60 * 1000,
			).toISOString()

			const notifications = context.db.schemas.moduleNotifications.findMany({
				where: (row: any) => {
					if (readTenantId(row) !== tenantId) return false
					if (row.status !== 'UNREAD') return false
					if (normalizedModuleId && row.moduleId !== normalizedModuleId) {
						return false
					}
					const severity = (row.severity ?? 'INFO') as
						| 'INFO'
						| 'WARNING'
						| 'ERROR'
					return (
						notificationSeverityRank[severity] >=
						notificationSeverityRank[input.minSeverity]
					)
				},
				orderBy: { field: '_updatedAt', direction: 'asc' },
				limit: input.limit,
			})

			const existingEscalationTasks =
				context.db.schemas.operationTasks.findMany({
					where: (row: any) => {
						if (readTenantId(row) !== tenantId) return false
						if (!row.description) return false
						return notificationMarkerPattern.test(row.description)
					},
				})

			const existingTaskByNotificationId = new Map<string, string>()
			for (const task of existingEscalationTasks) {
				const match = notificationMarkerPattern.exec(task.description ?? '')
				if (!match?.[1]) continue
				if (!existingTaskByNotificationId.has(match[1])) {
					existingTaskByNotificationId.set(match[1], task._id)
				}
			}

			const tenantTasks = context.db.schemas.operationTasks.findMany({
				where: (row: any) => readTenantId(row) === tenantId,
			})
			const maxTaskSequence = tenantTasks.reduce((max, task) => {
				const match = taskNoPattern.exec(task.taskNo ?? '')
				if (!match?.[1]) return max
				const parsed = Number.parseInt(match[1], 10)
				if (!Number.isFinite(parsed)) return max
				return Math.max(max, parsed)
			}, 0)
			let nextTaskSequence = maxTaskSequence + 1

			const escalatedEntries: Array<{
				notificationId: string
				taskId: string
				priority: string
				moduleId: string
			}> = []
			const skippedEntries: Array<{
				notificationId: string
				reason: string
				taskId?: string
			}> = []
			const failedEntries: Array<{
				notificationId: string
				reason: string
			}> = []

			for (const notification of notifications) {
				const existingTaskId = existingTaskByNotificationId.get(
					notification._id,
				)
				if (existingTaskId) {
					skippedEntries.push({
						notificationId: notification._id,
						reason: 'Notification already escalated',
						taskId: existingTaskId,
					})
					continue
				}

				const marker = `[notification:${notification._id}]`
				const description = [
					marker,
					`Severity: ${notification.severity}.`,
					notification.body?.trim() || null,
				]
					.filter(Boolean)
					.join(' ')

				try {
					const createdTask = context.db.schemas.operationTasks.insert({
						taskNo: `TASK${String(nextTaskSequence).padStart(7, '0')}`,
						moduleId: notification.moduleId ?? 'hub',
						title: `Escalate notification: ${notification.title}`,
						description,
						status: 'OPEN',
						priority: notification.severity === 'ERROR' ? 'CRITICAL' : 'HIGH',
						assigneeUserId:
							normalizedAssigneeId || notification.targetUserId || undefined,
						dueDate,
					})
					nextTaskSequence += 1
					existingTaskByNotificationId.set(notification._id, createdTask._id)
					escalatedEntries.push({
						notificationId: notification._id,
						taskId: createdTask._id,
						priority: createdTask.priority,
						moduleId: createdTask.moduleId,
					})
				} catch (error) {
					failedEntries.push({
						notificationId: notification._id,
						reason:
							error instanceof Error
								? error.message
								: 'Unable to create escalation task',
					})
				}
			}

			return {
				scanned: notifications.length,
				escalated: escalatedEntries.length,
				skipped: skippedEntries.length,
				failed: failedEntries.length,
				escalatedEntries,
				skippedEntries,
				failedEntries,
				config: {
					moduleId: normalizedModuleId ?? null,
					assignToUserId: normalizedAssigneeId ?? null,
					dueInHours: input.dueInHours,
					minSeverity: input.minSeverity,
					limit: input.limit,
				},
				escalatedAt: new Date().toISOString(),
			}
		}),
})

const hubUsersRouter = createRPCRouter({
	...hubUsersCrudRouter,
	assignRoleToUser: publicProcedure
		.input(assignRoleToUserInputSchema)
		.route({
			method: 'POST',
			summary: 'Assign or toggle a role for a user within tenant-scoped RBAC',
		})
		.handler(({ input, context }) => {
			assertPermission(context, 'hub.rbac.assign-role', {
				fallbackRole: 'ADMIN',
				actionLabel: 'hub RBAC role assignment',
				moduleId: 'hub',
				entityType: 'hubUserRole',
				entityId: `${input.userId}:${input.roleCode}`,
			})

			const tenantId = context.auth.tenantId
			const normalizedUserId = input.userId.trim()
			const normalizedRoleCode = normalizeRoleCode(input.roleCode)
			if (!normalizedUserId) {
				throw new Error('User ID is required')
			}
			if (!normalizedRoleCode) {
				throw new Error('Role code is required')
			}

			const user = ensureHubUser({
				context,
				tenantId,
				userId: normalizedUserId,
			})
			const role = ensureHubRole({
				context,
				tenantId,
				roleCode: normalizedRoleCode,
			})

			const existingAssignment = context.db.schemas.hubUserRoles.findMany({
				where: (row: any) =>
					readTenantId(row) === tenantId &&
					row.hubUserId === user._id &&
					row.roleId === role._id,
				limit: 1,
			})[0]

			const assignedAt = new Date().toISOString()
			const assignment = existingAssignment
				? context.db.schemas.hubUserRoles.update(existingAssignment._id, {
						active: input.active,
						assignedAt,
						assignedByUserId: context.auth.userId,
					})
				: context.db.schemas.hubUserRoles.insert({
						hubUserId: user._id,
						roleId: role._id,
						active: input.active,
						assignedAt,
						assignedByUserId: context.auth.userId,
					})

			if (!assignment?._id) {
				throw new Error('Unable to persist role assignment')
			}

			appendAuditLog(context, {
				moduleId: 'hub',
				action: 'hub.rbac.assign-role',
				entityType: 'hubUserRole',
				entityId: assignment._id,
				status: 'SUCCESS',
				before: existingAssignment
					? {
							hubUserId: existingAssignment.hubUserId,
							roleId: existingAssignment.roleId,
							active: existingAssignment.active,
						}
					: null,
				after: {
					hubUserId: assignment.hubUserId,
					roleId: assignment.roleId,
					active: assignment.active,
					assignedByUserId: assignment.assignedByUserId,
				},
			})

			return {
				assignment,
				user,
				role,
				permissions: listEffectivePermissionCodes(
					context,
					normalizedUserId,
				).sort(),
			}
		}),
	getEffectivePermissions: publicProcedure
		.input(getEffectivePermissionsInputSchema)
		.route({
			method: 'GET',
			summary:
				'Resolve effective permissions for a user from persisted RBAC links',
		})
		.handler(({ input, context }) => {
			assertPermission(context, 'hub.rbac.read-effective-permissions', {
				fallbackRole: 'AGENT',
				actionLabel: 'hub effective permissions read',
				moduleId: 'hub',
				entityType: 'hubUser',
				entityId: input.userId,
			})

			const tenantId = context.auth.tenantId
			const normalizedUserId = input.userId.trim()
			if (!normalizedUserId) {
				throw new Error('User ID is required')
			}

			const user = context.db.schemas.hubUsers.findMany({
				where: (row: any) =>
					readTenantId(row) === tenantId && row.userId === normalizedUserId,
				limit: 1,
			})[0]
			const assignments = user
				? context.db.schemas.hubUserRoles.findMany({
						where: (row: any) =>
							readTenantId(row) === tenantId &&
							row.hubUserId === user._id &&
							row.active !== false,
					})
				: []
			const roleCodeById = readRoleCodeById({
				context,
				tenantId,
				roleIds: assignments.map((assignment: any) => assignment.roleId),
			})

			const roleCodes = Array.from(
				new Set(
					assignments
						.map((assignment: any) => roleCodeById.get(assignment.roleId))
						.filter((code): code is string => Boolean(code)),
				),
			).sort()

			return {
				userId: normalizedUserId,
				found: Boolean(user?._id),
				roleCodes,
				permissionCodes: listEffectivePermissionCodes(
					context,
					normalizedUserId,
				).sort(),
			}
		}),
})

const hubRolesRouter = createRPCRouter({
	...hubRolesCrudRouter,
	setRolePermissions: publicProcedure
		.input(setRolePermissionsInputSchema)
		.route({
			method: 'POST',
			summary:
				'Set full permission matrix for a role (adds missing, revokes absent)',
		})
		.handler(({ input, context }) => {
			assertPermission(context, 'hub.rbac.set-role-permissions', {
				fallbackRole: 'ADMIN',
				actionLabel: 'hub role permission matrix update',
				moduleId: 'hub',
				entityType: 'hubRole',
				entityId: input.roleCode,
			})

			const tenantId = context.auth.tenantId
			const normalizedRoleCode = normalizeRoleCode(input.roleCode)
			if (!normalizedRoleCode) {
				throw new Error('Role code is required')
			}

			const role = ensureHubRole({
				context,
				tenantId,
				roleCode: normalizedRoleCode,
			})
			const normalizedPermissionCodes = Array.from(
				new Set(
					input.permissionCodes
						.map((permissionCode) => normalizePermissionCode(permissionCode))
						.filter(Boolean),
				),
			).sort()

			const existingAssignments =
				context.db.schemas.hubRolePermissions.findMany({
					where: (row: any) =>
						readTenantId(row) === tenantId && row.roleId === role._id,
				})
			const existingPermissionCodeById = readPermissionCodeById({
				context,
				tenantId,
				permissionIds: existingAssignments.map(
					(assignment: any) => assignment.permissionId,
				),
			})
			const beforePermissionCodes = Array.from(
				new Set(
					existingAssignments
						.map((assignment: any) =>
							existingPermissionCodeById.get(assignment.permissionId),
						)
						.filter((code): code is string => Boolean(code)),
				),
			).sort()

			const targetPermissions = normalizedPermissionCodes.map(
				(permissionCode) =>
					ensureHubPermission({
						context,
						tenantId,
						permissionCode,
					}),
			)
			const targetPermissionIdSet = new Set(
				targetPermissions.map((permission) => permission._id),
			)
			const existingAssignmentByPermissionId = new Map<string, any>(
				existingAssignments.map((assignment: any) => [
					assignment.permissionId,
					assignment,
				]),
			)

			const revoked: string[] = []
			for (const assignment of existingAssignments) {
				if (targetPermissionIdSet.has(assignment.permissionId)) continue
				const permissionCode =
					existingPermissionCodeById.get(assignment.permissionId) ??
					assignment.permissionId
				revoked.push(permissionCode)
				context.db.schemas.hubRolePermissions.delete(assignment._id)
			}

			const granted: string[] = []
			const grantedAt = new Date().toISOString()
			for (const permission of targetPermissions) {
				if (existingAssignmentByPermissionId.has(permission._id)) continue
				context.db.schemas.hubRolePermissions.insert({
					roleId: role._id,
					permissionId: permission._id,
					grantedAt,
					grantedByUserId: context.auth.userId,
				})
				granted.push(permission.permissionCode)
			}

			appendAuditLog(context, {
				moduleId: 'hub',
				action: 'hub.rbac.set-role-permissions',
				entityType: 'hubRole',
				entityId: role._id,
				status: 'SUCCESS',
				before: {
					roleCode: normalizedRoleCode,
					permissionCodes: beforePermissionCodes,
				},
				after: {
					roleCode: normalizedRoleCode,
					permissionCodes: normalizedPermissionCodes,
					granted,
					revoked,
				},
			})

			return {
				roleId: role._id,
				roleCode: normalizedRoleCode,
				permissionCodes: normalizedPermissionCodes,
				granted,
				revoked,
			}
		}),
})

const hubPermissionsRouter = createRPCRouter({
	...hubPermissionsCrudRouter,
})

const hubUserRolesRouter = createRPCRouter({
	...hubUserRolesCrudRouter,
})

const hubRolePermissionsRouter = createRPCRouter({
	...hubRolePermissionsCrudRouter,
})

const hubModuleSettingsRouter = createRPCRouter({
	...hubModuleSettingsCrudRouter,
	upsertModuleSetting: publicProcedure
		.input(upsertModuleSettingInputSchema)
		.route({
			method: 'POST',
			summary: 'Upsert module setting and append an immutable revision entry',
		})
		.handler(({ input, context }) => {
			assertPermission(context, 'hub.settings.write', {
				fallbackRole: 'MANAGER',
				actionLabel: 'hub module setting upsert',
				moduleId: 'hub',
				entityType: 'hubModuleSetting',
				entityId: `${input.moduleId}:${input.settingKey}`,
			})

			const tenantId = context.auth.tenantId
			const moduleId = input.moduleId.trim().toLowerCase()
			const settingKey = input.settingKey.trim()
			if (!moduleId) {
				throw new Error('Module ID is required')
			}
			if (!settingKey) {
				throw new Error('Setting key is required')
			}

			const nowIso = new Date().toISOString()
			const valueJson = toJsonString(input.value)
			const existing = findModuleSetting({
				context,
				tenantId,
				moduleId,
				settingKey,
			})
			const nextRevisionNo = Number(existing?.revisionNo ?? 0) + 1
			const beforeValue = fromJsonString(existing?.valueJson)

			const setting = existing
				? context.db.schemas.hubModuleSettings.update(existing._id, {
						valueJson,
						schemaVersion: input.schemaVersion ?? existing.schemaVersion,
						revisionNo: nextRevisionNo,
						updatedByUserId: context.auth.userId,
						updatedAt: nowIso,
					})
				: context.db.schemas.hubModuleSettings.insert({
						moduleId,
						settingKey,
						valueJson,
						schemaVersion: input.schemaVersion,
						revisionNo: nextRevisionNo,
						updatedByUserId: context.auth.userId,
						updatedAt: nowIso,
					})
			if (!setting?._id) {
				throw new Error('Unable to persist module setting')
			}

			const revision = context.db.schemas.hubModuleSettingsRevisions.insert({
				settingId: setting._id,
				moduleId,
				settingKey,
				revisionNo: nextRevisionNo,
				valueJson,
				schemaVersion: input.schemaVersion ?? setting.schemaVersion,
				changeReason: input.changeReason,
				changedByUserId: context.auth.userId,
				changedAt: nowIso,
			})

			appendAuditLog(context, {
				moduleId: 'hub',
				action: 'hub.settings.write',
				entityType: 'hubModuleSetting',
				entityId: setting._id,
				status: 'SUCCESS',
				before: {
					moduleId,
					settingKey,
					value: beforeValue,
					revisionNo: existing?.revisionNo ?? null,
				},
				after: {
					moduleId,
					settingKey,
					value: input.value,
					revisionNo: nextRevisionNo,
				},
			})

			return {
				setting,
				revision,
				value: fromJsonString(setting.valueJson),
			}
		}),
	rollbackModuleSetting: publicProcedure
		.input(rollbackModuleSettingInputSchema)
		.route({
			method: 'POST',
			summary:
				'Rollback module setting to a previous revision and record rollback',
		})
		.handler(({ input, context }) => {
			assertPermission(context, 'hub.settings.rollback', {
				fallbackRole: 'ADMIN',
				actionLabel: 'hub module setting rollback',
				moduleId: 'hub',
				entityType: 'hubModuleSetting',
				entityId: `${input.moduleId}:${input.settingKey}`,
			})

			const tenantId = context.auth.tenantId
			const moduleId = input.moduleId.trim().toLowerCase()
			const settingKey = input.settingKey.trim()
			if (!moduleId) {
				throw new Error('Module ID is required')
			}
			if (!settingKey) {
				throw new Error('Setting key is required')
			}

			const setting = findModuleSetting({
				context,
				tenantId,
				moduleId,
				settingKey,
			})
			if (!setting?._id) {
				throw new Error('Module setting not found')
			}

			const revisionToRestore =
				context.db.schemas.hubModuleSettingsRevisions.findMany({
					where: (row: any) =>
						readTenantId(row) === tenantId &&
						row.settingId === setting._id &&
						Number(row.revisionNo ?? -1) === input.revisionNo,
					limit: 1,
				})[0]
			if (!revisionToRestore?._id) {
				throw new Error('Revision to rollback was not found')
			}

			const nowIso = new Date().toISOString()
			const nextRevisionNo = Number(setting.revisionNo ?? 0) + 1
			const updatedSetting = context.db.schemas.hubModuleSettings.update(
				setting._id,
				{
					valueJson: revisionToRestore.valueJson,
					schemaVersion:
						revisionToRestore.schemaVersion ?? setting.schemaVersion,
					revisionNo: nextRevisionNo,
					updatedByUserId: context.auth.userId,
					updatedAt: nowIso,
				},
			)
			if (!updatedSetting?._id) {
				throw new Error('Unable to update module setting during rollback')
			}

			const rollbackRevision =
				context.db.schemas.hubModuleSettingsRevisions.insert({
					settingId: updatedSetting._id,
					moduleId,
					settingKey,
					revisionNo: nextRevisionNo,
					valueJson: revisionToRestore.valueJson,
					schemaVersion:
						revisionToRestore.schemaVersion ?? updatedSetting.schemaVersion,
					changeReason: input.changeReason ?? 'Rollback',
					changedByUserId: context.auth.userId,
					changedAt: nowIso,
					rollbackOfRevisionNo: input.revisionNo,
				})

			appendAuditLog(context, {
				moduleId: 'hub',
				action: 'hub.settings.rollback',
				entityType: 'hubModuleSetting',
				entityId: updatedSetting._id,
				status: 'SUCCESS',
				before: {
					moduleId,
					settingKey,
					value: fromJsonString(setting.valueJson),
					revisionNo: setting.revisionNo,
				},
				after: {
					moduleId,
					settingKey,
					value: fromJsonString(revisionToRestore.valueJson),
					revisionNo: nextRevisionNo,
					rollbackOfRevisionNo: input.revisionNo,
				},
			})

			return {
				setting: updatedSetting,
				restoredFromRevisionNo: input.revisionNo,
				newRevisionNo: nextRevisionNo,
				rollbackRevision,
				value: fromJsonString(updatedSetting.valueJson),
			}
		}),
})

const hubModuleSettingRevisionsRouter = createRPCRouter({
	list: publicProcedure
		.input(
			z.object({
				moduleId: z.string().optional(),
				settingKey: z.string().optional(),
				limit: z.number().int().min(1).max(500).default(100),
				offset: z.number().int().min(0).default(0),
			}),
		)
		.route({
			method: 'GET',
			summary: 'List module setting revisions (read-only)',
		})
		.handler(({ input, context }) => {
			assertPermission(context, 'hub.settings.read-revisions', {
				fallbackRole: 'AGENT',
				actionLabel: 'hub setting revisions read',
				moduleId: 'hub',
				entityType: 'hubModuleSettingRevision',
			})

			const tenantId = context.auth.tenantId
			const moduleFilter = input.moduleId?.trim().toLowerCase()
			const settingKeyFilter = input.settingKey?.trim()

			const items = context.db.schemas.hubModuleSettingsRevisions.findMany({
				where: (row: any) => {
					if (readTenantId(row) !== tenantId) return false
					if (moduleFilter && row.moduleId !== moduleFilter) return false
					if (settingKeyFilter && row.settingKey !== settingKeyFilter)
						return false
					return true
				},
				orderBy: { field: '_updatedAt', direction: 'desc' },
				limit: input.limit,
				offset: input.offset,
			})

			return {
				items: items.map((item: any) => ({
					...item,
					value: fromJsonString(item.valueJson),
				})),
				nextOffset:
					items.length === input.limit ? input.offset + input.limit : null,
			}
		}),
	getById: publicProcedure
		.input(
			z.object({
				id: z.string(),
			}),
		)
		.route({
			method: 'GET',
			summary: 'Get module setting revision by ID (read-only)',
		})
		.handler(({ input, context }) => {
			assertPermission(context, 'hub.settings.read-revisions', {
				fallbackRole: 'AGENT',
				actionLabel: 'hub setting revision read',
				moduleId: 'hub',
				entityType: 'hubModuleSettingRevision',
				entityId: input.id,
			})

			const tenantId = context.auth.tenantId
			const row = context.db.schemas.hubModuleSettingsRevisions.get(input.id)
			if (!row) {
				throw new Error('Module setting revision not found')
			}
			if (readTenantId(row) !== tenantId) {
				throw new Error('Cross-tenant access is not allowed')
			}
			return {
				...row,
				value: fromJsonString(row.valueJson),
			}
		}),
})

const auditLogsRouter = createRPCRouter({
	list: publicProcedure
		.input(listAuditLogsInputSchema)
		.route({
			method: 'GET',
			summary: 'List immutable audit logs',
		})
		.handler(({ input, context }) => {
			assertPermission(context, 'hub.audit.read', {
				fallbackRole: 'MANAGER',
				actionLabel: 'hub audit read',
				moduleId: 'hub',
				entityType: 'hubAuditLog',
			})

			const tenantId = context.auth.tenantId
			const normalizedModuleId = input.moduleId?.trim().toLowerCase()
			const normalizedAction = input.action?.trim().toLowerCase()
			const normalizedActorUserId = input.actorUserId?.trim()

			const items = context.db.schemas.hubAuditLogs.findMany({
				where: (row: any) => {
					if (readTenantId(row) !== tenantId) return false
					if (normalizedModuleId && row.moduleId !== normalizedModuleId) {
						return false
					}
					if (
						normalizedAction &&
						!String(row.action ?? '')
							.toLowerCase()
							.includes(normalizedAction)
					) {
						return false
					}
					if (input.status && row.status !== input.status) {
						return false
					}
					if (
						normalizedActorUserId &&
						String(row.actorUserId ?? '') !== normalizedActorUserId
					) {
						return false
					}
					return true
				},
				orderBy: { field: '_updatedAt', direction: 'desc' },
				limit: input.limit,
				offset: input.offset,
			})

			return {
				items: items.map((item: any) => ({
					...item,
					before: fromJsonString(item.beforeJson),
					after: fromJsonString(item.afterJson),
				})),
				nextOffset:
					items.length === input.limit ? input.offset + input.limit : null,
			}
		}),
	getById: publicProcedure
		.input(
			z.object({
				id: z.string(),
			}),
		)
		.route({
			method: 'GET',
			summary: 'Get immutable audit log details by ID',
		})
		.handler(({ input, context }) => {
			assertPermission(context, 'hub.audit.read', {
				fallbackRole: 'MANAGER',
				actionLabel: 'hub audit detail read',
				moduleId: 'hub',
				entityType: 'hubAuditLog',
				entityId: input.id,
			})

			const tenantId = context.auth.tenantId
			const row = context.db.schemas.hubAuditLogs.get(input.id)
			if (!row) {
				throw new Error('Audit log not found')
			}
			if (readTenantId(row) !== tenantId) {
				throw new Error('Cross-tenant access is not allowed')
			}

			return {
				...row,
				before: fromJsonString(row.beforeJson),
				after: fromJsonString(row.afterJson),
			}
		}),
	exportLogs: publicProcedure
		.input(exportAuditLogsInputSchema)
		.route({
			method: 'GET',
			summary: 'Export filtered audit logs for compliance and operations',
		})
		.handler(({ input, context }) => {
			assertPermission(context, 'hub.audit.read', {
				fallbackRole: 'MANAGER',
				actionLabel: 'hub audit export',
				moduleId: 'hub',
				entityType: 'hubAuditLog',
			})

			const tenantId = context.auth.tenantId
			const normalizedModuleId = input.moduleId?.trim().toLowerCase()
			const normalizedAction = input.action?.trim().toLowerCase()
			const records = context.db.schemas.hubAuditLogs.findMany({
				where: (row: any) => {
					if (readTenantId(row) !== tenantId) return false
					if (normalizedModuleId && row.moduleId !== normalizedModuleId) {
						return false
					}
					if (
						normalizedAction &&
						!String(row.action ?? '')
							.toLowerCase()
							.includes(normalizedAction)
					) {
						return false
					}
					if (input.status && row.status !== input.status) return false
					return true
				},
				orderBy: { field: '_updatedAt', direction: 'desc' },
				limit: input.limit,
			})

			return {
				count: records.length,
				exportedAt: new Date().toISOString(),
				records: records.map((record: any) => ({
					...record,
					before: fromJsonString(record.beforeJson),
					after: fromJsonString(record.afterJson),
				})),
			}
		}),
})

const scheduledJobsRouter = createRPCRouter({
	...scheduledJobsCrudRouter,
	registerDefaults: publicProcedure
		.input(z.object({}).default({}))
		.route({
			method: 'POST',
			summary: 'Register default scheduler job definitions idempotently',
		})
		.handler(({ context }) => {
			assertPermission(context, 'hub.scheduler.manage', {
				fallbackRole: 'ADMIN',
				actionLabel: 'hub scheduler default registration',
				moduleId: 'hub',
				entityType: 'scheduledJob',
			})
			ensureScheduledJobsRegistered(context)
			const tenantId = context.auth.tenantId
			const items = context.db.schemas.scheduledJobs.findMany({
				where: (row: any) => readTenantId(row) === tenantId,
				orderBy: { field: 'jobCode', direction: 'asc' },
			})
			return {
				count: items.length,
				items,
			}
		}),
	setEnabled: publicProcedure
		.input(setScheduledJobEnabledInputSchema)
		.route({
			method: 'POST',
			summary: 'Enable or disable a scheduled job',
		})
		.handler(({ input, context }) => {
			assertPermission(context, 'hub.scheduler.manage', {
				fallbackRole: 'ADMIN',
				actionLabel: 'hub scheduler enable/disable',
				moduleId: 'hub',
				entityType: 'scheduledJob',
				entityId: input.jobCode,
			})
			ensureScheduledJobsRegistered(context)
			const tenantId = context.auth.tenantId
			const job = findScheduledJobByCode({
				context,
				tenantId,
				jobCode: input.jobCode,
			})
			if (!job?._id) {
				throw new Error('Scheduled job not found')
			}

			const updated = context.db.schemas.scheduledJobs.update(job._id, {
				enabled: input.enabled,
			})
			if (!updated) {
				throw new Error('Unable to update scheduled job state')
			}

			appendAuditLog(context, {
				moduleId: 'hub',
				action: 'hub.scheduler.manage',
				entityType: 'scheduledJob',
				entityId: job._id,
				status: 'SUCCESS',
				before: { enabled: job.enabled },
				after: { enabled: updated.enabled },
			})

			return updated
		}),
	runDueJobs: publicProcedure
		.input(runDueScheduledJobsInputSchema)
		.route({
			method: 'POST',
			summary: 'Execute due scheduler jobs at the specified reference time',
		})
		.handler(({ input, context }) => {
			assertPermission(context, 'hub.scheduler.execute', {
				fallbackRole: 'MANAGER',
				actionLabel: 'hub scheduler run due jobs',
				moduleId: 'hub',
				entityType: 'scheduledJob',
			})
			return runDueScheduledJobsInternal({
				context,
				asOf: input.asOf,
				jobCodes: input.jobCodes,
			})
		}),
	runJobNow: publicProcedure
		.input(runScheduledJobNowInputSchema)
		.route({
			method: 'POST',
			summary:
				'Execute a specific scheduled job immediately for current window',
		})
		.handler(({ input, context }) => {
			assertPermission(context, 'hub.scheduler.execute', {
				fallbackRole: 'MANAGER',
				actionLabel: 'hub scheduler run job now',
				moduleId: 'hub',
				entityType: 'scheduledJob',
				entityId: input.jobCode,
			})
			ensureScheduledJobsRegistered(context)
			const tenantId = context.auth.tenantId
			const job = findScheduledJobByCode({
				context,
				tenantId,
				jobCode: input.jobCode,
			})
			if (!job?._id) {
				throw new Error('Scheduled job not found')
			}
			const referenceTimestamp = readTimestamp(input.asOf) ?? Date.now()
			return executeScheduledJobForReference({
				context,
				job,
				referenceTimestamp,
				trigger: 'MANUAL',
				retryFailed: input.retryFailed,
			})
		}),
})

const scheduledJobRunsRouter = createRPCRouter({
	list: publicProcedure
		.input(listScheduledJobRunsInputSchema)
		.route({
			method: 'GET',
			summary: 'List scheduled job runs with status and timing',
		})
		.handler(({ input, context }) => {
			assertPermission(context, 'hub.scheduler.read', {
				fallbackRole: 'AGENT',
				actionLabel: 'hub scheduler run history read',
				moduleId: 'hub',
				entityType: 'scheduledJobRun',
			})
			ensureScheduledJobsRegistered(context)
			const tenantId = context.auth.tenantId
			const normalizedJobCode = input.jobCode
				? normalizeScheduledJobCode(input.jobCode)
				: undefined

			const items = context.db.schemas.scheduledJobRuns.findMany({
				where: (row: any) => {
					if (readTenantId(row) !== tenantId) return false
					if (normalizedJobCode && row.jobCode !== normalizedJobCode)
						return false
					if (input.status && row.status !== input.status) return false
					return true
				},
				orderBy: { field: '_updatedAt', direction: 'desc' },
				limit: input.limit,
				offset: input.offset,
			})
			return {
				items: items.map((item: any) => ({
					...item,
					result: fromJsonString(item.resultJson),
				})),
				nextOffset:
					items.length === input.limit ? input.offset + input.limit : null,
			}
		}),
	getById: publicProcedure
		.input(
			z.object({
				id: z.string(),
			}),
		)
		.route({
			method: 'GET',
			summary: 'Get scheduled job run details',
		})
		.handler(({ input, context }) => {
			assertPermission(context, 'hub.scheduler.read', {
				fallbackRole: 'AGENT',
				actionLabel: 'hub scheduler run detail read',
				moduleId: 'hub',
				entityType: 'scheduledJobRun',
				entityId: input.id,
			})
			const tenantId = context.auth.tenantId
			const run = context.db.schemas.scheduledJobRuns.get(input.id)
			if (!run) {
				throw new Error('Scheduled job run not found')
			}
			if (readTenantId(run) !== tenantId) {
				throw new Error('Cross-tenant access is not allowed')
			}
			return {
				...run,
				result: fromJsonString(run.resultJson),
			}
		}),
})

const orderFulfillmentRouter = createRPCRouter({
	startOrderFulfillment: publicProcedure
		.input(startOrderFulfillmentInputSchema)
		.route({
			method: 'POST',
			summary:
				'Start idempotent sales-order fulfillment orchestration across Ledger and Trace',
		})
		.handler(({ input, context }) => {
			assertRole(context, 'AGENT', 'hub order fulfillment start')
			const tenantId = context.auth.tenantId
			const order = context.db.schemas.salesHeaders.get(input.orderId)
			if (!order || readTenantId(order) !== tenantId) {
				throw new Error('Sales order not found')
			}
			if (order.status !== 'APPROVED' && order.status !== 'COMPLETED') {
				throw new Error('Sales order must be APPROVED before fulfillment')
			}

			const existingWorkflow = context.db.schemas.orderWorkflows.findMany({
				where: (row: any) =>
					readTenantId(row) === tenantId && row.salesOrderId === order._id,
				orderBy: { field: '_updatedAt', direction: 'desc' },
				limit: 1,
			})[0]

			if (existingWorkflow?.status === 'COMPLETED') {
				return {
					workflowId: existingWorkflow._id,
					workflowNo: existingWorkflow.workflowNo,
					salesOrderId: existingWorkflow.salesOrderId,
					salesOrderNo: existingWorkflow.salesOrderNo,
					status: existingWorkflow.status,
					currentStage: existingWorkflow.currentStage,
					invoiceId: existingWorkflow.invoiceId ?? null,
					invoiceNo: existingWorkflow.invoiceNo ?? null,
					shipmentId: existingWorkflow.shipmentId ?? null,
					shipmentNo: existingWorkflow.shipmentNo ?? null,
					steps: getWorkflowSteps(context, tenantId, existingWorkflow._id),
					idempotent: true,
				}
			}

			const workflow =
				existingWorkflow ??
				context.db.schemas.orderWorkflows.insert({
					workflowNo: '',
					salesOrderId: order._id,
					salesOrderNo: order.documentNo,
					status: 'RUNNING',
					currentStage: 'VALIDATE_ORDER',
					startedAt: new Date().toISOString(),
					retryCount: 0,
				})

			const execution = executeOrderFulfillmentWorkflow({
				context,
				workflowId: workflow._id,
			})

			return {
				workflowId: execution.workflow?._id ?? workflow._id,
				workflowNo: execution.workflow?.workflowNo ?? workflow.workflowNo,
				salesOrderId: execution.workflow?.salesOrderId ?? workflow.salesOrderId,
				salesOrderNo: execution.workflow?.salesOrderNo ?? workflow.salesOrderNo,
				status: execution.workflow?.status ?? 'FAILED',
				currentStage: execution.workflow?.currentStage ?? null,
				invoiceId: execution.workflow?.invoiceId ?? null,
				invoiceNo: execution.workflow?.invoiceNo ?? null,
				shipmentId: execution.workflow?.shipmentId ?? null,
				shipmentNo: execution.workflow?.shipmentNo ?? null,
				steps: execution.steps,
				completed: execution.completed,
				failed: execution.failed,
				failureStage: execution.failureStage ?? null,
				failureMessage: execution.failureMessage ?? null,
				idempotent: Boolean(existingWorkflow),
			}
		}),
	resumeOrderFulfillment: publicProcedure
		.input(resumeOrderFulfillmentInputSchema)
		.route({
			method: 'POST',
			summary:
				'Resume failed/running fulfillment workflow from persisted stage state',
		})
		.handler(({ input, context }) => {
			assertRole(context, 'AGENT', 'hub order fulfillment resume')
			const tenantId = context.auth.tenantId
			const workflow = context.db.schemas.orderWorkflows.get(input.workflowId)
			if (!workflow || readTenantId(workflow) !== tenantId) {
				throw new Error('Order workflow not found')
			}

			if (workflow.status === 'COMPLETED') {
				return {
					workflowId: workflow._id,
					workflowNo: workflow.workflowNo,
					salesOrderId: workflow.salesOrderId,
					salesOrderNo: workflow.salesOrderNo,
					status: workflow.status,
					currentStage: workflow.currentStage,
					invoiceId: workflow.invoiceId ?? null,
					invoiceNo: workflow.invoiceNo ?? null,
					shipmentId: workflow.shipmentId ?? null,
					shipmentNo: workflow.shipmentNo ?? null,
					steps: getWorkflowSteps(context, tenantId, workflow._id),
					resumed: false,
					idempotent: true,
				}
			}

			const execution = executeOrderFulfillmentWorkflow({
				context,
				workflowId: workflow._id,
			})

			return {
				workflowId: execution.workflow?._id ?? workflow._id,
				workflowNo: execution.workflow?.workflowNo ?? workflow.workflowNo,
				salesOrderId: execution.workflow?.salesOrderId ?? workflow.salesOrderId,
				salesOrderNo: execution.workflow?.salesOrderNo ?? workflow.salesOrderNo,
				status: execution.workflow?.status ?? 'FAILED',
				currentStage: execution.workflow?.currentStage ?? null,
				invoiceId: execution.workflow?.invoiceId ?? null,
				invoiceNo: execution.workflow?.invoiceNo ?? null,
				shipmentId: execution.workflow?.shipmentId ?? null,
				shipmentNo: execution.workflow?.shipmentNo ?? null,
				steps: execution.steps,
				completed: execution.completed,
				failed: execution.failed,
				failureStage: execution.failureStage ?? null,
				failureMessage: execution.failureMessage ?? null,
				resumed: true,
				idempotent: false,
			}
		}),
	getOrderFulfillmentStatus: publicProcedure
		.input(getOrderFulfillmentStatusInputSchema)
		.route({
			method: 'GET',
			summary: 'Get persisted order fulfillment workflow and stage status',
		})
		.handler(({ input, context }) => {
			assertRole(context, 'AGENT', 'hub order fulfillment status read')
			const tenantId = context.auth.tenantId
			const workflow = context.db.schemas.orderWorkflows.get(input.workflowId)
			if (!workflow || readTenantId(workflow) !== tenantId) {
				throw new Error('Order workflow not found')
			}
			const steps = getWorkflowSteps(context, tenantId, workflow._id)
			const completedSteps = steps.filter(
				(step) => step.status === 'COMPLETED',
			).length
			const failedSteps = steps.filter(
				(step) => step.status === 'FAILED',
			).length

			return {
				workflowId: workflow._id,
				workflowNo: workflow.workflowNo,
				salesOrderId: workflow.salesOrderId,
				salesOrderNo: workflow.salesOrderNo,
				status: workflow.status,
				currentStage: workflow.currentStage,
				invoiceId: workflow.invoiceId ?? null,
				invoiceNo: workflow.invoiceNo ?? null,
				shipmentId: workflow.shipmentId ?? null,
				shipmentNo: workflow.shipmentNo ?? null,
				retryCount: Number(workflow.retryCount ?? 0),
				startedAt: workflow.startedAt ?? null,
				completedAt: workflow.completedAt ?? null,
				failedAt: workflow.failedAt ?? null,
				failureCode: workflow.failureCode ?? null,
				failureMessage: workflow.failureMessage ?? null,
				failureTaskId: workflow.failureTaskId ?? null,
				failureNotificationId: workflow.failureNotificationId ?? null,
				summary: {
					stageCount: steps.length,
					completedSteps,
					failedSteps,
				},
				steps,
			}
		}),
})

export const hubRouter = createRPCRouter({
	operationTasks: operationTasksRouter,
	notifications: notificationsRouter,
	users: hubUsersRouter,
	roles: hubRolesRouter,
	permissions: hubPermissionsRouter,
	userRoles: hubUserRolesRouter,
	rolePermissions: hubRolePermissionsRouter,
	moduleSettings: hubModuleSettingsRouter,
	moduleSettingRevisions: hubModuleSettingRevisionsRouter,
	auditLogs: auditLogsRouter,
	scheduledJobs: scheduledJobsRouter,
	scheduledJobRuns: scheduledJobRunsRouter,
	orderFulfillment: orderFulfillmentRouter,
	reporting: reportingRouter,
})
