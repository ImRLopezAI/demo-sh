import * as z from 'zod'
import { CUST_LEDGER_DOCUMENT_TYPE, INVOICE_STATUS } from './utils/enums'
import { zodTable } from './utils/helper'

export const salesInvoiceHeaders = zodTable('salesInvoiceHeaders', (zid) => ({
	invoiceNo: z.string(),
	status: z.enum(INVOICE_STATUS).default('DRAFT'),
	customerId: zid('customers'),
	salesOrderNo: z.string().optional(),
	postingDate: z.string().optional(),
	dueDate: z.string().optional(),
	currency: z.string().default('USD'),
	statusReason: z.string().optional(),
	statusUpdatedAt: z.number().optional(),
}))

export const salesInvoiceLines = zodTable('salesInvoiceLines', (zid) => ({
	invoiceNo: zid('salesInvoiceHeaders'),
	lineNo: z.number().default(0),
	itemId: zid('items'),
	quantity: z.number().default(0),
	unitPrice: z.number().default(0),
	lineAmount: z.number().default(0),
}))

export const custLedgerEntries = zodTable('custLedgerEntries', (zid) => ({
	entryNo: z.number().default(0),
	customerId: zid('customers'),
	postingDate: z.string().optional(),
	documentType: z.enum(CUST_LEDGER_DOCUMENT_TYPE).default('INVOICE'),
	documentNo: z.string().optional(),
	description: z.string().optional(),
	amount: z.number().default(0),
	remainingAmount: z.number().default(0),
	open: z.boolean().default(true),
	currency: z.string().default('USD'),
}))

export const glEntries = zodTable('glEntries', (zid) => ({
	entryNo: z.number().default(0),
	postingDate: z.string().optional(),
	accountNo: z.string(),
	accountName: z.string().optional(),
	documentType: z.string().optional(),
	documentNo: z.string().optional(),
	description: z.string().optional(),
	debitAmount: z.number().default(0),
	creditAmount: z.number().default(0),
}))
