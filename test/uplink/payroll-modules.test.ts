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
			expect.arrayContaining(['employees', 'employeeLedgerEntries']),
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
})
