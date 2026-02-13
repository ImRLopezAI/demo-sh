import { items } from '@server/convex/market'
import { createTenantScoped } from 'convex/utils'

export const { list, getById, create, update, remove, transitionStatus, kpis } =
	createTenantScoped({
		moduleName: 'market',
		prefix: 'items',
		primaryTable: 'items',
		createSchema: items.insertSchema,
		updateSchema: items.updateSchema,
	})
