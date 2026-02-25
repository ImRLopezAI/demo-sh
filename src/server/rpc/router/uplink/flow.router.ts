import {
	BANK_ACCOUNT_REASON_REQUIRED,
	BANK_ACCOUNT_TRANSITIONS,
	JOURNAL_LINE_REASON_REQUIRED,
	JOURNAL_LINE_TRANSITIONS,
	RECONCILIATION_REASON_REQUIRED,
	RECONCILIATION_TRANSITIONS,
} from '@server/db/constants'
import { createRPCRouter, publicProcedure } from '@server/rpc/init'
import z from 'zod'
import { assertRole } from '../authz'
import { createTenantScopedCrudRouter } from '../helpers'

const bankAccountsRouter = createTenantScopedCrudRouter({
	prefix: 'bank-accounts',
	moduleName: 'flow',
	primaryTable: 'bankAccounts',
	viewTables: { overview: 'bankAccounts' },
	statusField: 'status',
	transitions: BANK_ACCOUNT_TRANSITIONS,
	reasonRequiredStatuses: BANK_ACCOUNT_REASON_REQUIRED,
	statusRoleRequirements: {
		BLOCKED: 'MANAGER',
	},
})

const bankLedgerEntriesRouter = createTenantScopedCrudRouter({
	moduleName: 'flow',
	prefix: 'bank-ledger-entries',
	primaryTable: 'bankAccountLedgerEntries',
	viewTables: { overview: 'bankAccountLedgerEntries' },
	statusField: 'reconciliationStatus',
	transitions: RECONCILIATION_TRANSITIONS,
	reasonRequiredStatuses: RECONCILIATION_REASON_REQUIRED,
	statusRoleRequirements: {
		RECONCILED: 'MANAGER',
	},
})

const journalLinesCrudRouter = createTenantScopedCrudRouter({
	moduleName: 'flow',
	prefix: 'journal-lines',
	primaryTable: 'genJournalLines',
	viewTables: { overview: 'genJournalLines' },
	statusField: 'status',
	transitions: JOURNAL_LINE_TRANSITIONS,
	reasonRequiredStatuses: JOURNAL_LINE_REASON_REQUIRED,
	statusRoleRequirements: {
		POSTED: 'MANAGER',
		VOIDED: 'MANAGER',
	},
})

const glEntriesRouter = createTenantScopedCrudRouter({
	moduleName: 'flow',
	prefix: 'gl-entries',
	primaryTable: 'glEntries',
	viewTables: { overview: 'glEntries' },
})

const postJournalBatchInputSchema = z.object({
	journalTemplate: z.string().optional(),
	journalBatch: z.string().optional(),
	sourceModule: z.string().optional(),
	postingDateFrom: z.string().optional(),
	postingDateTo: z.string().optional(),
})

const cashForecastInputSchema = z.object({
	horizonDays: z.number().int().min(7).max(90).default(30),
	lookbackDays: z.number().int().min(14).max(180).default(60),
	adverseVarianceThresholdPct: z.number().min(5).max(75).default(15),
})

const readTenantId = (row: unknown) =>
	(row as { tenantId?: string }).tenantId ?? 'demo-tenant'

const DAY_IN_MS = 24 * 60 * 60 * 1000

const toUtcDayKey = (timestamp: number) => {
	const date = new Date(timestamp)
	const year = date.getUTCFullYear()
	const month = String(date.getUTCMonth() + 1).padStart(2, '0')
	const day = String(date.getUTCDate()).padStart(2, '0')
	return `${year}-${month}-${day}`
}

const toIsoDay = (timestamp: number) => {
	const [date] = new Date(timestamp).toISOString().split('T')
	return date
}

const startOfUtcDay = (timestamp: number) => {
	const date = new Date(timestamp)
	return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

const readTimestamp = (value: unknown) => {
	if (!value) return null
	if (typeof value === 'string') {
		const parsed = Date.parse(value)
		return Number.isFinite(parsed) ? parsed : null
	}
	if (typeof value === 'number' && Number.isFinite(value)) return value
	if (value instanceof Date) {
		const parsed = value.getTime()
		return Number.isFinite(parsed) ? parsed : null
	}
	return null
}

const isBatchPostable = (status: string) =>
	status === 'OPEN' || status === 'APPROVED'

const isSupportedBankDocumentType = (
	documentType: string | undefined,
): documentType is
	| 'PAYMENT'
	| 'REFUND'
	| 'TRANSFER'
	| 'ADJUSTMENT'
	| 'PAYROLL' =>
	documentType === 'PAYMENT' ||
	documentType === 'REFUND' ||
	documentType === 'TRANSFER' ||
	documentType === 'ADJUSTMENT' ||
	documentType === 'PAYROLL'

const journalLinesRouter = createRPCRouter({
	...journalLinesCrudRouter,
	postJournalBatch: publicProcedure
		.input(postJournalBatchInputSchema)
		.route({
			method: 'POST',
			summary: 'Post flow journal lines in batch with per-line outcomes',
		})
		.handler(({ input, context }) => {
			assertRole(context, 'MANAGER', 'flow journal batch posting')
			const tenantId = context.auth.tenantId
			const fromTimestamp = input.postingDateFrom
				? Date.parse(input.postingDateFrom)
				: null
			const toTimestamp = input.postingDateTo
				? Date.parse(input.postingDateTo)
				: null

			if (
				(input.postingDateFrom && Number.isNaN(fromTimestamp)) ||
				(input.postingDateTo && Number.isNaN(toTimestamp))
			) {
				throw new Error('Invalid posting-date filter provided')
			}

			const journalLines = context.db.schemas.genJournalLines.findMany({
				where: (row) => {
					if (readTenantId(row) !== tenantId) return false
					if (
						input.journalTemplate &&
						row.journalTemplate !== input.journalTemplate
					) {
						return false
					}
					if (input.journalBatch && row.journalBatch !== input.journalBatch) {
						return false
					}
					if (input.sourceModule && row.sourceModule !== input.sourceModule) {
						return false
					}
					if (fromTimestamp || toTimestamp) {
						if (!row.postingDate) return false
						const rowPostingTimestamp = Date.parse(row.postingDate)
						if (Number.isNaN(rowPostingTimestamp)) return false
						if (fromTimestamp && rowPostingTimestamp < fromTimestamp)
							return false
						if (toTimestamp && rowPostingTimestamp > toTimestamp) return false
					}
					return true
				},
				orderBy: { field: '_updatedAt', direction: 'asc' },
			})

			const postedIds: string[] = []
			const skippedEntries: Array<{
				id: string
				status: string
				reason: string
			}> = []
			const failedEntries: Array<{
				id: string
				status: string
				reason: string
			}> = []

			for (const line of journalLines) {
				if (!isBatchPostable(line.status)) {
					skippedEntries.push({
						id: line._id,
						status: line.status,
						reason: `Status ${line.status} is not eligible for batch posting`,
					})
					continue
				}

				const debitAmount = Number(line.debitAmount ?? 0)
				const creditAmount = Number(line.creditAmount ?? 0)
				const hasSingleSidedAmount =
					(debitAmount > 0 && creditAmount === 0) ||
					(creditAmount > 0 && debitAmount === 0)
				if (!line.accountNo?.trim()) {
					failedEntries.push({
						id: line._id,
						status: line.status,
						reason: 'Account number is required for posting',
					})
					continue
				}
				if (!hasSingleSidedAmount) {
					failedEntries.push({
						id: line._id,
						status: line.status,
						reason:
							'Journal line must have exactly one positive side (debit or credit)',
					})
					continue
				}

				const previousStatus = line.status
				const previousStatusReason = line.statusReason
				const previousStatusUpdatedAt = line.statusUpdatedAt
				const postingDate = line.postingDate ?? new Date().toISOString()
				let createdGlEntryId: string | null = null
				let createdBankEntryId: string | null = null

				try {
					const updatedLine = context.db.schemas.genJournalLines.update(
						line._id,
						{
							status: 'POSTED',
							statusReason: undefined,
							statusUpdatedAt: new Date(),
						},
					)
					if (!updatedLine) {
						throw new Error('Unable to update journal line status')
					}

					const glEntry = context.db.schemas.glEntries.insert({
						entryNo: Number(line.lineNo ?? 0),
						postingDate,
						accountNo: line.accountNo,
						documentType: line.documentType,
						documentNo: line.documentNo,
						description: line.description,
						debitAmount,
						creditAmount,
					})
					createdGlEntryId = glEntry._id

					if (line.accountType === 'BANK_ACCOUNT') {
						const bankAccount = context.db.schemas.bankAccounts.findMany({
							where: (row) =>
								readTenantId(row) === tenantId &&
								row.accountNo === line.accountNo,
							limit: 1,
						})[0]
						if (!bankAccount) {
							throw new Error(
								`Bank account ${line.accountNo} was not found for posting`,
							)
						}
						const bankDocumentType = isSupportedBankDocumentType(
							line.documentType,
						)
							? line.documentType
							: 'ADJUSTMENT'
						const bankLedgerEntry =
							context.db.schemas.bankAccountLedgerEntries.insert({
								entryNo: Number(line.lineNo ?? 0),
								bankAccountId: bankAccount._id,
								postingDate,
								documentType: bankDocumentType,
								documentNo: line.documentNo,
								description: line.description,
								debitAmount,
								creditAmount,
								amount: creditAmount - debitAmount,
								reconciliationStatus: 'OPEN',
								open: true,
							})
						createdBankEntryId = bankLedgerEntry._id
					}

					postedIds.push(line._id)
				} catch (error) {
					if (createdBankEntryId) {
						context.db.schemas.bankAccountLedgerEntries.delete(
							createdBankEntryId,
						)
					}
					if (createdGlEntryId) {
						context.db.schemas.glEntries.delete(createdGlEntryId)
					}
					context.db.schemas.genJournalLines.update(line._id, {
						status: previousStatus,
						statusReason: previousStatusReason,
						statusUpdatedAt: previousStatusUpdatedAt,
					})
					failedEntries.push({
						id: line._id,
						status: line.status,
						reason:
							error instanceof Error ? error.message : 'Unknown posting error',
					})
				}
			}

			return {
				processed: journalLines.length,
				posted: postedIds.length,
				skipped: skippedEntries.length,
				failed: failedEntries.length,
				postedIds,
				skippedEntries,
				failedEntries,
				scope: {
					journalTemplate: input.journalTemplate ?? null,
					journalBatch: input.journalBatch ?? null,
					sourceModule: input.sourceModule ?? null,
					postingDateFrom: input.postingDateFrom ?? null,
					postingDateTo: input.postingDateTo ?? null,
				},
				postedAt: new Date().toISOString(),
			}
		}),
})

const analyticsRouter = createRPCRouter({
	cashForecast: publicProcedure
		.input(cashForecastInputSchema)
		.route({
			method: 'GET',
			summary: 'Build rolling cash forecast with actual-vs-forecast variance',
		})
		.handler(({ input, context }) => {
			assertRole(context, 'AGENT', 'flow cash forecast analytics')
			const tenantId = context.auth.tenantId
			const now = Date.now()
			const todayStart = startOfUtcDay(now)
			const lookbackStart = todayStart - input.lookbackDays * DAY_IN_MS

			const bankAccounts = context.db.schemas.bankAccounts.findMany({
				where: (row) => readTenantId(row) === tenantId,
			})
			const ledgerEntries =
				context.db.schemas.bankAccountLedgerEntries.findMany({
					where: (row) => readTenantId(row) === tenantId,
				})

			const dailyActuals = new Map<string, number>()
			let lookbackInflow = 0
			let lookbackOutflow = 0

			for (const entry of ledgerEntries) {
				const entryMeta = entry as unknown as Record<string, unknown>
				const timestamp =
					readTimestamp(entry.postingDate) ??
					readTimestamp(entryMeta._createdAt) ??
					readTimestamp(entryMeta.createdAt) ??
					readTimestamp(entryMeta._creationTime)
				if (!timestamp) continue
				const dayKey = toUtcDayKey(timestamp)
				const amount = Number(entry.amount ?? 0)
				dailyActuals.set(dayKey, (dailyActuals.get(dayKey) ?? 0) + amount)

				if (timestamp < lookbackStart || timestamp > now) continue
				if (amount >= 0) {
					lookbackInflow += amount
				} else {
					lookbackOutflow += Math.abs(amount)
				}
			}

			const averageDailyInflow = lookbackInflow / input.lookbackDays
			const averageDailyOutflow = lookbackOutflow / input.lookbackDays
			const averageDailyNet = averageDailyInflow - averageDailyOutflow
			const startingBalance = bankAccounts.reduce(
				(sum, account) => sum + Number(account.currentBalance ?? 0),
				0,
			)

			const forecast: Array<{
				date: string
				forecastNet: number
				forecastBalance: number
			}> = []
			let rollingBalance = startingBalance
			for (let index = 1; index <= input.horizonDays; index += 1) {
				const dayTimestamp = todayStart + index * DAY_IN_MS
				rollingBalance += averageDailyNet
				forecast.push({
					date: toIsoDay(dayTimestamp),
					forecastNet: Number(averageDailyNet.toFixed(2)),
					forecastBalance: Number(rollingBalance.toFixed(2)),
				})
			}

			const variance: Array<{
				date: string
				forecastNet: number
				actualNet: number
				varianceAmount: number
				variancePct: number
				isAdverse: boolean
			}> = []

			for (let index = input.horizonDays; index >= 1; index -= 1) {
				const dayTimestamp = todayStart - index * DAY_IN_MS
				const dayKey = toUtcDayKey(dayTimestamp)
				const actualNet = dailyActuals.get(dayKey) ?? 0
				const varianceAmount = actualNet - averageDailyNet
				const denominator = Math.max(1, Math.abs(averageDailyNet))
				const variancePct = (varianceAmount / denominator) * 100
				const isAdverse = variancePct <= -input.adverseVarianceThresholdPct

				variance.push({
					date: toIsoDay(dayTimestamp),
					forecastNet: Number(averageDailyNet.toFixed(2)),
					actualNet: Number(actualNet.toFixed(2)),
					varianceAmount: Number(varianceAmount.toFixed(2)),
					variancePct: Number(variancePct.toFixed(2)),
					isAdverse,
				})
			}

			const alerts: Array<{
				type: 'NEGATIVE_CASH_FORECAST' | 'ADVERSE_VARIANCE'
				severity: 'WARNING' | 'ERROR'
				message: string
				thresholdPct?: number
			}> = []

			const firstNegativeForecast = forecast.find(
				(point) => point.forecastBalance < 0,
			)
			if (firstNegativeForecast) {
				alerts.push({
					type: 'NEGATIVE_CASH_FORECAST',
					severity: 'ERROR',
					message: `Projected cash balance turns negative on ${firstNegativeForecast.date}.`,
				})
			}

			const adverseVarianceDays = variance.filter((point) => point.isAdverse)
			if (adverseVarianceDays.length > 0) {
				const worstVariance = adverseVarianceDays.reduce((worst, point) =>
					point.variancePct < worst.variancePct ? point : worst,
				)
				alerts.push({
					type: 'ADVERSE_VARIANCE',
					severity: 'WARNING',
					message: `${adverseVarianceDays.length} day(s) crossed adverse variance threshold. Worst variance: ${worstVariance.variancePct.toFixed(1)}%.`,
					thresholdPct: input.adverseVarianceThresholdPct,
				})
			}

			return {
				config: {
					horizonDays: input.horizonDays,
					lookbackDays: input.lookbackDays,
					adverseVarianceThresholdPct: input.adverseVarianceThresholdPct,
				},
				baseline: {
					startingBalance: Number(startingBalance.toFixed(2)),
					averageDailyInflow: Number(averageDailyInflow.toFixed(2)),
					averageDailyOutflow: Number(averageDailyOutflow.toFixed(2)),
					averageDailyNet: Number(averageDailyNet.toFixed(2)),
				},
				forecast,
				variance,
				alerts,
				generatedAt: new Date(now).toISOString(),
			}
		}),
})

export const flowRouter = createRPCRouter({
	bankAccounts: bankAccountsRouter,
	bankLedgerEntries: bankLedgerEntriesRouter,
	journalLines: journalLinesRouter,
	glEntries: glEntriesRouter,
	analytics: analyticsRouter,
})
