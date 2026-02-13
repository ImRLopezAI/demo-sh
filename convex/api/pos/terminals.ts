import { terminals } from '@server/convex/pos'
import { createTenantScoped } from '../../utils'

export const { list, getById, create, update, remove, transitionStatus, kpis } =
	createTenantScoped({
		moduleName: 'pos',
		prefix: 'terminals',
		primaryTable: 'terminals',
		statusField: 'status',
		transitions: {
			ONLINE: ['OFFLINE', 'MAINTENANCE'],
			OFFLINE: ['ONLINE', 'MAINTENANCE'],
			MAINTENANCE: ['ONLINE', 'OFFLINE'],
		},
		createSchema: terminals.insertSchema,
		updateSchema: terminals.updateSchema,
	})
