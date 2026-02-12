import * as z from 'zod'
import {
	ACCOUNT_TYPE,
	BANK_ACCOUNT_STATUS,
	BANK_LEDGER_DOCUMENT_TYPE,
	JOURNAL_DOCUMENT_TYPE,
	JOURNAL_STATUS,
	RECONCILIATION_STATUS,
} from './utils/enums'
import { zodTable } from './utils/helper'

export const bankAccounts = zodTable('bankAccounts', (zid) => ({
	accountNo: z.string(),
	name: z.string(),
	bankName: z.string().optional(),
	iban: z.string(),
	swiftCode: z.string().optional(),
	currency: z.string().default('USD'),
	status: z.enum(BANK_ACCOUNT_STATUS).default('ACTIVE'),
	lastSyncAt: z.number().optional(),
}))

export const bankAccountLedgerEntries = zodTable(
	'bankAccountLedgerEntries',
	(zid) => ({
		entryNo: z.number().default(0),
		bankAccountId: zid('bankAccounts'),
		postingDate: z.string().optional(),
		documentType: z.enum(BANK_LEDGER_DOCUMENT_TYPE).default('PAYMENT'),
		documentNo: z.string().optional(),
		description: z.string().optional(),
		debitAmount: z.number().default(0),
		creditAmount: z.number().default(0),
		amount: z.number().default(0),
		reconciliationStatus: z.enum(RECONCILIATION_STATUS).default('OPEN'),
		statusReason: z.string().optional(),
		statusUpdatedAt: z.number().optional(),
		open: z.boolean().default(true),
	}),
)

export const genJournalLines = zodTable('genJournalLines', (zid) => ({
	journalTemplate: z.string().default('GENERAL'),
	journalBatch: z.string().default('DEFAULT'),
	lineNo: z.number().default(0),
	postingDate: z.string().optional(),
	documentType: z.enum(JOURNAL_DOCUMENT_TYPE).default('PAYMENT'),
	documentNo: z.string().optional(),
	accountType: z.enum(ACCOUNT_TYPE).default('GL_ACCOUNT'),
	accountNo: z.string(),
	balancingAccountType: z.enum(ACCOUNT_TYPE).optional(),
	balancingAccountNo: z.string().optional(),
	description: z.string().optional(),
	debitAmount: z.number().default(0),
	creditAmount: z.number().default(0),
	status: z.enum(JOURNAL_STATUS).default('OPEN'),
	statusReason: z.string().optional(),
	statusUpdatedAt: z.number().optional(),
	sourceModule: z.string().default('FLOW'),
}))
