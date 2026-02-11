import { createRPCRouter } from '@server/rpc/init'
import { createTenantScopedCrudRouter } from '../helpers'

const bankAccountsRouter = createTenantScopedCrudRouter({
	moduleName: 'flow/bank-accounts',
	primaryTable: 'bankAccounts',
	viewTables: { overview: 'bankAccounts' },
	statusField: 'status',
	transitions: {
		ACTIVE: ['INACTIVE', 'BLOCKED'],
		INACTIVE: ['ACTIVE', 'BLOCKED'],
		BLOCKED: ['ACTIVE', 'INACTIVE'],
	},
	reasonRequiredStatuses: ['BLOCKED'],
})

const bankLedgerEntriesRouter = createTenantScopedCrudRouter({
	moduleName: 'flow/bank-ledger-entries',
	primaryTable: 'bankAccountLedgerEntries',
	viewTables: { overview: 'bankAccountLedgerEntries' },
	statusField: 'reconciliationStatus',
	transitions: {
		OPEN: ['MATCHED', 'EXCEPTION'],
		MATCHED: ['RECONCILED', 'EXCEPTION'],
		EXCEPTION: ['MATCHED'],
	},
	reasonRequiredStatuses: ['EXCEPTION'],
})

const journalLinesRouter = createTenantScopedCrudRouter({
	moduleName: 'flow/journal-lines',
	primaryTable: 'genJournalLines',
	viewTables: { overview: 'genJournalLines' },
	statusField: 'status',
	transitions: {
		OPEN: ['APPROVED', 'POSTED', 'VOIDED'],
		APPROVED: ['POSTED', 'VOIDED'],
	},
	reasonRequiredStatuses: ['VOIDED'],
})

const glEntriesRouter = createTenantScopedCrudRouter({
	moduleName: 'flow/gl-entries',
	primaryTable: 'glEntries',
	viewTables: { overview: 'glEntries' },
})

export const flowRouter = createRPCRouter({
	bankAccounts: bankAccountsRouter,
	bankLedgerEntries: bankLedgerEntriesRouter,
	journalLines: journalLinesRouter,
	glEntries: glEntriesRouter,
})
