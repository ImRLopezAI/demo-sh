import { transferHeaders } from '@server/convex/replenishment'
import { createTenantScoped } from 'convex/utils'

export const { list, getById, create, update, remove, transitionStatus, kpis } =
	createTenantScoped({
		moduleName: 'replenishment',
		prefix: 'transfers',
		primaryTable: 'transferHeaders',
		statusField: 'status',
		transitions: {
			DRAFT: ['RELEASED'],
			RELEASED: ['IN_TRANSIT', 'CANCELED'],
			IN_TRANSIT: ['RECEIVED'],
		},
		reasonRequiredStatuses: ['CANCELED'],
		createSchema: transferHeaders.insertSchema,
		updateSchema: transferHeaders.updateSchema,
	})
