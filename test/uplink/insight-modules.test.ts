import { db } from '@server/db'
import { beforeEach, describe, expect, test } from 'vitest'
import { createCaller } from './helpers'

describe.sequential('insight module', () => {
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
})
