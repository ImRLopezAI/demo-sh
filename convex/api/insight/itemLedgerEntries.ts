import { itemLedgerEntries } from '@server/convex/insight'
import { createTenantScoped } from 'convex/utils'

export const { list, getById, create, update, remove, transitionStatus, kpis } =
	createTenantScoped({
		moduleName: 'insight',
		prefix: 'itemLedgerEntries',
		primaryTable: 'itemLedgerEntries',
		createSchema: itemLedgerEntries.insertSchema,
		updateSchema: itemLedgerEntries.updateSchema,
	})
