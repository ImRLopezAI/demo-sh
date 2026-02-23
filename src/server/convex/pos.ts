import * as z from 'zod'
import {
	PAYMENT_METHOD,
	POS_SESSION_STATUS,
	POS_TRANSACTION_STATUS,
	TERMINAL_STATUS,
} from './utils/enums'
import { zodTable } from './utils/helper'

export const terminals = zodTable('terminals', (_zid) => ({
	terminalCode: z.string(),
	name: z.string(),
	locationCode: z.string().optional(),
	status: z.enum(TERMINAL_STATUS).default('ONLINE'),
	lastHeartbeat: z.number().optional(),
}))

export const posSessions = zodTable('posSessions', (zid) => ({
	sessionNo: z.string(),
	terminalId: zid('terminals'),
	cashierId: z.string().optional(),
	status: z.enum(POS_SESSION_STATUS).default('OPEN'),
	openedAt: z.number().optional(),
	closedAt: z.number().optional(),
	openingBalance: z.number().default(0),
	closingBalance: z.number().default(0),
}))

export const posTransactions = zodTable('posTransactions', (zid) => ({
	receiptNo: z.string(),
	posSessionId: zid('posSessions'),
	status: z.enum(POS_TRANSACTION_STATUS).default('OPEN'),
	customerId: z.string().optional(),
	totalAmount: z.number().default(0),
	taxAmount: z.number().default(0),
	discountAmount: z.number().default(0),
	paidAmount: z.number().default(0),
	paymentMethod: z.enum(PAYMENT_METHOD).default('CASH'),
	transactionAt: z.number().optional(),
	statusReason: z.string().optional(),
	statusUpdatedAt: z.number().optional(),
}))

export const posTransactionLines = zodTable('posTransactionLines', (zid) => ({
	transactionId: zid('posTransactions'),
	lineNo: z.number().default(0),
	itemId: zid('items'),
	description: z.string().optional(),
	quantity: z.number().default(1),
	unitPrice: z.number().default(0),
	lineAmount: z.number().default(0),
	discountPercent: z.number().default(0),
}))
