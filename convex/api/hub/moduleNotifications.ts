import { moduleNotifications } from '@server/convex/hub'
import { createTenantScoped } from 'convex/utils'

export const { list, getById, create, update, remove, transitionStatus, kpis } =
	createTenantScoped({
		moduleName: 'hub',
		prefix: 'moduleNotifications',
		primaryTable: 'moduleNotifications',
		statusField: 'status',
		transitions: {
			UNREAD: ['READ', 'ARCHIVED'],
			READ: ['ARCHIVED'],
		},
		createSchema: moduleNotifications.insertSchema,
		updateSchema: moduleNotifications.updateSchema,
	})
