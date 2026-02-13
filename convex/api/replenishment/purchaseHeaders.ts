import { purchaseHeaders } from '@server/convex/replenishment'
import { createTenantScoped } from 'convex/utils'

export const { list, getById, create, update, remove, transitionStatus, kpis } =
	createTenantScoped({
		moduleName: 'replenishment',
		prefix: 'purchaseOrders',
		primaryTable: 'purchaseHeaders',
		statusField: 'status',
		transitions: {
			DRAFT: ['PENDING_APPROVAL'],
			PENDING_APPROVAL: ['APPROVED', 'REJECTED'],
			APPROVED: ['COMPLETED', 'CANCELED'],
			REJECTED: ['DRAFT'],
		},
		reasonRequiredStatuses: ['REJECTED', 'CANCELED'],
		createSchema: purchaseHeaders.insertSchema,
		updateSchema: purchaseHeaders.updateSchema,
	})
