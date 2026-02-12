import { createRPCRouter } from '@server/rpc/init'
import { createTenantScopedCrudRouter } from '../helpers'

const salesInvoiceHeadersRouter = createTenantScopedCrudRouter({
	moduleName: 'ledger',
	prefix: 'invoices',
	primaryTable: 'salesInvoiceHeaders',
	viewTables: { overview: 'salesInvoiceHeaders' },
	statusField: 'status',
	transitions: {
		DRAFT: ['POSTED'],
		POSTED: ['REVERSED'],
	},
	reasonRequiredStatuses: ['REVERSED'],
})

const salesInvoiceLinesRouter = createTenantScopedCrudRouter({
	moduleName: 'ledger',
	prefix: 'invoice-lines',
	primaryTable: 'salesInvoiceLines',
	viewTables: { overview: 'salesInvoiceLines' },
})

const custLedgerEntriesRouter = createTenantScopedCrudRouter({
	moduleName: 'ledger',
	prefix: 'customer-ledger',
	primaryTable: 'custLedgerEntries',
	viewTables: { overview: 'custLedgerEntries' },
})

const glEntriesRouter = createTenantScopedCrudRouter({
	moduleName: 'ledger',
	prefix: 'gl-entries',
	primaryTable: 'glEntries',
	viewTables: { overview: 'glEntries' },
})

export const ledgerRouter = createRPCRouter({
	invoices: salesInvoiceHeadersRouter,
	invoiceLines: salesInvoiceLinesRouter,
	customerLedger: custLedgerEntriesRouter,
	glEntries: glEntriesRouter,
})
