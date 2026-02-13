import { vendors } from '@server/convex/replenishment'
import { createTenantScoped } from 'convex/utils'

export const { list, getById, create, update, remove, transitionStatus, kpis } =
	createTenantScoped({
		moduleName: 'replenishment',
		prefix: 'vendors',
		primaryTable: 'vendors',
		createSchema: vendors.insertSchema,
		updateSchema: vendors.updateSchema,
	})
