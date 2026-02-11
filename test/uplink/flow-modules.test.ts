import { createRouterClient } from '@orpc/server'
import { db } from '@server/db'
import { rpcRouter } from '@server/rpc'
import { createRpcContext } from '@server/rpc/init'
import { beforeEach, describe, expect, test } from 'vitest'

function createCaller() {
	return createRouterClient(rpcRouter, {
		context: createRpcContext({
			headers: new Headers({
				'x-tenant-id': 'demo-tenant',
				'x-user-id': 'test-user',
			}),
		}),
	})
}

type BankAccountInsert = Parameters<typeof db.schemas.bankAccounts.insert>[0]
type BankAccountLedgerInsert = Parameters<
	typeof db.schemas.bankAccountLedgerEntries.insert
>[0]

function insertBankAccount(overrides: Partial<BankAccountInsert> = {}) {
	return db.schemas.bankAccounts.insert({
		accountNo: `BANK-${crypto.randomUUID()}`,
		name: 'Bank Account',
		iban: crypto.randomUUID(),
		currency: 'USD',
		status: 'ACTIVE',
		entryCount: 0,
		currentBalance: 0,
		...overrides,
	})
}

function insertBankLedgerEntry(overrides: Partial<BankAccountLedgerInsert>) {
	return db.schemas.bankAccountLedgerEntries.insert({
		entryNo: 0,
		bankAccountId: '',
		documentType: 'PAYMENT',
		debitAmount: 0,
		creditAmount: 0,
		amount: 0,
		reconciliationStatus: 'OPEN',
		open: true,
		...overrides,
	})
}

describe.sequential('flow module', () => {
	beforeEach(async () => {
		await db._internals.reset()
	})

	test('registers flow tables on db.schemas', () => {
		expect(Object.keys(db.schemas)).toEqual(
			expect.arrayContaining([
				'bankAccounts',
				'bankAccountLedgerEntries',
				'genJournalLines',
			]),
		)
	})

	test('computes bank account flow fields', () => {
		const bankAccount = insertBankAccount({
			accountNo: 'BANK-FLOW-001',
			name: 'Operating Account',
		})

		insertBankLedgerEntry({
			bankAccountId: bankAccount._id,
			documentType: 'PAYMENT',
			amount: 400,
			creditAmount: 400,
		})
		insertBankLedgerEntry({
			bankAccountId: bankAccount._id,
			documentType: 'REFUND',
			amount: -150,
			debitAmount: 150,
		})

		const accountSnapshot = db.schemas.bankAccounts.get(bankAccount._id)
		expect(accountSnapshot?.entryCount).toBe(2)
		expect(accountSnapshot?.currentBalance).toBe(250)
	})

	test('loads bank account relations with with option', () => {
		const bankAccount = insertBankAccount({
			accountNo: 'BANK-FLOW-REL-001',
		})
		const bankEntry = insertBankLedgerEntry({
			bankAccountId: bankAccount._id,
			documentType: 'TRANSFER',
			amount: 75,
		})

		const accountsWithEntries = db.schemas.bankAccounts.findMany({
			where: (row) => row._id === bankAccount._id,
			with: { ledgerEntries: true },
		})
		expect(accountsWithEntries[0]?.ledgerEntries).toHaveLength(1)
		expect(accountsWithEntries[0]?.ledgerEntries[0]?._id).toBe(bankEntry._id)

		const entriesWithAccount = db.schemas.bankAccountLedgerEntries.findMany({
			where: (row) => row._id === bankEntry._id,
			with: { bankAccount: true },
		})
		expect(entriesWithAccount[0]?.bankAccount?._id).toBe(bankAccount._id)
	})

	test('exposes callable flow rpc surface', async () => {
		const caller = createCaller()

		const accounts = await caller.flow.bankAccounts.list({
			limit: 5,
			offset: 0,
		})
		expect(Array.isArray(accounts.items)).toBe(true)

		const journals = await caller.flow.journalLines.list({
			limit: 5,
			offset: 0,
		})
		expect(Array.isArray(journals.items)).toBe(true)
	})

	test('enforces flow workflow transitions and reason requirements', async () => {
		const caller = createCaller()
		const bankAccount = insertBankAccount({
			accountNo: 'BANK-FLOW-WORKFLOW-001',
			status: 'ACTIVE',
		})

		await expect(
			caller.flow.bankAccounts.transitionStatus({
				id: bankAccount._id,
				toStatus: 'RECONCILED',
			}),
		).rejects.toThrow('is not allowed')

		const bankEntry = insertBankLedgerEntry({
			bankAccountId: bankAccount._id,
		})

		await expect(
			caller.flow.bankLedgerEntries.transitionStatus({
				id: bankEntry._id,
				toStatus: 'EXCEPTION',
			}),
		).rejects.toThrow('A reason is required')
	})

	test('can read shared finance rows created through payroll routes', async () => {
		const caller = createCaller()
		const bankAccount = insertBankAccount({
			accountNo: 'BANK-FLOW-SHARED-001',
		})

		const payrollJournalLine = await caller.payroll.journalLines.create({
			accountNo: '6100',
			documentType: 'PAYROLL',
			debitAmount: 2800,
			sourceModule: 'PAYROLL',
		})

		const flowJournalLine = await caller.flow.journalLines.getById({
			id: payrollJournalLine._id,
		})
		expect(flowJournalLine._id).toBe(payrollJournalLine._id)
		expect(flowJournalLine.sourceModule).toBe('PAYROLL')

		const payrollBankEntry = await caller.payroll.bankLedgerEntries.create({
			bankAccountId: bankAccount._id,
			documentType: 'PAYROLL',
			amount: -2800,
			debitAmount: 2800,
		})

		const flowBankEntry = await caller.flow.bankLedgerEntries.getById({
			id: payrollBankEntry._id,
		})
		expect(flowBankEntry._id).toBe(payrollBankEntry._id)
		expect(flowBankEntry.bankAccountId).toBe(bankAccount._id)
	})
})
