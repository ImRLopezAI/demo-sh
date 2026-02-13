import { salesHeaders } from '@server/convex/market'
import { createTenantScoped } from 'convex/utils'

export const { list, getById, create, update, remove, transitionStatus, kpis } =
	createTenantScoped({
		moduleName: 'market',
		prefix: 'salesOrders',
		primaryTable: 'salesHeaders',
		statusField: 'status',
		transitions: {
			DRAFT: ['PENDING_APPROVAL'],
			PENDING_APPROVAL: ['APPROVED', 'REJECTED'],
			APPROVED: ['COMPLETED', 'CANCELED'],
			REJECTED: ['DRAFT'],
		},
		reasonRequiredStatuses: ['REJECTED', 'CANCELED'],
		createSchema: salesHeaders.insertSchema,
		updateSchema: salesHeaders.updateSchema,
	})
