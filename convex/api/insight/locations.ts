import { locations } from '@server/convex/insight'
import { createTenantScoped } from 'convex/utils'

export const { list, getById, create, update, remove, transitionStatus, kpis } =
	createTenantScoped({
		moduleName: 'insight',
		prefix: 'locations',
		primaryTable: 'locations',
		createSchema: locations.insertSchema,
		updateSchema: locations.updateSchema,
	})
