import z from 'zod'
import { defineSchema, flowField } from './definitions'

export const db = defineSchema(
	({ createTable }) => ({
		// =====================================================================
		// Hub
		// =====================================================================
		operationTasks: createTable('operationTasks', {
			schema: {
				taskNo: z.string(),
				moduleId: z.string(),
				title: z.string().meta({ type: 'sentence' }),
				description: z.string().optional(),
				status: z
					.enum(['OPEN', 'IN_PROGRESS', 'BLOCKED', 'DONE'])
					.default('OPEN'),
				priority: z
					.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
					.default('MEDIUM'),
				assigneeUserId: z.string().optional(),
				dueDate: z.string().optional().meta({ type: 'date' }),
				statusReason: z.string().optional(),
				statusUpdatedAt: z.date().optional(),
			},
			seed: 8,
			noSeries: { pattern: 'TASK0000001', field: 'taskNo' },
		})
			.table()
			.index('operationTasks_moduleId_idx', ['moduleId'])
			.index('operationTasks_status_idx', ['status']),

		moduleNotifications: createTable('moduleNotifications', {
			schema: {
				moduleId: z.string(),
				title: z.string().meta({ type: 'sentence' }),
				body: z.string().optional(),
				status: z.enum(['UNREAD', 'READ', 'ARCHIVED']).default('UNREAD'),
				severity: z.enum(['INFO', 'WARNING', 'ERROR']).default('INFO'),
				targetUserId: z.string().optional(),
			},
			seed: 12,
		})
			.table()
			.index('moduleNotifications_moduleId_idx', ['moduleId'])
			.index('moduleNotifications_status_idx', ['status']),

		// =====================================================================
		// Market
		// =====================================================================
		items: createTable('items', {
			schema: {
				itemNo: z.string(),
				description: z.string().meta({ field: 'commerce.productName' }),
				type: z.enum(['ITEM', 'SERVICE', 'BUNDLE']).default('ITEM'),
				unitPrice: z.number().default(0).meta({ min: 5, max: 500 }),
				unitCost: z.number().default(0).meta({ min: 2, max: 300 }),
				inventory: z.number().default(0).meta({ min: 0, max: 1000 }),
				uom: z.string().default('EA'),
				barcode: z.string().optional(),
				blocked: z.boolean().default(false),

				totalSalesQty: z
					.number()
					.default(0)
					.meta({
						flowField: flowField({
							type: 'sum',
							source: 'salesLines',
							key: 'itemId',
							field: 'quantity',
						}),
					}),
				totalSalesAmount: z
					.number()
					.default(0)
					.meta({
						flowField: flowField({
							type: 'sum',
							source: 'salesLines',
							key: 'itemId',
							field: 'lineAmount',
						}),
					}),
			},
			seed: 20,
			noSeries: { pattern: 'ITEM0000001', field: 'itemNo' },
		})
			.table()
			.index('items_itemNo_idx', ['itemNo'])
			.unique('items_barcode_uq', ['barcode']),

		customers: createTable('customers', {
			schema: {
				customerNo: z.string(),
				name: z.string().meta({ type: 'company' }),
				email: z.string().optional().meta({ type: 'email' }),
				phone: z.string().optional().meta({ type: 'phone' }),
				address: z.string().optional().meta({ type: 'address' }),
				city: z.string().optional().meta({ type: 'city' }),
				country: z.string().optional().meta({ type: 'country' }),
				blocked: z.boolean().default(false),

				orderCount: z
					.number()
					.default(0)
					.meta({
						flowField: flowField({
							type: 'count',
							source: 'salesHeaders',
							key: 'customerId',
						}),
					}),
				totalBalance: z
					.number()
					.default(0)
					.meta({
						flowField: flowField({
							type: 'sum',
							source: 'custLedgerEntries',
							key: 'customerId',
							field: 'remainingAmount',
						}),
					}),
			},
			seed: 15,
			noSeries: { pattern: 'CUST0000001', field: 'customerNo' },
		})
			.table()
			.index('customers_customerNo_idx', ['customerNo']),

		salesHeaders: createTable('salesHeaders', {
			schema: (one) => ({
				documentNo: z.string(),
				documentType: z
					.enum(['ORDER', 'RETURN_ORDER', 'QUOTE'])
					.default('ORDER'),
				status: z
					.enum([
						'DRAFT',
						'PENDING_APPROVAL',
						'APPROVED',
						'REJECTED',
						'COMPLETED',
						'CANCELED',
					])
					.default('DRAFT'),
				customerId: one('customers'),
				customerName: z
					.string()
					.optional()
					.meta({
						flowField: flowField({
							type: 'lookup',
							source: 'customers',
							key: '_id',
							from: 'customerId',
							field: 'name',
						}),
					}),
				orderDate: z.string().optional().meta({ type: 'date' }),
				currency: z
					.string()
					.default('USD')
					.meta({ field: 'finance.currencyCode' }),
				statusReason: z.string().optional(),
				statusUpdatedAt: z.date().optional(),
				externalRef: z.string().optional(),

				lineCount: z
					.number()
					.default(0)
					.meta({
						flowField: flowField({
							type: 'count',
							source: 'salesLines',
							key: 'documentNo',
							from: 'documentNo',
						}),
					}),
				totalAmount: z
					.number()
					.default(0)
					.meta({
						flowField: flowField({
							type: 'sum',
							source: 'salesLines',
							key: 'documentNo',
							from: 'documentNo',
							field: 'lineAmount',
						}),
					}),
			}),
			seed: 10,
			noSeries: { pattern: 'SO0000001', field: 'documentNo' },
		})
			.table()
			.index('salesHeaders_customerId_idx', ['customerId'])
			.index('salesHeaders_status_idx', ['status']),

		salesLines: createTable('salesLines', {
			schema: (one) => ({
				documentNo: one('salesHeaders'),
				lineNo: z.number().default(0),
				itemId: one('items'),
				itemDescription: z
					.string()
					.optional()
					.meta({
						flowField: flowField({
							type: 'lookup',
							source: 'items',
							key: '_id',
							from: 'itemId',
							field: 'description',
						}),
					}),
				quantity: z.number().default(0).meta({ min: 1, max: 50 }),
				unitPrice: z.number().default(0).meta({ min: 10, max: 500 }),
				discountPercent: z.number().default(0).meta({ min: 0, max: 25 }),
				lineAmount: z.number().default(0).meta({ min: 10, max: 5000 }),
			}),
			seed: { min: 2, max: 5, perParent: true, parentTable: 'salesHeaders' },
		})
			.table()
			.index('salesLines_documentNo_idx', ['documentNo'])
			.index('salesLines_itemId_idx', ['itemId'])
			.computed((row) => ({
				calculatedAmount:
					row.quantity * row.unitPrice * (1 - row.discountPercent / 100),
			})),

		carts: createTable('carts', {
			schema: (one) => ({
				customerId: one('customers'),
				customerName: z
					.string()
					.optional()
					.meta({
						flowField: flowField({
							type: 'lookup',
							source: 'customers',
							key: '_id',
							from: 'customerId',
							field: 'name',
						}),
					}),
				status: z.enum(['OPEN', 'CHECKED_OUT', 'ABANDONED']).default('OPEN'),
				currency: z
					.string()
					.default('USD')
					.meta({ field: 'finance.currencyCode' }),

				itemCount: z
					.number()
					.default(0)
					.meta({
						flowField: flowField({
							type: 'count',
							source: 'cartLines',
							key: 'cartId',
						}),
					}),
				totalAmount: z
					.number()
					.default(0)
					.meta({
						flowField: flowField({
							type: 'sum',
							source: 'cartLines',
							key: 'cartId',
							field: 'lineAmount',
						}),
					}),
			}),
			seed: 5,
		})
			.table()
			.index('carts_customerId_idx', ['customerId'])
			.index('carts_status_idx', ['status']),

		cartLines: createTable('cartLines', {
			schema: (one) => ({
				cartId: one('carts'),
				itemDescription: z
					.string()
					.optional()
					.meta({
						flowField: flowField({
							type: 'lookup',
							source: 'items',
							key: '_id',
							from: 'itemId',
							field: 'description',
						}),
					}),
				itemId: one('items'),
				quantity: z.number().default(1).meta({ min: 1, max: 50 }),
				unitPrice: z.number().default(0).meta({ min: 10, max: 500 }),
				lineAmount: z.number().default(0).meta({ min: 10, max: 5000 }),
			}),
			seed: { min: 1, max: 4, perParent: true, parentTable: 'carts' },
		})
			.table()
			.index('cartLines_cartId_idx', ['cartId'])
			.index('cartLines_itemId_idx', ['itemId'])
			.computed((row) => ({
				calculatedAmount: row.quantity * row.unitPrice,
			})),

		// =====================================================================
		// Insight
		// =====================================================================
		locations: createTable('locations', {
			schema: {
				code: z.string(),
				name: z.string().meta({ field: 'company.name' }),
				type: z
					.enum(['WAREHOUSE', 'STORE', 'DISTRIBUTION_CENTER'])
					.default('WAREHOUSE'),
				address: z.string().optional().meta({ type: 'address' }),
				city: z.string().optional().meta({ type: 'city' }),
				country: z.string().optional().meta({ type: 'country' }),
				latitude: z
					.number()
					.min(-56)
					.max(72)
					.optional()
					.meta({ min: -56, max: 72 }),
				longitude: z
					.number()
					.min(-170)
					.max(-34)
					.optional()
					.meta({ min: -170, max: -34 }),
				active: z.boolean().default(true),

				itemCount: z
					.number()
					.default(0)
					.meta({
						flowField: flowField({
							type: 'count',
							source: 'itemLedgerEntries',
							key: 'locationCode',
							from: 'code',
						}),
					}),
			},
			seed: 5,
			noSeries: { pattern: 'LOC0001', field: 'code' },
		})
			.table()
			.index('locations_code_idx', ['code']),

		itemLedgerEntries: createTable('itemLedgerEntries', {
			schema: (one) => ({
				entryNo: z.number().default(0),
				entryType: z
					.enum([
						'SALE',
						'PURCHASE',
						'POSITIVE_ADJUSTMENT',
						'NEGATIVE_ADJUSTMENT',
						'TRANSFER',
					])
					.default('PURCHASE'),
				itemId: one('items'),
				itemDescription: z
					.string()
					.optional()
					.meta({
						flowField: flowField({
							type: 'lookup',
							source: 'items',
							key: '_id',
							from: 'itemId',
							field: 'description',
						}),
					}),
				locationCode: z.string().optional(),
				postingDate: z.string().optional().meta({ type: 'date' }),
				quantity: z.number().default(0).meta({ min: 1, max: 50 }),
				remainingQty: z.number().default(0),
				open: z.boolean().default(true),
				sourceDocumentType: z.string().optional(),
				sourceDocumentNo: z.string().optional(),
			}),
			seed: 30,
		})
			.table()
			.index('itemLedgerEntries_itemId_idx', ['itemId'])
			.index('itemLedgerEntries_locationCode_idx', ['locationCode']),

		valueEntries: createTable('valueEntries', {
			schema: (one) => ({
				entryNo: z.number().default(0),
				itemLedgerEntryId: one('itemLedgerEntries'),
				itemId: one('items'),
				itemDescription: z
					.string()
					.optional()
					.meta({
						flowField: flowField({
							type: 'lookup',
							source: 'items',
							key: '_id',
							from: 'itemId',
							field: 'description',
						}),
					}),
				postingDate: z.string().optional().meta({ type: 'date' }),
				entryType: z
					.enum([
						'DIRECT_COST',
						'REVALUATION',
						'ROUNDING',
						'INDIRECT_COST',
						'VARIANCE',
					])
					.default('DIRECT_COST'),
				costAmountActual: z.number().default(0).meta({ min: 0, max: 10000 }),
				salesAmountActual: z.number().default(0).meta({ min: 0, max: 10000 }),
				costPerUnit: z.number().default(0).meta({ min: 5, max: 300 }),
			}),
			seed: {
				min: 1,
				max: 2,
				perParent: true,
				parentTable: 'itemLedgerEntries',
			},
		})
			.table()
			.index('valueEntries_itemLedgerEntryId_idx', ['itemLedgerEntryId'])
			.index('valueEntries_itemId_idx', ['itemId']),

		// =====================================================================
		// Replenishment
		// =====================================================================
		vendors: createTable('vendors', {
			schema: {
				vendorNo: z.string(),
				name: z.string().meta({ type: 'company' }),
				contactName: z.string().optional().meta({ type: 'fullname' }),
				email: z.string().optional().meta({ type: 'email' }),
				phone: z.string().optional().meta({ type: 'phone' }),
				address: z.string().optional().meta({ type: 'address' }),
				city: z.string().optional().meta({ type: 'city' }),
				country: z.string().optional().meta({ type: 'country' }),
				currency: z
					.string()
					.default('USD')
					.meta({ field: 'finance.currencyCode' }),
				blocked: z.boolean().default(false),

				purchaseOrderCount: z
					.number()
					.default(0)
					.meta({
						flowField: flowField({
							type: 'count',
							source: 'purchaseHeaders',
							key: 'vendorId',
						}),
					}),
				totalBalance: z
					.number()
					.default(0)
					.meta({
						flowField: flowField({
							type: 'sum',
							source: 'purchaseHeaders',
							key: 'vendorId',
							field: 'totalAmount',
						}),
					}),
			},
			seed: 10,
			noSeries: { pattern: 'VEND0000001', field: 'vendorNo' },
		})
			.table()
			.index('vendors_vendorNo_idx', ['vendorNo']),

		purchaseHeaders: createTable('purchaseHeaders', {
			schema: (one) => ({
				documentNo: z.string(),
				documentType: z
					.enum(['ORDER', 'RETURN_ORDER', 'QUOTE'])
					.default('ORDER'),
				status: z
					.enum([
						'DRAFT',
						'PENDING_APPROVAL',
						'APPROVED',
						'REJECTED',
						'COMPLETED',
						'CANCELED',
					])
					.default('DRAFT'),
				vendorId: one('vendors'),
				vendorName: z
					.string()
					.optional()
					.meta({
						flowField: flowField({
							type: 'lookup',
							source: 'vendors',
							key: '_id',
							from: 'vendorId',
							field: 'name',
						}),
					}),
				orderDate: z.string().optional().meta({ type: 'date' }),
				expectedReceiptDate: z.string().optional().meta({ type: 'date' }),
				currency: z
					.string()
					.default('USD')
					.meta({ field: 'finance.currencyCode' }),
				statusReason: z.string().optional(),
				statusUpdatedAt: z.date().optional(),

				lineCount: z
					.number()
					.default(0)
					.meta({
						flowField: flowField({
							type: 'count',
							source: 'purchaseLines',
							key: 'documentNo',
							from: 'documentNo',
						}),
					}),
				totalAmount: z
					.number()
					.default(0)
					.meta({
						flowField: flowField({
							type: 'sum',
							source: 'purchaseLines',
							key: 'documentNo',
							from: 'documentNo',
							field: 'lineAmount',
						}),
					}),
			}),
			seed: 8,
			noSeries: { pattern: 'PO0000001', field: 'documentNo' },
		})
			.table()
			.index('purchaseHeaders_vendorId_idx', ['vendorId'])
			.index('purchaseHeaders_status_idx', ['status']),

		purchaseLines: createTable('purchaseLines', {
			schema: (one) => ({
				documentNo: one('purchaseHeaders'),
				lineNo: z.number().default(0),
				itemId: one('items'),
				description: z
					.string()
					.optional()
					.meta({
						flowField: flowField({
							type: 'lookup',
							source: 'items',
							key: '_id',
							from: 'itemId',
							field: 'description',
						}),
					}),
				quantity: z.number().default(0).meta({ min: 1, max: 50 }),
				unitCost: z.number().default(0).meta({ min: 5, max: 300 }),
				lineAmount: z.number().default(0).meta({ min: 10, max: 5000 }),
				quantityReceived: z.number().default(0),
				quantityInvoiced: z.number().default(0),
			}),
			seed: { min: 2, max: 5, perParent: true, parentTable: 'purchaseHeaders' },
		})
			.table()
			.index('purchaseLines_documentNo_idx', ['documentNo'])
			.index('purchaseLines_itemId_idx', ['itemId'])
			.computed((row) => ({
				calculatedAmount: row.quantity * row.unitCost,
				outstandingQty: row.quantity - row.quantityReceived,
			})),

		transferHeaders: createTable('transferHeaders', {
			schema: {
				transferNo: z.string(),
				status: z
					.enum(['DRAFT', 'RELEASED', 'IN_TRANSIT', 'RECEIVED', 'CANCELED'])
					.default('DRAFT'),
				fromLocationCode: z.string(),
				toLocationCode: z.string(),
				shipmentDate: z.string().optional().meta({ type: 'date' }),
				receiptDate: z.string().optional().meta({ type: 'date' }),
				statusReason: z.string().optional(),
				statusUpdatedAt: z.date().optional(),

				lineCount: z
					.number()
					.default(0)
					.meta({
						flowField: flowField({
							type: 'count',
							source: 'transferLines',
							key: 'transferNo',
							from: 'transferNo',
						}),
					}),
			},
			seed: 5,
			noSeries: { pattern: 'TR0000001', field: 'transferNo' },
		})
			.table()
			.index('transferHeaders_status_idx', ['status']),

		transferLines: createTable('transferLines', {
			schema: (one) => ({
				transferNo: one('transferHeaders'),
				lineNo: z.number().default(0),
				itemId: one('items'),
				description: z
					.string()
					.optional()
					.meta({
						flowField: flowField({
							type: 'lookup',
							source: 'items',
							key: '_id',
							from: 'itemId',
							field: 'description',
						}),
					}),
				quantity: z.number().default(0).meta({ min: 1, max: 50 }),
				quantityShipped: z.number().default(0),
				quantityReceived: z.number().default(0),
			}),
			seed: { min: 1, max: 4, perParent: true, parentTable: 'transferHeaders' },
		})
			.table()
			.index('transferLines_transferNo_idx', ['transferNo'])
			.index('transferLines_itemId_idx', ['itemId'])
			.computed((row) => ({
				outstandingQty: row.quantity - row.quantityShipped,
			})),

		// =====================================================================
		// Ledger
		// =====================================================================
		salesInvoiceHeaders: createTable('salesInvoiceHeaders', {
			schema: (one) => ({
				invoiceNo: z.string(),
				status: z.enum(['DRAFT', 'POSTED', 'REVERSED']).default('DRAFT'),
				customerId: one('customers'),
				customerName: z
					.string()
					.optional()
					.meta({
						flowField: flowField({
							type: 'lookup',
							source: 'customers',
							key: '_id',
							from: 'customerId',
							field: 'name',
						}),
					}),
				salesOrderNo: z.string().optional(),
				postingDate: z.string().optional().meta({ type: 'date' }),
				dueDate: z.string().optional().meta({ type: 'date' }),
				currency: z
					.string()
					.default('USD')
					.meta({ field: 'finance.currencyCode' }),
				statusReason: z.string().optional(),
				statusUpdatedAt: z.date().optional(),

				lineCount: z
					.number()
					.default(0)
					.meta({
						flowField: flowField({
							type: 'count',
							source: 'salesInvoiceLines',
							key: 'invoiceNo',
							from: 'invoiceNo',
						}),
					}),
				totalAmount: z
					.number()
					.default(0)
					.meta({
						flowField: flowField({
							type: 'sum',
							source: 'salesInvoiceLines',
							key: 'invoiceNo',
							from: 'invoiceNo',
							field: 'lineAmount',
						}),
					}),
			}),
			seed: 8,
			noSeries: { pattern: 'SINV0000001', field: 'invoiceNo' },
		})
			.table()
			.index('salesInvoiceHeaders_customerId_idx', ['customerId'])
			.index('salesInvoiceHeaders_status_idx', ['status']),

		salesInvoiceLines: createTable('salesInvoiceLines', {
			schema: (one) => ({
				invoiceNo: one('salesInvoiceHeaders'),
				lineNo: z.number().default(0),
				itemId: one('items'),
				itemDescription: z
					.string()
					.optional()
					.meta({
						flowField: flowField({
							type: 'lookup',
							source: 'items',
							key: '_id',
							from: 'itemId',
							field: 'description',
						}),
					}),
				quantity: z.number().default(0).meta({ min: 1, max: 50 }),
				unitPrice: z.number().default(0).meta({ min: 10, max: 500 }),
				lineAmount: z.number().default(0).meta({ min: 10, max: 5000 }),
			}),
			seed: {
				min: 2,
				max: 4,
				perParent: true,
				parentTable: 'salesInvoiceHeaders',
			},
		})
			.table()
			.index('salesInvoiceLines_invoiceNo_idx', ['invoiceNo'])
			.index('salesInvoiceLines_itemId_idx', ['itemId'])
			.computed((row) => ({
				calculatedAmount: row.quantity * row.unitPrice,
			})),

		custLedgerEntries: createTable('custLedgerEntries', {
			schema: (one) => ({
				entryNo: z.number().default(0),
				customerId: one('customers'),
				customerName: z
					.string()
					.optional()
					.meta({
						flowField: flowField({
							type: 'lookup',
							source: 'customers',
							key: '_id',
							from: 'customerId',
							field: 'name',
						}),
					}),
				postingDate: z.string().optional().meta({ type: 'date' }),
				documentType: z
					.enum(['INVOICE', 'CREDIT_MEMO', 'PAYMENT'])
					.default('INVOICE'),
				documentNo: z.string().optional(),
				description: z
					.string()
					.optional()
					.meta({ field: 'finance.transactionDescription' }),
				amount: z.number().default(0).meta({ min: -5000, max: 5000 }),
				remainingAmount: z.number().default(0).meta({ min: 0, max: 5000 }),
				open: z.boolean().default(true),
				currency: z
					.string()
					.default('USD')
					.meta({ field: 'finance.currencyCode' }),
			}),
			seed: 15,
		})
			.table()
			.index('custLedgerEntries_customerId_idx', ['customerId'])
			.index('custLedgerEntries_documentNo_idx', ['documentNo']),

		glEntries: createTable('glEntries', {
			schema: {
				entryNo: z.number().default(0),
				postingDate: z.string().optional().meta({ type: 'date' }),
				accountNo: z.string().meta({ field: 'finance.accountNumber' }),
				accountName: z
					.string()
					.optional()
					.meta({ field: 'finance.accountName' }),
				documentType: z.string().optional(),
				documentNo: z.string().optional(),
				description: z
					.string()
					.optional()
					.meta({ field: 'finance.transactionDescription' }),
				debitAmount: z.number().default(0).meta({ min: 0, max: 10000 }),
				creditAmount: z.number().default(0).meta({ min: 0, max: 10000 }),
			},
			seed: 25,
		})
			.table()
			.index('glEntries_accountNo_idx', ['accountNo'])
			.index('glEntries_documentNo_idx', ['documentNo'])
			.computed((row) => ({
				netAmount: row.debitAmount - row.creditAmount,
			})),

		// =====================================================================
		// Flow
		// =====================================================================
		bankAccounts: createTable('bankAccounts', {
			schema: {
				accountNo: z.string(),
				name: z.string().meta({ field: 'finance.accountName' }),
				bankName: z.string().optional().meta({ field: 'company.name' }),
				iban: z.string().default(() => crypto.randomUUID()),
				swiftCode: z.string().optional().meta({ field: 'finance.bic' }),
				currency: z
					.string()
					.default('USD')
					.meta({ field: 'finance.currencyCode' }),
				status: z.enum(['ACTIVE', 'INACTIVE', 'BLOCKED']).default('ACTIVE'),
				lastSyncAt: z.date().optional(),

				entryCount: z
					.number()
					.default(0)
					.meta({
						flowField: flowField({
							type: 'count',
							source: 'bankAccountLedgerEntries',
							key: 'bankAccountId',
						}),
					}),
				currentBalance: z
					.number()
					.default(0)
					.meta({
						flowField: flowField({
							type: 'sum',
							source: 'bankAccountLedgerEntries',
							key: 'bankAccountId',
							field: 'amount',
						}),
					}),
			},
			seed: 6,
			noSeries: { pattern: 'BANK0000001', field: 'accountNo' },
		})
			.table()
			.index('bankAccounts_accountNo_idx', ['accountNo'])
			.index('bankAccounts_status_idx', ['status'])
			.unique('bankAccounts_iban_uq', ['iban']),

		bankAccountLedgerEntries: createTable('bankAccountLedgerEntries', {
			schema: (one) => ({
				entryNo: z.number().default(0),
				bankAccountId: one('bankAccounts'),
				bankAccountName: z
					.string()
					.optional()
					.meta({
						flowField: flowField({
							type: 'lookup',
							source: 'bankAccounts',
							key: '_id',
							from: 'bankAccountId',
							field: 'name',
						}),
					}),
				postingDate: z.string().optional().meta({ type: 'date' }),
				documentType: z
					.enum(['PAYMENT', 'REFUND', 'TRANSFER', 'ADJUSTMENT', 'PAYROLL'])
					.default('PAYMENT'),
				documentNo: z.string().optional(),
				description: z
					.string()
					.optional()
					.meta({ field: 'finance.transactionDescription' }),
				debitAmount: z.number().default(0).meta({ min: 0, max: 10000 }),
				creditAmount: z.number().default(0).meta({ min: 0, max: 10000 }),
				amount: z.number().default(0).meta({ min: -5000, max: 5000 }),
				reconciliationStatus: z
					.enum(['OPEN', 'MATCHED', 'RECONCILED', 'EXCEPTION'])
					.default('OPEN'),
				statusReason: z.string().optional(),
				statusUpdatedAt: z.date().optional(),
				open: z.boolean().default(true),
			}),
			seed: {
				min: 3,
				max: 7,
				perParent: true,
				parentTable: 'bankAccounts',
			},
		})
			.table()
			.index('bankAccountLedgerEntries_bankAccountId_idx', ['bankAccountId'])
			.index('bankAccountLedgerEntries_documentNo_idx', ['documentNo'])
			.index('bankAccountLedgerEntries_reconciliationStatus_idx', [
				'reconciliationStatus',
			])
			.computed((row) => ({
				netAmount: row.creditAmount - row.debitAmount,
			})),

		genJournalLines: createTable('genJournalLines', {
			schema: {
				journalTemplate: z.string().default('GENERAL'),
				journalBatch: z.string().default('DEFAULT'),
				lineNo: z.number().default(0),
				postingDate: z.string().optional().meta({ type: 'date' }),
				documentType: z
					.enum([
						'PAYMENT',
						'INVOICE',
						'REFUND',
						'TRANSFER',
						'PAYROLL',
						'ADJUSTMENT',
					])
					.default('PAYMENT'),
				documentNo: z.string().optional(),
				accountType: z
					.enum([
						'GL_ACCOUNT',
						'BANK_ACCOUNT',
						'CUSTOMER',
						'VENDOR',
						'EMPLOYEE',
					])
					.default('GL_ACCOUNT'),
				accountNo: z.string().meta({ field: 'finance.accountNumber' }),
				balancingAccountType: z
					.enum([
						'GL_ACCOUNT',
						'BANK_ACCOUNT',
						'CUSTOMER',
						'VENDOR',
						'EMPLOYEE',
					])
					.optional(),
				balancingAccountNo: z.string().optional(),
				description: z
					.string()
					.optional()
					.meta({ field: 'finance.transactionDescription' }),
				debitAmount: z.number().default(0).meta({ min: 0, max: 10000 }),
				creditAmount: z.number().default(0).meta({ min: 0, max: 10000 }),
				status: z
					.enum(['OPEN', 'APPROVED', 'POSTED', 'VOIDED'])
					.default('OPEN'),
				statusReason: z.string().optional(),
				statusUpdatedAt: z.date().optional(),
				sourceModule: z.string().default('FLOW'),
			},
			seed: 24,
		})
			.table()
			.index('genJournalLines_status_idx', ['status'])
			.index('genJournalLines_documentNo_idx', ['documentNo'])
			.index('genJournalLines_accountNo_idx', ['accountNo'])
			.computed((row) => ({
				netAmount: row.debitAmount - row.creditAmount,
			})),

		// =====================================================================
		// Payroll
		// =====================================================================
		employees: createTable('employees', {
			schema: {
				employeeNo: z.string(),
				firstName: z.string().meta({ type: 'firstname' }),
				lastName: z.string().meta({ type: 'lastname' }),
				email: z.string().optional().meta({ type: 'email' }),
				phone: z.string().optional().meta({ type: 'phone' }),
				department: z
					.string()
					.optional()
					.meta({ field: 'commerce.department' }),
				jobTitle: z.string().optional().meta({ type: 'job_title' }),
				employmentType: z
					.enum(['FULL_TIME', 'PART_TIME', 'CONTRACTOR', 'TEMPORARY'])
					.default('FULL_TIME'),
				status: z.enum(['ACTIVE', 'ON_LEAVE', 'TERMINATED']).default('ACTIVE'),
				hireDate: z.string().optional().meta({ type: 'date' }),
				terminationDate: z.string().optional(),
				taxId: z.string().optional(),
				baseSalary: z.number().default(0).meta({ min: 30000, max: 150000 }),
				payFrequency: z
					.enum(['WEEKLY', 'BIWEEKLY', 'SEMI_MONTHLY', 'MONTHLY'])
					.default('MONTHLY'),
				bankAccountId: z.string().optional(),

				ledgerEntryCount: z
					.number()
					.default(0)
					.meta({
						flowField: flowField({
							type: 'count',
							source: 'employeeLedgerEntries',
							key: 'employeeId',
						}),
					}),
				outstandingAmount: z
					.number()
					.default(0)
					.meta({
						flowField: flowField({
							type: 'sum',
							source: 'employeeLedgerEntries',
							key: 'employeeId',
							field: 'remainingAmount',
						}),
					}),
			},
			seed: 18,
			noSeries: { pattern: 'EMP0000001', field: 'employeeNo' },
		})
			.table()
			.index('employees_employeeNo_idx', ['employeeNo'])
			.index('employees_status_idx', ['status'])
			.index('employees_department_idx', ['department']),

		employeeLedgerEntries: createTable('employeeLedgerEntries', {
			schema: (one) => ({
				entryNo: z.number().default(0),
				employeeId: one('employees'),
				employeeName: z
					.string()
					.optional()
					.meta({
						flowField: flowField({
							type: 'lookup',
							source: 'employees',
							key: '_id',
							from: 'employeeId',
							field: 'firstName',
						}),
					}),
				postingDate: z.string().optional().meta({ type: 'date' }),
				documentType: z
					.enum(['PAYROLL', 'ADJUSTMENT', 'PAYMENT', 'BENEFIT'])
					.default('PAYROLL'),
				documentNo: z.string().optional(),
				description: z
					.string()
					.optional()
					.meta({ field: 'finance.transactionDescription' }),
				amount: z.number().default(0).meta({ min: -5000, max: 5000 }),
				remainingAmount: z.number().default(0).meta({ min: 0, max: 5000 }),
				currency: z
					.string()
					.default('USD')
					.meta({ field: 'finance.currencyCode' }),
				open: z.boolean().default(true),
				payrollPeriod: z.string().optional(),
			}),
			seed: {
				min: 2,
				max: 5,
				perParent: true,
				parentTable: 'employees',
			},
		})
			.table()
			.index('employeeLedgerEntries_employeeId_idx', ['employeeId'])
			.index('employeeLedgerEntries_documentNo_idx', ['documentNo'])
			.computed((row) => ({
				isSettled: row.remainingAmount <= 0,
			})),

		// =====================================================================
		// POS
		// =====================================================================
		terminals: createTable('terminals', {
			schema: {
				terminalCode: z.string(),
				name: z.string().meta({ field: 'commerce.department' }),
				locationCode: z.string().optional(),
				status: z.enum(['ONLINE', 'OFFLINE', 'MAINTENANCE']).default('ONLINE'),
				lastHeartbeat: z.date().optional(),

				sessionCount: z
					.number()
					.default(0)
					.meta({
						flowField: flowField({
							type: 'count',
							source: 'posSessions',
							key: 'terminalId',
						}),
					}),
			},
			seed: 4,
			noSeries: { pattern: 'TERM001', field: 'terminalCode' },
		})
			.table()
			.index('terminals_terminalCode_idx', ['terminalCode']),

		posSessions: createTable('posSessions', {
			schema: (one) => ({
				sessionNo: z.string(),
				terminalId: one('terminals'),
				terminalName: z
					.string()
					.optional()
					.meta({
						flowField: flowField({
							type: 'lookup',
							source: 'terminals',
							key: '_id',
							from: 'terminalId',
							field: 'name',
						}),
					}),
				cashierId: z.string().optional(),
				status: z.enum(['OPEN', 'PAUSED', 'CLOSED']).default('OPEN'),
				openedAt: z.date().optional(),
				closedAt: z.date().optional(),
				openingBalance: z.number().default(0).meta({ min: 0, max: 50000 }),
				closingBalance: z.number().default(0).meta({ min: 0, max: 50000 }),

				transactionCount: z
					.number()
					.default(0)
					.meta({
						flowField: flowField({
							type: 'count',
							source: 'posTransactions',
							key: 'posSessionId',
						}),
					}),
				totalSales: z
					.number()
					.default(0)
					.meta({
						flowField: flowField({
							type: 'sum',
							source: 'posTransactions',
							key: 'posSessionId',
							field: 'totalAmount',
						}),
					}),
			}),
			seed: { min: 2, max: 4, perParent: true, parentTable: 'terminals' },
			noSeries: { pattern: 'SESS0000001', field: 'sessionNo' },
		})
			.table()
			.index('posSessions_terminalId_idx', ['terminalId'])
			.index('posSessions_status_idx', ['status']),

		posTransactions: createTable('posTransactions', {
			schema: (one) => ({
				receiptNo: z.string(),
				posSessionId: one('posSessions'),
				status: z
					.enum(['OPEN', 'COMPLETED', 'VOIDED', 'REFUNDED'])
					.default('OPEN'),
				customerId: z.string().optional(),
				customerName: z
					.string()
					.optional()
					.meta({
						flowField: flowField({
							type: 'lookup',
							source: 'customers',
							key: '_id',
							from: 'customerId',
							field: 'name',
						}),
					}),
				totalAmount: z.number().default(0).meta({ min: 5, max: 500 }),
				taxAmount: z.number().default(0).meta({ min: 0, max: 50 }),
				discountAmount: z.number().default(0).meta({ min: 0, max: 25 }),
				paidAmount: z.number().default(0).meta({ min: 5, max: 500 }),
				paymentMethod: z
					.enum(['CASH', 'CARD', 'MOBILE', 'MIXED'])
					.default('CASH'),
				transactionAt: z.date().optional(),
				statusReason: z.string().optional(),
				statusUpdatedAt: z.date().optional(),

				lineCount: z
					.number()
					.default(0)
					.meta({
						flowField: flowField({
							type: 'count',
							source: 'posTransactionLines',
							key: 'transactionId',
						}),
					}),
			}),
			seed: { min: 3, max: 8, perParent: true, parentTable: 'posSessions' },
			noSeries: { pattern: 'RCP0000001', field: 'receiptNo' },
		})
			.table()
			.index('posTransactions_posSessionId_idx', ['posSessionId'])
			.index('posTransactions_status_idx', ['status']),

		posTransactionLines: createTable('posTransactionLines', {
			schema: (one) => ({
				transactionId: one('posTransactions'),
				lineNo: z.number().default(0),
				itemId: one('items'),
				description: z
					.string()
					.optional()
					.meta({ field: 'commerce.productName' }),
				quantity: z.number().default(1).meta({ min: 1, max: 50 }),
				unitPrice: z.number().default(0).meta({ min: 10, max: 500 }),
				lineAmount: z.number().default(0).meta({ min: 10, max: 5000 }),
				discountPercent: z.number().default(0).meta({ min: 0, max: 25 }),
			}),
			seed: { min: 1, max: 5, perParent: true, parentTable: 'posTransactions' },
		})
			.table()
			.index('posTransactionLines_transactionId_idx', ['transactionId'])
			.index('posTransactionLines_itemId_idx', ['itemId'])
			.computed((row) => ({
				calculatedAmount:
					row.quantity * row.unitPrice * (1 - row.discountPercent / 100),
			})),

		// =====================================================================
		// Trace
		// =====================================================================
		shipments: createTable('shipments', {
			schema: {
				shipmentNo: z.string(),
				status: z
					.enum([
						'PLANNED',
						'DISPATCHED',
						'IN_TRANSIT',
						'DELIVERED',
						'EXCEPTION',
					])
					.default('PLANNED'),
				sourceDocumentType: z.string().optional(),
				sourceDocumentNo: z.string().optional(),
				shipmentMethodCode: z.string().optional(),
				priority: z
					.enum(['LOW', 'NORMAL', 'HIGH', 'EXPRESS'])
					.default('NORMAL'),
				plannedDispatchDate: z.string().optional().meta({ type: 'date' }),
				plannedDeliveryDate: z.string().optional().meta({ type: 'date' }),
				actualDispatchDate: z.string().optional().meta({ type: 'date' }),
				actualDeliveryDate: z.string().optional().meta({ type: 'date' }),
				courierName: z.string().optional(),
				trackingNo: z.string().optional(),
				statusReason: z.string().optional(),
				statusUpdatedAt: z.date().optional(),

				lineCount: z
					.number()
					.default(0)
					.meta({
						flowField: flowField({
							type: 'count',
							source: 'shipmentLines',
							key: 'shipmentNo',
							from: 'shipmentNo',
						}),
					}),
			},
			seed: 10,
			noSeries: { pattern: 'SHIP0000001', field: 'shipmentNo' },
		})
			.table()
			.index('shipments_status_idx', ['status'])
			.index('shipments_trackingNo_idx', ['trackingNo']),

		shipmentLines: createTable('shipmentLines', {
			schema: (one) => ({
				shipmentNo: one('shipments'),
				lineNo: z.number().default(0),
				itemId: one('items'),
				itemDescription: z
					.string()
					.optional()
					.meta({
						flowField: flowField({
							type: 'lookup',
							source: 'items',
							key: '_id',
							from: 'itemId',
							field: 'description',
						}),
					}),
				description: z
					.string()
					.optional()
					.meta({ field: 'commerce.productName' }),
				quantity: z.number().default(0).meta({ min: 1, max: 50 }),
				quantityShipped: z.number().default(0),
			}),
			seed: { min: 1, max: 4, perParent: true, parentTable: 'shipments' },
		})
			.table()
			.index('shipmentLines_shipmentNo_idx', ['shipmentNo'])
			.index('shipmentLines_itemId_idx', ['itemId'])
			.computed((row) => ({
				outstandingQty: row.quantity - row.quantityShipped,
			})),

		shipmentMethods: createTable('shipmentMethods', {
			schema: {
				code: z.string(),
				description: z.string().meta({ type: 'sentence' }),
				active: z.boolean().default(true),
			},
			seed: 4,
			noSeries: { pattern: 'SM001', field: 'code' },
		})
			.table()
			.defaults({ tenantId: 'demo-tenant' } as Record<string, unknown>),
	}),
	{
		relations: (r) => ({
			// Market relations
			salesHeaders: {
				customer: r.one.customers({
					from: r.salesHeaders.customerId,
					to: r.customers._id,
				}),
				lines: r.many.salesLines({
					from: r.salesHeaders.documentNo,
					to: r.salesLines.documentNo,
				}),
			},
			salesLines: {
				header: r.one.salesHeaders({
					from: r.salesLines.documentNo,
					to: r.salesHeaders.documentNo,
				}),
				item: r.one.items({
					from: r.salesLines.itemId,
					to: r.items._id,
				}),
			},
			carts: {
				customer: r.one.customers({
					from: r.carts.customerId,
					to: r.customers._id,
				}),
				lines: r.many.cartLines({
					from: r.carts._id,
					to: r.cartLines.cartId,
				}),
			},
			cartLines: {
				cart: r.one.carts({
					from: r.cartLines.cartId,
					to: r.carts._id,
				}),
				item: r.one.items({
					from: r.cartLines.itemId,
					to: r.items._id,
				}),
			},

			// Insight relations
			itemLedgerEntries: {
				item: r.one.items({
					from: r.itemLedgerEntries.itemId,
					to: r.items._id,
				}),
			},
			valueEntries: {
				itemLedgerEntry: r.one.itemLedgerEntries({
					from: r.valueEntries.itemLedgerEntryId,
					to: r.itemLedgerEntries._id,
				}),
				item: r.one.items({
					from: r.valueEntries.itemId,
					to: r.items._id,
				}),
			},

			// Replenishment relations
			purchaseHeaders: {
				vendor: r.one.vendors({
					from: r.purchaseHeaders.vendorId,
					to: r.vendors._id,
				}),
				lines: r.many.purchaseLines({
					from: r.purchaseHeaders.documentNo,
					to: r.purchaseLines.documentNo,
				}),
			},
			purchaseLines: {
				header: r.one.purchaseHeaders({
					from: r.purchaseLines.documentNo,
					to: r.purchaseHeaders.documentNo,
				}),
				item: r.one.items({
					from: r.purchaseLines.itemId,
					to: r.items._id,
				}),
			},
			transferHeaders: {
				lines: r.many.transferLines({
					from: r.transferHeaders.transferNo,
					to: r.transferLines.transferNo,
				}),
			},
			transferLines: {
				header: r.one.transferHeaders({
					from: r.transferLines.transferNo,
					to: r.transferHeaders.transferNo,
				}),
				item: r.one.items({
					from: r.transferLines.itemId,
					to: r.items._id,
				}),
			},

			// Ledger relations
			salesInvoiceHeaders: {
				customer: r.one.customers({
					from: r.salesInvoiceHeaders.customerId,
					to: r.customers._id,
				}),
				lines: r.many.salesInvoiceLines({
					from: r.salesInvoiceHeaders.invoiceNo,
					to: r.salesInvoiceLines.invoiceNo,
				}),
			},
			salesInvoiceLines: {
				header: r.one.salesInvoiceHeaders({
					from: r.salesInvoiceLines.invoiceNo,
					to: r.salesInvoiceHeaders.invoiceNo,
				}),
				item: r.one.items({
					from: r.salesInvoiceLines.itemId,
					to: r.items._id,
				}),
			},
			custLedgerEntries: {
				customer: r.one.customers({
					from: r.custLedgerEntries.customerId,
					to: r.customers._id,
				}),
			},

			// Flow relations
			bankAccounts: {
				ledgerEntries: r.many.bankAccountLedgerEntries({
					from: r.bankAccounts._id,
					to: r.bankAccountLedgerEntries.bankAccountId,
				}),
			},
			bankAccountLedgerEntries: {
				bankAccount: r.one.bankAccounts({
					from: r.bankAccountLedgerEntries.bankAccountId,
					to: r.bankAccounts._id,
				}),
			},

			// Payroll relations
			employees: {
				ledgerEntries: r.many.employeeLedgerEntries({
					from: r.employees._id,
					to: r.employeeLedgerEntries.employeeId,
				}),
			},
			employeeLedgerEntries: {
				employee: r.one.employees({
					from: r.employeeLedgerEntries.employeeId,
					to: r.employees._id,
				}),
			},

			// POS relations
			posSessions: {
				terminal: r.one.terminals({
					from: r.posSessions.terminalId,
					to: r.terminals._id,
				}),
				transactions: r.many.posTransactions({
					from: r.posSessions._id,
					to: r.posTransactions.posSessionId,
				}),
			},
			posTransactions: {
				session: r.one.posSessions({
					from: r.posTransactions.posSessionId,
					to: r.posSessions._id,
				}),
				lines: r.many.posTransactionLines({
					from: r.posTransactions._id,
					to: r.posTransactionLines.transactionId,
				}),
			},
			posTransactionLines: {
				transaction: r.one.posTransactions({
					from: r.posTransactionLines.transactionId,
					to: r.posTransactions._id,
				}),
				item: r.one.items({
					from: r.posTransactionLines.itemId,
					to: r.items._id,
				}),
			},

			// Trace relations
			shipments: {
				lines: r.many.shipmentLines({
					from: r.shipments.shipmentNo,
					to: r.shipmentLines.shipmentNo,
				}),
			},
			shipmentLines: {
				shipment: r.one.shipments({
					from: r.shipmentLines.shipmentNo,
					to: r.shipments.shipmentNo,
				}),
				item: r.one.items({
					from: r.shipmentLines.itemId,
					to: r.items._id,
				}),
			},
		}),
	},
)
