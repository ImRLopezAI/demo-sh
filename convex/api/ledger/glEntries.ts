import { glEntries } from '@server/convex/ledger'
import { createTenantScoped } from 'convex/utils'

export const { list, getById, create, update, remove, transitionStatus, kpis } =
	createTenantScoped({
		moduleName: 'ledger',
		prefix: 'glEntries',
		primaryTable: 'glEntries',
		createSchema: glEntries.insertSchema,
		updateSchema: glEntries.updateSchema,
	})
