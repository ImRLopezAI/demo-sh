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

describe('flow module', () => {
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

	test('posts journal lines in batch with partial-failure visibility and retry support', async () => {
		const caller = createCaller()
		const runId = crypto.randomUUID().slice(0, 8)
		const journalTemplate = 'PAYMENT'
		const journalBatch = `AUTO-${runId}`
		const postingDate = new Date().toISOString()

		const openLine = await caller.flow.journalLines.create({
			journalTemplate,
			journalBatch,
			lineNo: 1000,
			postingDate,
			documentType: 'PAYMENT',
			documentNo: `FLOW-OPEN-${runId}`,
			accountType: 'GL_ACCOUNT',
			accountNo: '6100',
			debitAmount: 250,
			creditAmount: 0,
			status: 'OPEN',
			sourceModule: 'FLOW',
		})
		const approvedLine = await caller.flow.journalLines.create({
			journalTemplate,
			journalBatch,
			lineNo: 1001,
			postingDate,
			documentType: 'PAYMENT',
			documentNo: `FLOW-APPROVED-${runId}`,
			accountType: 'GL_ACCOUNT',
			accountNo: '2200',
			debitAmount: 0,
			creditAmount: 250,
			status: 'APPROVED',
			sourceModule: 'FLOW',
		})
		const invalidLine = await caller.flow.journalLines.create({
			journalTemplate,
			journalBatch,
			lineNo: 1002,
			postingDate,
			documentType: 'PAYMENT',
			documentNo: `FLOW-INVALID-${runId}`,
			accountType: 'GL_ACCOUNT',
			accountNo: '6100',
			debitAmount: 0,
			creditAmount: 0,
			status: 'OPEN',
			sourceModule: 'FLOW',
		})
		const alreadyPostedLine = await caller.flow.journalLines.create({
			journalTemplate,
			journalBatch,
			lineNo: 1003,
			postingDate,
			documentType: 'PAYMENT',
			documentNo: `FLOW-POSTED-${runId}`,
			accountType: 'GL_ACCOUNT',
			accountNo: '6100',
			debitAmount: 125,
			creditAmount: 0,
			status: 'POSTED',
			sourceModule: 'FLOW',
		})

		const firstBatch = await caller.flow.journalLines.postJournalBatch({
			journalTemplate,
			journalBatch,
		})
		expect(firstBatch.processed).toBe(4)
		expect(firstBatch.posted).toBe(2)
		expect(firstBatch.skipped).toBe(1)
		expect(firstBatch.failed).toBe(1)
		expect(firstBatch.postedIds).toEqual(
			expect.arrayContaining([openLine._id, approvedLine._id]),
		)
		expect(firstBatch.failedEntries[0]?.id).toBe(invalidLine._id)

		const openLineAfterFirst = await caller.flow.journalLines.getById({
			id: openLine._id,
		})
		const approvedLineAfterFirst = await caller.flow.journalLines.getById({
			id: approvedLine._id,
		})
		const invalidLineAfterFirst = await caller.flow.journalLines.getById({
			id: invalidLine._id,
		})
		const alreadyPostedAfterFirst = await caller.flow.journalLines.getById({
			id: alreadyPostedLine._id,
		})
		expect(openLineAfterFirst.status).toBe('POSTED')
		expect(approvedLineAfterFirst.status).toBe('POSTED')
		expect(invalidLineAfterFirst.status).toBe('OPEN')
		expect(alreadyPostedAfterFirst.status).toBe('POSTED')
		expect(openLineAfterFirst.statusUpdatedAt).toBeDefined()
		expect(approvedLineAfterFirst.statusUpdatedAt).toBeDefined()

		const firstBatchGlEntries = db.schemas.glEntries.findMany({
			where: (row) =>
				row.documentNo === `FLOW-OPEN-${runId}` ||
				row.documentNo === `FLOW-APPROVED-${runId}`,
		})
		expect(firstBatchGlEntries).toHaveLength(2)

		await caller.flow.journalLines.update({
			id: invalidLine._id,
			data: {
				journalTemplate,
				journalBatch,
				documentNo: `FLOW-INVALID-${runId}`,
				accountNo: '6100',
				debitAmount: 75,
				creditAmount: 0,
				status: 'OPEN',
			},
		})

		const secondBatch = await caller.flow.journalLines.postJournalBatch({
			journalTemplate,
			journalBatch,
		})
		expect(secondBatch.posted).toBe(1)
		expect(secondBatch.failed).toBe(0)
		expect(secondBatch.postedIds).toContain(invalidLine._id)

		const invalidLineAfterRetry = await caller.flow.journalLines.getById({
			id: invalidLine._id,
		})
		expect(invalidLineAfterRetry.status).toBe('POSTED')

		const retryGlEntry = db.schemas.glEntries.findMany({
			where: (row) => row.documentNo === `FLOW-INVALID-${runId}`,
		})
		expect(retryGlEntry).toHaveLength(1)
	})

	test('builds rolling cash forecast with variance and adverse-threshold alerts', async () => {
		const caller = createCaller()
		const bankAccount = insertBankAccount({
			accountNo: 'BANK-FLOW-FORECAST-001',
			currentBalance: 0,
		})
		const todayStart = new Date()
		todayStart.setUTCHours(0, 0, 0, 0)

		for (let dayOffset = 1; dayOffset <= 14; dayOffset += 1) {
			const postingDate = new Date(
				todayStart.getTime() - dayOffset * 24 * 60 * 60 * 1000,
			).toISOString()
			const amount = dayOffset === 7 ? -600 : 100
			insertBankLedgerEntry({
				bankAccountId: bankAccount._id,
				postingDate,
				amount,
				debitAmount: amount < 0 ? Math.abs(amount) : 0,
				creditAmount: amount > 0 ? amount : 0,
				documentType: amount < 0 ? 'PAYMENT' : 'REFUND',
			})
		}

		const forecast = await caller.flow.analytics.cashForecast({
			horizonDays: 14,
			lookbackDays: 14,
			adverseVarianceThresholdPct: 10,
		})

		expect(forecast.config.horizonDays).toBe(14)
		expect(forecast.forecast).toHaveLength(14)
		expect(forecast.variance).toHaveLength(14)
		expect(Number.isFinite(forecast.baseline.averageDailyNet)).toBe(true)
		expect(forecast.variance.some((point) => point.isAdverse)).toBe(true)
		expect(
			forecast.alerts.some((alert) => alert.type === 'ADVERSE_VARIANCE'),
		).toBe(true)
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

	test('keeps 25-row flow pagination within acceptable latency', async () => {
		const caller = createCaller()
		const maxDurationMs = 2000
		const startedAt = Date.now()
		const result = await caller.flow.bankAccounts.list({ limit: 25, offset: 0 })
		const durationMs = Date.now() - startedAt

		expect(Array.isArray(result.items)).toBe(true)
		expect(result.items.length).toBeLessThanOrEqual(25)
		expect(durationMs).toBeLessThan(maxDurationMs)
	})
})
