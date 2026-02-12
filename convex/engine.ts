import { createEngine } from "./components/tableEngine/lib"
import { components } from "./_generated/api"
import type { DataModel } from "./_generated/dataModel"

export const engine = createEngine<DataModel>({
	component: components.tableEngine,
	tables: {
		// =====================================================================
		// Hub
		// =====================================================================
		operationTasks: {
			tableName: "operationTasks",
			noSeries: {
				code: "TASK",
				field: "taskNo",
				pattern: "TASK0000001",
			},
		},
		moduleNotifications: {
			tableName: "moduleNotifications",
		},

		// =====================================================================
		// Market
		// =====================================================================
		items: {
			tableName: "items",
			noSeries: {
				code: "ITEM",
				field: "itemNo",
				pattern: "ITEM0000001",
			},
			flowFields: {
				totalSalesQty: {
					type: "sum",
					source: "salesLines",
					key: "itemId",
					field: "quantity",
				},
				totalSalesAmount: {
					type: "sum",
					source: "salesLines",
					key: "itemId",
					field: "lineAmount",
				},
				avgLineAmount: {
					type: "average",
					source: "salesLines",
					key: "itemId",
					field: "lineAmount",
				},
				minLineAmount: {
					type: "min",
					source: "salesLines",
					key: "itemId",
					field: "lineAmount",
				},
				maxLineAmount: {
					type: "max",
					source: "salesLines",
					key: "itemId",
					field: "lineAmount",
				},
				hasSalesLines: {
					type: "exist",
					source: "salesLines",
					key: "itemId",
				},
			},
			relations: {
				salesLines: {
					table: "salesLines",
					field: "by_itemId",
					type: "many",
				},
			},
		},
		customers: {
			tableName: "customers",
			noSeries: {
				code: "CUST",
				field: "customerNo",
				pattern: "CUST0000001",
			},
			flowFields: {
				orderCount: {
					type: "count",
					source: "salesHeaders",
					key: "customerId",
				},
				totalBalance: {
					type: "sum",
					source: "custLedgerEntries",
					key: "customerId",
					field: "remainingAmount",
				},
			},
			relations: {
				salesHeaders: {
					table: "salesHeaders",
					field: "by_customerId",
					type: "many",
				},
			},
		},
		salesHeaders: {
			tableName: "salesHeaders",
			noSeries: {
				code: "SO",
				field: "documentNo",
				pattern: "SO0000001",
			},
			flowFields: {
				customerName: {
					type: "lookup",
					source: "customers",
					key: "customerId",
					field: "name",
				},
				lineCount: {
					type: "count",
					source: "salesLines",
					key: "documentNo",
				},
				totalAmount: {
					type: "sum",
					source: "salesLines",
					key: "documentNo",
					field: "lineAmount",
				},
			},
			relations: {
				lines: {
					table: "salesLines",
					field: "by_documentNo",
					type: "many",
				},
				customer: {
					table: "customers",
					field: "by_customerId",
					type: "one",
				},
			},
		},
		salesLines: {
			tableName: "salesLines",
			flowFields: {
				itemDescription: {
					type: "lookup",
					source: "items",
					key: "itemId",
					field: "description",
				},
			},
			relations: {
				item: {
					table: "items",
					field: "by_itemId",
					type: "one",
				},
				header: {
					table: "salesHeaders",
					field: "by_documentNo",
					type: "one",
				},
			},
		},
		carts: {
			tableName: "carts",
			flowFields: {
				customerName: {
					type: "lookup",
					source: "customers",
					key: "customerId",
					field: "name",
				},
				itemCount: {
					type: "count",
					source: "cartLines",
					key: "cartId",
				},
				totalAmount: {
					type: "sum",
					source: "cartLines",
					key: "cartId",
					field: "lineAmount",
				},
			},
			relations: {
				customer: {
					table: "customers",
					field: "by_customerId",
					type: "one",
				},
				lines: {
					table: "cartLines",
					field: "by_cartId",
					type: "many",
				},
			},
		},
		cartLines: {
			tableName: "cartLines",
			flowFields: {
				itemDescription: {
					type: "lookup",
					source: "items",
					key: "itemId",
					field: "description",
				},
			},
			relations: {
				cart: {
					table: "carts",
					field: "by_cartId",
					type: "one",
				},
				item: {
					table: "items",
					field: "by_itemId",
					type: "one",
				},
			},
		},

		// =====================================================================
		// Insight
		// =====================================================================
		locations: {
			tableName: "locations",
			noSeries: {
				code: "LOC",
				field: "code",
				pattern: "LOC0001",
			},
			flowFields: {
				itemCount: {
					type: "count",
					source: "itemLedgerEntries",
					key: "locationCode",
				},
			},
		},
		itemLedgerEntries: {
			tableName: "itemLedgerEntries",
			flowFields: {
				itemDescription: {
					type: "lookup",
					source: "items",
					key: "itemId",
					field: "description",
				},
			},
			relations: {
				item: {
					table: "items",
					field: "by_itemId",
					type: "one",
				},
			},
		},
		valueEntries: {
			tableName: "valueEntries",
			flowFields: {
				itemDescription: {
					type: "lookup",
					source: "items",
					key: "itemId",
					field: "description",
				},
			},
			relations: {
				itemLedgerEntry: {
					table: "itemLedgerEntries",
					field: "by_itemLedgerEntryId",
					type: "one",
				},
				item: {
					table: "items",
					field: "by_itemId",
					type: "one",
				},
			},
		},

		// =====================================================================
		// Replenishment
		// =====================================================================
		vendors: {
			tableName: "vendors",
			noSeries: {
				code: "VEND",
				field: "vendorNo",
				pattern: "VEND0000001",
			},
			flowFields: {
				purchaseOrderCount: {
					type: "count",
					source: "purchaseHeaders",
					key: "vendorId",
				},
				totalBalance: {
					type: "sum",
					source: "purchaseHeaders",
					key: "vendorId",
					field: "totalAmount",
				},
			},
		},
		purchaseHeaders: {
			tableName: "purchaseHeaders",
			noSeries: {
				code: "PO",
				field: "documentNo",
				pattern: "PO0000001",
			},
			flowFields: {
				vendorName: {
					type: "lookup",
					source: "vendors",
					key: "vendorId",
					field: "name",
				},
				lineCount: {
					type: "count",
					source: "purchaseLines",
					key: "documentNo",
				},
				totalAmount: {
					type: "sum",
					source: "purchaseLines",
					key: "documentNo",
					field: "lineAmount",
				},
			},
			relations: {
				vendor: {
					table: "vendors",
					field: "by_vendorId",
					type: "one",
				},
				lines: {
					table: "purchaseLines",
					field: "by_documentNo",
					type: "many",
				},
			},
		},
		purchaseLines: {
			tableName: "purchaseLines",
			flowFields: {
				description: {
					type: "lookup",
					source: "items",
					key: "itemId",
					field: "description",
				},
			},
			relations: {
				header: {
					table: "purchaseHeaders",
					field: "by_documentNo",
					type: "one",
				},
				item: {
					table: "items",
					field: "by_itemId",
					type: "one",
				},
			},
		},
		transferHeaders: {
			tableName: "transferHeaders",
			noSeries: {
				code: "TR",
				field: "transferNo",
				pattern: "TR0000001",
			},
			flowFields: {
				lineCount: {
					type: "count",
					source: "transferLines",
					key: "transferNo",
				},
			},
			relations: {
				lines: {
					table: "transferLines",
					field: "by_transferNo",
					type: "many",
				},
			},
		},
		transferLines: {
			tableName: "transferLines",
			flowFields: {
				description: {
					type: "lookup",
					source: "items",
					key: "itemId",
					field: "description",
				},
			},
			relations: {
				header: {
					table: "transferHeaders",
					field: "by_transferNo",
					type: "one",
				},
				item: {
					table: "items",
					field: "by_itemId",
					type: "one",
				},
			},
		},

		// =====================================================================
		// Ledger
		// =====================================================================
		salesInvoiceHeaders: {
			tableName: "salesInvoiceHeaders",
			noSeries: {
				code: "SINV",
				field: "invoiceNo",
				pattern: "SINV0000001",
			},
			flowFields: {
				customerName: {
					type: "lookup",
					source: "customers",
					key: "customerId",
					field: "name",
				},
				lineCount: {
					type: "count",
					source: "salesInvoiceLines",
					key: "invoiceNo",
				},
				totalAmount: {
					type: "sum",
					source: "salesInvoiceLines",
					key: "invoiceNo",
					field: "lineAmount",
				},
			},
			relations: {
				customer: {
					table: "customers",
					field: "by_customerId",
					type: "one",
				},
				lines: {
					table: "salesInvoiceLines",
					field: "by_invoiceNo",
					type: "many",
				},
			},
		},
		salesInvoiceLines: {
			tableName: "salesInvoiceLines",
			flowFields: {
				itemDescription: {
					type: "lookup",
					source: "items",
					key: "itemId",
					field: "description",
				},
			},
			relations: {
				header: {
					table: "salesInvoiceHeaders",
					field: "by_invoiceNo",
					type: "one",
				},
				item: {
					table: "items",
					field: "by_itemId",
					type: "one",
				},
			},
		},
		custLedgerEntries: {
			tableName: "custLedgerEntries",
			flowFields: {
				customerName: {
					type: "lookup",
					source: "customers",
					key: "customerId",
					field: "name",
				},
			},
			relations: {
				customer: {
					table: "customers",
					field: "by_customerId",
					type: "one",
				},
			},
		},
		glEntries: {
			tableName: "glEntries",
		},

		// =====================================================================
		// Flow
		// =====================================================================
		bankAccounts: {
			tableName: "bankAccounts",
			noSeries: {
				code: "BANK",
				field: "accountNo",
				pattern: "BANK0000001",
			},
			flowFields: {
				entryCount: {
					type: "count",
					source: "bankAccountLedgerEntries",
					key: "bankAccountId",
				},
				currentBalance: {
					type: "sum",
					source: "bankAccountLedgerEntries",
					key: "bankAccountId",
					field: "amount",
				},
			},
			relations: {
				ledgerEntries: {
					table: "bankAccountLedgerEntries",
					field: "by_bankAccountId",
					type: "many",
				},
			},
		},
		bankAccountLedgerEntries: {
			tableName: "bankAccountLedgerEntries",
			flowFields: {
				bankAccountName: {
					type: "lookup",
					source: "bankAccounts",
					key: "bankAccountId",
					field: "name",
				},
			},
			relations: {
				bankAccount: {
					table: "bankAccounts",
					field: "by_bankAccountId",
					type: "one",
				},
			},
		},
		genJournalLines: {
			tableName: "genJournalLines",
		},

		// =====================================================================
		// Payroll
		// =====================================================================
		employees: {
			tableName: "employees",
			noSeries: {
				code: "EMP",
				field: "employeeNo",
				pattern: "EMP0000001",
			},
			flowFields: {
				ledgerEntryCount: {
					type: "count",
					source: "employeeLedgerEntries",
					key: "employeeId",
				},
				outstandingAmount: {
					type: "sum",
					source: "employeeLedgerEntries",
					key: "employeeId",
					field: "remainingAmount",
				},
			},
			relations: {
				ledgerEntries: {
					table: "employeeLedgerEntries",
					field: "by_employeeId",
					type: "many",
				},
			},
		},
		employeeLedgerEntries: {
			tableName: "employeeLedgerEntries",
			flowFields: {
				employeeName: {
					type: "lookup",
					source: "employees",
					key: "employeeId",
					field: "firstName",
				},
			},
			relations: {
				employee: {
					table: "employees",
					field: "by_employeeId",
					type: "one",
				},
			},
		},

		// =====================================================================
		// POS
		// =====================================================================
		terminals: {
			tableName: "terminals",
			noSeries: {
				code: "TERM",
				field: "terminalCode",
				pattern: "TERM001",
			},
			flowFields: {
				sessionCount: {
					type: "count",
					source: "posSessions",
					key: "terminalId",
				},
			},
		},
		posSessions: {
			tableName: "posSessions",
			noSeries: {
				code: "SESS",
				field: "sessionNo",
				pattern: "SESS0000001",
			},
			flowFields: {
				terminalName: {
					type: "lookup",
					source: "terminals",
					key: "terminalId",
					field: "name",
				},
				transactionCount: {
					type: "count",
					source: "posTransactions",
					key: "posSessionId",
				},
				totalSales: {
					type: "sum",
					source: "posTransactions",
					key: "posSessionId",
					field: "totalAmount",
				},
			},
			relations: {
				terminal: {
					table: "terminals",
					field: "by_terminalId",
					type: "one",
				},
				transactions: {
					table: "posTransactions",
					field: "by_posSessionId",
					type: "many",
				},
			},
		},
		posTransactions: {
			tableName: "posTransactions",
			noSeries: {
				code: "RCP",
				field: "receiptNo",
				pattern: "RCP0000001",
			},
			flowFields: {
				customerName: {
					type: "lookup",
					source: "customers",
					key: "customerId",
					field: "name",
				},
				lineCount: {
					type: "count",
					source: "posTransactionLines",
					key: "transactionId",
				},
			},
			relations: {
				session: {
					table: "posSessions",
					field: "by_posSessionId",
					type: "one",
				},
				lines: {
					table: "posTransactionLines",
					field: "by_transactionId",
					type: "many",
				},
			},
		},
		posTransactionLines: {
			tableName: "posTransactionLines",
			relations: {
				transaction: {
					table: "posTransactions",
					field: "by_transactionId",
					type: "one",
				},
				item: {
					table: "items",
					field: "by_itemId",
					type: "one",
				},
			},
		},

		// =====================================================================
		// Trace
		// =====================================================================
		shipments: {
			tableName: "shipments",
			noSeries: {
				code: "SHIP",
				field: "shipmentNo",
				pattern: "SHIP0000001",
			},
			flowFields: {
				lineCount: {
					type: "count",
					source: "shipmentLines",
					key: "shipmentNo",
				},
			},
			relations: {
				lines: {
					table: "shipmentLines",
					field: "by_shipmentNo",
					type: "many",
				},
			},
		},
		shipmentLines: {
			tableName: "shipmentLines",
			flowFields: {
				itemDescription: {
					type: "lookup",
					source: "items",
					key: "itemId",
					field: "description",
				},
			},
			relations: {
				shipment: {
					table: "shipments",
					field: "by_shipmentNo",
					type: "one",
				},
				item: {
					table: "items",
					field: "by_itemId",
					type: "one",
				},
			},
		},
		shipmentMethods: {
			tableName: "shipmentMethods",
			noSeries: {
				code: "SM",
				field: "code",
				pattern: "SM001",
			},
		},
	},
})
