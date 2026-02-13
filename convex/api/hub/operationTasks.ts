import { operationTasks } from '@server/convex/hub'
import { createTenantScoped } from 'convex/utils'

export const { list, getById, create, update, remove, transitionStatus, kpis } =
	createTenantScoped({
		moduleName: 'hub',
		prefix: 'operationTasks',
		primaryTable: 'operationTasks',
		statusField: 'status',
		transitions: {
			OPEN: ['IN_PROGRESS', 'BLOCKED'],
			IN_PROGRESS: ['BLOCKED', 'DONE'],
			BLOCKED: ['IN_PROGRESS', 'DONE'],
		},
		reasonRequiredStatuses: ['BLOCKED'],
		createSchema: operationTasks.insertSchema,
		updateSchema: operationTasks.updateSchema,
	})
