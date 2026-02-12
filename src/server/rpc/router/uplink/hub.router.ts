import { createRPCRouter } from '@server/rpc/init'
import { createTenantScopedCrudRouter } from '../helpers'

const operationTasksRouter = createTenantScopedCrudRouter({
	moduleName: 'hub',
	prefix: 'operation-tasks',
	primaryTable: 'operationTasks',
	viewTables: {
		overview: 'operationTasks',
		operations: 'operationTasks',
		notifications: 'moduleNotifications',
	},
	statusField: 'status',
	transitions: {
		OPEN: ['IN_PROGRESS', 'BLOCKED'],
		IN_PROGRESS: ['BLOCKED', 'DONE'],
		BLOCKED: ['IN_PROGRESS', 'DONE'],
	},
	reasonRequiredStatuses: ['BLOCKED'],
})

const notificationsRouter = createTenantScopedCrudRouter({
	moduleName: 'hub',
	prefix: 'notifications',
	primaryTable: 'moduleNotifications',
	viewTables: { overview: 'moduleNotifications' },
	statusField: 'status',
	transitions: {
		UNREAD: ['READ', 'ARCHIVED'],
		READ: ['ARCHIVED'],
	},
})

export const hubRouter = createRPCRouter({
	operationTasks: operationTasksRouter,
	notifications: notificationsRouter,
})
