import {
	POS_SESSION_TRANSITIONS,
	POS_TRANSACTION_REASON_REQUIRED,
	POS_TRANSACTION_TRANSITIONS,
	TERMINAL_TRANSITIONS,
} from '@server/db/constants'
import {
	BUILT_IN_LAYOUT_KEYS,
	getBuiltInLayout,
	renderReportFile,
} from '@server/reporting'
import { buildPosReceiptDataSet } from '@server/reporting/entity-adapters/pos-receipt'
import { createRPCRouter, publicProcedure } from '@server/rpc/init'
import z from 'zod'
import { appendAuditLog, assertRole } from '../authz'
import { createTenantScopedCrudRouter } from '../helpers'

const posTransactionsRouter = createTenantScopedCrudRouter({
	moduleName: 'pos',
	prefix: 'transactions',
	primaryTable: 'posTransactions',
	viewTables: { overview: 'posTransactions' },
	statusField: 'status',
	transitions: POS_TRANSACTION_TRANSITIONS,
	reasonRequiredStatuses: POS_TRANSACTION_REASON_REQUIRED,
	statusRoleRequirements: {
		VOIDED: 'MANAGER',
		REFUNDED: 'MANAGER',
	},
})

const posTransactionLinesRouter = createTenantScopedCrudRouter({
	moduleName: 'pos',
	prefix: 'transaction-lines',
	primaryTable: 'posTransactionLines',
	viewTables: { overview: 'posTransactionLines' },
	parentRelations: [
		{
			childField: 'transactionId',
			parentTable: 'posTransactions',
		},
		{
			childField: 'itemId',
			parentTable: 'items',
		},
	],
})

const terminalsRouter = createTenantScopedCrudRouter({
	moduleName: 'pos',
	prefix: 'terminals',
	primaryTable: 'terminals',
	viewTables: { overview: 'terminals' },
	statusField: 'status',
	transitions: TERMINAL_TRANSITIONS,
	statusRoleRequirements: {
		MAINTENANCE: 'MANAGER',
	},
})

const posSessionsRouter = createTenantScopedCrudRouter({
	moduleName: 'pos',
	prefix: 'sessions',
	primaryTable: 'posSessions',
	viewTables: { overview: 'posSessions' },
	statusField: 'status',
	transitions: POS_SESSION_TRANSITIONS,
	statusRoleRequirements: {
		CLOSED: 'MANAGER',
	},
})

const startSessionInputSchema = z.object({
	terminalId: z.string(),
	cashierId: z.string().optional(),
	openingBalance: z.number().min(0).max(50000).default(0),
	reuseOpenSession: z.boolean().default(true),
})

const closeShiftInputSchema = z.object({
	sessionId: z.string(),
	closingBalance: z.number().min(0).max(50000),
	varianceReason: z.string().trim().optional(),
	managerSignoffUserId: z.string().trim().optional(),
	approvalVarianceThreshold: z.number().min(1).max(5000).default(20),
})

const governTransactionInputSchema = z.object({
	transactionId: z.string(),
	action: z.enum(['VOID', 'REFUND']),
	reason: z.string().trim().min(1),
	idempotencyKey: z.string().trim().optional(),
	offlineOperationId: z.string().trim().optional(),
})

const generateReceiptInputSchema = z.object({
	transactionId: z.string(),
	builtInLayout: z.enum(BUILT_IN_LAYOUT_KEYS).default('THERMAL_RECEIPT'),
})

const readTenantId = (row: unknown) =>
	(row as { tenantId?: string }).tenantId ?? 'demo-tenant'

const resolveTransactionAction = (
	transaction: { status?: string },
	action: 'VOID' | 'REFUND',
):
	| {
			type: 'APPLY'
			targetStatus: 'VOIDED' | 'REFUNDED'
	  }
	| {
			type: 'IDEMPOTENT'
			targetStatus: 'VOIDED' | 'REFUNDED'
	  }
	| {
			type: 'CONFLICT'
			conflictType:
				| 'ALREADY_VOIDED'
				| 'ALREADY_REFUNDED'
				| 'INVALID_STATUS_TRANSITION'
			targetStatus: 'VOIDED' | 'REFUNDED'
	  } => {
	const status = String(transaction.status ?? 'OPEN')
	const targetStatus = action === 'VOID' ? 'VOIDED' : 'REFUNDED'
	if (status === targetStatus) {
		return { type: 'IDEMPOTENT', targetStatus }
	}
	if (action === 'VOID') {
		if (status === 'REFUNDED') {
			return {
				type: 'CONFLICT',
				targetStatus,
				conflictType: 'ALREADY_REFUNDED',
			}
		}
		if (status !== 'OPEN') {
			return {
				type: 'CONFLICT',
				targetStatus,
				conflictType: 'INVALID_STATUS_TRANSITION',
			}
		}
		return { type: 'APPLY', targetStatus }
	}
	if (status === 'VOIDED') {
		return { type: 'CONFLICT', targetStatus, conflictType: 'ALREADY_VOIDED' }
	}
	if (status !== 'COMPLETED') {
		return {
			type: 'CONFLICT',
			targetStatus,
			conflictType: 'INVALID_STATUS_TRANSITION',
		}
	}
	return { type: 'APPLY', targetStatus }
}

const transactionsRouter = createRPCRouter({
	...posTransactionsRouter,
	governTransaction: publicProcedure
		.input(governTransactionInputSchema)
		.route({
			method: 'POST',
			summary:
				'Govern refund/void commands with idempotency and offline replay conflict safety',
		})
		.handler(({ input, context }) => {
			assertRole(context, 'MANAGER', 'pos transaction governance action')
			const tenantId = context.auth.tenantId
			const transaction = context.db.schemas.posTransactions.get(
				input.transactionId,
			)
			if (!transaction || readTenantId(transaction) !== tenantId) {
				throw new Error('POS transaction not found')
			}

			const transitionDecision = resolveTransactionAction(
				transaction,
				input.action,
			)
			if (transitionDecision.type === 'CONFLICT') {
				return {
					transactionId: transaction._id,
					status: transaction.status,
					action: input.action,
					idempotent: false,
					conflict: {
						type: transitionDecision.conflictType,
						resolution:
							transitionDecision.conflictType === 'INVALID_STATUS_TRANSITION'
								? 'MANUAL_REVIEW'
								: 'SKIP',
						remediation:
							transitionDecision.conflictType === 'INVALID_STATUS_TRANSITION'
								? 'Refresh transaction status and re-run governance action.'
								: 'Offline replay detected prior terminal action; skip duplicate command.',
					},
				}
			}
			if (transitionDecision.type === 'IDEMPOTENT') {
				return {
					transactionId: transaction._id,
					status: transaction.status,
					action: input.action,
					idempotent: true,
					conflict: null,
				}
			}

			const correlationId =
				input.idempotencyKey?.trim() ||
				input.offlineOperationId?.trim() ||
				undefined
			if (correlationId) {
				const priorAudit = context.db.schemas.hubAuditLogs.findMany({
					where: (row) =>
						readTenantId(row) === tenantId &&
						row.action === `pos.transaction.governance.${input.action}` &&
						row.entityId === transaction._id &&
						row.correlationId === correlationId &&
						row.status === 'SUCCESS',
					limit: 1,
				})[0]
				if (priorAudit) {
					const refreshed = context.db.schemas.posTransactions.get(
						transaction._id,
					)
					return {
						transactionId: transaction._id,
						status: refreshed?.status ?? transaction.status,
						action: input.action,
						idempotent: true,
						conflict: null,
					}
				}
			}

			const updated = context.db.schemas.posTransactions.update(
				transaction._id,
				{
					status: transitionDecision.targetStatus,
					statusReason: input.reason,
					statusUpdatedAt: new Date(),
				},
			)
			if (!updated) {
				throw new Error('Unable to apply POS transaction governance action')
			}

			const session = context.db.schemas.posSessions.get(updated.posSessionId)
			appendAuditLog(context, {
				moduleId: 'pos',
				action: `pos.transaction.governance.${input.action}`,
				entityType: 'posTransaction',
				entityId: updated._id,
				status: 'SUCCESS',
				message: `Governed ${input.action} for transaction ${updated.receiptNo} (${updated.status}). Session=${session?.sessionNo ?? updated.posSessionId}, terminal=${session?.terminalId ?? 'unknown'}.`,
				correlationId,
			})

			return {
				transactionId: updated._id,
				status: updated.status,
				action: input.action,
				idempotent: false,
				conflict: null,
			}
		}),
	generateReceipt: publicProcedure
		.input(generateReceiptInputSchema)
		.route({
			method: 'POST',
			summary: 'Generate POS receipt PDF for a transaction',
		})
		.handler(async ({ input, context }) => {
			assertRole(context, 'AGENT', 'pos receipt generation')

			const dataSet = buildPosReceiptDataSet(context, input.transactionId)
			const layout = getBuiltInLayout(input.builtInLayout)
			const file = await renderReportFile({
				layout,
				dataSet,
				filenameSuffix: 'receipt',
			})

			context.resHeaders?.set('Content-Type', 'application/pdf')
			context.resHeaders?.set(
				'Content-Disposition',
				`attachment; filename="${file.name}"`,
			)
			return file
		}),
})

const sessionsRouter = createRPCRouter({
	...posSessionsRouter,
	startSession: publicProcedure
		.input(startSessionInputSchema)
		.route({
			method: 'POST',
			summary: 'Start a POS session for a terminal (agent-invocable)',
		})
		.handler(({ input, context }) => {
			assertRole(context, 'AGENT', 'pos session start')
			const tenantId = context.auth.tenantId
			const terminal = context.db.schemas.terminals.get(input.terminalId)
			if (!terminal) {
				throw new Error('Terminal not found')
			}
			if (readTenantId(terminal) !== tenantId) {
				throw new Error('Cross-tenant access is not allowed')
			}
			if (terminal.status !== 'ONLINE') {
				throw new Error('POS sessions can only be started on ONLINE terminals')
			}

			const normalizedCashierId = input.cashierId?.trim() || context.auth.userId
			if (input.reuseOpenSession) {
				const existingOpenSession = context.db.schemas.posSessions.findMany({
					where: (row) =>
						readTenantId(row) === tenantId &&
						row.terminalId === terminal._id &&
						row.status === 'OPEN' &&
						(!normalizedCashierId || row.cashierId === normalizedCashierId),
					orderBy: { field: '_updatedAt', direction: 'desc' },
					limit: 1,
				})[0]

				if (existingOpenSession) {
					return {
						sessionId: existingOpenSession._id,
						sessionNo: existingOpenSession.sessionNo,
						status: existingOpenSession.status,
						terminalId: terminal._id,
						terminalName: terminal.name,
						cashierId: existingOpenSession.cashierId ?? null,
						idempotent: true,
					}
				}
			}

			const startedSession = context.db.schemas.posSessions.insert({
				sessionNo: '',
				terminalId: terminal._id,
				cashierId: normalizedCashierId || undefined,
				status: 'OPEN',
				openedAt: new Date(),
				openingBalance: input.openingBalance,
				closingBalance: input.openingBalance,
				transactionCount: 0,
				totalSales: 0,
			})

			return {
				sessionId: startedSession._id,
				sessionNo: startedSession.sessionNo,
				status: startedSession.status,
				terminalId: terminal._id,
				terminalName: terminal.name,
				cashierId: startedSession.cashierId ?? null,
				idempotent: false,
			}
		}),
	closeShift: publicProcedure
		.input(closeShiftInputSchema)
		.route({
			method: 'POST',
			summary:
				'Close shift with variance controls and manager sign-off policy enforcement',
		})
		.handler(({ input, context }) => {
			assertRole(context, 'AGENT', 'pos shift close')
			const tenantId = context.auth.tenantId
			const session = context.db.schemas.posSessions.get(input.sessionId)
			if (!session || readTenantId(session) !== tenantId) {
				throw new Error('POS session not found')
			}

			if (session.status === 'CLOSED') {
				return {
					sessionId: session._id,
					sessionNo: session.sessionNo,
					status: session.status,
					variance: Number(
						(
							Number(session.closingBalance ?? 0) -
							Number(session.openingBalance ?? 0)
						).toFixed(2),
					),
					managerApprovalRequired: false,
					idempotent: true,
				}
			}
			if (session.status !== 'OPEN' && session.status !== 'PAUSED') {
				throw new Error('Only OPEN or PAUSED sessions can be closed')
			}

			const variance = Number(
				(input.closingBalance - Number(session.openingBalance ?? 0)).toFixed(2),
			)
			const managerApprovalRequired =
				Math.abs(variance) >= input.approvalVarianceThreshold
			if (managerApprovalRequired) {
				if (!input.varianceReason?.trim()) {
					throw new Error(
						'Variance reason is required when manager approval threshold is exceeded',
					)
				}
				if (!input.managerSignoffUserId?.trim()) {
					throw new Error(
						'Manager sign-off is required when variance exceeds policy threshold',
					)
				}
				assertRole(context, 'MANAGER', 'pos shift close high-variance approval')
			}

			const updated = context.db.schemas.posSessions.update(session._id, {
				status: 'CLOSED',
				closingBalance: input.closingBalance,
				closedAt: new Date(),
			})
			if (!updated) {
				throw new Error('Unable to close POS session')
			}

			appendAuditLog(context, {
				moduleId: 'pos',
				action: 'pos.shift.close',
				entityType: 'posSession',
				entityId: updated._id,
				status: 'SUCCESS',
				message: `Shift ${updated.sessionNo} closed on terminal ${updated.terminalId} with variance ${variance.toFixed(2)} by ${context.auth.userId}.`,
				correlationId: input.managerSignoffUserId?.trim() || undefined,
			})

			return {
				sessionId: updated._id,
				sessionNo: updated.sessionNo,
				status: updated.status,
				variance,
				managerApprovalRequired,
				idempotent: false,
			}
		}),
})

export const posRouter = createRPCRouter({
	transactions: transactionsRouter,
	transactionLines: posTransactionLinesRouter,
	terminals: terminalsRouter,
	sessions: sessionsRouter,
})
