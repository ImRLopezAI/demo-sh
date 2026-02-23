import { createRPCRouter, publicProcedure } from '@server/rpc/init'
import z from 'zod'
import { createTenantScopedCrudRouter } from '../helpers'

const itemLedgerEntriesRouter = createTenantScopedCrudRouter({
	moduleName: 'insight',
	prefix: 'item-ledger-entries',
	primaryTable: 'itemLedgerEntries',
	viewTables: { overview: 'itemLedgerEntries' },
})

const locationsRouter = createTenantScopedCrudRouter({
	moduleName: 'insight',
	prefix: 'locations',
	primaryTable: 'locations',
	viewTables: { overview: 'locations' },
})

const valueEntriesRouter = createTenantScopedCrudRouter({
	moduleName: 'insight',
	prefix: 'value-entries',
	primaryTable: 'valueEntries',
	viewTables: { overview: 'valueEntries' },
})

const forecastInputSchema = z.object({
	horizonDays: z.number().int().min(7).max(180).default(30),
	locationCode: z.string().optional(),
	itemId: z.string().optional(),
	limit: z.number().int().min(1).max(100).default(25),
})

const alertTriggerInputSchema = forecastInputSchema.extend({
	asOf: z.string().optional(),
	maxNotifications: z.number().int().min(1).max(50).default(20),
})

const readTenantId = (row: unknown) =>
	(row as { tenantId?: string }).tenantId ?? 'demo-tenant'

const riskRank: Record<'LOW' | 'MEDIUM' | 'HIGH', number> = {
	HIGH: 3,
	MEDIUM: 2,
	LOW: 1,
}

const ALERT_SETTING_KEY = 'insight_alert_subscription'

type ForecastSignal = {
	itemId: string
	locationCode: string
	demandQty: number
	inboundQty: number
	outboundQty: number
	currentStock: number
	avgDailyDemand: number
	forecastDemandHorizon: number
	forecastDemand30Days: number
	daysOfCover: number | null
	stockoutRisk: 'LOW' | 'MEDIUM' | 'HIGH'
	sampleCount: number
	confidence: 'LOW' | 'MEDIUM' | 'HIGH'
}

type ForecastComputationResult = {
	generatedAt: string
	freshnessAt: string
	horizonDays: number
	assumptions: {
		riskBandsDaysOfCover: {
			high: number
			medium: number
		}
		maxHorizonDays: number
	}
	signalCount: number
	signals: ForecastSignal[]
}

type AlertPolicy = {
	stockoutRiskThreshold: 'LOW' | 'MEDIUM' | 'HIGH'
	obsoleteDaysThreshold: number
	dedupeMinutes: number
	escalationMinutes: number
}

const defaultAlertPolicy: AlertPolicy = {
	stockoutRiskThreshold: 'HIGH',
	obsoleteDaysThreshold: 45,
	dedupeMinutes: 120,
	escalationMinutes: 60,
}

const parseAlertPolicy = (valueJson?: string | null): AlertPolicy => {
	if (!valueJson) return defaultAlertPolicy
	try {
		const parsed = JSON.parse(valueJson) as Partial<AlertPolicy>
		return {
			stockoutRiskThreshold:
				parsed.stockoutRiskThreshold ??
				defaultAlertPolicy.stockoutRiskThreshold,
			obsoleteDaysThreshold: Math.max(
				1,
				Number(
					parsed.obsoleteDaysThreshold ??
						defaultAlertPolicy.obsoleteDaysThreshold,
				),
			),
			dedupeMinutes: Math.max(
				1,
				Number(parsed.dedupeMinutes ?? defaultAlertPolicy.dedupeMinutes),
			),
			escalationMinutes: Math.max(
				1,
				Number(
					parsed.escalationMinutes ?? defaultAlertPolicy.escalationMinutes,
				),
			),
		}
	} catch {
		return defaultAlertPolicy
	}
}

const confidenceFromSample = (
	sampleCount: number,
): 'LOW' | 'MEDIUM' | 'HIGH' => {
	if (sampleCount >= 12) return 'HIGH'
	if (sampleCount >= 6) return 'MEDIUM'
	return 'LOW'
}

const computeForecastSignals = (
	context: any,
	input: z.infer<typeof forecastInputSchema>,
	nowTimestamp: number,
): ForecastComputationResult => {
	const tenantId = context.auth.tenantId
	const horizonMs = input.horizonDays * 24 * 60 * 60 * 1000
	const windowStart = nowTimestamp - horizonMs

	const ledgerRows = context.db.schemas.itemLedgerEntries.findMany({
		where: (row: any) => {
			if (readTenantId(row) !== tenantId) return false
			if (input.locationCode && row.locationCode !== input.locationCode) {
				return false
			}
			if (input.itemId && row.itemId !== input.itemId) return false
			if (!row.postingDate) return false
			const postingTime = Date.parse(row.postingDate)
			if (Number.isNaN(postingTime)) return false
			return postingTime >= windowStart && postingTime <= nowTimestamp
		},
	})

	type SignalAccumulator = {
		itemId: string
		locationCode: string
		demandQty: number
		inboundQty: number
		outboundQty: number
		currentStock: number
		sampleCount: number
	}

	const signalMap = new Map<string, SignalAccumulator>()
	for (const row of ledgerRows) {
		const locationCode = row.locationCode ?? 'UNASSIGNED'
		const key = `${row.itemId}::${locationCode}`
		const accumulator = signalMap.get(key) ?? {
			itemId: row.itemId,
			locationCode,
			demandQty: 0,
			inboundQty: 0,
			outboundQty: 0,
			currentStock: 0,
			sampleCount: 0,
		}
		const quantity = Math.abs(Number(row.quantity ?? 0))
		const remainingQty = Number(row.remainingQty ?? 0)
		const entryType = String(row.entryType ?? '')

		if (entryType === 'SALE') {
			accumulator.demandQty += quantity
			accumulator.outboundQty += quantity
		} else if (
			entryType === 'PURCHASE' ||
			entryType === 'POSITIVE_ADJUSTMENT' ||
			entryType === 'TRANSFER'
		) {
			accumulator.inboundQty += quantity
		} else if (entryType === 'NEGATIVE_ADJUSTMENT') {
			accumulator.outboundQty += quantity
		}

		accumulator.currentStock = Math.max(0, remainingQty)
		accumulator.sampleCount += 1
		signalMap.set(key, accumulator)
	}

	const signals = [...signalMap.values()]
		.map((signal): ForecastSignal => {
			const avgDailyDemand = signal.demandQty / input.horizonDays
			const daysOfCover =
				avgDailyDemand > 0
					? Number((signal.currentStock / avgDailyDemand).toFixed(2))
					: null
			const stockoutRisk: 'LOW' | 'MEDIUM' | 'HIGH' =
				daysOfCover === null
					? 'LOW'
					: daysOfCover < 7
						? 'HIGH'
						: daysOfCover < 14
							? 'MEDIUM'
							: 'LOW'

			return {
				itemId: signal.itemId,
				locationCode: signal.locationCode,
				demandQty: Number(signal.demandQty.toFixed(2)),
				inboundQty: Number(signal.inboundQty.toFixed(2)),
				outboundQty: Number(signal.outboundQty.toFixed(2)),
				currentStock: Number(signal.currentStock.toFixed(2)),
				avgDailyDemand: Number(avgDailyDemand.toFixed(2)),
				forecastDemandHorizon: Number(signal.demandQty.toFixed(2)),
				forecastDemand30Days: Number((avgDailyDemand * 30).toFixed(2)),
				daysOfCover,
				stockoutRisk,
				sampleCount: signal.sampleCount,
				confidence: confidenceFromSample(signal.sampleCount),
			}
		})
		.sort((a, b) => {
			const riskDelta = riskRank[b.stockoutRisk] - riskRank[a.stockoutRisk]
			if (riskDelta !== 0) return riskDelta
			return b.demandQty - a.demandQty
		})
		.slice(0, input.limit)

	return {
		generatedAt: new Date(nowTimestamp).toISOString(),
		freshnessAt: new Date(nowTimestamp).toISOString(),
		horizonDays: input.horizonDays,
		assumptions: {
			riskBandsDaysOfCover: {
				high: 7,
				medium: 14,
			},
			maxHorizonDays: 180,
		},
		signalCount: signals.length,
		signals,
	}
}

export const insightRouter = createRPCRouter({
	itemLedgerEntries: itemLedgerEntriesRouter,
	locations: locationsRouter,
	valueEntries: valueEntriesRouter,
	forecastDemand: publicProcedure
		.input(forecastInputSchema)
		.route({
			method: 'POST',
			summary: 'Generate inventory demand/velocity and stock-out risk signals',
		})
		.handler(({ input, context }) => {
			return computeForecastSignals(context, input, Date.now())
		}),
	triggerForecastAlerts: publicProcedure
		.input(alertTriggerInputSchema)
		.route({
			method: 'POST',
			summary:
				'Create deduplicated Insight risk notifications from forecast signals',
		})
		.handler(({ input, context }) => {
			const tenantId = context.auth.tenantId
			const nowTimestamp = input.asOf ? Date.parse(input.asOf) : Date.now()
			const now = Number.isNaN(nowTimestamp) ? Date.now() : nowTimestamp
			const forecast = computeForecastSignals(context, input, now)

			const setting = context.db.schemas.hubModuleSettings.findMany({
				where: (row: any) =>
					readTenantId(row) === tenantId &&
					row.moduleId === 'insight' &&
					row.settingKey === ALERT_SETTING_KEY,
				limit: 1,
			})[0]
			const policy = parseAlertPolicy(setting?.valueJson)
			const dedupeWindowMs = policy.dedupeMinutes * 60 * 1000
			const thresholdRank = riskRank[policy.stockoutRiskThreshold]
			const candidates = forecast.signals
				.filter((signal) => riskRank[signal.stockoutRisk] >= thresholdRank)
				.slice(0, input.maxNotifications)

			let created = 0
			let deduped = 0
			const createdNotificationIds: string[] = []

			for (const signal of candidates) {
				const dedupeKey = `${signal.itemId}:${signal.locationCode}:${signal.stockoutRisk}`
				const marker = `[insight-alert:${dedupeKey}]`
				const existing = context.db.schemas.moduleNotifications.findMany({
					where: (row: any) => {
						if (readTenantId(row) !== tenantId) return false
						if (row.moduleId !== 'insight') return false
						if (typeof row.body !== 'string' || !row.body.includes(marker)) {
							return false
						}
						const updatedAt = Number(row._updatedAt ?? row._createdAt ?? 0)
						return now - updatedAt <= dedupeWindowMs
					},
					limit: 1,
				})[0]

				if (existing) {
					deduped += 1
					continue
				}

				const severity =
					signal.stockoutRisk === 'HIGH'
						? 'ERROR'
						: signal.stockoutRisk === 'MEDIUM'
							? 'WARNING'
							: 'INFO'
				const daysOfCoverLabel =
					signal.daysOfCover === null ? 'n/a' : String(signal.daysOfCover)

				const inserted = context.db.schemas.moduleNotifications.insert({
					moduleId: 'insight',
					title: `Stockout risk ${signal.stockoutRisk}: ${signal.itemId}`,
					body: `${marker} ${signal.locationCode} · cover ${daysOfCoverLabel} days · demand ${signal.demandQty.toFixed(2)}. Review replenishment and policy thresholds.`,
					status: 'UNREAD',
					severity,
				})
				created += 1
				createdNotificationIds.push(inserted._id)
			}

			return {
				policy,
				evaluatedSignals: forecast.signalCount,
				candidates: candidates.length,
				created,
				deduped,
				createdNotificationIds,
				generatedAt: forecast.generatedAt,
			}
		}),
})
