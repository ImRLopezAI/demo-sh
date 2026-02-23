import { createRPCRouter, publicProcedure } from '@server/rpc/init'
import z from 'zod'
import { assertRole } from '../authz'
import { createTenantScopedCrudRouter } from '../helpers'

const employeesRouter = createTenantScopedCrudRouter({
	moduleName: 'payroll',
	prefix: 'employees',
	primaryTable: 'employees',
	viewTables: { overview: 'employees' },
	statusField: 'status',
	transitions: {
		ACTIVE: ['ON_LEAVE', 'TERMINATED'],
		ON_LEAVE: ['ACTIVE', 'TERMINATED'],
	},
	reasonRequiredStatuses: ['TERMINATED'],
	statusRoleRequirements: {
		TERMINATED: 'MANAGER',
	},
})

const employeeLedgerRouter = createTenantScopedCrudRouter({
	moduleName: 'payroll',
	prefix: 'employee-ledger',
	primaryTable: 'employeeLedgerEntries',
	viewTables: { overview: 'employeeLedgerEntries' },
})

const journalLinesRouter = createTenantScopedCrudRouter({
	moduleName: 'payroll',
	prefix: 'journal-lines',
	primaryTable: 'genJournalLines',
	viewTables: { overview: 'genJournalLines' },
	statusField: 'status',
	transitions: {
		OPEN: ['APPROVED', 'POSTED', 'VOIDED'],
		APPROVED: ['POSTED', 'VOIDED'],
	},
	reasonRequiredStatuses: ['VOIDED'],
	statusRoleRequirements: {
		POSTED: 'MANAGER',
		VOIDED: 'MANAGER',
	},
})

const glEntriesRouter = createTenantScopedCrudRouter({
	moduleName: 'payroll',
	prefix: 'gl-entries',
	primaryTable: 'glEntries',
	viewTables: { overview: 'glEntries' },
})

const bankLedgerEntriesRouter = createTenantScopedCrudRouter({
	moduleName: 'payroll',
	prefix: 'bank-ledger-entries',
	primaryTable: 'bankAccountLedgerEntries',
	viewTables: { overview: 'bankAccountLedgerEntries' },
	statusField: 'reconciliationStatus',
	transitions: {
		OPEN: ['MATCHED', 'EXCEPTION'],
		MATCHED: ['RECONCILED', 'EXCEPTION'],
		EXCEPTION: ['MATCHED'],
	},
	reasonRequiredStatuses: ['EXCEPTION'],
	statusRoleRequirements: {
		RECONCILED: 'MANAGER',
	},
})

const payrollRuleSetsRouter = createTenantScopedCrudRouter({
	moduleName: 'payroll',
	prefix: 'rulesets',
	primaryTable: 'payrollRuleSets',
	viewTables: { overview: 'payrollRuleSets' },
})

const payrollTaxBracketsRouter = createTenantScopedCrudRouter({
	moduleName: 'payroll',
	prefix: 'tax-brackets',
	primaryTable: 'payrollTaxBrackets',
	viewTables: { overview: 'payrollTaxBrackets' },
})

const payrollDeductionRulesRouter = createTenantScopedCrudRouter({
	moduleName: 'payroll',
	prefix: 'deduction-rules',
	primaryTable: 'payrollDeductionRules',
	viewTables: { overview: 'payrollDeductionRules' },
})

const payrollRunAdjustmentsRouter = createTenantScopedCrudRouter({
	moduleName: 'payroll',
	prefix: 'run-adjustments',
	primaryTable: 'payrollRunAdjustments',
	viewTables: { overview: 'payrollRunAdjustments' },
})

const payrollRunStatutoryReportsRouter = createTenantScopedCrudRouter({
	moduleName: 'payroll',
	prefix: 'statutory-reports',
	primaryTable: 'payrollRunStatutoryReports',
	viewTables: { overview: 'payrollRunStatutoryReports' },
	statusField: 'status',
	transitions: {
		GENERATED: ['VOIDED'],
		VOIDED: [],
	},
	reasonRequiredStatuses: ['VOIDED'],
})

const payrollRunsCrudRouter = createTenantScopedCrudRouter({
	moduleName: 'payroll',
	prefix: 'payroll-runs',
	primaryTable: 'payrollRuns',
	viewTables: { overview: 'payrollRuns' },
	statusField: 'status',
	transitions: {
		DRAFT: ['CANCELED'],
		CALCULATED: ['CANCELED'],
	},
	reasonRequiredStatuses: ['CANCELED'],
	statusRoleRequirements: {
		CANCELED: 'MANAGER',
	},
})

const calculateRunInputSchema = z.object({
	runId: z.string(),
})

const postRunInputSchema = z.object({
	runId: z.string(),
})

const markRunPaidInputSchema = z.object({
	runId: z.string(),
	bankAccountId: z.string().optional(),
})

const applyAdjustmentInputSchema = z.object({
	runId: z.string(),
	employeeId: z.string(),
	adjustmentType: z
		.enum(['CORRECTION', 'BONUS', 'DEDUCTION'])
		.default('CORRECTION'),
	amountDelta: z.number(),
	reason: z.string().min(3),
})

const generateStatutoryReportsInputSchema = z.object({
	runId: z.string(),
	reportTypes: z
		.array(z.enum(['TAX_SUMMARY', 'DEDUCTION_SUMMARY', 'PAYMENT_FILE']))
		.default(['TAX_SUMMARY', 'DEDUCTION_SUMMARY', 'PAYMENT_FILE']),
	forceRegenerate: z.boolean().default(false),
})

const readTenantId = (row: unknown) =>
	(row as { tenantId?: string }).tenantId ?? 'demo-tenant'

const roundMoney = (value: number) => Math.round(value * 100) / 100

const nextEntryNo = (rows: Array<{ entryNo?: number }>) =>
	rows.reduce((max, row) => Math.max(max, Number(row.entryNo ?? 0)), 0) + 1

const toPeriodGross = (
	annualSalary: number,
	payFrequency: 'WEEKLY' | 'BIWEEKLY' | 'SEMI_MONTHLY' | 'MONTHLY',
) => {
	switch (payFrequency) {
		case 'WEEKLY':
			return annualSalary / 52
		case 'BIWEEKLY':
			return annualSalary / 26
		case 'SEMI_MONTHLY':
			return annualSalary / 24
		default:
			return annualSalary / 12
	}
}

interface PayrollCalculationSnapshotRow {
	employeeId: string
	employeeNo: string
	employeeName: string
	grossAmount: number
	preTaxDeductions: Array<{
		code: string
		name: string
		amount: number
	}>
	taxableAmount: number
	taxAmount: number
	taxBreakdown: Array<{
		lowerBound: number
		upperBound: number | null
		ratePercent: number
		taxAmount: number
	}>
	postTaxDeductions: Array<{
		code: string
		name: string
		amount: number
	}>
	adjustmentAmount: number
	deductionAmount: number
	netAmount: number
}

const resolveRunEmployees = (
	run: {
		scopeType?: 'ALL_ACTIVE' | 'SELECTED'
		selectedEmployeeIds?: string
	},
	context: any,
	tenantId: string,
) => {
	const selectedIds = (run.selectedEmployeeIds ?? '')
		.split(',')
		.map((id) => id.trim())
		.filter(Boolean)

	if (run.scopeType === 'SELECTED') {
		if (selectedIds.length === 0) {
			throw new Error('Selected employee scope requires at least one employee')
		}
		return context.db.schemas.employees.findMany({
			where: (row: any) =>
				readTenantId(row) === tenantId &&
				selectedIds.includes(row._id) &&
				row.status !== 'TERMINATED',
		})
	}

	return context.db.schemas.employees.findMany({
		where: (row: any) =>
			readTenantId(row) === tenantId && row.status === 'ACTIVE',
	})
}

const resolveRuleset = (context: any, tenantId: string, run: any) => {
	if (run.rulesetId) {
		const explicit = context.db.schemas.payrollRuleSets.get(run.rulesetId)
		if (!explicit || readTenantId(explicit) !== tenantId) {
			throw new Error('Configured payroll ruleset not found')
		}
		return explicit
	}

	const now = Date.now()
	return context.db.schemas.payrollRuleSets
		.findMany({
			where: (row: any) => {
				if (readTenantId(row) !== tenantId) return false
				if (!row.active) return false
				const fromMs = row.effectiveFrom
					? new Date(row.effectiveFrom).getTime()
					: null
				const toMs = row.effectiveTo
					? new Date(row.effectiveTo).getTime()
					: null
				if (fromMs && !Number.isNaN(fromMs) && now < fromMs) return false
				if (toMs && !Number.isNaN(toMs) && now > toMs) return false
				return true
			},
		})
		.sort(
			(a: any, b: any) => Number(b.versionNo ?? 0) - Number(a.versionNo ?? 0),
		)[0]
}

const computeProgressiveTax = (
	taxableAmount: number,
	brackets: Array<{
		lowerBound?: number
		upperBound?: number
		ratePercent?: number
	}>,
) => {
	if (taxableAmount <= 0) {
		return {
			taxAmount: 0,
			taxBreakdown: [] as PayrollCalculationSnapshotRow['taxBreakdown'],
		}
	}
	if (brackets.length === 0) {
		const defaultTax = roundMoney(taxableAmount * 0.2)
		return {
			taxAmount: defaultTax,
			taxBreakdown: [
				{
					lowerBound: 0,
					upperBound: null,
					ratePercent: 20,
					taxAmount: defaultTax,
				},
			],
		}
	}

	const sorted = [...brackets].sort(
		(a, b) => Number(a.lowerBound ?? 0) - Number(b.lowerBound ?? 0),
	)
	let taxAmount = 0
	const taxBreakdown: PayrollCalculationSnapshotRow['taxBreakdown'] = []

	for (const bracket of sorted) {
		const lower = Number(bracket.lowerBound ?? 0)
		const upper =
			typeof bracket.upperBound === 'number'
				? Number(bracket.upperBound)
				: Number.POSITIVE_INFINITY
		if (taxableAmount <= lower) continue
		const taxableSlice = Math.max(0, Math.min(taxableAmount, upper) - lower)
		if (taxableSlice <= 0) continue
		const bracketTax = roundMoney(
			taxableSlice * (Number(bracket.ratePercent ?? 0) / 100),
		)
		taxAmount = roundMoney(taxAmount + bracketTax)
		taxBreakdown.push({
			lowerBound: lower,
			upperBound: Number.isFinite(upper) ? upper : null,
			ratePercent: Number(bracket.ratePercent ?? 0),
			taxAmount: bracketTax,
		})
	}

	return { taxAmount, taxBreakdown }
}

const payrollRunsRouter = createRPCRouter({
	...payrollRunsCrudRouter,
	calculateRun: publicProcedure
		.input(calculateRunInputSchema)
		.route({
			method: 'POST',
			summary: 'Calculate gross-to-net for a payroll run with rulesets',
		})
		.handler(({ input, context }) => {
			assertRole(context, 'MANAGER', 'payroll run calculation')
			const tenantId = context.auth.tenantId
			const run = context.db.schemas.payrollRuns.get(input.runId)
			if (!run) {
				throw new Error('Payroll run not found')
			}
			if (readTenantId(run) !== tenantId) {
				throw new Error('Cross-tenant access is not allowed')
			}
			if (!['DRAFT', 'CALCULATED'].includes(String(run.status ?? ''))) {
				throw new Error('Only DRAFT/CALCULATED payroll runs can be calculated')
			}

			const employees = resolveRunEmployees(run, context, tenantId)
			if (employees.length === 0) {
				throw new Error('No eligible employees found for payroll run')
			}

			const ruleset = resolveRuleset(context, tenantId, run)
			const taxBrackets = ruleset
				? context.db.schemas.payrollTaxBrackets.findMany({
						where: (row: any) =>
							readTenantId(row) === tenantId && row.rulesetId === ruleset._id,
					})
				: []
			const deductionRules = ruleset
				? context.db.schemas.payrollDeductionRules.findMany({
						where: (row: any) =>
							readTenantId(row) === tenantId &&
							row.rulesetId === ruleset._id &&
							row.active,
					})
				: []

			const runAdjustments = context.db.schemas.payrollRunAdjustments.findMany({
				where: (row: any) =>
					readTenantId(row) === tenantId && row.runId === run._id,
			})
			const adjustmentByEmployee = new Map<string, number>()
			for (const adjustment of runAdjustments) {
				const current = adjustmentByEmployee.get(adjustment.employeeId) ?? 0
				adjustmentByEmployee.set(
					adjustment.employeeId,
					roundMoney(current + Number(adjustment.amountDelta ?? 0)),
				)
			}

			const preTaxRules = deductionRules
				.filter((rule: any) => rule.phase === 'PRE_TAX')
				.sort(
					(a: any, b: any) => Number(a.priority ?? 0) - Number(b.priority ?? 0),
				)
			const postTaxRules = deductionRules
				.filter((rule: any) => rule.phase === 'POST_TAX')
				.sort(
					(a: any, b: any) => Number(a.priority ?? 0) - Number(b.priority ?? 0),
				)

			const calculations: PayrollCalculationSnapshotRow[] = employees.map(
				(employee: any) => {
					const grossAmount = roundMoney(
						toPeriodGross(
							Number(employee.baseSalary ?? 0),
							employee.payFrequency,
						),
					)
					const preTaxDeductions = preTaxRules.map((rule: any) => {
						const amount = roundMoney(
							Number(rule.fixedAmount ?? 0) +
								grossAmount * (Number(rule.percentOfGross ?? 0) / 100),
						)
						return {
							code: String(rule.code ?? ''),
							name: String(rule.name ?? ''),
							amount,
						}
					})
					const preTaxTotal = roundMoney(
						preTaxDeductions.reduce((sum, row) => sum + row.amount, 0),
					)
					const taxableAmount = roundMoney(
						Math.max(0, grossAmount - preTaxTotal),
					)
					const progressiveTax = computeProgressiveTax(
						taxableAmount,
						taxBrackets,
					)

					const postTaxDeductions = postTaxRules.map((rule: any) => {
						const amount = roundMoney(
							Number(rule.fixedAmount ?? 0) +
								grossAmount * (Number(rule.percentOfGross ?? 0) / 100),
						)
						return {
							code: String(rule.code ?? ''),
							name: String(rule.name ?? ''),
							amount,
						}
					})
					const postTaxTotal = roundMoney(
						postTaxDeductions.reduce((sum, row) => sum + row.amount, 0),
					)
					const adjustmentAmount = roundMoney(
						adjustmentByEmployee.get(employee._id) ?? 0,
					)
					const deductionAmount = roundMoney(
						preTaxTotal + progressiveTax.taxAmount + postTaxTotal,
					)
					const netAmount = roundMoney(
						Math.max(0, grossAmount - deductionAmount + adjustmentAmount),
					)

					return {
						employeeId: employee._id,
						employeeNo: employee.employeeNo,
						employeeName:
							`${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim(),
						grossAmount,
						preTaxDeductions,
						taxableAmount,
						taxAmount: progressiveTax.taxAmount,
						taxBreakdown: progressiveTax.taxBreakdown,
						postTaxDeductions,
						adjustmentAmount,
						deductionAmount,
						netAmount,
					}
				},
			)

			const grossAmount = roundMoney(
				calculations.reduce((sum, row) => sum + row.grossAmount, 0),
			)
			const deductionAmount = roundMoney(
				calculations.reduce((sum, row) => sum + row.deductionAmount, 0),
			)
			const netAmount = roundMoney(
				calculations.reduce((sum, row) => sum + row.netAmount, 0),
			)

			const updatedRun = context.db.schemas.payrollRuns.update(run._id, {
				status: 'CALCULATED',
				rulesetId: ruleset?._id,
				employeeCount: calculations.length,
				grossAmount,
				deductionAmount,
				netAmount,
				calculationSnapshot: JSON.stringify({
					ruleset: ruleset
						? {
								id: ruleset._id,
								code: ruleset.code,
								name: ruleset.name,
							}
						: {
								id: null,
								code: 'DEFAULT',
								name: 'Default 20% flat tax',
							},
					calculations,
				}),
				statusUpdatedAt: new Date(),
			})
			if (!updatedRun) {
				throw new Error('Unable to update payroll run calculations')
			}

			return {
				runId: updatedRun._id,
				runNo: updatedRun.runNo,
				status: updatedRun.status,
				rulesetId: updatedRun.rulesetId,
				employeeCount: calculations.length,
				grossAmount,
				deductionAmount,
				netAmount,
				calculations,
			}
		}),
	applyAdjustment: publicProcedure
		.input(applyAdjustmentInputSchema)
		.route({
			method: 'POST',
			summary: 'Apply payroll run adjustment/correction with audit history',
		})
		.handler(({ input, context }) => {
			assertRole(context, 'MANAGER', 'payroll run adjustment')
			const tenantId = context.auth.tenantId
			const run = context.db.schemas.payrollRuns.get(input.runId)
			if (!run || readTenantId(run) !== tenantId) {
				throw new Error('Payroll run not found')
			}
			if (run.status === 'CANCELED') {
				throw new Error('Cannot adjust canceled payroll run')
			}
			const employee = context.db.schemas.employees.get(input.employeeId)
			if (!employee || readTenantId(employee) !== tenantId) {
				throw new Error('Employee not found')
			}

			const adjustment = context.db.schemas.payrollRunAdjustments.insert({
				adjustmentNo: '',
				runId: run._id,
				employeeId: employee._id,
				adjustmentType: input.adjustmentType,
				amountDelta: input.amountDelta,
				reason: input.reason,
				appliedAt: new Date().toISOString(),
				appliedByUserId: context.auth.userId,
			})

			const requiresRecalculation = run.status === 'CALCULATED'
			if (requiresRecalculation) {
				context.db.schemas.payrollRuns.update(run._id, {
					status: 'DRAFT',
					statusReason: 'Adjustment applied; recalculate run',
					statusUpdatedAt: new Date(),
				})
			}

			return {
				adjustmentId: adjustment._id,
				adjustmentNo: adjustment.adjustmentNo,
				runId: run._id,
				runStatus: run.status,
				requiresRecalculation,
			}
		}),
	generateStatutoryReports: publicProcedure
		.input(generateStatutoryReportsInputSchema)
		.route({
			method: 'POST',
			summary: 'Generate statutory report artifacts for payroll runs',
		})
		.handler(({ input, context }) => {
			assertRole(context, 'MANAGER', 'payroll statutory report generation')
			const tenantId = context.auth.tenantId
			const run = context.db.schemas.payrollRuns.get(input.runId)
			if (!run || readTenantId(run) !== tenantId) {
				throw new Error('Payroll run not found')
			}
			if (!run.calculationSnapshot) {
				throw new Error(
					'Payroll run must be calculated before generating reports',
				)
			}

			let snapshot: {
				calculations: PayrollCalculationSnapshotRow[]
				ruleset?: { id: string | null; code: string; name: string }
			}
			try {
				const parsed = JSON.parse(run.calculationSnapshot) as unknown
				if (
					typeof parsed === 'object' &&
					parsed !== null &&
					'calculations' in parsed &&
					Array.isArray((parsed as any).calculations)
				) {
					snapshot = parsed as {
						calculations: PayrollCalculationSnapshotRow[]
						ruleset?: { id: string | null; code: string; name: string }
					}
				} else {
					snapshot = {
						calculations: parsed as PayrollCalculationSnapshotRow[],
					}
				}
			} catch {
				throw new Error('Payroll run calculation snapshot is invalid')
			}

			const existingReports =
				context.db.schemas.payrollRunStatutoryReports.findMany({
					where: (row: any) =>
						readTenantId(row) === tenantId && row.runId === run._id,
				})

			const reports = input.reportTypes.map((reportType) => {
				const existing = existingReports.find(
					(report: any) =>
						report.reportType === reportType && report.status === 'GENERATED',
				)
				if (existing && !input.forceRegenerate) {
					return existing
				}
				if (existing && input.forceRegenerate) {
					context.db.schemas.payrollRunStatutoryReports.update(existing._id, {
						status: 'VOIDED',
					})
				}

				let artifact: Record<string, unknown>
				if (reportType === 'TAX_SUMMARY') {
					artifact = {
						runNo: run.runNo,
						ruleset: snapshot.ruleset ?? null,
						totalTax: roundMoney(
							snapshot.calculations.reduce(
								(sum, row) => sum + Number(row.taxAmount ?? 0),
								0,
							),
						),
						employees: snapshot.calculations.map((row) => ({
							employeeId: row.employeeId,
							employeeNo: row.employeeNo,
							employeeName: row.employeeName,
							taxAmount: row.taxAmount,
						})),
					}
				} else if (reportType === 'DEDUCTION_SUMMARY') {
					artifact = {
						runNo: run.runNo,
						totalDeductions: roundMoney(
							snapshot.calculations.reduce(
								(sum, row) => sum + Number(row.deductionAmount ?? 0),
								0,
							),
						),
						employees: snapshot.calculations.map((row) => ({
							employeeId: row.employeeId,
							employeeNo: row.employeeNo,
							employeeName: row.employeeName,
							preTaxDeductions: row.preTaxDeductions,
							postTaxDeductions: row.postTaxDeductions,
							total: row.deductionAmount,
						})),
					}
				} else {
					artifact = {
						runNo: run.runNo,
						currency: run.currency ?? 'USD',
						payments: snapshot.calculations.map((row) => ({
							employeeId: row.employeeId,
							employeeNo: row.employeeNo,
							employeeName: row.employeeName,
							netAmount: row.netAmount,
						})),
						totalNetAmount: roundMoney(
							snapshot.calculations.reduce(
								(sum, row) => sum + Number(row.netAmount ?? 0),
								0,
							),
						),
					}
				}

				return context.db.schemas.payrollRunStatutoryReports.insert({
					reportNo: '',
					runId: run._id,
					reportType,
					status: 'GENERATED',
					periodStart: run.periodStart,
					periodEnd: run.periodEnd,
					artifactJson: JSON.stringify(artifact),
					generatedAt: new Date().toISOString(),
					generatedByUserId: context.auth.userId,
				})
			})

			return {
				runId: run._id,
				runNo: run.runNo,
				reportCount: reports.length,
				reports,
			}
		}),
	postRun: publicProcedure
		.input(postRunInputSchema)
		.route({ method: 'POST', summary: 'Post payroll run into finance records' })
		.handler(({ input, context }) => {
			assertRole(context, 'MANAGER', 'payroll run posting')
			const tenantId = context.auth.tenantId
			const run = context.db.schemas.payrollRuns.get(input.runId)
			if (!run) {
				throw new Error('Payroll run not found')
			}
			if (readTenantId(run) !== tenantId) {
				throw new Error('Cross-tenant access is not allowed')
			}

			const existingLedgerEntries =
				context.db.schemas.employeeLedgerEntries.findMany({
					where: (row: any) =>
						readTenantId(row) === tenantId &&
						row.documentNo === run.runNo &&
						row.documentType === 'PAYROLL',
				})
			const existingJournalLines = context.db.schemas.genJournalLines.findMany({
				where: (row: any) =>
					readTenantId(row) === tenantId &&
					row.documentNo === run.runNo &&
					row.documentType === 'PAYROLL' &&
					row.sourceModule === 'PAYROLL',
			})

			if (run.status === 'POSTED' || run.status === 'PAID') {
				return {
					runId: run._id,
					runNo: run.runNo,
					status: run.status,
					journalCount: existingJournalLines.length,
					employeeLedgerCount: existingLedgerEntries.length,
					netAmount: Number(run.netAmount ?? 0),
					idempotent: true,
				}
			}

			if (run.status !== 'CALCULATED') {
				throw new Error('Only CALCULATED payroll runs can be posted')
			}
			if (existingLedgerEntries.length > 0 || existingJournalLines.length > 0) {
				throw new Error('Payroll run already has posting entries')
			}
			if (!run.calculationSnapshot) {
				throw new Error('Payroll run calculation snapshot is missing')
			}

			let calculations: Array<{
				employeeId: string
				netAmount: number
				employeeName?: string
			}> = []
			try {
				const parsed = JSON.parse(run.calculationSnapshot) as unknown
				if (
					typeof parsed === 'object' &&
					parsed !== null &&
					'calculations' in parsed &&
					Array.isArray((parsed as any).calculations)
				) {
					calculations = (parsed as any).calculations as Array<{
						employeeId: string
						netAmount: number
						employeeName?: string
					}>
				} else {
					calculations = parsed as Array<{
						employeeId: string
						netAmount: number
						employeeName?: string
					}>
				}
			} catch {
				throw new Error('Payroll run calculation snapshot is invalid')
			}
			if (calculations.length === 0) {
				throw new Error('Payroll run has no calculated employees')
			}

			const previousStatus = run.status
			const previousPostedJournalCount = run.postedJournalCount
			const previousPostingSummary = run.postingSummary
			const previousStatusUpdatedAt = run.statusUpdatedAt
			const createdEmployeeLedgerIds: string[] = []
			const createdJournalLineIds: string[] = []
			const createdGlEntryIds: string[] = []

			try {
				const postingDate = run.periodEnd ?? new Date().toISOString()
				const nextEmployeeLedgerEntryNo = nextEntryNo(
					context.db.schemas.employeeLedgerEntries.findMany({
						where: (row: any) => readTenantId(row) === tenantId,
					}),
				)
				const nextGlEntryNo = nextEntryNo(
					context.db.schemas.glEntries.findMany({
						where: (row: any) => readTenantId(row) === tenantId,
					}),
				)

				for (const [index, calculation] of calculations.entries()) {
					const employee = context.db.schemas.employees.get(
						calculation.employeeId,
					)
					if (!employee || readTenantId(employee) !== tenantId) {
						throw new Error(
							`Employee ${calculation.employeeId} is not available for posting`,
						)
					}
					const netAmount = roundMoney(Number(calculation.netAmount ?? 0))
					if (netAmount <= 0) {
						throw new Error(
							`Calculated net amount for employee ${employee.employeeNo} must be positive`,
						)
					}

					const ledgerEntry = context.db.schemas.employeeLedgerEntries.insert({
						entryNo: nextEmployeeLedgerEntryNo + index,
						employeeId: employee._id,
						postingDate,
						documentType: 'PAYROLL',
						documentNo: run.runNo,
						description: `Payroll run ${run.runNo}`,
						amount: netAmount,
						remainingAmount: netAmount,
						currency: run.currency ?? 'USD',
						open: true,
						payrollPeriod: `${run.periodStart ?? ''}..${run.periodEnd ?? ''}`,
					})
					createdEmployeeLedgerIds.push(ledgerEntry._id)

					const journalLine = context.db.schemas.genJournalLines.insert({
						journalTemplate: 'PAYROLL',
						journalBatch: run.runNo,
						lineNo: index + 1,
						postingDate,
						documentType: 'PAYROLL',
						documentNo: run.runNo,
						accountType: 'EMPLOYEE',
						accountNo: employee.employeeNo,
						balancingAccountType: 'GL_ACCOUNT',
						balancingAccountNo: '2100',
						description:
							`Payroll ${run.runNo} - ${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim(),
						debitAmount: netAmount,
						creditAmount: 0,
						status: 'POSTED',
						sourceModule: 'PAYROLL',
					})
					createdJournalLineIds.push(journalLine._id)
				}

				const totalNetAmount = roundMoney(
					calculations.reduce(
						(sum, row) => sum + roundMoney(Number(row.netAmount ?? 0)),
						0,
					),
				)
				const payrollExpenseEntry = context.db.schemas.glEntries.insert({
					entryNo: nextGlEntryNo,
					postingDate,
					accountNo: '6200',
					accountName: 'Payroll Expense',
					documentType: 'PAYROLL',
					documentNo: run.runNo,
					description: `Payroll run ${run.runNo}`,
					debitAmount: totalNetAmount,
					creditAmount: 0,
				})
				createdGlEntryIds.push(payrollExpenseEntry._id)

				const payrollPayableEntry = context.db.schemas.glEntries.insert({
					entryNo: nextGlEntryNo + 1,
					postingDate,
					accountNo: '2100',
					accountName: 'Payroll Payable',
					documentType: 'PAYROLL',
					documentNo: run.runNo,
					description: `Payroll run ${run.runNo}`,
					debitAmount: 0,
					creditAmount: totalNetAmount,
				})
				createdGlEntryIds.push(payrollPayableEntry._id)

				const updatedRun = context.db.schemas.payrollRuns.update(run._id, {
					status: 'POSTED',
					postedJournalCount: createdJournalLineIds.length,
					postingSummary: JSON.stringify({
						employeeLedgerIds: createdEmployeeLedgerIds,
						journalLineIds: createdJournalLineIds,
						glEntryIds: createdGlEntryIds,
					}),
					statusUpdatedAt: new Date(),
				})
				if (!updatedRun) {
					throw new Error('Unable to update payroll run as posted')
				}

				return {
					runId: updatedRun._id,
					runNo: updatedRun.runNo,
					status: updatedRun.status,
					journalCount: createdJournalLineIds.length,
					employeeLedgerCount: createdEmployeeLedgerIds.length,
					netAmount: roundMoney(Number(updatedRun.netAmount ?? 0)),
					idempotent: false,
				}
			} catch (error) {
				for (const glEntryId of createdGlEntryIds) {
					context.db.schemas.glEntries.delete(glEntryId)
				}
				for (const journalLineId of createdJournalLineIds) {
					context.db.schemas.genJournalLines.delete(journalLineId)
				}
				for (const employeeLedgerId of createdEmployeeLedgerIds) {
					context.db.schemas.employeeLedgerEntries.delete(employeeLedgerId)
				}
				context.db.schemas.payrollRuns.update(run._id, {
					status: previousStatus,
					postedJournalCount: previousPostedJournalCount,
					postingSummary: previousPostingSummary,
					statusUpdatedAt: previousStatusUpdatedAt,
				})
				throw error
			}
		}),
	markRunPaid: publicProcedure
		.input(markRunPaidInputSchema)
		.route({
			method: 'POST',
			summary:
				'Mark a posted payroll run as paid and create disbursement entry',
		})
		.handler(({ input, context }) => {
			assertRole(context, 'MANAGER', 'payroll run payment')
			const tenantId = context.auth.tenantId
			const run = context.db.schemas.payrollRuns.get(input.runId)
			if (!run) {
				throw new Error('Payroll run not found')
			}
			if (readTenantId(run) !== tenantId) {
				throw new Error('Cross-tenant access is not allowed')
			}

			const existingDisbursements =
				context.db.schemas.bankAccountLedgerEntries.findMany({
					where: (row: any) =>
						readTenantId(row) === tenantId &&
						row.documentNo === run.runNo &&
						row.documentType === 'PAYROLL',
				})

			if (run.status === 'PAID') {
				return {
					runId: run._id,
					runNo: run.runNo,
					status: run.status,
					disbursementCount: existingDisbursements.length,
					idempotent: true,
				}
			}

			if (run.status !== 'POSTED') {
				throw new Error('Only POSTED payroll runs can be marked as paid')
			}

			const employeeLedgerEntries =
				context.db.schemas.employeeLedgerEntries.findMany({
					where: (row: any) =>
						readTenantId(row) === tenantId &&
						row.documentNo === run.runNo &&
						row.documentType === 'PAYROLL',
				})
			if (employeeLedgerEntries.length === 0) {
				throw new Error('Payroll run has no posted employee ledger entries')
			}

			const bankAccount = input.bankAccountId
				? context.db.schemas.bankAccounts.get(input.bankAccountId)
				: context.db.schemas.bankAccounts.findMany({
						where: (row: any) =>
							readTenantId(row) === tenantId && row.status === 'ACTIVE',
						limit: 1,
					})[0]
			if (!bankAccount || readTenantId(bankAccount) !== tenantId) {
				throw new Error(
					'An active bank account is required for payroll disbursement',
				)
			}

			const previousStatus = run.status
			const previousStatusUpdatedAt = run.statusUpdatedAt
			const previousPaidAt = run.paidAt
			const previousDisbursementCount = run.disbursementCount
			const previousLedgerState = employeeLedgerEntries.map((row: any) => ({
				id: row._id,
				remainingAmount: row.remainingAmount,
				open: row.open,
			}))
			let createdDisbursementId: string | null = null

			try {
				const nextBankEntryNo = nextEntryNo(
					context.db.schemas.bankAccountLedgerEntries.findMany({
						where: (row: any) => readTenantId(row) === tenantId,
					}),
				)
				const netAmount = roundMoney(Number(run.netAmount ?? 0))
				const disbursement = context.db.schemas.bankAccountLedgerEntries.insert(
					{
						entryNo: nextBankEntryNo,
						bankAccountId: bankAccount._id,
						postingDate: run.periodEnd ?? new Date().toISOString(),
						documentType: 'PAYROLL',
						documentNo: run.runNo,
						description: `Payroll disbursement ${run.runNo}`,
						debitAmount: netAmount,
						creditAmount: 0,
						amount: -netAmount,
						reconciliationStatus: 'OPEN',
						open: true,
					},
				)
				createdDisbursementId = disbursement._id

				for (const ledgerEntry of employeeLedgerEntries) {
					context.db.schemas.employeeLedgerEntries.update(ledgerEntry._id, {
						remainingAmount: 0,
						open: false,
					})
				}

				const updatedRun = context.db.schemas.payrollRuns.update(run._id, {
					status: 'PAID',
					paidAt: new Date().toISOString(),
					disbursementCount: Number(run.disbursementCount ?? 0) + 1,
					statusUpdatedAt: new Date(),
				})
				if (!updatedRun) {
					throw new Error('Unable to update payroll run payment status')
				}

				return {
					runId: updatedRun._id,
					runNo: updatedRun.runNo,
					status: updatedRun.status,
					disbursementId: disbursement._id,
					disbursementCount: updatedRun.disbursementCount,
					idempotent: false,
				}
			} catch (error) {
				if (createdDisbursementId) {
					context.db.schemas.bankAccountLedgerEntries.delete(
						createdDisbursementId,
					)
				}
				for (const ledgerState of previousLedgerState) {
					context.db.schemas.employeeLedgerEntries.update(ledgerState.id, {
						remainingAmount: ledgerState.remainingAmount,
						open: ledgerState.open,
					})
				}
				context.db.schemas.payrollRuns.update(run._id, {
					status: previousStatus,
					paidAt: previousPaidAt,
					disbursementCount: previousDisbursementCount,
					statusUpdatedAt: previousStatusUpdatedAt,
				})
				throw error
			}
		}),
})

export const payrollRouter = createRPCRouter({
	employees: employeesRouter,
	employeeLedger: employeeLedgerRouter,
	journalLines: journalLinesRouter,
	glEntries: glEntriesRouter,
	bankLedgerEntries: bankLedgerEntriesRouter,
	rulesets: payrollRuleSetsRouter,
	taxBrackets: payrollTaxBracketsRouter,
	deductionRules: payrollDeductionRulesRouter,
	runAdjustments: payrollRunAdjustmentsRouter,
	statutoryReports: payrollRunStatutoryReportsRouter,
	payrollRuns: payrollRunsRouter,
})
