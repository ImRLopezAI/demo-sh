import { glEntries } from '@server/convex/ledger'
import { createTenantScoped } from '../../utils'

export const { list, getById, create, update, remove, transitionStatus, kpis } =
	createTenantScoped({
		moduleName: 'payroll',
		prefix: 'glEntries',
		primaryTable: 'glEntries',
		createSchema: glEntries.insertSchema,
		updateSchema: glEntries.updateSchema,
	})
