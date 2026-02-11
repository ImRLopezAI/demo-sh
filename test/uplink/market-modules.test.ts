import { db } from '@server/db'
import { beforeEach, describe, expect, test } from 'vitest'
import { createCaller } from './helpers'

describe.sequential('market module', () => {
	beforeEach(async () => {
		await db._internals.reset()
	})

	test('registers market tables on db.schemas', () => {
		expect(Object.keys(db.schemas)).toEqual(
			expect.arrayContaining([
				'items',
				'customers',
				'salesHeaders',
				'salesLines',
				'carts',
				'cartLines',
			]),
		)
	})

	test('loads market relations with with option', () => {
		const header = db.schemas.salesHeaders.toArray()[0]
		expect(header).toBeDefined()

		const headersWithRelations = db.schemas.salesHeaders.findMany({
			where: (row) => row._id === header?._id,
			with: { customer: true, lines: true },
		})

		expect(headersWithRelations[0]?.customer?._id).toBeDefined()
		expect(Array.isArray(headersWithRelations[0]?.lines)).toBe(true)
		expect((headersWithRelations[0]?.lines ?? []).length).toBeGreaterThan(0)
	})

	test('exposes callable market rpc surface', async () => {
		const caller = createCaller()

		const salesOrders = await caller.market.salesOrders.list({
			limit: 5,
			offset: 0,
		})
		expect(Array.isArray(salesOrders.items)).toBe(true)

		const customers = await caller.market.customers.list({
			limit: 5,
			offset: 0,
		})
		expect(Array.isArray(customers.items)).toBe(true)

		const carts = await caller.market.carts.list({
			limit: 5,
			offset: 0,
		})
		expect(Array.isArray(carts.items)).toBe(true)
	})

	test('enforces market sales-order transitions and reason requirements', async () => {
		const caller = createCaller()
		const header = db.schemas.salesHeaders.toArray()[0]
		expect(header?._id).toBeDefined()

		db.schemas.salesHeaders.update(header?._id, { status: 'PENDING_APPROVAL' })

		await expect(
			caller.market.salesOrders.transitionStatus({
				id: header?._id,
				toStatus: 'CANCELED',
			}),
		).rejects.toThrow('is not allowed')

		await expect(
			caller.market.salesOrders.transitionStatus({
				id: header?._id,
				toStatus: 'REJECTED',
			}),
		).rejects.toThrow('A reason is required')
	})

	test('supports valid cart transition', async () => {
		const caller = createCaller()
		const cart = db.schemas.carts.toArray()[0]
		expect(cart?._id).toBeDefined()

		db.schemas.carts.update(cart?._id, { status: 'OPEN' })

		const updated = await caller.market.carts.transitionStatus({
			id: cart?._id,
			toStatus: 'CHECKED_OUT',
		})

		expect(updated?.status).toBe('CHECKED_OUT')
	})
})
