import * as z from 'zod'
import {
	EMPLOYEE_LEDGER_DOCUMENT_TYPE,
	EMPLOYEE_STATUS,
	EMPLOYMENT_TYPE,
	PAY_FREQUENCY,
} from './utils/enums'
import { zodTable } from './utils/helper'

export const employees = zodTable('employees', (_zid) => ({
	employeeNo: z.string(),
	firstName: z.string(),
	lastName: z.string(),
	email: z.string().optional(),
	phone: z.string().optional(),
	department: z.string().optional(),
	jobTitle: z.string().optional(),
	employmentType: z.enum(EMPLOYMENT_TYPE).default('FULL_TIME'),
	status: z.enum(EMPLOYEE_STATUS).default('ACTIVE'),
	hireDate: z.string().optional(),
	terminationDate: z.string().optional(),
	taxId: z.string().optional(),
	baseSalary: z.number().default(0),
	payFrequency: z.enum(PAY_FREQUENCY).default('MONTHLY'),
	bankAccountId: z.string().optional(),
}))

export const employeeLedgerEntries = zodTable(
	'employeeLedgerEntries',
	(zid) => ({
		entryNo: z.number().default(0),
		employeeId: zid('employees'),
		postingDate: z.string().optional(),
		documentType: z.enum(EMPLOYEE_LEDGER_DOCUMENT_TYPE).default('PAYROLL'),
		documentNo: z.string().optional(),
		description: z.string().optional(),
		amount: z.number().default(0),
		remainingAmount: z.number().default(0),
		currency: z.string().default('USD'),
		open: z.boolean().default(true),
		payrollPeriod: z.string().optional(),
	}),
)
