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

const readTenantId = (row: unknown) =>
	(row as { tenantId?: string }).tenantId ?? 'demo-tenant'

const riskRank: Record<'LOW' | 'MEDIUM' | 'HIGH', number> = {
	HIGH: 3,
	MEDIUM: 2,
	LOW: 1,
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
			const tenantId = context.auth.tenantId
			const now = Date.now()
			const horizonMs = input.horizonDays * 24 * 60 * 60 * 1000
			const windowStart = now - horizonMs

			const ledgerRows = context.db.schemas.itemLedgerEntries.findMany({
				where: (row) => {
					if (readTenantId(row) !== tenantId) return false
					if (input.locationCode && row.locationCode !== input.locationCode) {
						return false
					}
					if (input.itemId && row.itemId !== input.itemId) return false
					if (!row.postingDate) return false
					const postingTime = Date.parse(row.postingDate)
					if (Number.isNaN(postingTime)) return false
					return postingTime >= windowStart && postingTime <= now
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
				.map((signal) => {
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
					}
				})
				.sort((a, b) => {
					const riskDelta = riskRank[b.stockoutRisk] - riskRank[a.stockoutRisk]
					if (riskDelta !== 0) return riskDelta
					return b.demandQty - a.demandQty
				})
				.slice(0, input.limit)

			return {
				generatedAt: new Date(now).toISOString(),
				horizonDays: input.horizonDays,
				signalCount: signals.length,
				signals,
			}
		}),
})
