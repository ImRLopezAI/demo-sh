import { db } from '@server/db'
import { beforeEach, describe, expect, test } from 'vitest'
import { createCaller } from './helpers'

describe.sequential('replenishment module', () => {
	beforeEach(async () => {
		await db._internals.reset()
	})

	test('registers replenishment tables on db.schemas', () => {
		expect(Object.keys(db.schemas)).toEqual(
			expect.arrayContaining([
				'vendors',
				'purchaseHeaders',
				'purchaseLines',
				'transferHeaders',
				'transferLines',
			]),
		)
	})

	test('loads replenishment relations with with option', () => {
		const purchaseHeader = db.schemas.purchaseHeaders.toArray()[0]
		expect(purchaseHeader).toBeDefined()

		const purchaseHeaders = db.schemas.purchaseHeaders.findMany({
			where: (row) => row._id === purchaseHeader?._id,
			with: { vendor: true, lines: true },
		})

		expect(purchaseHeaders[0]?.vendor?._id).toBeDefined()
		expect(Array.isArray(purchaseHeaders[0]?.lines)).toBe(true)
		expect((purchaseHeaders[0]?.lines ?? []).length).toBeGreaterThan(0)
	})

	test('exposes callable replenishment rpc surface', async () => {
		const caller = createCaller()

		const purchaseOrders = await caller.replenishment.purchaseOrders.list({
			limit: 5,
			offset: 0,
		})
		expect(Array.isArray(purchaseOrders.items)).toBe(true)

		const vendors = await caller.replenishment.vendors.list({
			limit: 5,
			offset: 0,
		})
		expect(Array.isArray(vendors.items)).toBe(true)

		const transfers = await caller.replenishment.transfers.list({
			limit: 5,
			offset: 0,
		})
		expect(Array.isArray(transfers.items)).toBe(true)
	})

	test('enforces purchase-order transitions and reason requirements', async () => {
		const caller = createCaller()
		const purchaseHeader = db.schemas.purchaseHeaders.toArray()[0]
		expect(purchaseHeader?._id).toBeDefined()

		db.schemas.purchaseHeaders.update(purchaseHeader?._id, {
			status: 'PENDING_APPROVAL',
		})

		await expect(
			caller.replenishment.purchaseOrders.transitionStatus({
				id: purchaseHeader?._id,
				toStatus: 'CANCELED',
			}),
		).rejects.toThrow('is not allowed')

		await expect(
			caller.replenishment.purchaseOrders.transitionStatus({
				id: purchaseHeader?._id,
				toStatus: 'REJECTED',
			}),
		).rejects.toThrow('A reason is required')
	})

	test('enforces transfer reason requirement for canceled', async () => {
		const caller = createCaller()
		const transferHeader = db.schemas.transferHeaders.toArray()[0]
		expect(transferHeader?._id).toBeDefined()

		db.schemas.transferHeaders.update(transferHeader?._id, {
			status: 'RELEASED',
		})

		await expect(
			caller.replenishment.transfers.transitionStatus({
				id: transferHeader?._id,
				toStatus: 'CANCELED',
			}),
		).rejects.toThrow('A reason is required')
	})
})
