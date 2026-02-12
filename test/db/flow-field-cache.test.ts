import { FlowFieldCache } from '@server/db/definitions/fields/flow-field-cache'
import { defineSchema } from '@server/db/definitions'
import { describe, expect, test } from 'vitest'
import { z } from 'zod'

describe('FlowFieldCache', () => {
	test('get returns miss for uncached values', () => {
		const cache = new FlowFieldCache()
		const result = cache.get('doc1', 'field1')
		expect(result.hit).toBe(false)
		expect(result.value).toBeUndefined()
	})

	test('set and get round-trip', () => {
		const cache = new FlowFieldCache()
		cache.set('doc1', 'totalAmount', 42)

		const result = cache.get('doc1', 'totalAmount')
		expect(result.hit).toBe(true)
		expect(result.value).toBe(42)
	})

	test('different docs have independent caches', () => {
		const cache = new FlowFieldCache()
		cache.set('doc1', 'count', 10)
		cache.set('doc2', 'count', 20)

		expect(cache.get('doc1', 'count').value).toBe(10)
		expect(cache.get('doc2', 'count').value).toBe(20)
	})

	test('different fields on same doc are independent', () => {
		const cache = new FlowFieldCache()
		cache.set('doc1', 'sum', 100)
		cache.set('doc1', 'avg', 50)

		expect(cache.get('doc1', 'sum').value).toBe(100)
		expect(cache.get('doc1', 'avg').value).toBe(50)
	})

	test('invalidateDoc clears all fields for a doc', () => {
		const cache = new FlowFieldCache()
		cache.set('doc1', 'a', 1)
		cache.set('doc1', 'b', 2)
		cache.set('doc2', 'a', 3)

		cache.invalidateDoc('doc1')

		expect(cache.get('doc1', 'a').hit).toBe(false)
		expect(cache.get('doc1', 'b').hit).toBe(false)
		expect(cache.get('doc2', 'a').hit).toBe(true)
	})

	test('invalidateAll clears everything', () => {
		const cache = new FlowFieldCache()
		cache.set('doc1', 'a', 1)
		cache.set('doc2', 'b', 2)

		cache.invalidateAll()

		expect(cache.get('doc1', 'a').hit).toBe(false)
		expect(cache.get('doc2', 'b').hit).toBe(false)
	})

	test('invalidateBySource clears caches for dependent tables', () => {
		const cache = new FlowFieldCache()

		// Register: orders table has a flow field sourced from orderLines
		const flowFieldDefs = new Map<string, Map<string, any>>()
		flowFieldDefs.set(
			'orders',
			new Map([
				[
					'lineCount',
					{
						source: 'orderLines',
						type: 'count',
						key: 'orderId',
					},
				],
			]),
		)
		cache.registerFlowFields(flowFieldDefs)

		cache.set('order1', 'lineCount', 5)
		expect(cache.get('order1', 'lineCount').hit).toBe(true)

		// Invalidate by source table
		cache.invalidateBySource('orderLines')
		expect(cache.get('order1', 'lineCount').hit).toBe(false)
	})

	test('invalidateBySource does nothing for unregistered tables', () => {
		const cache = new FlowFieldCache()
		cache.set('doc1', 'field1', 42)

		cache.invalidateBySource('unrelated')
		expect(cache.get('doc1', 'field1').hit).toBe(true)
	})

	test('caches zero and falsy values correctly', () => {
		const cache = new FlowFieldCache()
		cache.set('doc1', 'count', 0)
		cache.set('doc1', 'label', '')
		cache.set('doc1', 'flag', false)
		cache.set('doc1', 'nothing', null)

		expect(cache.get('doc1', 'count')).toEqual({ value: 0, hit: true })
		expect(cache.get('doc1', 'label')).toEqual({ value: '', hit: true })
		expect(cache.get('doc1', 'flag')).toEqual({ value: false, hit: true })
		expect(cache.get('doc1', 'nothing')).toEqual({ value: null, hit: true })
	})

	test('invalidateTable also invalidates dependents', () => {
		const cache = new FlowFieldCache()

		const flowFieldDefs = new Map<string, Map<string, any>>()
		flowFieldDefs.set(
			'orders',
			new Map([['lineCount', { source: 'lines', type: 'count', key: 'orderId' }]]),
		)
		cache.registerFlowFields(flowFieldDefs)

		cache.set('order1', 'lineCount', 3)
		expect(cache.get('order1', 'lineCount').hit).toBe(true)

		// invalidateTable on the source table invalidates dependent caches
		cache.invalidateTable('lines')
		expect(cache.get('order1', 'lineCount').hit).toBe(false)
	})
})

describe('FlowField caching integration', () => {
	test('flow fields recalculate after source mutation', () => {
		const db = defineSchema(({ createTable }) => {
			const orders = createTable('orders', {
				schema: () => ({
					customerName: z.string(),
					lineCount: z.number().optional().meta({
						flowField: {
							type: 'count',
							source: 'orderLines',
							key: 'orderId',
						},
					}),
				}),
				seed: 0,
			})

			const orderLines = createTable('orderLines', {
				schema: (one) => ({
					orderId: one('orders'),
					product: z.string(),
					qty: z.number(),
				}),
				seed: 0,
			})

			return {
				orders: orders.table(),
				orderLines: orderLines.table(),
			}
		})

		const order = db.schemas.orders.insert({ customerName: 'Alice' })

		// Initially 0 lines
		const orderData = db.schemas.orders.findFirst({
			where: (o) => o._id === order._id,
		})
		expect(orderData?.lineCount).toBe(0)

		// Add lines
		db.schemas.orderLines.insert({
			orderId: order._id,
			product: 'Widget',
			qty: 2,
		})
		db.schemas.orderLines.insert({
			orderId: order._id,
			product: 'Gadget',
			qty: 1,
		})

		// After adding lines, count should update
		const updatedOrder = db.schemas.orders.findFirst({
			where: (o) => o._id === order._id,
		})
		expect(updatedOrder?.lineCount).toBe(2)
	})

	test('flow field sum recalculates after mutations', () => {
		const db = defineSchema(({ createTable }) => {
			const invoices = createTable('invoices', {
				schema: () => ({
					customer: z.string(),
					total: z.number().optional().meta({
						flowField: {
							type: 'sum',
							source: 'invoiceLines',
							field: 'amount',
							key: 'invoiceId',
						},
					}),
				}),
				seed: 0,
			})

			const invoiceLines = createTable('invoiceLines', {
				schema: (one) => ({
					invoiceId: one('invoices'),
					amount: z.number(),
				}),
				seed: 0,
			})

			return {
				invoices: invoices.table(),
				invoiceLines: invoiceLines.table(),
			}
		})

		const invoice = db.schemas.invoices.insert({ customer: 'Bob' })

		db.schemas.invoiceLines.insert({ invoiceId: invoice._id, amount: 100 })
		db.schemas.invoiceLines.insert({ invoiceId: invoice._id, amount: 250 })

		const result = db.schemas.invoices.findFirst({
			where: (i) => i._id === invoice._id,
		})
		expect(result?.total).toBe(350)
	})
})
