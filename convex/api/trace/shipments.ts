import { shipments } from '@server/convex/trace'
import { createTenantScoped } from '../../utils'

export const { list, getById, create, update, remove, transitionStatus, kpis } =
	createTenantScoped({
		moduleName: 'trace',
		prefix: 'shipments',
		primaryTable: 'shipments',
		statusField: 'status',
		transitions: {
			PLANNED: ['DISPATCHED', 'EXCEPTION'],
			DISPATCHED: ['IN_TRANSIT', 'EXCEPTION'],
			IN_TRANSIT: ['DELIVERED', 'EXCEPTION'],
			DELIVERED: ['EXCEPTION'],
		},
		reasonRequiredStatuses: ['EXCEPTION'],
		createSchema: shipments.insertSchema,
		updateSchema: shipments.updateSchema,
	})
