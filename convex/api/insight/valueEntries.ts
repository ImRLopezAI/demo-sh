import { valueEntries } from '@server/convex/insight'
import { createTenantScoped } from 'convex/utils'

export const { list, getById, create, update, remove, transitionStatus, kpis } =
	createTenantScoped({
		moduleName: 'insight',
		prefix: 'valueEntries',
		primaryTable: 'valueEntries',
		createSchema: valueEntries.insertSchema,
		updateSchema: valueEntries.updateSchema,
	})
