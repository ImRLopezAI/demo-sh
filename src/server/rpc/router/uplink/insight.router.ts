import { createRPCRouter } from '@server/rpc/init'
import { createTenantScopedCrudRouter } from '../helpers'

const itemLedgerEntriesRouter = createTenantScopedCrudRouter({
	moduleName: 'insight/item-ledger-entries',
	primaryTable: 'itemLedgerEntries',
	viewTables: { overview: 'itemLedgerEntries' },
})

const locationsRouter = createTenantScopedCrudRouter({
	moduleName: 'insight/locations',
	primaryTable: 'locations',
	viewTables: { overview: 'locations' },
})

const valueEntriesRouter = createTenantScopedCrudRouter({
	moduleName: 'insight/value-entries',
	primaryTable: 'valueEntries',
	viewTables: { overview: 'valueEntries' },
})

export const insightRouter = createRPCRouter({
	itemLedgerEntries: itemLedgerEntriesRouter,
	locations: locationsRouter,
	valueEntries: valueEntriesRouter,
})
