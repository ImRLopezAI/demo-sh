import { createRPCRouter, publicProcedure } from '@server/rpc/init'
import z from 'zod'
import { assertRole } from '../authz'
import { createTenantScopedCrudRouter } from '../helpers'

const posTransactionsRouter = createTenantScopedCrudRouter({
	moduleName: 'pos',
	prefix: 'transactions',
	primaryTable: 'posTransactions',
	viewTables: { overview: 'posTransactions' },
	statusField: 'status',
	transitions: {
		OPEN: ['COMPLETED', 'VOIDED'],
		COMPLETED: ['REFUNDED'],
	},
	reasonRequiredStatuses: ['VOIDED', 'REFUNDED'],
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
	transitions: {
		ONLINE: ['OFFLINE', 'MAINTENANCE'],
		OFFLINE: ['ONLINE', 'MAINTENANCE'],
		MAINTENANCE: ['ONLINE', 'OFFLINE'],
	},
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
	transitions: {
		OPEN: ['PAUSED', 'CLOSED'],
		PAUSED: ['OPEN', 'CLOSED'],
	},
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

const readTenantId = (row: unknown) =>
	(row as { tenantId?: string }).tenantId ?? 'demo-tenant'

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
})

export const posRouter = createRPCRouter({
	transactions: posTransactionsRouter,
	transactionLines: posTransactionLinesRouter,
	terminals: terminalsRouter,
	sessions: sessionsRouter,
})
