import {
	BANK_ACCOUNT_STATUSES,
	CART_STATUSES,
	DOCUMENT_APPROVAL_STATUSES,
	EMPLOYEE_STATUSES,
	JOURNAL_LINE_STATUSES,
	NOTIFICATION_STATUSES,
	OPERATION_TASK_STATUSES,
	PAYROLL_RUN_STATUSES,
	POS_SESSION_STATUSES,
	POS_TRANSACTION_STATUSES,
	RECONCILIATION_STATUSES,
	SALES_INVOICE_STATUSES,
	SHIPMENT_STATUSES,
	TERMINAL_STATUSES,
	TRANSFER_STATUSES,
} from '@server/db/constants'
import type { ReportModuleId } from '@server/reporting/contracts'
import type { FilterFieldDef } from './types'

export const MODULE_LABELS: Record<ReportModuleId, string> = {
	hub: 'Hub',
	market: 'Market',
	insight: 'Insight',
	replenishment: 'Replenishment',
	ledger: 'Ledger',
	flow: 'Flow',
	payroll: 'Payroll',
	pos: 'POS',
	trace: 'Trace',
}

export const ENTITY_OPTIONS: Record<ReportModuleId, string[]> = {
	hub: ['operationTasks', 'notifications'],
	market: ['salesOrders', 'items', 'customers', 'carts'],
	insight: ['itemLedger', 'locations', 'valueEntries'],
	replenishment: ['purchaseOrders', 'vendors', 'transfers'],
	ledger: ['invoices', 'customerLedger', 'glEntries'],
	flow: ['bankAccounts', 'bankLedger', 'paymentJournal', 'glEntries'],
	payroll: ['payrollRuns', 'employees', 'employeeLedger'],
	pos: ['transactions', 'transactionLines', 'sessions', 'terminals'],
	trace: ['shipments', 'shipmentMethods'],
}

export const ENTITY_LABELS: Record<string, string> = {
	operationTasks: 'Operation Tasks',
	notifications: 'Notifications',
	salesOrders: 'Sales Orders',
	items: 'Items',
	customers: 'Customers',
	carts: 'Carts',
	itemLedger: 'Item Ledger',
	locations: 'Locations',
	valueEntries: 'Value Entries',
	purchaseOrders: 'Purchase Orders',
	vendors: 'Vendors',
	transfers: 'Transfers',
	invoices: 'Invoices',
	customerLedger: 'Customer Ledger',
	glEntries: 'G/L Entries',
	bankAccounts: 'Bank Accounts',
	bankLedger: 'Bank Ledger',
	paymentJournal: 'Payment Journal',
	payrollRuns: 'Payroll Runs',
	employees: 'Employees',
	employeeLedger: 'Employee Ledger',
	transactions: 'Transactions',
	transactionLines: 'Transaction Lines',
	sessions: 'Sessions',
	terminals: 'Terminals',
	shipments: 'Shipments',
	shipmentMethods: 'Shipment Methods',
}

export const ENTITY_FILTER_FIELDS: Record<string, FilterFieldDef[]> = {
	'hub.operationTasks': [
		{
			key: 'status',
			label: 'Status',
			type: 'enum',
			options: OPERATION_TASK_STATUSES,
		},
	],
	'hub.notifications': [
		{
			key: 'status',
			label: 'Status',
			type: 'enum',
			options: NOTIFICATION_STATUSES,
		},
	],
	'market.salesOrders': [
		{
			key: 'status',
			label: 'Status',
			type: 'enum',
			options: DOCUMENT_APPROVAL_STATUSES,
		},
		{ key: 'customerName', label: 'Customer Name', type: 'string' },
	],
	'market.items': [
		{ key: 'description', label: 'Description', type: 'string' },
		{ key: 'blocked', label: 'Blocked', type: 'boolean' },
	],
	'market.customers': [
		{ key: 'name', label: 'Name', type: 'string' },
		{ key: 'blocked', label: 'Blocked', type: 'boolean' },
	],
	'market.carts': [
		{ key: 'status', label: 'Status', type: 'enum', options: CART_STATUSES },
	],
	'insight.itemLedger': [
		{ key: 'itemNo', label: 'Item No', type: 'string' },
		{ key: 'locationCode', label: 'Location Code', type: 'string' },
	],
	'insight.locations': [
		{ key: 'code', label: 'Code', type: 'string' },
		{ key: 'name', label: 'Name', type: 'string' },
	],
	'insight.valueEntries': [{ key: 'itemNo', label: 'Item No', type: 'string' }],
	'replenishment.purchaseOrders': [
		{
			key: 'status',
			label: 'Status',
			type: 'enum',
			options: DOCUMENT_APPROVAL_STATUSES,
		},
		{ key: 'vendorName', label: 'Vendor Name', type: 'string' },
	],
	'replenishment.vendors': [
		{ key: 'name', label: 'Name', type: 'string' },
		{ key: 'blocked', label: 'Blocked', type: 'boolean' },
	],
	'replenishment.transfers': [
		{
			key: 'status',
			label: 'Status',
			type: 'enum',
			options: TRANSFER_STATUSES,
		},
	],
	'ledger.invoices': [
		{
			key: 'status',
			label: 'Status',
			type: 'enum',
			options: SALES_INVOICE_STATUSES,
		},
		{ key: 'customerName', label: 'Customer Name', type: 'string' },
	],
	'ledger.customerLedger': [
		{ key: 'customerNo', label: 'Customer No', type: 'string' },
	],
	'ledger.glEntries': [
		{ key: 'accountNo', label: 'Account No', type: 'string' },
	],
	'flow.bankAccounts': [
		{
			key: 'status',
			label: 'Status',
			type: 'enum',
			options: BANK_ACCOUNT_STATUSES,
		},
	],
	'flow.bankLedger': [
		{
			key: 'status',
			label: 'Status',
			type: 'enum',
			options: RECONCILIATION_STATUSES,
		},
	],
	'flow.paymentJournal': [
		{
			key: 'status',
			label: 'Status',
			type: 'enum',
			options: JOURNAL_LINE_STATUSES,
		},
	],
	'flow.glEntries': [{ key: 'accountNo', label: 'Account No', type: 'string' }],
	'payroll.payrollRuns': [
		{
			key: 'status',
			label: 'Status',
			type: 'enum',
			options: PAYROLL_RUN_STATUSES,
		},
	],
	'payroll.employees': [
		{
			key: 'status',
			label: 'Status',
			type: 'enum',
			options: EMPLOYEE_STATUSES,
		},
		{ key: 'name', label: 'Name', type: 'string' },
	],
	'payroll.employeeLedger': [
		{ key: 'employeeNo', label: 'Employee No', type: 'string' },
	],
	'pos.transactions': [
		{
			key: 'status',
			label: 'Status',
			type: 'enum',
			options: POS_TRANSACTION_STATUSES,
		},
		{ key: 'paymentMethod', label: 'Payment Method', type: 'string' },
	],
	'pos.transactionLines': [
		{ key: 'description', label: 'Description', type: 'string' },
	],
	'pos.sessions': [
		{
			key: 'status',
			label: 'Status',
			type: 'enum',
			options: POS_SESSION_STATUSES,
		},
	],
	'pos.terminals': [
		{
			key: 'status',
			label: 'Status',
			type: 'enum',
			options: TERMINAL_STATUSES,
		},
	],
	'trace.shipments': [
		{
			key: 'status',
			label: 'Status',
			type: 'enum',
			options: SHIPMENT_STATUSES,
		},
	],
	'trace.shipmentMethods': [{ key: 'code', label: 'Code', type: 'string' }],
}

export const ENTITY_SUGGESTED_COLUMNS: Record<
	string,
	Array<{ key: string; label: string }>
> = {
	'hub.operationTasks': [
		{ key: '_id', label: 'ID' },
		{ key: 'title', label: 'Title' },
		{ key: 'status', label: 'Status' },
		{ key: 'priority', label: 'Priority' },
		{ key: '_updatedAt', label: 'Updated' },
	],
	'hub.notifications': [
		{ key: '_id', label: 'ID' },
		{ key: 'title', label: 'Title' },
		{ key: 'status', label: 'Status' },
		{ key: '_createdAt', label: 'Created' },
	],
	'market.salesOrders': [
		{ key: '_id', label: 'ID' },
		{ key: 'documentNo', label: 'Document No' },
		{ key: 'customerName', label: 'Customer' },
		{ key: 'status', label: 'Status' },
		{ key: 'totalAmount', label: 'Total' },
		{ key: '_updatedAt', label: 'Updated' },
	],
	'market.items': [
		{ key: '_id', label: 'ID' },
		{ key: 'itemNo', label: 'Item No' },
		{ key: 'description', label: 'Description' },
		{ key: 'unitPrice', label: 'Unit Price' },
		{ key: 'inventory', label: 'Inventory' },
	],
	'market.customers': [
		{ key: '_id', label: 'ID' },
		{ key: 'name', label: 'Name' },
		{ key: 'email', label: 'Email' },
		{ key: 'balance', label: 'Balance' },
	],
	'market.carts': [
		{ key: '_id', label: 'ID' },
		{ key: 'status', label: 'Status' },
		{ key: 'itemCount', label: 'Items' },
		{ key: 'totalAmount', label: 'Total' },
		{ key: '_updatedAt', label: 'Updated' },
	],
	'insight.itemLedger': [
		{ key: '_id', label: 'ID' },
		{ key: 'itemNo', label: 'Item No' },
		{ key: 'locationCode', label: 'Location' },
		{ key: 'quantity', label: 'Quantity' },
		{ key: 'postingDate', label: 'Posting Date' },
	],
	'insight.locations': [
		{ key: '_id', label: 'ID' },
		{ key: 'code', label: 'Code' },
		{ key: 'name', label: 'Name' },
	],
	'insight.valueEntries': [
		{ key: '_id', label: 'ID' },
		{ key: 'itemNo', label: 'Item No' },
		{ key: 'costAmount', label: 'Cost Amount' },
		{ key: 'salesAmount', label: 'Sales Amount' },
		{ key: 'postingDate', label: 'Posting Date' },
	],
	'replenishment.purchaseOrders': [
		{ key: '_id', label: 'ID' },
		{ key: 'documentNo', label: 'Document No' },
		{ key: 'vendorName', label: 'Vendor' },
		{ key: 'status', label: 'Status' },
		{ key: 'totalAmount', label: 'Total' },
	],
	'replenishment.vendors': [
		{ key: '_id', label: 'ID' },
		{ key: 'name', label: 'Name' },
		{ key: 'contact', label: 'Contact' },
		{ key: 'balance', label: 'Balance' },
	],
	'replenishment.transfers': [
		{ key: '_id', label: 'ID' },
		{ key: 'transferNo', label: 'Transfer No' },
		{ key: 'fromLocation', label: 'From' },
		{ key: 'toLocation', label: 'To' },
		{ key: 'status', label: 'Status' },
	],
	'ledger.invoices': [
		{ key: '_id', label: 'ID' },
		{ key: 'invoiceNo', label: 'Invoice No' },
		{ key: 'customerName', label: 'Customer' },
		{ key: 'status', label: 'Status' },
		{ key: 'totalAmount', label: 'Total' },
		{ key: 'postingDate', label: 'Posting Date' },
	],
	'ledger.customerLedger': [
		{ key: '_id', label: 'ID' },
		{ key: 'customerNo', label: 'Customer No' },
		{ key: 'description', label: 'Description' },
		{ key: 'amount', label: 'Amount' },
		{ key: 'postingDate', label: 'Posting Date' },
	],
	'ledger.glEntries': [
		{ key: '_id', label: 'ID' },
		{ key: 'accountNo', label: 'Account No' },
		{ key: 'description', label: 'Description' },
		{ key: 'debitAmount', label: 'Debit' },
		{ key: 'creditAmount', label: 'Credit' },
		{ key: 'postingDate', label: 'Posting Date' },
	],
	'flow.bankAccounts': [
		{ key: '_id', label: 'ID' },
		{ key: 'name', label: 'Name' },
		{ key: 'bankAccountNo', label: 'Account No' },
		{ key: 'status', label: 'Status' },
		{ key: 'balance', label: 'Balance' },
	],
	'flow.bankLedger': [
		{ key: '_id', label: 'ID' },
		{ key: 'description', label: 'Description' },
		{ key: 'amount', label: 'Amount' },
		{ key: 'status', label: 'Status' },
		{ key: 'postingDate', label: 'Posting Date' },
	],
	'flow.paymentJournal': [
		{ key: '_id', label: 'ID' },
		{ key: 'accountNo', label: 'Account No' },
		{ key: 'description', label: 'Description' },
		{ key: 'amount', label: 'Amount' },
		{ key: 'status', label: 'Status' },
	],
	'flow.glEntries': [
		{ key: '_id', label: 'ID' },
		{ key: 'accountNo', label: 'Account No' },
		{ key: 'description', label: 'Description' },
		{ key: 'debitAmount', label: 'Debit' },
		{ key: 'creditAmount', label: 'Credit' },
	],
	'payroll.payrollRuns': [
		{ key: '_id', label: 'ID' },
		{ key: 'periodStart', label: 'Period Start' },
		{ key: 'periodEnd', label: 'Period End' },
		{ key: 'status', label: 'Status' },
		{ key: 'totalAmount', label: 'Total' },
	],
	'payroll.employees': [
		{ key: '_id', label: 'ID' },
		{ key: 'name', label: 'Name' },
		{ key: 'department', label: 'Department' },
		{ key: 'status', label: 'Status' },
	],
	'payroll.employeeLedger': [
		{ key: '_id', label: 'ID' },
		{ key: 'employeeNo', label: 'Employee No' },
		{ key: 'description', label: 'Description' },
		{ key: 'amount', label: 'Amount' },
		{ key: 'postingDate', label: 'Posting Date' },
	],
	'pos.transactions': [
		{ key: '_id', label: 'ID' },
		{ key: 'transactionNo', label: 'Transaction No' },
		{ key: 'status', label: 'Status' },
		{ key: 'paymentMethod', label: 'Payment' },
		{ key: 'totalAmount', label: 'Total' },
		{ key: '_createdAt', label: 'Created' },
	],
	'pos.transactionLines': [
		{ key: '_id', label: 'ID' },
		{ key: 'description', label: 'Description' },
		{ key: 'quantity', label: 'Qty' },
		{ key: 'unitPrice', label: 'Unit Price' },
		{ key: 'lineAmount', label: 'Line Amount' },
	],
	'pos.sessions': [
		{ key: '_id', label: 'ID' },
		{ key: 'sessionNo', label: 'Session No' },
		{ key: 'terminalId', label: 'Terminal' },
		{ key: 'status', label: 'Status' },
		{ key: 'openedAt', label: 'Opened' },
	],
	'pos.terminals': [
		{ key: '_id', label: 'ID' },
		{ key: 'name', label: 'Name' },
		{ key: 'locationCode', label: 'Location' },
		{ key: 'status', label: 'Status' },
	],
	'trace.shipments': [
		{ key: '_id', label: 'ID' },
		{ key: 'shipmentNo', label: 'Shipment No' },
		{ key: 'status', label: 'Status' },
		{ key: 'carrierName', label: 'Carrier' },
		{ key: 'shippedAt', label: 'Shipped' },
	],
	'trace.shipmentMethods': [
		{ key: '_id', label: 'ID' },
		{ key: 'code', label: 'Code' },
		{ key: 'description', label: 'Description' },
	],
}

/**
 * Map a dataset primary table name to the module + entity used by the
 * reporting RPC. Lets us auto-infer module/entity from the dataset so the
 * user never has to pick them manually.
 */
export const TABLE_TO_MODULE_ENTITY: Record<
	string,
	{ moduleId: ReportModuleId; entityId: string }
> = {
	// market
	salesHeaders: { moduleId: 'market', entityId: 'salesOrders' },
	salesLines: { moduleId: 'market', entityId: 'salesOrders' },
	customers: { moduleId: 'market', entityId: 'customers' },
	items: { moduleId: 'market', entityId: 'items' },
	carts: { moduleId: 'market', entityId: 'carts' },
	// ledger
	salesInvoiceHeaders: { moduleId: 'ledger', entityId: 'invoices' },
	salesInvoiceLines: { moduleId: 'ledger', entityId: 'invoices' },
	custLedgerEntries: { moduleId: 'ledger', entityId: 'customerLedger' },
	glEntries: { moduleId: 'ledger', entityId: 'glEntries' },
	// replenishment
	purchaseHeaders: { moduleId: 'replenishment', entityId: 'purchaseOrders' },
	purchaseLines: { moduleId: 'replenishment', entityId: 'purchaseOrders' },
	vendors: { moduleId: 'replenishment', entityId: 'vendors' },
	transferHeaders: { moduleId: 'replenishment', entityId: 'transfers' },
	transferLines: { moduleId: 'replenishment', entityId: 'transfers' },
	// pos
	posTransactions: { moduleId: 'pos', entityId: 'transactions' },
	posTransactionLines: { moduleId: 'pos', entityId: 'transactionLines' },
	posSessions: { moduleId: 'pos', entityId: 'sessions' },
	terminals: { moduleId: 'pos', entityId: 'terminals' },
	// payroll
	employees: { moduleId: 'payroll', entityId: 'employees' },
	employeeLedgerEntries: { moduleId: 'payroll', entityId: 'employeeLedger' },
	payrollRuns: { moduleId: 'payroll', entityId: 'payrollRuns' },
	// flow
	bankAccounts: { moduleId: 'flow', entityId: 'bankAccounts' },
	bankAccountLedgerEntries: { moduleId: 'flow', entityId: 'bankLedger' },
	genJournalLines: { moduleId: 'flow', entityId: 'paymentJournal' },
	// trace
	shipments: { moduleId: 'trace', entityId: 'shipments' },
	shipmentMethods: { moduleId: 'trace', entityId: 'shipmentMethods' },
	// insight
	locations: { moduleId: 'insight', entityId: 'locations' },
	itemLedgerEntries: { moduleId: 'insight', entityId: 'itemLedger' },
	valueEntries: { moduleId: 'insight', entityId: 'valueEntries' },
	// hub
	operationTasks: { moduleId: 'hub', entityId: 'operationTasks' },
	moduleNotifications: { moduleId: 'hub', entityId: 'notifications' },
}

// ---------------------------------------------------------------------------
// Table Relationship Map
// ---------------------------------------------------------------------------

export interface TableRelation {
	relatedTable: string
	relationType: 'lookup' | 'has-many'
	joinField: string
	relatedJoinField: string
	suggestedAlias: string
	label: string
}

/**
 * Encodes FK relationships from `src/server/db/index.ts` so the dataset
 * builder can filter related-table dropdowns and auto-populate join fields.
 */
export const TABLE_RELATIONSHIPS: Record<string, TableRelation[]> = {
	// Market
	salesHeaders: [
		{
			relatedTable: 'salesLines',
			relationType: 'has-many',
			joinField: 'documentNo',
			relatedJoinField: 'documentNo',
			suggestedAlias: 'lines',
			label: 'Sales Lines',
		},
		{
			relatedTable: 'customers',
			relationType: 'lookup',
			joinField: 'customerId',
			relatedJoinField: '_id',
			suggestedAlias: 'customer',
			label: 'Customer',
		},
	],
	salesLines: [
		{
			relatedTable: 'salesHeaders',
			relationType: 'lookup',
			joinField: 'documentNo',
			relatedJoinField: 'documentNo',
			suggestedAlias: 'header',
			label: 'Sales Header',
		},
		{
			relatedTable: 'items',
			relationType: 'lookup',
			joinField: 'itemId',
			relatedJoinField: '_id',
			suggestedAlias: 'item',
			label: 'Item',
		},
	],
	customers: [
		{
			relatedTable: 'salesHeaders',
			relationType: 'has-many',
			joinField: '_id',
			relatedJoinField: 'customerId',
			suggestedAlias: 'salesOrders',
			label: 'Sales Orders',
		},
		{
			relatedTable: 'salesInvoiceHeaders',
			relationType: 'has-many',
			joinField: '_id',
			relatedJoinField: 'customerId',
			suggestedAlias: 'invoices',
			label: 'Sales Invoices',
		},
		{
			relatedTable: 'custLedgerEntries',
			relationType: 'has-many',
			joinField: '_id',
			relatedJoinField: 'customerId',
			suggestedAlias: 'ledger',
			label: 'Customer Ledger Entries',
		},
	],
	items: [
		{
			relatedTable: 'itemLedgerEntries',
			relationType: 'has-many',
			joinField: '_id',
			relatedJoinField: 'itemId',
			suggestedAlias: 'ledger',
			label: 'Item Ledger Entries',
		},
		{
			relatedTable: 'valueEntries',
			relationType: 'has-many',
			joinField: '_id',
			relatedJoinField: 'itemId',
			suggestedAlias: 'values',
			label: 'Value Entries',
		},
		{
			relatedTable: 'salesLines',
			relationType: 'has-many',
			joinField: '_id',
			relatedJoinField: 'itemId',
			suggestedAlias: 'salesLines',
			label: 'Sales Lines',
		},
	],

	// Ledger
	salesInvoiceHeaders: [
		{
			relatedTable: 'salesInvoiceLines',
			relationType: 'has-many',
			joinField: 'invoiceNo',
			relatedJoinField: 'invoiceNo',
			suggestedAlias: 'lines',
			label: 'Invoice Lines',
		},
		{
			relatedTable: 'customers',
			relationType: 'lookup',
			joinField: 'customerId',
			relatedJoinField: '_id',
			suggestedAlias: 'customer',
			label: 'Customer',
		},
	],
	salesInvoiceLines: [
		{
			relatedTable: 'salesInvoiceHeaders',
			relationType: 'lookup',
			joinField: 'invoiceNo',
			relatedJoinField: 'invoiceNo',
			suggestedAlias: 'header',
			label: 'Invoice Header',
		},
		{
			relatedTable: 'items',
			relationType: 'lookup',
			joinField: 'itemId',
			relatedJoinField: '_id',
			suggestedAlias: 'item',
			label: 'Item',
		},
	],
	custLedgerEntries: [
		{
			relatedTable: 'customers',
			relationType: 'lookup',
			joinField: 'customerId',
			relatedJoinField: '_id',
			suggestedAlias: 'customer',
			label: 'Customer',
		},
	],

	// Replenishment
	purchaseHeaders: [
		{
			relatedTable: 'purchaseLines',
			relationType: 'has-many',
			joinField: 'documentNo',
			relatedJoinField: 'documentNo',
			suggestedAlias: 'lines',
			label: 'Purchase Lines',
		},
		{
			relatedTable: 'vendors',
			relationType: 'lookup',
			joinField: 'vendorId',
			relatedJoinField: '_id',
			suggestedAlias: 'vendor',
			label: 'Vendor',
		},
	],
	purchaseLines: [
		{
			relatedTable: 'purchaseHeaders',
			relationType: 'lookup',
			joinField: 'documentNo',
			relatedJoinField: 'documentNo',
			suggestedAlias: 'header',
			label: 'Purchase Header',
		},
		{
			relatedTable: 'items',
			relationType: 'lookup',
			joinField: 'itemId',
			relatedJoinField: '_id',
			suggestedAlias: 'item',
			label: 'Item',
		},
	],
	vendors: [
		{
			relatedTable: 'purchaseHeaders',
			relationType: 'has-many',
			joinField: '_id',
			relatedJoinField: 'vendorId',
			suggestedAlias: 'purchaseOrders',
			label: 'Purchase Orders',
		},
		{
			relatedTable: 'vendorLedgerEntries',
			relationType: 'has-many',
			joinField: '_id',
			relatedJoinField: 'vendorId',
			suggestedAlias: 'ledger',
			label: 'Vendor Ledger Entries',
		},
	],
	transferHeaders: [
		{
			relatedTable: 'transferLines',
			relationType: 'has-many',
			joinField: 'transferNo',
			relatedJoinField: 'transferNo',
			suggestedAlias: 'lines',
			label: 'Transfer Lines',
		},
	],
	transferLines: [
		{
			relatedTable: 'transferHeaders',
			relationType: 'lookup',
			joinField: 'transferNo',
			relatedJoinField: 'transferNo',
			suggestedAlias: 'header',
			label: 'Transfer Header',
		},
		{
			relatedTable: 'items',
			relationType: 'lookup',
			joinField: 'itemId',
			relatedJoinField: '_id',
			suggestedAlias: 'item',
			label: 'Item',
		},
	],

	// POS
	posTransactions: [
		{
			relatedTable: 'posTransactionLines',
			relationType: 'has-many',
			joinField: '_id',
			relatedJoinField: 'transactionId',
			suggestedAlias: 'lines',
			label: 'Transaction Lines',
		},
		{
			relatedTable: 'posSessions',
			relationType: 'lookup',
			joinField: 'posSessionId',
			relatedJoinField: '_id',
			suggestedAlias: 'session',
			label: 'POS Session',
		},
	],
	posTransactionLines: [
		{
			relatedTable: 'posTransactions',
			relationType: 'lookup',
			joinField: 'transactionId',
			relatedJoinField: '_id',
			suggestedAlias: 'transaction',
			label: 'Transaction',
		},
		{
			relatedTable: 'items',
			relationType: 'lookup',
			joinField: 'itemId',
			relatedJoinField: '_id',
			suggestedAlias: 'item',
			label: 'Item',
		},
	],
	posSessions: [
		{
			relatedTable: 'posTransactions',
			relationType: 'has-many',
			joinField: '_id',
			relatedJoinField: 'posSessionId',
			suggestedAlias: 'transactions',
			label: 'POS Transactions',
		},
		{
			relatedTable: 'terminals',
			relationType: 'lookup',
			joinField: 'terminalId',
			relatedJoinField: '_id',
			suggestedAlias: 'terminal',
			label: 'Terminal',
		},
	],

	// Payroll
	employees: [
		{
			relatedTable: 'employeeLedgerEntries',
			relationType: 'has-many',
			joinField: '_id',
			relatedJoinField: 'employeeId',
			suggestedAlias: 'ledger',
			label: 'Employee Ledger Entries',
		},
	],
	employeeLedgerEntries: [
		{
			relatedTable: 'employees',
			relationType: 'lookup',
			joinField: 'employeeId',
			relatedJoinField: '_id',
			suggestedAlias: 'employee',
			label: 'Employee',
		},
	],

	// Flow
	bankAccounts: [
		{
			relatedTable: 'bankAccountLedgerEntries',
			relationType: 'has-many',
			joinField: '_id',
			relatedJoinField: 'bankAccountId',
			suggestedAlias: 'ledger',
			label: 'Bank Account Ledger Entries',
		},
	],
	bankAccountLedgerEntries: [
		{
			relatedTable: 'bankAccounts',
			relationType: 'lookup',
			joinField: 'bankAccountId',
			relatedJoinField: '_id',
			suggestedAlias: 'bankAccount',
			label: 'Bank Account',
		},
	],

	// Insight
	itemLedgerEntries: [
		{
			relatedTable: 'items',
			relationType: 'lookup',
			joinField: 'itemId',
			relatedJoinField: '_id',
			suggestedAlias: 'item',
			label: 'Item',
		},
	],
	valueEntries: [
		{
			relatedTable: 'items',
			relationType: 'lookup',
			joinField: 'itemId',
			relatedJoinField: '_id',
			suggestedAlias: 'item',
			label: 'Item',
		},
		{
			relatedTable: 'itemLedgerEntries',
			relationType: 'lookup',
			joinField: 'itemLedgerEntryId',
			relatedJoinField: '_id',
			suggestedAlias: 'itemLedger',
			label: 'Item Ledger Entry',
		},
	],

	// Trace
	shipments: [
		{
			relatedTable: 'shipmentLines',
			relationType: 'has-many',
			joinField: 'shipmentNo',
			relatedJoinField: 'shipmentNo',
			suggestedAlias: 'lines',
			label: 'Shipment Lines',
		},
	],
	shipmentLines: [
		{
			relatedTable: 'shipments',
			relationType: 'lookup',
			joinField: 'shipmentNo',
			relatedJoinField: 'shipmentNo',
			suggestedAlias: 'header',
			label: 'Shipment',
		},
		{
			relatedTable: 'items',
			relationType: 'lookup',
			joinField: 'itemId',
			relatedJoinField: '_id',
			suggestedAlias: 'item',
			label: 'Item',
		},
	],
}

/** Report-level metadata paths (report envelope, not dataset fields). */
export const REPORT_META_VALUE_PATHS = [
	{ value: 'title', label: 'Report Title' },
	{ value: 'generatedAt', label: 'Generated At' },
	{ value: 'summary.totalRows', label: 'Total Rows' },
]

export const BLOCK_TYPE_META = [
	{
		kind: 'heading' as const,
		label: 'Heading',
		icon: 'Heading' as const,
	},
	{
		kind: 'keyValue' as const,
		label: 'Key-Value',
		icon: 'KeyRound' as const,
	},
	{
		kind: 'table' as const,
		label: 'Data Table',
		icon: 'Table2' as const,
	},
	{
		kind: 'spacer' as const,
		label: 'Spacer',
		icon: 'SeparatorHorizontal' as const,
	},
	{
		kind: 'paragraph' as const,
		label: 'Paragraph',
		icon: 'AlignLeft' as const,
	},
	{
		kind: 'row' as const,
		label: 'Row',
		icon: 'Columns2' as const,
	},
	{
		kind: 'sectionHeader' as const,
		label: 'Section Header',
		icon: 'PanelTop' as const,
	},
	{
		kind: 'keyValueGroup' as const,
		label: 'KV Group',
		icon: 'List' as const,
	},
	{
		kind: 'divider' as const,
		label: 'Divider',
		icon: 'Minus' as const,
	},
] as const
