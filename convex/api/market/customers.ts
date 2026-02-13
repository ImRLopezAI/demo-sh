import { customers } from '@server/convex/market'
import { createTenantScoped } from 'convex/utils'

export const { list, getById, create, update, remove, transitionStatus, kpis } =
	createTenantScoped({
		moduleName: 'market',
		prefix: 'customers',
		primaryTable: 'customers',
		createSchema: customers.insertSchema,
		updateSchema: customers.updateSchema,
	})
