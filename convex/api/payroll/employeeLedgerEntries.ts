import { employeeLedgerEntries } from '@server/convex/payroll'
import { createTenantScoped } from 'convex/utils'

export const { list, getById, create, update, remove, transitionStatus, kpis } =
	createTenantScoped({
		moduleName: 'payroll',
		prefix: 'employeeLedgerEntries',
		primaryTable: 'employeeLedgerEntries',
		createSchema: employeeLedgerEntries.insertSchema,
		updateSchema: employeeLedgerEntries.updateSchema,
	})
