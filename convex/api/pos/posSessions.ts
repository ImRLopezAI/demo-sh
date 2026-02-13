import { posSessions } from '@server/convex/pos'
import { createTenantScoped } from '../../utils'

export const { list, getById, create, update, remove, transitionStatus, kpis } =
	createTenantScoped({
		moduleName: 'pos',
		prefix: 'posSessions',
		primaryTable: 'posSessions',
		statusField: 'status',
		transitions: {
			OPEN: ['PAUSED', 'CLOSED'],
			PAUSED: ['OPEN', 'CLOSED'],
		},
		createSchema: posSessions.insertSchema,
		updateSchema: posSessions.updateSchema,
	})
