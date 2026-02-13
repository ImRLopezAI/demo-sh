import { carts } from '@server/convex/market'
import { createTenantScoped } from 'convex/utils'

export const { list, getById, create, update, remove, transitionStatus, kpis } =
	createTenantScoped({
		moduleName: 'market',
		prefix: 'carts',
		primaryTable: 'carts',
		statusField: 'status',
		transitions: {
			OPEN: ['CHECKED_OUT', 'ABANDONED'],
		},
		createSchema: carts.insertSchema,
		updateSchema: carts.updateSchema,
	})
