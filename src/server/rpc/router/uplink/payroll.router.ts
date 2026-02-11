import { createRPCRouter } from '@server/rpc/init'
import { createTenantScopedCrudRouter } from '../helpers'

const employeesRouter = createTenantScopedCrudRouter({
	moduleName: 'payroll/employees',
	primaryTable: 'employees',
	viewTables: { overview: 'employees' },
	statusField: 'status',
	transitions: {
		ACTIVE: ['ON_LEAVE', 'TERMINATED'],
		ON_LEAVE: ['ACTIVE', 'TERMINATED'],
	},
	reasonRequiredStatuses: ['TERMINATED'],
})

const employeeLedgerRouter = createTenantScopedCrudRouter({
	moduleName: 'payroll/employee-ledger',
	primaryTable: 'employeeLedgerEntries',
	viewTables: { overview: 'employeeLedgerEntries' },
})

const journalLinesRouter = createTenantScopedCrudRouter({
	moduleName: 'payroll/journal-lines',
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
	moduleName: 'payroll/gl-entries',
	primaryTable: 'glEntries',
	viewTables: { overview: 'glEntries' },
})

const bankLedgerEntriesRouter = createTenantScopedCrudRouter({
	moduleName: 'payroll/bank-ledger-entries',
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

export const payrollRouter = createRPCRouter({
	employees: employeesRouter,
	employeeLedger: employeeLedgerRouter,
	journalLines: journalLinesRouter,
	glEntries: glEntriesRouter,
	bankLedgerEntries: bankLedgerEntriesRouter,
})
