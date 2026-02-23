import * as z from 'zod'
import {
	CART_STATUS,
	DOCUMENT_STATUS,
	DOCUMENT_TYPE,
	ITEM_TYPE,
} from './utils/enums'
import { zodTable } from './utils/helper'

export const items = zodTable('items', (_zid) => ({
	itemNo: z.string(),
	description: z.string(),
	type: z.enum(ITEM_TYPE).default('ITEM'),
	unitPrice: z.number().default(0),
	unitCost: z.number().default(0),
	inventory: z.number().default(0),
	uom: z.string().default('EA'),
	barcode: z.string().optional(),
	blocked: z.boolean().default(false),
}))

export const customers = zodTable('customers', (_zid) => ({
	customerNo: z.string(),
	name: z.string(),
	email: z.string().optional(),
	phone: z.string().optional(),
	address: z.string().optional(),
	city: z.string().optional(),
	country: z.string().optional(),
	blocked: z.boolean().default(false),
}))

export const salesHeaders = zodTable('salesHeaders', (zid) => ({
	documentNo: z.string(),
	documentType: z.enum(DOCUMENT_TYPE).default('ORDER'),
	status: z.enum(DOCUMENT_STATUS).default('DRAFT'),
	customerId: zid('customers'),
	orderDate: z.string().optional(),
	currency: z.string().default('USD'),
	statusReason: z.string().optional(),
	statusUpdatedAt: z.number().optional(),
	externalRef: z.string().optional(),
}))

export const salesLines = zodTable('salesLines', (zid) => ({
	documentNo: zid('salesHeaders'),
	lineNo: z.number().default(0),
	itemId: zid('items'),
	quantity: z.number().default(0),
	unitPrice: z.number().default(0),
	discountPercent: z.number().default(0),
	lineAmount: z.number().default(0),
}))

export const carts = zodTable('carts', (zid) => ({
	customerId: zid('customers'),
	status: z.enum(CART_STATUS).default('OPEN'),
	currency: z.string().default('USD'),
}))

export const cartLines = zodTable('cartLines', (zid) => ({
	cartId: zid('carts'),
	itemId: zid('items'),
	quantity: z.number().default(1),
	unitPrice: z.number().default(0),
	lineAmount: z.number().default(0),
}))
