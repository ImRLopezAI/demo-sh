/**
 * Ledger module route specs.
 * Finance: dashboard, invoices, customer ledger, G/L entries, collections & compliance.
 *
 * Uses json-render features:
 * - $computed for currency/number formatting
 * - $template for dynamic text
 * - $bindState for invoice status and doc type filters
 * - $cond for conditional overdue alerts
 * - visibility for filter reset and warning banners
 */
import type { NextAppSpec } from '@json-render/next'

type Routes = NonNullable<NextAppSpec['routes']>

export const ledgerRoutes: Routes = {
	'/ledger/dashboard': {
		layout: 'app',
		metadata: {
			title: 'Ledger Dashboard',
			description: 'Invoiced amounts, receivables, and e-invoice funnel.',
		},
		page: {
			root: 'dashboard',
			elements: {
				dashboard: {
					type: 'DashboardPageStack',
					props: {},
					children: ['provider'],
				},
				provider: {
					type: 'LedgerDashboardData',
					props: {},
					children: [
						'header',
						'kpis',
						'heroCards',
						'invoiceStatusCounts',
						'eInvoiceFunnel',
						'invoiceVolumeTrend',
						'lowerGrid',
					],
				},
				header: {
					type: 'PageHeader',
					props: {
						title: 'Ledger Dashboard',
						description:
							'Invoiced amounts, receivables, and e-invoice funnel.',
					},
					children: [],
				},
				kpis: {
					type: 'LedgerKpiStrip',
					props: {},
					children: [],
				},
				heroCards: {
					type: 'LedgerHeroCards',
					props: {},
					children: [],
				},
				invoiceStatusCounts: {
					type: 'LedgerInvoiceStatusCounts',
					props: {},
					children: [],
				},
				eInvoiceFunnel: {
					type: 'LedgerEInvoiceFunnel',
					props: {},
					children: [],
				},
				invoiceVolumeTrend: {
					type: 'LedgerInvoiceVolumeTrend',
					props: {},
					children: [],
				},
				lowerGrid: {
					type: 'DashboardThreeColumnGrid',
					props: {},
					children: ['stats', 'invoiceRegister'],
				},
				stats: {
					type: 'LedgerStats',
					props: {},
					children: [],
				},
				invoiceRegister: {
					type: 'LedgerInvoiceRegister',
					props: {},
					children: [],
				},
			},
		},
	},

	'/ledger/invoices': {
		layout: 'app',
		metadata: {
			title: 'Invoices',
			description: 'Sales invoices, credit memos, and tax documents.',
		},
		page: {
			root: 'view',
			elements: {
				view: {
					type: 'ModuleListView',
					props: {
						moduleId: 'ledger',
						entityId: 'invoices',
						title: 'Invoices',
						description: 'Sales invoices, credit memos, and tax documents.',
						columns: [
							{ accessorKey: 'invoiceNo', title: 'Invoice No.' },
							{ accessorKey: 'customerName', title: 'Customer' },
							{
								accessorKey: 'documentType',
								title: 'Type',
								cellVariant: 'select',
							},
							{ accessorKey: 'status', title: 'Status', cellVariant: 'select' },
							{
								accessorKey: 'invoiceDate',
								title: 'Invoice Date',
								cellVariant: 'date',
							},
							{
								accessorKey: 'dueDate',
								title: 'Due Date',
								cellVariant: 'date',
							},
							{
								accessorKey: 'totalAmount',
								title: 'Amount',
								cellVariant: 'number',
							},
							{
								accessorKey: 'remainingAmount',
								title: 'Remaining',
								cellVariant: 'number',
							},
						],
						enableNew: true,
						newLabel: 'New Invoice',
						_cardTitle: 'Invoice {invoiceNo}',
						_cardNewTitle: 'New Invoice',
						_cardDescription:
							'Sales invoice or credit memo with financial details and status tracking.',
						_cardSections: [
							{
								title: 'Header',
								fields: [
									{
										name: 'invoiceNo',
										label: 'Invoice No.',
										type: 'text',
										readOnly: true,
									},
									{
										name: 'customerId',
										label: 'Customer ID',
										type: 'text',
										readOnly: true,
									},
									{
										name: 'customerName',
										label: 'Customer Name',
										type: 'text',
										readOnly: true,
									},
								],
							},
							{
								title: 'Status',
								fields: [
									{
										name: 'status',
										label: 'Status',
										type: 'select',
										options: [
											{ label: 'Draft', value: 'DRAFT' },
											{ label: 'Posted', value: 'POSTED' },
											{ label: 'Sent', value: 'SENT' },
											{ label: 'Paid', value: 'PAID' },
											{ label: 'Cancelled', value: 'CANCELLED' },
										],
									},
									{
										name: 'documentType',
										label: 'Document Type',
										type: 'select',
										options: [
											{ label: 'Invoice', value: 'INVOICE' },
											{ label: 'Credit Memo', value: 'CREDIT_MEMO' },
										],
									},
								],
							},
							{
								title: 'Financials',
								fields: [
									{ name: 'currency', label: 'Currency', type: 'text' },
									{
										name: 'totalAmount',
										label: 'Total Amount',
										type: 'number',
										readOnly: true,
									},
									{
										name: 'taxAmount',
										label: 'Tax Amount',
										type: 'number',
										readOnly: true,
									},
									{
										name: 'remainingAmount',
										label: 'Remaining Amount',
										type: 'number',
										readOnly: true,
									},
								],
							},
							{
								title: 'Dates',
								fields: [
									{ name: 'postingDate', label: 'Posting Date', type: 'date' },
									{ name: 'dueDate', label: 'Due Date', type: 'date' },
								],
							},
						] as any,
					},
					children: [],
				},
			},
		},
	},

	'/ledger/customer-ledger': {
		layout: 'app',
		metadata: {
			title: 'Customer Ledger',
			description: 'Customer ledger entries and receivables.',
		},
		page: {
			root: 'view',
			elements: {
				view: {
					type: 'ModuleListView',
					props: {
						moduleId: 'ledger',
						entityId: 'customerLedger',
						title: 'Customer Ledger',
						description: 'Customer ledger entries and receivables.',
						columns: [
							{ accessorKey: 'entryNo', title: 'Entry No.' },
							{ accessorKey: 'customerName', title: 'Customer' },
							{
								accessorKey: 'documentType',
								title: 'Doc Type',
								cellVariant: 'select',
							},
							{ accessorKey: 'documentNo', title: 'Doc No.' },
							{
								accessorKey: 'postingDate',
								title: 'Posting Date',
								cellVariant: 'date',
							},
							{ accessorKey: 'amount', title: 'Amount', cellVariant: 'number' },
							{
								accessorKey: 'remainingAmount',
								title: 'Remaining',
								cellVariant: 'number',
							},
							{ accessorKey: 'open', title: 'Open', cellVariant: 'select' },
						],
						enableNew: false,
					},
					children: [],
				},
			},
		},
	},

	'/ledger/gl-entries': {
		layout: 'app',
		metadata: {
			title: 'G/L Entries',
			description: 'General ledger entries across all accounts.',
		},
		page: {
			root: 'view',
			elements: {
				view: {
					type: 'ModuleListView',
					props: {
						moduleId: 'ledger',
						entityId: 'glEntries',
						title: 'G/L Entries',
						description: 'General ledger entries across all accounts.',
						columns: [
							{ accessorKey: 'entryNo', title: 'Entry No.' },
							{ accessorKey: 'accountNo', title: 'Account No.' },
							{ accessorKey: 'accountName', title: 'Account' },
							{
								accessorKey: 'postingDate',
								title: 'Posting Date',
								cellVariant: 'date',
							},
							{
								accessorKey: 'documentType',
								title: 'Doc Type',
								cellVariant: 'select',
							},
							{ accessorKey: 'documentNo', title: 'Doc No.' },
							{
								accessorKey: 'debitAmount',
								title: 'Debit',
								cellVariant: 'number',
							},
							{
								accessorKey: 'creditAmount',
								title: 'Credit',
								cellVariant: 'number',
							},
						],
						enableNew: false,
					},
					children: [],
				},
			},
		},
	},

	'/ledger/collections-compliance': {
		layout: 'app',
		metadata: {
			title: 'Collections & Compliance',
			description: 'Collections follow-up and regulatory compliance tracking.',
		},
		page: {
			root: 'view',
			elements: {
				view: {
					type: 'CollectionsCompliance',
					props: {
						title: 'Collections & Compliance Operations',
						description:
							'Manage credit memo lifecycle, e-invoice queue outcomes, and receivables follow-up workflows.',
					},
					children: [],
				},
			},
		},
	},
}
