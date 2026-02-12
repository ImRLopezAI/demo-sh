import { defineSchema } from "convex/server"
import {
	// Hub
	operationTasks,
	moduleNotifications,
	// Market
	items,
	customers,
	salesHeaders,
	salesLines,
	carts,
	cartLines,
	// Insight
	locations,
	itemLedgerEntries,
	valueEntries,
	// Replenishment
	vendors,
	purchaseHeaders,
	purchaseLines,
	transferHeaders,
	transferLines,
	// Ledger
	salesInvoiceHeaders,
	salesInvoiceLines,
	custLedgerEntries,
	glEntries,
	// Flow
	bankAccounts,
	bankAccountLedgerEntries,
	genJournalLines,
	// Payroll
	employees,
	employeeLedgerEntries,
	// POS
	terminals,
	posSessions,
	posTransactions,
	posTransactionLines,
	// Trace
	shipments,
	shipmentLines,
	shipmentMethods,
} from "../src/server/convex"

export default defineSchema({
	// =====================================================================
	// Hub
	// =====================================================================
	operationTasks: operationTasks
		.table()
		.index("by_moduleId", ["moduleId"])
		.index("by_status", ["status"]),

	moduleNotifications: moduleNotifications
		.table()
		.index("by_moduleId", ["moduleId"])
		.index("by_status", ["status"]),

	// =====================================================================
	// Market
	// =====================================================================
	items: items
		.table()
		.index("by_itemNo", ["itemNo"]),

	customers: customers
		.table()
		.index("by_customerNo", ["customerNo"])
		.index("by_email", ["email"]),

	salesHeaders: salesHeaders
		.table()
		.index("by_documentNo", ["documentNo"])
		.index("by_customerId", ["customerId"])
		.index("by_status", ["status"]),

	salesLines: salesLines
		.table()
		.index("by_documentNo", ["documentNo"])
		.index("by_itemId", ["itemId"]),

	carts: carts
		.table()
		.index("by_customerId", ["customerId"])
		.index("by_status", ["status"]),

	cartLines: cartLines
		.table()
		.index("by_cartId", ["cartId"])
		.index("by_itemId", ["itemId"]),

	// =====================================================================
	// Insight
	// =====================================================================
	locations: locations
		.table()
		.index("by_code", ["code"]),

	itemLedgerEntries: itemLedgerEntries
		.table()
		.index("by_itemId", ["itemId"])
		.index("by_locationCode", ["locationCode"]),

	valueEntries: valueEntries
		.table()
		.index("by_itemLedgerEntryId", ["itemLedgerEntryId"])
		.index("by_itemId", ["itemId"]),

	// =====================================================================
	// Replenishment
	// =====================================================================
	vendors: vendors
		.table()
		.index("by_vendorNo", ["vendorNo"]),

	purchaseHeaders: purchaseHeaders
		.table()
		.index("by_documentNo", ["documentNo"])
		.index("by_vendorId", ["vendorId"])
		.index("by_status", ["status"]),

	purchaseLines: purchaseLines
		.table()
		.index("by_documentNo", ["documentNo"])
		.index("by_itemId", ["itemId"]),

	transferHeaders: transferHeaders
		.table()
		.index("by_transferNo", ["transferNo"])
		.index("by_status", ["status"]),

	transferLines: transferLines
		.table()
		.index("by_transferNo", ["transferNo"])
		.index("by_itemId", ["itemId"]),

	// =====================================================================
	// Ledger
	// =====================================================================
	salesInvoiceHeaders: salesInvoiceHeaders
		.table()
		.index("by_invoiceNo", ["invoiceNo"])
		.index("by_customerId", ["customerId"])
		.index("by_status", ["status"]),

	salesInvoiceLines: salesInvoiceLines
		.table()
		.index("by_invoiceNo", ["invoiceNo"])
		.index("by_itemId", ["itemId"]),

	custLedgerEntries: custLedgerEntries
		.table()
		.index("by_customerId", ["customerId"])
		.index("by_documentNo", ["documentNo"]),

	glEntries: glEntries
		.table()
		.index("by_accountNo", ["accountNo"])
		.index("by_documentNo", ["documentNo"]),

	// =====================================================================
	// Flow
	// =====================================================================
	bankAccounts: bankAccounts
		.table()
		.index("by_accountNo", ["accountNo"])
		.index("by_status", ["status"]),

	bankAccountLedgerEntries: bankAccountLedgerEntries
		.table()
		.index("by_bankAccountId", ["bankAccountId"])
		.index("by_documentNo", ["documentNo"])
		.index("by_reconciliationStatus", ["reconciliationStatus"]),

	genJournalLines: genJournalLines
		.table()
		.index("by_status", ["status"])
		.index("by_documentNo", ["documentNo"])
		.index("by_accountNo", ["accountNo"]),

	// =====================================================================
	// Payroll
	// =====================================================================
	employees: employees
		.table()
		.index("by_employeeNo", ["employeeNo"])
		.index("by_status", ["status"])
		.index("by_department", ["department"]),

	employeeLedgerEntries: employeeLedgerEntries
		.table()
		.index("by_employeeId", ["employeeId"])
		.index("by_documentNo", ["documentNo"]),

	// =====================================================================
	// POS
	// =====================================================================
	terminals: terminals
		.table()
		.index("by_terminalCode", ["terminalCode"]),

	posSessions: posSessions
		.table()
		.index("by_terminalId", ["terminalId"])
		.index("by_status", ["status"]),

	posTransactions: posTransactions
		.table()
		.index("by_posSessionId", ["posSessionId"])
		.index("by_status", ["status"]),

	posTransactionLines: posTransactionLines
		.table()
		.index("by_transactionId", ["transactionId"])
		.index("by_itemId", ["itemId"]),

	// =====================================================================
	// Trace
	// =====================================================================
	shipments: shipments
		.table()
		.index("by_shipmentNo", ["shipmentNo"])
		.index("by_status", ["status"])
		.index("by_trackingNo", ["trackingNo"]),

	shipmentLines: shipmentLines
		.table()
		.index("by_shipmentNo", ["shipmentNo"])
		.index("by_itemId", ["itemId"]),

	shipmentMethods: shipmentMethods
		.table()
		.index("by_code", ["code"]),
})
