import { custLedgerEntries } from '@server/convex/ledger'
import { createTenantScoped } from 'convex/utils'

export const { list, getById, create, update, remove, transitionStatus, kpis } =
	createTenantScoped({
		moduleName: 'ledger',
		prefix: 'custLedgerEntries',
		primaryTable: 'custLedgerEntries',
		createSchema: custLedgerEntries.insertSchema,
		updateSchema: custLedgerEntries.updateSchema,
	})
