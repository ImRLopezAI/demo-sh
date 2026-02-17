import * as z from 'zod'
import { DOCUMENT_STATUS, DOCUMENT_TYPE, TRANSFER_STATUS } from './utils/enums'
import { zodTable } from './utils/helper'

export const vendors = zodTable('vendors', (_zid) => ({
	vendorNo: z.string(),
	name: z.string(),
	contactName: z.string().optional(),
	email: z.string().optional(),
	phone: z.string().optional(),
	address: z.string().optional(),
	city: z.string().optional(),
	country: z.string().optional(),
	currency: z.string().default('USD'),
	blocked: z.boolean().default(false),
	purchaseOrderCount: z.number().default(0),
	totalBalance: z.number().default(0),
}))

export const purchaseHeaders = zodTable('purchaseHeaders', (zid) => ({
	documentNo: z.string(),
	documentType: z.enum(DOCUMENT_TYPE).default('ORDER'),
	status: z.enum(DOCUMENT_STATUS).default('DRAFT'),
	vendorId: zid('vendors'),
	vendorName: z.string().optional(),
	orderDate: z.string().optional(),
	expectedReceiptDate: z.string().optional(),
	currency: z.string().default('USD'),
	statusReason: z.string().optional(),
	statusUpdatedAt: z.number().optional(),
	lineCount: z.number().default(0),
	totalAmount: z.number().default(0),
}))

export const purchaseLines = zodTable('purchaseLines', (zid) => ({
	documentNo: zid('purchaseHeaders'),
	lineNo: z.number().default(0),
	itemId: zid('items'),
	description: z.string().optional(),
	quantity: z.number().default(0),
	unitCost: z.number().default(0),
	lineAmount: z.number().default(0),
	quantityReceived: z.number().default(0),
	quantityInvoiced: z.number().default(0),
}))

export const transferHeaders = zodTable('transferHeaders', (_zid) => ({
	transferNo: z.string(),
	status: z.enum(TRANSFER_STATUS).default('DRAFT'),
	fromLocationCode: z.string(),
	toLocationCode: z.string(),
	shipmentDate: z.string().optional(),
	receiptDate: z.string().optional(),
	statusReason: z.string().optional(),
	statusUpdatedAt: z.number().optional(),
	lineCount: z.number().default(0),
}))

export const transferLines = zodTable('transferLines', (zid) => ({
	transferNo: zid('transferHeaders'),
	lineNo: z.number().default(0),
	itemId: zid('items'),
	description: z.string().optional(),
	quantity: z.number().default(0),
	quantityShipped: z.number().default(0),
	quantityReceived: z.number().default(0),
}))
