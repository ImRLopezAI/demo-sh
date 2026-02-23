import { db } from '@server/db'
import { beforeEach, describe, expect, test } from 'vitest'
import { createCaller } from './helpers'

describe('insight module', () => {
	beforeEach(async () => {
		await db._internals.reset()
	})

	test('registers insight tables on db.schemas', () => {
		expect(Object.keys(db.schemas)).toEqual(
			expect.arrayContaining([
				'locations',
				'itemLedgerEntries',
				'valueEntries',
			]),
		)
	})

	test('loads insight relations with with option', () => {
		const valueEntry = db.schemas.valueEntries.toArray()[0]
		expect(valueEntry).toBeDefined()

		const entries = db.schemas.valueEntries.findMany({
			where: (row) => row._id === valueEntry?._id,
			with: { itemLedgerEntry: true, item: true },
		})

		expect(entries[0]?.itemLedgerEntry?._id).toBeDefined()
		expect(entries[0]?.item?._id).toBeDefined()
	})

	test('exposes callable insight rpc surface', async () => {
		const caller = createCaller()

		const itemLedgerEntries = await caller.insight.itemLedgerEntries.list({
			limit: 5,
			offset: 0,
		})
		expect(Array.isArray(itemLedgerEntries.items)).toBe(true)

		const locations = await caller.insight.locations.list({
			limit: 5,
			offset: 0,
		})
		expect(Array.isArray(locations.items)).toBe(true)

		const valueEntries = await caller.insight.valueEntries.list({
			limit: 5,
			offset: 0,
		})
		expect(Array.isArray(valueEntries.items)).toBe(true)
	})

	test('supports location creation workflow', async () => {
		const caller = createCaller()
		const createdLocation = await caller.insight.locations.create({
			code: '',
			name: 'New Regional Warehouse',
			type: 'WAREHOUSE',
			address: '1200 Atlantic Ave',
			city: 'Miami',
			country: 'US',
			active: true,
		})

		expect(createdLocation._id).toBeDefined()
		expect(createdLocation.code).toBeTruthy()
		expect(createdLocation.name).toBe('New Regional Warehouse')
		expect(createdLocation.active).toBe(true)
	})

	test('exposes insight kpis endpoints', async () => {
		const caller = createCaller()

		const itemLedgerKpis = await caller.insight.itemLedgerEntries.kpis({})
		expect(typeof itemLedgerKpis.total).toBe('number')
		expect(itemLedgerKpis.total).toBeGreaterThan(0)

		const locationKpis = await caller.insight.locations.kpis({})
		expect(typeof locationKpis.total).toBe('number')
		expect(locationKpis.total).toBeGreaterThan(0)
	})

	test('supports listViewRecords for overview view', async () => {
		const caller = createCaller()

		const response = await caller.insight.valueEntries.listViewRecords({
			viewId: 'overview',
			limit: 5,
			offset: 0,
		})

		expect(response.tableName).toBe('valueEntries')
		expect(Array.isArray(response.items)).toBe(true)
	})

	test('returns validated forecasting signals for decision support', async () => {
		const caller = createCaller()
		const item = db.schemas.items.toArray()[0]
		const location = db.schemas.locations.toArray()[0]
		expect(item?._id).toBeDefined()
		expect(location?.code).toBeDefined()

		const nowIso = new Date().toISOString()
		db.schemas.itemLedgerEntries.insert({
			entryNo: 0,
			entryType: 'SALE',
			itemId: item?._id,
			locationCode: location?.code,
			postingDate: nowIso,
			quantity: 4,
			remainingQty: 12,
			open: false,
			sourceDocumentType: 'ORDER',
			sourceDocumentNo: 'SO-INSIGHT-1',
		})
		db.schemas.itemLedgerEntries.insert({
			entryNo: 0,
			entryType: 'SALE',
			itemId: item?._id,
			locationCode: location?.code,
			postingDate: nowIso,
			quantity: 6,
			remainingQty: 6,
			open: false,
			sourceDocumentType: 'ORDER',
			sourceDocumentNo: 'SO-INSIGHT-2',
		})

		const forecast = await caller.insight.forecastDemand({
			horizonDays: 30,
			locationCode: location?.code,
			itemId: item?._id,
			limit: 10,
		})
		expect(forecast.horizonDays).toBe(30)
		expect(Array.isArray(forecast.signals)).toBe(true)
		expect(forecast.signalCount).toBeGreaterThan(0)
		expect(forecast.signals[0]?.itemId).toBe(item?._id)
		expect(forecast.signals[0]?.locationCode).toBe(location?.code)
		expect(typeof forecast.signals[0]?.avgDailyDemand).toBe('number')
		expect(
			['LOW', 'MEDIUM', 'HIGH'].includes(
				forecast.signals[0]?.stockoutRisk as string,
			),
		).toBe(true)
	})

	test('triggers deduplicated hub notifications from forecast alert subscriptions', async () => {
		const caller = createCaller({ role: 'MANAGER' })
		const item = db.schemas.items.toArray()[0]
		const location = db.schemas.locations.toArray()[0]
		expect(item?._id).toBeDefined()
		expect(location?.code).toBeDefined()
		if (!item?._id || !location?.code) {
			throw new Error('Missing seeded item/location')
		}

		const nowIso = new Date().toISOString()
		db.schemas.itemLedgerEntries.insert({
			entryNo: 0,
			entryType: 'SALE',
			itemId: item._id,
			locationCode: location.code,
			postingDate: nowIso,
			quantity: 30,
			remainingQty: 2,
			open: false,
			sourceDocumentType: 'ORDER',
			sourceDocumentNo: 'SO-INSIGHT-ALERT-1',
		})
		db.schemas.itemLedgerEntries.insert({
			entryNo: 0,
			entryType: 'SALE',
			itemId: item._id,
			locationCode: location.code,
			postingDate: nowIso,
			quantity: 20,
			remainingQty: 1,
			open: false,
			sourceDocumentType: 'ORDER',
			sourceDocumentNo: 'SO-INSIGHT-ALERT-2',
		})

		await caller.hub.moduleSettings.upsertModuleSetting({
			moduleId: 'insight',
			settingKey: 'insight_alert_subscription',
			value: {
				stockoutRiskThreshold: 'HIGH',
				obsoleteDaysThreshold: 45,
				dedupeMinutes: 120,
				escalationMinutes: 60,
			},
			schemaVersion: 'v2',
			changeReason: 'Enable test alert policy',
		})

		const first = await caller.insight.triggerForecastAlerts({
			horizonDays: 30,
			locationCode: location.code,
			itemId: item._id,
			limit: 10,
			maxNotifications: 10,
		})
		expect(first.created).toBeGreaterThan(0)
		expect(first.deduped).toBe(0)
		expect(first.createdNotificationIds.length).toBeGreaterThan(0)

		const second = await caller.insight.triggerForecastAlerts({
			horizonDays: 30,
			locationCode: location.code,
			itemId: item._id,
			limit: 10,
			maxNotifications: 10,
		})
		expect(second.created).toBe(0)
		expect(second.deduped).toBeGreaterThan(0)

		const notifications = db.schemas.moduleNotifications.findMany({
			where: (row) =>
				row.moduleId === 'insight' &&
				(row.body?.includes('[insight-alert:') ?? false),
		})
		expect(notifications.length).toBeGreaterThan(0)
	})

	test('keeps 25-row insight pagination within acceptable latency', async () => {
		const caller = createCaller()
		const maxDurationMs = 2000
		const startedAt = Date.now()
		const result = await caller.insight.itemLedgerEntries.list({
			limit: 25,
			offset: 0,
		})
		const durationMs = Date.now() - startedAt

		expect(Array.isArray(result.items)).toBe(true)
		expect(result.items.length).toBeLessThanOrEqual(25)
		expect(durationMs).toBeLessThan(maxDurationMs)
	})
})
