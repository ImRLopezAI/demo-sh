import * as flow from '../src/server/convex/flow'
import * as hub from '../src/server/convex/hub'
import * as insight from '../src/server/convex/insight'
import * as ledger from '../src/server/convex/ledger'

// Module schema imports
import * as market from '../src/server/convex/market'
import * as payroll from '../src/server/convex/payroll'
import * as pos from '../src/server/convex/pos'
import * as replenishment from '../src/server/convex/replenishment'
import * as trace from '../src/server/convex/trace'
import { components, internal } from './_generated/api'
import { internalAction, internalMutation } from './_generated/server'
import { createSeeder } from './components/seeder/lib'
import { engine } from './engine'

// ---------------------------------------------------------------------------
// Seeder config
// ---------------------------------------------------------------------------

const seeder = createSeeder({
	engineTables: engine.config.tables,
	tables: {
		// =================================================================
		// Master tables (no FK deps) — seeded first
		// =================================================================
		items: { def: market.items, seed: 20 },
		customers: { def: market.customers, seed: 15 },
		locations: { def: insight.locations, seed: 5 },
		vendors: { def: replenishment.vendors, seed: 10 },
		terminals: { def: pos.terminals, seed: 3 },
		employees: { def: payroll.employees, seed: 10 },
		shipmentMethods: { def: trace.shipmentMethods, seed: 4 },
		bankAccounts: { def: flow.bankAccounts, seed: 3 },

		// =================================================================
		// Headers (FK to master) — perParent
		// =================================================================
		salesHeaders: {
			def: market.salesHeaders,
			seed: { min: 2, max: 5, perParent: 'customers' },
		},
		purchaseHeaders: {
			def: replenishment.purchaseHeaders,
			seed: { min: 1, max: 3, perParent: 'vendors' },
		},
		salesInvoiceHeaders: {
			def: ledger.salesInvoiceHeaders,
			seed: { min: 1, max: 3, perParent: 'customers' },
		},
		transferHeaders: { def: replenishment.transferHeaders, seed: 5 },
		carts: {
			def: market.carts,
			seed: { min: 0, max: 2, perParent: 'customers' },
		},
		posSessions: {
			def: pos.posSessions,
			seed: { min: 1, max: 3, perParent: 'terminals' },
		},
		shipments: { def: trace.shipments, seed: 8 },

		// =================================================================
		// Lines (FK to headers + items) — perParent
		// =================================================================
		salesLines: {
			def: market.salesLines,
			seed: { min: 1, max: 4, perParent: 'salesHeaders' },
		},
		purchaseLines: {
			def: replenishment.purchaseLines,
			seed: { min: 1, max: 3, perParent: 'purchaseHeaders' },
		},
		salesInvoiceLines: {
			def: ledger.salesInvoiceLines,
			seed: { min: 1, max: 3, perParent: 'salesInvoiceHeaders' },
		},
		transferLines: {
			def: replenishment.transferLines,
			seed: { min: 1, max: 3, perParent: 'transferHeaders' },
		},
		cartLines: {
			def: market.cartLines,
			seed: { min: 1, max: 3, perParent: 'carts' },
		},
		posTransactions: {
			def: pos.posTransactions,
			seed: { min: 2, max: 5, perParent: 'posSessions' },
		},
		posTransactionLines: {
			def: pos.posTransactionLines,
			seed: { min: 1, max: 4, perParent: 'posTransactions' },
		},
		shipmentLines: {
			def: trace.shipmentLines,
			seed: { min: 1, max: 4, perParent: 'shipments' },
		},

		// =================================================================
		// Ledger entries
		// =================================================================
		itemLedgerEntries: { def: insight.itemLedgerEntries, seed: 30 },
		valueEntries: { def: insight.valueEntries, seed: 20 },
		custLedgerEntries: { def: ledger.custLedgerEntries, seed: 15 },
		glEntries: { def: ledger.glEntries, seed: 20 },
		bankAccountLedgerEntries: {
			def: flow.bankAccountLedgerEntries,
			seed: { min: 3, max: 8, perParent: 'bankAccounts' },
		},
		genJournalLines: { def: flow.genJournalLines, seed: 10 },
		employeeLedgerEntries: {
			def: payroll.employeeLedgerEntries,
			seed: { min: 2, max: 5, perParent: 'employees' },
		},

		// =================================================================
		// Hub
		// =================================================================
		operationTasks: { def: hub.operationTasks, seed: 10 },
		moduleNotifications: { def: hub.moduleNotifications, seed: 8 },
	},
})

// ---------------------------------------------------------------------------
// Wire up with raw mutations (no engine trigger wrapper)
// NoSeries handled directly via tableEngine component API.
// FlowField aggregates are NOT updated during seeding.
// ---------------------------------------------------------------------------

const wired = seeder.wire(
	internalAction,
	internalMutation,
	components.seeder,
	components.tableEngine,
)

// Export the insert/clear mutations (internal — used by actions)
export const _seedInsert = wired._seedInsert
export const _seedClear = wired._seedClear

// Build and export actions (reference the mutations via internal.seed)
export const { clearSeeds, seedAll, seedTable } = wired.buildActions(
	internal.seed._seedInsert,
	internal.seed._seedClear,
)
