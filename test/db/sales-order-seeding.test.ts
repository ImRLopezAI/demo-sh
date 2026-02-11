import { defineSchema } from '@server/db/definitions'
import { describe, expect, test } from 'vitest'
import { z } from 'zod'

describe('Sales Order and Items Seeding', () => {
	test('sales order schema with items relation', () => {
		const db = defineSchema(
			({ createTable }) => ({
				salesOrders: createTable('salesOrders', {
					schema: {
						orderNumber: z.string().meta({ type: 'uuid' }),
						customerName: z.string().meta({ type: 'fullname' }),
						customerEmail: z.string().meta({ type: 'email' }),
						status: z.enum([
							'pending',
							'processing',
							'shipped',
							'delivered',
							'cancelled',
						]),
						orderDate: z.string().meta({ type: 'date' }),
					},
					seed: 0,
				}).table(),
				orderItems: createTable('orderItems', {
					schema: (one) => ({
						orderId: one('salesOrders'),
						productName: z.string().meta({ type: 'productName' }),
						quantity: z.number().int().min(1),
						unitPrice: z.number().min(0),
					}),
					seed: 0,
				}).table(),
			}),
			{
				relations: (r) => ({
					salesOrders: {
						items: r.many.orderItems({
							from: r.salesOrders._id,
							to: r.orderItems.orderId,
						}),
					},
					orderItems: {
						order: r.one.salesOrders({
							from: r.orderItems.orderId,
							to: r.salesOrders._id,
						}),
					},
				}),
			},
		)

		// Create orders
		const order1 = db.schemas.salesOrders.insert({
			orderNumber: 'ORD-001',
			customerName: 'John Doe',
			customerEmail: 'john@example.com',
			status: 'processing',
			orderDate: '2024-01-15',
		})

		const order2 = db.schemas.salesOrders.insert({
			orderNumber: 'ORD-002',
			customerName: 'Jane Smith',
			customerEmail: 'jane@example.com',
			status: 'shipped',
			orderDate: '2024-01-16',
		})

		// Create items for order 1
		db.schemas.orderItems.insert({
			orderId: order1._id,
			productName: 'Laptop',
			quantity: 1,
			unitPrice: 999.99,
		})
		db.schemas.orderItems.insert({
			orderId: order1._id,
			productName: 'Mouse',
			quantity: 2,
			unitPrice: 29.99,
		})
		db.schemas.orderItems.insert({
			orderId: order1._id,
			productName: 'Keyboard',
			quantity: 1,
			unitPrice: 79.99,
		})

		// Create items for order 2
		db.schemas.orderItems.insert({
			orderId: order2._id,
			productName: 'Monitor',
			quantity: 2,
			unitPrice: 349.99,
		})

		// Test one-to-many: orders with items
		const ordersWithItems = db.schemas.salesOrders.findMany({
			with: { items: true },
		})

		expect(ordersWithItems.length).toBe(2)

		const johnOrder = ordersWithItems.find(
			(o) => o.customerName === 'John Doe',
		)!
		expect(johnOrder.items.length).toBe(3)
		expect(johnOrder.items.map((i) => i.productName).sort()).toEqual([
			'Keyboard',
			'Laptop',
			'Mouse',
		])

		const janeOrder = ordersWithItems.find(
			(o) => o.customerName === 'Jane Smith',
		)!
		expect(janeOrder.items.length).toBe(1)
		expect(janeOrder.items[0].productName).toBe('Monitor')
		expect(janeOrder.items[0].quantity).toBe(2)

		// Test many-to-one: items with order
		const itemsWithOrder = db.schemas.orderItems.findMany({
			with: { order: true },
		})

		expect(itemsWithOrder.length).toBe(4)
		for (const item of itemsWithOrder) {
			expect(item.order).not.toBeNull()
			expect(item.order._id).toBe(item.orderId)
			expect(item.order.orderNumber).toBeDefined()
		}

		// Verify laptop belongs to John's order
		const laptopItem = itemsWithOrder.find((i) => i.productName === 'Laptop')!
		expect(laptopItem.order.customerName).toBe('John Doe')
	})

	test('seeding sales orders with faker data', () => {
		const db = defineSchema(
			({ createTable }) => ({
				salesOrders: createTable('salesOrders', {
					schema: {
						orderNumber: z.string().meta({ type: 'uuid' }),
						customerName: z.string().meta({ type: 'fullname' }),
						customerEmail: z.string().meta({ type: 'email' }),
						status: z.enum([
							'pending',
							'processing',
							'shipped',
							'delivered',
							'cancelled',
						]),
						orderDate: z.string().meta({ type: 'date' }),
					},
					seed: 5, // Seed 5 orders
				}).table(),
				orderItems: createTable('orderItems', {
					schema: (one) => ({
						orderId: one('salesOrders'),
						productName: z.string().meta({ type: 'productName' }),
						quantity: z.number().int().min(1),
						unitPrice: z.number().min(0),
					}),
					seed: 15, // Seed 15 items
				}).table(),
			}),
			{
				relations: (r) => ({
					salesOrders: {
						items: r.many.orderItems({
							from: r.salesOrders._id,
							to: r.orderItems.orderId,
						}),
					},
					orderItems: {
						order: r.one.salesOrders({
							from: r.orderItems.orderId,
							to: r.salesOrders._id,
						}),
					},
				}),
			},
		)

		// Verify seeding counts
		expect(db.schemas.salesOrders.size).toBe(5)
		expect(db.schemas.orderItems.size).toBe(15)

		// Verify orders have valid faker data
		const orders = db.schemas.salesOrders.toArray()
		for (const order of orders) {
			expect(order._id).toBeDefined()
			expect(order.orderNumber).toBeDefined()
			expect(order.customerName.length).toBeGreaterThan(0)
			expect(order.customerEmail).toContain('@')
			expect([
				'pending',
				'processing',
				'shipped',
				'delivered',
				'cancelled',
			]).toContain(order.status)
		}

		// Verify items reference valid orders
		const items = db.schemas.orderItems.toArray()
		const orderIds = new Set(orders.map((o) => o._id))
		for (const item of items) {
			expect(item._id).toBeDefined()
			expect(item.productName).toBeDefined()
			expect(item.quantity).toBeGreaterThanOrEqual(1)
			expect(item.unitPrice).toBeGreaterThanOrEqual(0)
			expect(orderIds.has(item.orderId)).toBe(true)
		}

		// Verify relations work with seeded data
		const ordersWithItems = db.schemas.salesOrders.findMany({
			with: { items: true },
		})

		let totalItems = 0
		for (const order of ordersWithItems) {
			expect(Array.isArray(order.items)).toBe(true)
			totalItems += order.items.length
			for (const item of order.items) {
				expect(item._id).toBeDefined()
				expect(item.orderId).toBe(order._id)
			}
		}
		expect(totalItems).toBe(15)
	})

	test('calculating order totals from items relation', () => {
		const db = defineSchema(
			({ createTable }) => ({
				salesOrders: createTable('salesOrders', {
					schema: {
						orderNumber: z.string(),
						customerName: z.string(),
					},
					seed: 0,
				}).table(),
				orderItems: createTable('orderItems', {
					schema: (one) => ({
						orderId: one('salesOrders'),
						productName: z.string(),
						quantity: z.number(),
						unitPrice: z.number(),
					}),
					seed: 0,
				}).table(),
			}),
			{
				relations: (r) => ({
					salesOrders: {
						items: r.many.orderItems({
							from: r.salesOrders._id,
							to: r.orderItems.orderId,
						}),
					},
				}),
			},
		)

		// Create order
		const order = db.schemas.salesOrders.insert({
			orderNumber: 'ORD-100',
			customerName: 'Test Customer',
		})

		// Add items
		db.schemas.orderItems.insert({
			orderId: order._id,
			productName: 'Item A',
			quantity: 2,
			unitPrice: 10.0,
		})
		db.schemas.orderItems.insert({
			orderId: order._id,
			productName: 'Item B',
			quantity: 1,
			unitPrice: 25.0,
		})
		db.schemas.orderItems.insert({
			orderId: order._id,
			productName: 'Item C',
			quantity: 3,
			unitPrice: 5.0,
		})

		// Query with relation
		const orderWithItems = db.schemas.salesOrders.findFirst({
			with: { items: true },
		})!

		// Calculate total
		const total = orderWithItems.items.reduce(
			(sum, item) => sum + item.quantity * item.unitPrice,
			0,
		)

		// 2*10 + 1*25 + 3*5 = 20 + 25 + 15 = 60
		expect(total).toBe(60)
	})

	test('order with no items returns empty array', () => {
		const db = defineSchema(
			({ createTable }) => ({
				salesOrders: createTable('salesOrders', {
					schema: {
						orderNumber: z.string(),
						customerName: z.string(),
					},
					seed: 0,
				}).table(),
				orderItems: createTable('orderItems', {
					schema: (one) => ({
						orderId: one('salesOrders'),
						productName: z.string(),
						quantity: z.number(),
						unitPrice: z.number(),
					}),
					seed: 0,
				}).table(),
			}),
			{
				relations: (r) => ({
					salesOrders: {
						items: r.many.orderItems({
							from: r.salesOrders._id,
							to: r.orderItems.orderId,
						}),
					},
				}),
			},
		)

		// Create order with no items
		db.schemas.salesOrders.insert({
			orderNumber: 'ORD-EMPTY',
			customerName: 'No Items Customer',
		})

		const order = db.schemas.salesOrders.findFirst({
			with: { items: true },
		})!

		expect(order.items).toEqual([])
		expect(order.items.length).toBe(0)
	})

	test('inference creates inverse relation automatically', () => {
		// Only define salesOrders.items, orderItems.order should be inferred
		const db = defineSchema(
			({ createTable }) => ({
				salesOrders: createTable('salesOrders', {
					schema: {
						orderNumber: z.string(),
						customerName: z.string(),
					},
					seed: 0,
				}).table(),
				orderItems: createTable('orderItems', {
					schema: (one) => ({
						orderId: one('salesOrders'),
						productName: z.string(),
						quantity: z.number(),
						unitPrice: z.number(),
					}),
					seed: 0,
				}).table(),
			}),
			{
				relations: (r) => ({
					salesOrders: {
						items: r.many.orderItems({
							from: r.salesOrders._id,
							to: r.orderItems.orderId,
						}),
					},
					// Note: orderItems.salesOrder is NOT defined, should be inferred
				}),
			},
		)

		const order = db.schemas.salesOrders.insert({
			orderNumber: 'ORD-INF',
			customerName: 'Inference Test',
		})

		db.schemas.orderItems.insert({
			orderId: order._id,
			productName: 'Inferred Product',
			quantity: 1,
			unitPrice: 99.99,
		})

		// salesOrders.items should work (explicit)
		const ordersWithItems = db.schemas.salesOrders.findMany({
			with: { items: true },
		})
		expect(ordersWithItems[0].items.length).toBe(1)

		// orderItems.salesOrder should work (inferred - singular form)
		const itemsWithOrder = db.schemas.orderItems.findMany({
			with: { salesOrder: true },
		})
		expect(itemsWithOrder[0].salesOrder).toBeDefined()
		expect(itemsWithOrder[0].salesOrder.orderNumber).toBe('ORD-INF')
	})

	test('complex order with multiple statuses and filtering', () => {
		const db = defineSchema(
			({ createTable }) => ({
				salesOrders: createTable('salesOrders', {
					schema: {
						orderNumber: z.string(),
						customerName: z.string(),
						status: z.enum(['pending', 'completed', 'cancelled']),
					},
					seed: 0,
				}).table(),
				orderItems: createTable('orderItems', {
					schema: (one) => ({
						orderId: one('salesOrders'),
						productName: z.string(),
						quantity: z.number(),
						unitPrice: z.number(),
					}),
					seed: 0,
				}).table(),
			}),
			{
				relations: (r) => ({
					salesOrders: {
						items: r.many.orderItems({
							from: r.salesOrders._id,
							to: r.orderItems.orderId,
						}),
					},
					orderItems: {
						order: r.one.salesOrders({
							from: r.orderItems.orderId,
							to: r.salesOrders._id,
						}),
					},
				}),
			},
		)

		// Create multiple orders
		const pendingOrder = db.schemas.salesOrders.insert({
			orderNumber: 'ORD-P1',
			customerName: 'Pending Customer',
			status: 'pending',
		})

		const completedOrder = db.schemas.salesOrders.insert({
			orderNumber: 'ORD-C1',
			customerName: 'Completed Customer',
			status: 'completed',
		})

		const cancelledOrder = db.schemas.salesOrders.insert({
			orderNumber: 'ORD-X1',
			customerName: 'Cancelled Customer',
			status: 'cancelled',
		})

		// Add items to each
		db.schemas.orderItems.insert({
			orderId: pendingOrder._id,
			productName: 'Pending Item',
			quantity: 1,
			unitPrice: 10,
		})
		db.schemas.orderItems.insert({
			orderId: completedOrder._id,
			productName: 'Completed Item',
			quantity: 2,
			unitPrice: 20,
		})
		db.schemas.orderItems.insert({
			orderId: cancelledOrder._id,
			productName: 'Cancelled Item',
			quantity: 3,
			unitPrice: 30,
		})

		// Query all orders with items
		const allOrders = db.schemas.salesOrders.findMany({
			with: { items: true },
		})

		expect(allOrders.length).toBe(3)

		// Filter completed orders and verify items
		const completedOrders = allOrders.filter((o) => o.status === 'completed')
		expect(completedOrders.length).toBe(1)
		expect(completedOrders[0].items[0].productName).toBe('Completed Item')

		// Query items and verify order status through relation
		const allItems = db.schemas.orderItems.findMany({
			with: { order: true },
		})

		const pendingItems = allItems.filter((i) => i.order.status === 'pending')
		expect(pendingItems.length).toBe(1)
		expect(pendingItems[0].productName).toBe('Pending Item')
	})
})
