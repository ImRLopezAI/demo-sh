import { createRouterClient } from '@orpc/server'
import { db } from '@server/db'
import { rpcRouter } from '@server/rpc'
import { createRpcContext } from '@server/rpc/init'
import { beforeEach, describe, expect, test, vi } from 'vitest'

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

type EmployeeInsert = Parameters<typeof db.schemas.employees.insert>[0]
type EmployeeLedgerInsert = Parameters<
	typeof db.schemas.employeeLedgerEntries.insert
>[0]
type BankAccountInsert = Parameters<typeof db.schemas.bankAccounts.insert>[0]

function insertEmployee(overrides: Partial<EmployeeInsert> = {}) {
	return db.schemas.employees.insert({
		employeeNo: `EMP-${crypto.randomUUID()}`,
		firstName: 'Test',
		lastName: 'User',
		employmentType: 'FULL_TIME',
		status: 'ACTIVE',
		baseSalary: 0,
		payFrequency: 'MONTHLY',
		ledgerEntryCount: 0,
		outstandingAmount: 0,
		...overrides,
	})
}

function insertEmployeeLedgerEntry(overrides: Partial<EmployeeLedgerInsert>) {
	return db.schemas.employeeLedgerEntries.insert({
		entryNo: 0,
		employeeId: '',
		documentType: 'PAYROLL',
		amount: 0,
		remainingAmount: 0,
		currency: 'USD',
		open: true,
		...overrides,
	})
}

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

describe.sequential('payroll module', () => {
	beforeEach(async () => {
		await db._internals.reset()
	})

	test('registers payroll tables on db.schemas', () => {
		expect(Object.keys(db.schemas)).toEqual(
			expect.arrayContaining([
				'employees',
				'employeeLedgerEntries',
				'payrollRuns',
			]),
		)
	})

	test('computes employee flow fields', () => {
		const employee = insertEmployee({
			employeeNo: 'EMP-PAYROLL-001',
			firstName: 'Alex',
			lastName: 'Rivera',
		})

		insertEmployeeLedgerEntry({
			employeeId: employee._id,
			documentType: 'PAYROLL',
			amount: 2400,
			remainingAmount: 400,
		})
		insertEmployeeLedgerEntry({
			employeeId: employee._id,
			documentType: 'ADJUSTMENT',
			amount: 200,
			remainingAmount: 50,
		})

		const snapshot = db.schemas.employees.get(employee._id)
		expect(snapshot?.ledgerEntryCount).toBe(2)
		expect(snapshot?.outstandingAmount).toBe(450)
	})

	test('loads employee relations with with option', () => {
		const employee = insertEmployee({
			employeeNo: 'EMP-PAYROLL-REL-001',
			firstName: 'Mina',
			lastName: 'Chen',
		})

		const ledgerEntry = insertEmployeeLedgerEntry({
			employeeId: employee._id,
			documentType: 'PAYROLL',
			amount: 1500,
			remainingAmount: 0,
		})

		const employeesWithEntries = db.schemas.employees.findMany({
			where: (row) => row._id === employee._id,
			with: { ledgerEntries: true },
		})
		expect(employeesWithEntries[0]?.ledgerEntries).toHaveLength(1)
		expect(employeesWithEntries[0]?.ledgerEntries[0]?._id).toBe(ledgerEntry._id)

		const entriesWithEmployee = db.schemas.employeeLedgerEntries.findMany({
			where: (row) => row._id === ledgerEntry._id,
			with: { employee: true },
		})
		expect(entriesWithEmployee[0]?.employee?._id).toBe(employee._id)
	})

	test('exposes callable payroll rpc surface', async () => {
		const caller = createCaller()

		const employees = await caller.payroll.employees.list({
			limit: 5,
			offset: 0,
		})
		expect(Array.isArray(employees.items)).toBe(true)

		const ledgerEntries = await caller.payroll.employeeLedger.list({
			limit: 5,
			offset: 0,
		})
		expect(Array.isArray(ledgerEntries.items)).toBe(true)

		const rulesets = await caller.payroll.rulesets.list({
			limit: 5,
			offset: 0,
		})
		expect(Array.isArray(rulesets.items)).toBe(true)
	})

	test('enforces payroll workflow transitions and reason requirements', async () => {
		const caller = createCaller()
		const employee = insertEmployee({
			employeeNo: 'EMP-PAYROLL-WORKFLOW-001',
			firstName: 'Jordan',
			lastName: 'Lee',
		})

		await expect(
			caller.payroll.employees.transitionStatus({
				id: employee._id,
				toStatus: 'TERMINATED',
			}),
		).rejects.toThrow('A reason is required')
	})

	test('calculates payroll using configurable rulesets with detailed breakdowns', async () => {
		const caller = createCaller()
		const employee = insertEmployee({
			employeeNo: 'EMP-RULESET-001',
			firstName: 'Rule',
			lastName: 'Based',
			baseSalary: 120000,
			payFrequency: 'MONTHLY',
		})

		const ruleset = await caller.payroll.rulesets.create({
			code: '',
			name: 'US 2026 Rules',
			jurisdiction: 'US-CA',
			defaultTaxPercent: 20,
			active: true,
			versionNo: 1,
		})
		await caller.payroll.taxBrackets.create({
			rulesetId: ruleset._id,
			lowerBound: 0,
			upperBound: 2000,
			ratePercent: 10,
			baseTax: 0,
			priority: 1,
		})
		await caller.payroll.taxBrackets.create({
			rulesetId: ruleset._id,
			lowerBound: 2000,
			ratePercent: 20,
			baseTax: 0,
			priority: 2,
		})
		await caller.payroll.deductionRules.create({
			rulesetId: ruleset._id,
			code: '401K',
			name: 'Retirement 5%',
			phase: 'PRE_TAX',
			fixedAmount: 0,
			percentOfGross: 5,
			active: true,
			priority: 1,
		})
		await caller.payroll.deductionRules.create({
			rulesetId: ruleset._id,
			code: 'HLTH',
			name: 'Health Plan',
			phase: 'POST_TAX',
			fixedAmount: 50,
			percentOfGross: 0,
			active: true,
			priority: 1,
		})

		const run = await caller.payroll.payrollRuns.create({
			runNo: '',
			status: 'DRAFT',
			periodStart: new Date('2026-03-01T00:00:00.000Z').toISOString(),
			periodEnd: new Date('2026-03-31T23:59:59.000Z').toISOString(),
			scopeType: 'SELECTED',
			selectedEmployeeIds: employee._id,
			currency: 'USD',
			rulesetId: ruleset._id,
		})

		const calculated = await caller.payroll.payrollRuns.calculateRun({
			runId: run._id,
		})
		expect(calculated.status).toBe('CALCULATED')
		expect(calculated.rulesetId).toBe(ruleset._id)
		expect(calculated.employeeCount).toBe(1)
		expect(calculated.grossAmount).toBe(10000)
		expect(calculated.deductionAmount).toBe(2250)
		expect(calculated.netAmount).toBe(7750)

		const row = calculated.calculations[0]
		expect(row.preTaxDeductions.length).toBeGreaterThan(0)
		expect(row.postTaxDeductions.length).toBeGreaterThan(0)
		expect(row.taxBreakdown.length).toBeGreaterThan(0)
		expect(row.taxAmount).toBe(1700)
	})

	test('generates statutory report artifacts per payroll run period', async () => {
		const caller = createCaller()
		const employee = insertEmployee({
			employeeNo: 'EMP-REPORT-001',
			baseSalary: 60000,
			payFrequency: 'MONTHLY',
		})
		const run = await caller.payroll.payrollRuns.create({
			runNo: '',
			status: 'DRAFT',
			periodStart: new Date('2026-04-01T00:00:00.000Z').toISOString(),
			periodEnd: new Date('2026-04-30T23:59:59.000Z').toISOString(),
			scopeType: 'SELECTED',
			selectedEmployeeIds: employee._id,
			currency: 'USD',
		})
		await caller.payroll.payrollRuns.calculateRun({ runId: run._id })

		const generated = await caller.payroll.payrollRuns.generateStatutoryReports(
			{
				runId: run._id,
			},
		)
		expect(generated.reportCount).toBe(3)
		expect(
			generated.reports.every((report) => report.status === 'GENERATED'),
		).toBe(true)

		const persisted = db.schemas.payrollRunStatutoryReports.findMany({
			where: (row) => row.runId === run._id,
		})
		expect(persisted).toHaveLength(3)
		const taxSummary = persisted.find((row) => row.reportType === 'TAX_SUMMARY')
		expect(taxSummary?.artifactJson).toContain('totalTax')
	})

	test('supports payroll run adjustments with audit history and recalculation', async () => {
		const caller = createCaller()
		const employee = insertEmployee({
			employeeNo: 'EMP-ADJ-001',
			baseSalary: 72000,
			payFrequency: 'MONTHLY',
		})
		const run = await caller.payroll.payrollRuns.create({
			runNo: '',
			status: 'DRAFT',
			periodStart: new Date('2026-05-01T00:00:00.000Z').toISOString(),
			periodEnd: new Date('2026-05-31T23:59:59.000Z').toISOString(),
			scopeType: 'SELECTED',
			selectedEmployeeIds: employee._id,
			currency: 'USD',
		})
		const firstCalc = await caller.payroll.payrollRuns.calculateRun({
			runId: run._id,
		})
		const firstNet = firstCalc.netAmount

		const adjustment = await caller.payroll.payrollRuns.applyAdjustment({
			runId: run._id,
			employeeId: employee._id,
			adjustmentType: 'DEDUCTION',
			amountDelta: -100,
			reason: 'Late attendance correction',
		})
		expect(adjustment.requiresRecalculation).toBe(true)

		const adjustmentRows = db.schemas.payrollRunAdjustments.findMany({
			where: (row) => row.runId === run._id && row.employeeId === employee._id,
		})
		expect(adjustmentRows).toHaveLength(1)
		expect(adjustmentRows[0].reason).toContain('correction')

		const recalculated = await caller.payroll.payrollRuns.calculateRun({
			runId: run._id,
		})
		expect(recalculated.netAmount).toBeCloseTo(firstNet - 100, 4)
		expect(recalculated.calculations[0].adjustmentAmount).toBe(-100)
	})

	test('executes payroll run lifecycle with posting and disbursement side effects', async () => {
		const caller = createCaller()
		const bankAccount = insertBankAccount({
			accountNo: 'BANK-PAYROLL-RUN-001',
		})
		const periodStart = new Date('2026-02-01T00:00:00.000Z').toISOString()
		const periodEnd = new Date('2026-02-28T23:59:59.000Z').toISOString()

		const run = await caller.payroll.payrollRuns.create({
			runNo: '',
			status: 'DRAFT',
			periodStart,
			periodEnd,
			scopeType: 'ALL_ACTIVE',
			currency: 'USD',
			employeeCount: 0,
			grossAmount: 0,
			deductionAmount: 0,
			netAmount: 0,
			postedJournalCount: 0,
			disbursementCount: 0,
		})
		expect(run.runNo).toBeTruthy()

		const calculated = await caller.payroll.payrollRuns.calculateRun({
			runId: run._id,
		})
		expect(calculated.status).toBe('CALCULATED')
		expect(calculated.employeeCount).toBeGreaterThan(0)
		expect(calculated.netAmount).toBeGreaterThan(0)
		expect(calculated.calculations.length).toBe(calculated.employeeCount)

		const posted = await caller.payroll.payrollRuns.postRun({ runId: run._id })
		expect(posted.status).toBe('POSTED')
		expect(posted.idempotent).toBe(false)
		expect(posted.journalCount).toBe(calculated.employeeCount)

		const postedRetry = await caller.payroll.payrollRuns.postRun({
			runId: run._id,
		})
		expect(postedRetry.idempotent).toBe(true)
		expect(postedRetry.status).toBe('POSTED')

		const employeeLedgerEntries = db.schemas.employeeLedgerEntries.findMany({
			where: (row) =>
				row.documentNo === run.runNo && row.documentType === 'PAYROLL',
		})
		expect(employeeLedgerEntries).toHaveLength(calculated.employeeCount)
		expect(employeeLedgerEntries.every((entry) => entry.open === true)).toBe(
			true,
		)

		const journalLines = db.schemas.genJournalLines.findMany({
			where: (row) =>
				row.documentNo === run.runNo &&
				row.documentType === 'PAYROLL' &&
				row.sourceModule === 'PAYROLL',
		})
		expect(journalLines).toHaveLength(calculated.employeeCount)
		expect(journalLines.every((line) => line.status === 'POSTED')).toBe(true)

		const glEntries = db.schemas.glEntries.findMany({
			where: (row) =>
				row.documentNo === run.runNo && row.documentType === 'PAYROLL',
		})
		expect(glEntries).toHaveLength(2)
		const glDebit = glEntries.reduce(
			(sum, row) => sum + Number(row.debitAmount ?? 0),
			0,
		)
		const glCredit = glEntries.reduce(
			(sum, row) => sum + Number(row.creditAmount ?? 0),
			0,
		)
		expect(glDebit).toBe(glCredit)
		expect(glDebit).toBeCloseTo(calculated.netAmount, 2)

		const paid = await caller.payroll.payrollRuns.markRunPaid({
			runId: run._id,
			bankAccountId: bankAccount._id,
		})
		expect(paid.status).toBe('PAID')
		expect(paid.idempotent).toBe(false)

		const paidRetry = await caller.payroll.payrollRuns.markRunPaid({
			runId: run._id,
			bankAccountId: bankAccount._id,
		})
		expect(paidRetry.idempotent).toBe(true)
		expect(paidRetry.status).toBe('PAID')

		const settledEmployeeLedgerEntries =
			db.schemas.employeeLedgerEntries.findMany({
				where: (row) =>
					row.documentNo === run.runNo && row.documentType === 'PAYROLL',
			})
		expect(
			settledEmployeeLedgerEntries.every(
				(entry) =>
					entry.open === false && Number(entry.remainingAmount ?? 0) === 0,
			),
		).toBe(true)

		const disbursements = db.schemas.bankAccountLedgerEntries.findMany({
			where: (row) =>
				row.documentNo === run.runNo && row.documentType === 'PAYROLL',
		})
		expect(disbursements).toHaveLength(1)
	})

	test('rolls back payroll run posting when finance entry creation fails', async () => {
		const caller = createCaller()
		const run = await caller.payroll.payrollRuns.create({
			runNo: '',
			status: 'DRAFT',
			periodStart: new Date('2026-01-01T00:00:00.000Z').toISOString(),
			periodEnd: new Date('2026-01-31T23:59:59.000Z').toISOString(),
			scopeType: 'ALL_ACTIVE',
			currency: 'USD',
			employeeCount: 0,
			grossAmount: 0,
			deductionAmount: 0,
			netAmount: 0,
			postedJournalCount: 0,
			disbursementCount: 0,
		})
		await caller.payroll.payrollRuns.calculateRun({ runId: run._id })

		const insertSpy = vi
			.spyOn(db.schemas.employeeLedgerEntries, 'insert')
			.mockImplementation(() => {
				throw new Error('forced payroll ledger insert failure')
			})

		try {
			await expect(
				caller.payroll.payrollRuns.postRun({ runId: run._id }),
			).rejects.toThrow('forced payroll ledger insert failure')
		} finally {
			insertSpy.mockRestore()
		}

		const runAfterFailure = await caller.payroll.payrollRuns.getById({
			id: run._id,
		})
		expect(runAfterFailure.status).toBe('CALCULATED')
		expect(Number(runAfterFailure.postedJournalCount ?? 0)).toBe(0)

		const employeeLedgerEntries = db.schemas.employeeLedgerEntries.findMany({
			where: (row) =>
				row.documentNo === run.runNo && row.documentType === 'PAYROLL',
		})
		expect(employeeLedgerEntries).toHaveLength(0)

		const journalLines = db.schemas.genJournalLines.findMany({
			where: (row) =>
				row.documentNo === run.runNo &&
				row.documentType === 'PAYROLL' &&
				row.sourceModule === 'PAYROLL',
		})
		expect(journalLines).toHaveLength(0)

		const glEntries = db.schemas.glEntries.findMany({
			where: (row) =>
				row.documentNo === run.runNo && row.documentType === 'PAYROLL',
		})
		expect(glEntries).toHaveLength(0)
	})

	test('writes shared finance rows visible through flow routes', async () => {
		const caller = createCaller()
		const bankAccount = insertBankAccount({
			accountNo: 'BANK-PAYROLL-SHARED-001',
		})

		const payrollJournalLine = await caller.payroll.journalLines.create({
			accountNo: '6100',
			documentType: 'PAYROLL',
			debitAmount: 3200,
			sourceModule: 'PAYROLL',
		})

		const flowJournalLine = await caller.flow.journalLines.getById({
			id: payrollJournalLine._id,
		})
		expect(flowJournalLine._id).toBe(payrollJournalLine._id)

		const payrollBankEntry = await caller.payroll.bankLedgerEntries.create({
			bankAccountId: bankAccount._id,
			documentType: 'PAYROLL',
			amount: -3200,
			debitAmount: 3200,
		})

		const flowBankEntry = await caller.flow.bankLedgerEntries.getById({
			id: payrollBankEntry._id,
		})
		expect(flowBankEntry._id).toBe(payrollBankEntry._id)
	})

	test('keeps 25-row payroll pagination within acceptable latency', async () => {
		const caller = createCaller()
		const maxDurationMs = 2000
		const startedAt = Date.now()
		const result = await caller.payroll.employees.list({ limit: 25, offset: 0 })
		const durationMs = Date.now() - startedAt

		expect(Array.isArray(result.items)).toBe(true)
		expect(result.items.length).toBeLessThanOrEqual(25)
		expect(durationMs).toBeLessThan(maxDurationMs)
	})
})
