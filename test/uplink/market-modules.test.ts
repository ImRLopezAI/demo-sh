import { db } from '@server/db'
import { beforeEach, describe, expect, test } from 'vitest'
import { createCaller } from './helpers'

describe('market module', () => {
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

	test('supports sales order line creation and parent-scoped line filtering', async () => {
		const caller = createCaller()
		const customer = db.schemas.customers.toArray()[0]
		const item = db.schemas.items.toArray()[0]
		expect(customer?._id).toBeDefined()
		expect(item?._id).toBeDefined()
		const customerId = customer?._id
		const itemId = item?._id
		if (!customerId || !itemId) {
			throw new Error('Missing seeded customer or item')
		}

		const orderA = await caller.market.salesOrders.create({
			documentNo: '',
			customerId,
			documentType: 'ORDER',
			orderDate: new Date().toISOString(),
			currency: 'USD',
		})
		const orderB = await caller.market.salesOrders.create({
			documentNo: '',
			customerId,
			documentType: 'ORDER',
			orderDate: new Date().toISOString(),
			currency: 'USD',
		})
		expect(orderA.documentNo).toBeTruthy()
		expect(orderB.documentNo).toBeTruthy()

		const lineA = await caller.market.salesLines.create({
			documentNo: orderA.documentNo,
			itemId,
			quantity: 2,
			unitPrice: 50,
			discountPercent: 0,
			lineAmount: 100,
		})
		await caller.market.salesLines.create({
			documentNo: orderB.documentNo,
			itemId,
			quantity: 1,
			unitPrice: 80,
			discountPercent: 0,
			lineAmount: 80,
		})

		const scopedLines = await caller.market.salesLines.listViewRecords({
			viewId: 'overview',
			limit: 50,
			offset: 0,
			filters: { documentNo: orderA.documentNo },
		})
		expect(scopedLines.items.length).toBeGreaterThan(0)
		expect(
			scopedLines.items.every((line) => line.documentNo === orderA.documentNo),
		).toBe(true)
		expect(scopedLines.items.some((line) => line._id === lineA._id)).toBe(true)

		const orderAFresh = await caller.market.salesOrders.getById({
			id: orderA._id,
		})
		expect((orderAFresh.lineCount ?? 0) >= 1).toBe(true)
	})

	test('rejects sales/cart line create when parent references are invalid', async () => {
		const caller = createCaller()
		const item = db.schemas.items.toArray()[0]
		expect(item?._id).toBeDefined()
		if (!item?._id) {
			throw new Error('Missing seeded item')
		}

		await expect(
			caller.market.salesLines.create({
				documentNo: 'SO-NOT-FOUND',
				itemId: item._id,
				quantity: 1,
				unitPrice: 10,
				discountPercent: 0,
				lineAmount: 10,
			}),
		).rejects.toThrow('parent not found')

		await expect(
			caller.market.cartLines.create({
				cartId: 'cart-not-found',
				itemId: item._id,
				quantity: 1,
				unitPrice: 10,
				lineAmount: 10,
			}),
		).rejects.toThrow('parent not found')
	})

	test('creates sales orders with lines atomically via createWithLines', async () => {
		const caller = createCaller()
		const customer = db.schemas.customers.toArray()[0]
		const item = db.schemas.items.toArray()[0]
		expect(customer?._id).toBeDefined()
		expect(item?._id).toBeDefined()
		if (!customer?._id || !item?._id) {
			throw new Error('Missing seeded customer or item')
		}

		const result = await caller.market.salesOrders.createWithLines({
			header: {
				documentType: 'ORDER',
				customerId: customer._id,
				orderDate: new Date().toISOString(),
				currency: 'USD',
				externalRef: `atomic-${Date.now()}`,
			},
			lines: [
				{
					lineNo: 1,
					itemId: item._id,
					quantity: 2,
					unitPrice: 50,
					discountPercent: 0,
				},
				{
					lineNo: 2,
					itemId: item._id,
					quantity: 1,
					unitPrice: 75,
					discountPercent: 0,
				},
			],
		})

		expect(result.header._id).toBeDefined()
		expect(result.header.documentNo).toBeTruthy()
		expect(result.lines).toHaveLength(2)
		expect(
			result.lines.every(
				(line) => line.documentNo === result.header.documentNo,
			),
		).toBe(true)
	})

	test('supports idempotent createWithLines retries using idempotencyKey', async () => {
		const caller = createCaller()
		const customer = db.schemas.customers.toArray()[0]
		const item = db.schemas.items.toArray()[0]
		expect(customer?._id).toBeDefined()
		expect(item?._id).toBeDefined()
		if (!customer?._id || !item?._id) {
			throw new Error('Missing seeded customer or item')
		}

		const idempotencyKey = `mk-so-${Date.now()}`
		const first = await caller.market.salesOrders.createWithLines({
			header: {
				documentType: 'ORDER',
				customerId: customer._id,
				orderDate: new Date().toISOString(),
				currency: 'USD',
			},
			lines: [
				{
					lineNo: 1,
					itemId: item._id,
					quantity: 2,
					unitPrice: 50,
					discountPercent: 0,
				},
			],
			idempotencyKey,
		})
		expect(first.idempotent).toBe(false)

		const second = await caller.market.salesOrders.createWithLines({
			header: {
				documentType: 'ORDER',
				customerId: customer._id,
				orderDate: new Date().toISOString(),
				currency: 'USD',
			},
			lines: [
				{
					lineNo: 1,
					itemId: item._id,
					quantity: 2,
					unitPrice: 50,
					discountPercent: 0,
				},
			],
			idempotencyKey,
		})
		expect(second.idempotent).toBe(true)
		expect(second.header._id).toBe(first.header._id)
		expect(
			db.schemas.salesHeaders.findMany({
				where: (row) => row.idempotencyKey === idempotencyKey,
			}),
		).toHaveLength(1)
	})

	test('rolls back createWithLines when any line insert fails', async () => {
		const caller = createCaller()
		const customer = db.schemas.customers.toArray()[0]
		expect(customer?._id).toBeDefined()
		if (!customer?._id) {
			throw new Error('Missing seeded customer')
		}

		const headerCountBefore = db.schemas.salesHeaders.toArray().length
		const lineCountBefore = db.schemas.salesLines.toArray().length

		await expect(
			caller.market.salesOrders.createWithLines({
				header: {
					documentType: 'ORDER',
					customerId: customer._id,
					orderDate: new Date().toISOString(),
					currency: 'USD',
				},
				lines: [
					{
						itemId: 'missing-item',
						quantity: 1,
						unitPrice: 10,
						discountPercent: 0,
					},
				],
			}),
		).rejects.toThrow()

		expect(db.schemas.salesHeaders.toArray()).toHaveLength(headerCountBefore)
		expect(db.schemas.salesLines.toArray()).toHaveLength(lineCountBefore)
	})

	test('updates sales order header and line deltas atomically via updateWithLines', async () => {
		const caller = createCaller()
		const customer = db.schemas.customers.toArray()[0]
		const item = db.schemas.items.toArray()[0]
		expect(customer?._id).toBeDefined()
		expect(item?._id).toBeDefined()
		if (!customer?._id || !item?._id) {
			throw new Error('Missing seeded customer or item')
		}

		const created = await caller.market.salesOrders.createWithLines({
			header: {
				documentType: 'ORDER',
				customerId: customer._id,
				orderDate: new Date().toISOString(),
				currency: 'USD',
			},
			lines: [
				{
					lineNo: 1,
					itemId: item._id,
					quantity: 2,
					unitPrice: 40,
					discountPercent: 0,
				},
				{
					lineNo: 2,
					itemId: item._id,
					quantity: 1,
					unitPrice: 60,
					discountPercent: 0,
				},
			],
		})

		const firstLine = created.lines[0]
		const secondLine = created.lines[1]
		const updated = await caller.market.salesOrders.updateWithLines({
			id: created.header._id,
			header: { currency: 'EUR' },
			lineChanges: [
				{
					id: firstLine._id,
					itemId: firstLine.itemId,
					quantity: 3,
					unitPrice: 40,
					discountPercent: 0,
				},
				{
					id: secondLine._id,
					itemId: secondLine.itemId,
					quantity: secondLine.quantity,
					unitPrice: secondLine.unitPrice,
					discountPercent: secondLine.discountPercent,
					_delete: true,
				},
				{
					itemId: item._id,
					quantity: 1,
					unitPrice: 90,
					discountPercent: 0,
				},
			],
		})

		expect(updated.header.currency).toBe('EUR')
		expect(updated.lines).toHaveLength(2)
		expect(updated.lines.some((line) => line._id === secondLine._id)).toBe(
			false,
		)
		expect(
			updated.lines.some(
				(line) => line._id === firstLine._id && line.quantity === 3,
			),
		).toBe(true)
	})

	test('rejects updateWithLines when line id does not belong to the order', async () => {
		const caller = createCaller()
		const customer = db.schemas.customers.toArray()[0]
		const item = db.schemas.items.toArray()[0]
		expect(customer?._id).toBeDefined()
		expect(item?._id).toBeDefined()
		if (!customer?._id || !item?._id) {
			throw new Error('Missing seeded customer or item')
		}

		const orderA = await caller.market.salesOrders.createWithLines({
			header: {
				documentType: 'ORDER',
				customerId: customer._id,
				orderDate: new Date().toISOString(),
				currency: 'USD',
			},
			lines: [
				{
					itemId: item._id,
					quantity: 1,
					unitPrice: 25,
					discountPercent: 0,
				},
			],
		})
		const orderB = await caller.market.salesOrders.createWithLines({
			header: {
				documentType: 'ORDER',
				customerId: customer._id,
				orderDate: new Date().toISOString(),
				currency: 'USD',
			},
			lines: [
				{
					itemId: item._id,
					quantity: 1,
					unitPrice: 25,
					discountPercent: 0,
				},
			],
		})

		await expect(
			caller.market.salesOrders.updateWithLines({
				id: orderA.header._id,
				lineChanges: [
					{
						id: orderB.lines[0]._id,
						itemId: item._id,
						quantity: 2,
						unitPrice: 25,
						discountPercent: 0,
					},
				],
			}),
		).rejects.toThrow('Sales line not found for this sales order')
	})

	test('configures price rules and promotions and evaluates them on sales lines', async () => {
		const caller = createCaller()
		const customer = db.schemas.customers.toArray()[0]
		const item = db.schemas.items.toArray()[0]
		expect(customer?._id).toBeDefined()
		expect(item?._id).toBeDefined()
		if (!customer?._id || !item?._id) {
			throw new Error('Missing seeded customer or item')
		}

		await caller.market.priceRules.create({
			code: '',
			name: 'VIP Unit Price',
			active: true,
			itemId: item._id,
			customerId: customer._id,
			minQuantity: 1,
			unitPrice: 120,
			discountPercent: 5,
			currency: 'USD',
			priority: 50,
		})
		await caller.market.promotions.create({
			code: 'PROMO15',
			name: 'Promo 15',
			active: true,
			discountPercent: 10,
			stackable: true,
			usageCount: 0,
		})

		const evaluated = await caller.market.pricing.evaluateLine({
			itemId: item._id,
			quantity: 2,
			customerId: customer._id,
			promotionCode: 'PROMO15',
			channel: 'MARKET',
			currency: 'USD',
		})
		expect(evaluated.priceRuleCode).toBeTruthy()
		expect(evaluated.promotionCode).toBe('PROMO15')
		expect(evaluated.unitPrice).toBe(120)
		expect(evaluated.discountPercent).toBe(15)
		expect(evaluated.lineAmount).toBe(204)
	})

	test('resolves and persists tax policy values on created order lines', async () => {
		const caller = createCaller()
		const customer = db.schemas.customers.toArray()[0]
		const item = db.schemas.items.toArray()[0]
		expect(customer?._id).toBeDefined()
		expect(item?._id).toBeDefined()
		if (!customer?._id || !item?._id) {
			throw new Error('Missing seeded customer or item')
		}

		await caller.market.taxPolicies.create({
			code: 'TX-CA-16',
			name: 'CA Standard Tax',
			jurisdiction: 'US-CA',
			channel: 'MARKET',
			ratePercent: 16,
			active: true,
			priority: 10,
		})

		const created = await caller.market.salesOrders.createWithLines({
			header: {
				documentType: 'ORDER',
				customerId: customer._id,
				orderDate: new Date().toISOString(),
				currency: 'USD',
				taxJurisdiction: 'US-CA',
			},
			lines: [
				{
					itemId: item._id,
					quantity: 2,
					unitPrice: 100,
					discountPercent: 0,
					taxPolicyCode: 'TX-CA-16',
				},
			],
		})

		expect(created.lines).toHaveLength(1)
		expect(created.lines[0].taxPolicyCode).toBe('TX-CA-16')
		expect(Number(created.lines[0].taxRatePercent)).toBe(16)
		expect(Number(created.lines[0].taxAmount)).toBe(32)
	})

	test('creates reservations on submit and releases them on cancel', async () => {
		const caller = createCaller()
		const customer = db.schemas.customers.toArray()[0]
		const item = db.schemas.items.toArray()[0]
		expect(customer?._id).toBeDefined()
		expect(item?._id).toBeDefined()
		if (!customer?._id || !item?._id) {
			throw new Error('Missing seeded customer or item')
		}

		const created = await caller.market.salesOrders.createWithLines({
			header: {
				documentType: 'ORDER',
				customerId: customer._id,
				orderDate: new Date().toISOString(),
				currency: 'USD',
			},
			lines: [
				{
					itemId: item._id,
					quantity: 2,
					unitPrice: 50,
					discountPercent: 0,
				},
			],
		})

		const submitted = await caller.market.salesOrders.submitForApproval({
			id: created.header._id,
		})
		expect(submitted.header.status).toBe('PENDING_APPROVAL')
		expect(submitted.reservations).toHaveLength(1)
		expect(submitted.reservations[0].status).toBe('ACTIVE')

		const canceled = await caller.market.salesOrders.cancelWithRelease({
			id: created.header._id,
			reason: 'Customer canceled',
		})
		expect(canceled.header.status).toBe('CANCELED')
		expect(canceled.releasedCount).toBe(1)

		const releasedReservations = db.schemas.inventoryReservations.findMany({
			where: (row) => row.documentNo === created.header.documentNo,
		})
		expect(releasedReservations).toHaveLength(1)
		expect(releasedReservations[0].status).toBe('RELEASED')
	})

	test('supports controlled reservation release/reassignment with idempotent safety', async () => {
		const caller = createCaller({ role: 'MANAGER' })
		const customer = db.schemas.customers.toArray()[0]
		const item = db.schemas.items.toArray()[0]
		expect(customer?._id).toBeDefined()
		expect(item?._id).toBeDefined()
		if (!customer?._id || !item?._id) {
			throw new Error('Missing seeded customer or item')
		}

		const sourceOrder = await caller.market.salesOrders.createWithLines({
			header: {
				documentType: 'ORDER',
				customerId: customer._id,
				orderDate: new Date().toISOString(),
				currency: 'USD',
			},
			lines: [
				{
					itemId: item._id,
					quantity: 2,
					unitPrice: 50,
					discountPercent: 0,
				},
			],
		})
		const submitted = await caller.market.salesOrders.submitForApproval({
			id: sourceOrder.header._id,
		})
		expect(submitted.reservations).toHaveLength(1)
		const reservationId = submitted.reservations[0]._id

		const targetOrder = await caller.market.salesOrders.createWithLines({
			header: {
				documentType: 'ORDER',
				customerId: customer._id,
				orderDate: new Date().toISOString(),
				currency: 'USD',
			},
			lines: [
				{
					itemId: item._id,
					quantity: 1,
					unitPrice: 45,
					discountPercent: 0,
				},
			],
		})
		const targetLine = targetOrder.lines[0]
		expect(targetLine?._id).toBeDefined()
		if (!targetLine?._id) {
			throw new Error('Missing target sales line')
		}

		const reassigned =
			await caller.market.inventoryReservations.reassignControlled({
				id: reservationId,
				targetSalesLineId: targetLine._id,
				reason: 'Reassign stale lock to prioritized order',
			})
		expect(reassigned.idempotent).toBe(false)
		expect(reassigned.salesLineId).toBe(targetLine._id)
		expect(reassigned.documentNo).toBe(targetLine.documentNo)

		const reassignedRetry =
			await caller.market.inventoryReservations.reassignControlled({
				id: reservationId,
				targetSalesLineId: targetLine._id,
				reason: 'Retry same reassignment',
			})
		expect(reassignedRetry.idempotent).toBe(true)

		const released =
			await caller.market.inventoryReservations.releaseControlled({
				id: reservationId,
				reason: 'Manual release after order merge',
			})
		expect(released.idempotent).toBe(false)
		expect(released.status).toBe('RELEASED')

		const releasedRetry =
			await caller.market.inventoryReservations.releaseControlled({
				id: reservationId,
				reason: 'Duplicate release',
			})
		expect(releasedRetry.idempotent).toBe(true)
	})

	test('enforces oversell prevention when submitting orders for approval', async () => {
		const caller = createCaller()
		const customer = db.schemas.customers.toArray()[0]
		const item = db.schemas.items.toArray()[0]
		expect(customer?._id).toBeDefined()
		expect(item?._id).toBeDefined()
		if (!customer?._id || !item?._id) {
			throw new Error('Missing seeded customer or item')
		}

		db.schemas.items.update(item._id, { inventory: 2 })

		const orderA = await caller.market.salesOrders.createWithLines({
			header: {
				documentType: 'ORDER',
				customerId: customer._id,
				orderDate: new Date().toISOString(),
				currency: 'USD',
			},
			lines: [
				{
					itemId: item._id,
					quantity: 2,
					unitPrice: 20,
					discountPercent: 0,
				},
			],
		})
		await caller.market.salesOrders.submitForApproval({ id: orderA.header._id })

		const orderB = await caller.market.salesOrders.createWithLines({
			header: {
				documentType: 'ORDER',
				customerId: customer._id,
				orderDate: new Date().toISOString(),
				currency: 'USD',
			},
			lines: [
				{
					itemId: item._id,
					quantity: 1,
					unitPrice: 20,
					discountPercent: 0,
				},
			],
		})

		await expect(
			caller.market.salesOrders.submitForApproval({ id: orderB.header._id }),
		).rejects.toThrow('Oversell prevented')
	})

	test('aligns market pricing totals with POS math for common tax scenarios', async () => {
		const caller = createCaller()
		const item = db.schemas.items.toArray()[0]
		expect(item?._id).toBeDefined()
		if (!item?._id) {
			throw new Error('Missing seeded item')
		}

		await caller.market.taxPolicies.create({
			code: 'TX-ALL-16',
			name: 'Universal 16%',
			jurisdiction: 'US-DEFAULT',
			channel: 'ALL',
			ratePercent: 16,
			active: true,
			priority: 1,
		})

		const marketTotals = await caller.market.pricing.evaluateTotals({
			channel: 'MARKET',
			currency: 'USD',
			taxPolicyCode: 'TX-ALL-16',
			lines: [
				{
					itemId: item._id,
					quantity: 2,
					unitPrice: 100,
					discountPercent: 10,
				},
			],
		})

		const posSubtotal = 2 * 100
		const posDiscount = posSubtotal * 0.1
		const posAfterDiscount = posSubtotal - posDiscount
		const posTax = posAfterDiscount * 0.16
		const posTotal = posAfterDiscount + posTax

		expect(marketTotals.subtotal).toBeCloseTo(posAfterDiscount, 4)
		expect(marketTotals.taxAmount).toBeCloseTo(posTax, 4)
		expect(marketTotals.total).toBeCloseTo(posTotal, 4)
	})

	test('enforces promotion usage limits across create-with-lines workflows', async () => {
		const caller = createCaller()
		const customer = db.schemas.customers.toArray()[0]
		const item = db.schemas.items.toArray()[0]
		expect(customer?._id).toBeDefined()
		expect(item?._id).toBeDefined()
		if (!customer?._id || !item?._id) {
			throw new Error('Missing seeded customer or item')
		}

		await caller.market.promotions.create({
			code: 'ONEUSE',
			name: 'One Use Promo',
			active: true,
			discountPercent: 25,
			stackable: false,
			usageLimit: 1,
			usageCount: 0,
		})

		const first = await caller.market.salesOrders.createWithLines({
			header: {
				documentType: 'ORDER',
				customerId: customer._id,
				orderDate: new Date().toISOString(),
				currency: 'USD',
				promotionCode: 'ONEUSE',
			},
			lines: [
				{
					itemId: item._id,
					quantity: 1,
					unitPrice: 100,
					discountPercent: 0,
				},
			],
		})
		expect(first.lines[0].promotionCode).toBe('ONEUSE')

		await expect(
			caller.market.salesOrders.createWithLines({
				header: {
					documentType: 'ORDER',
					customerId: customer._id,
					orderDate: new Date().toISOString(),
					currency: 'USD',
					promotionCode: 'ONEUSE',
				},
				lines: [
					{
						itemId: item._id,
						quantity: 1,
						unitPrice: 100,
						discountPercent: 0,
					},
				],
			}),
		).rejects.toThrow('usage limit reached')
	})

	test('checks out carts into sales orders with idempotent retry handling', async () => {
		const caller = createCaller()
		const cart = db.schemas.carts.toArray()[0]
		expect(cart?._id).toBeDefined()
		const cartId = cart?._id
		if (!cartId) throw new Error('Missing seeded cart')

		db.schemas.carts.update(cartId, { status: 'OPEN' })
		const cartLines = db.schemas.cartLines.findMany({
			where: (row) => row.cartId === cartId,
		})
		expect(cartLines.length).toBeGreaterThan(0)

		const firstCheckout = await caller.market.carts.checkout({
			cartId,
		})
		expect(firstCheckout.cartStatus).toBe('CHECKED_OUT')
		expect(firstCheckout.idempotent).toBe(false)

		const linkedOrdersAfterFirst = db.schemas.salesHeaders.findMany({
			where: (row) => row.externalRef === `CART:${cartId}`,
		})
		expect(linkedOrdersAfterFirst).toHaveLength(1)

		const linkedOrderLines = db.schemas.salesLines.findMany({
			where: (row) => row.documentNo === linkedOrdersAfterFirst[0]?.documentNo,
		})
		expect(linkedOrderLines.length).toBe(cartLines.length)

		const secondCheckout = await caller.market.carts.checkout({
			cartId,
		})
		expect(secondCheckout.idempotent).toBe(true)
		expect(secondCheckout.orderId).toBe(firstCheckout.orderId)

		const linkedOrdersAfterSecond = db.schemas.salesHeaders.findMany({
			where: (row) => row.externalRef === `CART:${cartId}`,
		})
		expect(linkedOrdersAfterSecond).toHaveLength(1)
	})

	test('fails checkout for empty carts without creating partial sales orders', async () => {
		const caller = createCaller()
		const customer = db.schemas.customers.toArray()[0]
		expect(customer?._id).toBeDefined()
		const customerId = customer?._id
		if (!customerId) throw new Error('Missing seeded customer')

		const emptyCart = await caller.market.carts.create({
			customerId,
			currency: 'USD',
			status: 'OPEN',
		})

		await expect(
			caller.market.carts.checkout({
				cartId: emptyCart._id,
			}),
		).rejects.toThrow('Cart has no lines to checkout')

		const linkedOrders = db.schemas.salesHeaders.findMany({
			where: (row) => row.externalRef === `CART:${emptyCart._id}`,
		})
		expect(linkedOrders).toHaveLength(0)

		const cartAfterFailure = await caller.market.carts.getById({
			id: emptyCart._id,
		})
		expect(cartAfterFailure.status).toBe('OPEN')
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

	test('keeps 25-row market pagination within acceptable latency', async () => {
		const caller = createCaller()
		const maxDurationMs = 2000
		const startedAt = Date.now()
		const result = await caller.market.salesOrders.list({
			limit: 25,
			offset: 0,
		})
		const durationMs = Date.now() - startedAt

		expect(Array.isArray(result.items)).toBe(true)
		expect(result.items.length).toBeLessThanOrEqual(25)
		expect(durationMs).toBeLessThan(maxDurationMs)
	})
})
