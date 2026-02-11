import { createRPCRouter } from '@server/rpc/init'
import { createTenantScopedCrudRouter } from '../helpers'

const posTransactionsRouter = createTenantScopedCrudRouter({
	moduleName: 'pos/transactions',
	primaryTable: 'posTransactions',
	viewTables: { overview: 'posTransactions' },
	statusField: 'status',
	transitions: {
		OPEN: ['COMPLETED', 'VOIDED'],
		COMPLETED: ['REFUNDED'],
	},
	reasonRequiredStatuses: ['VOIDED', 'REFUNDED'],
})

const posTransactionLinesRouter = createTenantScopedCrudRouter({
	moduleName: 'pos/transaction-lines',
	primaryTable: 'posTransactionLines',
	viewTables: { overview: 'posTransactionLines' },
})

const terminalsRouter = createTenantScopedCrudRouter({
	moduleName: 'pos/terminals',
	primaryTable: 'terminals',
	viewTables: { overview: 'terminals' },
	statusField: 'status',
	transitions: {
		ONLINE: ['OFFLINE', 'MAINTENANCE'],
		OFFLINE: ['ONLINE', 'MAINTENANCE'],
		MAINTENANCE: ['ONLINE', 'OFFLINE'],
	},
})

const posSessionsRouter = createTenantScopedCrudRouter({
	moduleName: 'pos/sessions',
	primaryTable: 'posSessions',
	viewTables: { overview: 'posSessions' },
	statusField: 'status',
	transitions: {
		OPEN: ['PAUSED', 'CLOSED'],
		PAUSED: ['OPEN', 'CLOSED'],
	},
})

export const posRouter = createRPCRouter({
	transactions: posTransactionsRouter,
	transactionLines: posTransactionLinesRouter,
	terminals: terminalsRouter,
	sessions: posSessionsRouter,
})
