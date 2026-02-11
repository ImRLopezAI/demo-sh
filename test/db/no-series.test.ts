import { defineSchema } from '@server/db/definitions'
// Import manager directly for internal testing only
import { NoSeriesManager } from '@server/db/definitions/no-series'
import { beforeEach, describe, expect, it } from 'vitest'
import { z } from 'zod'

describe('NoSeriesManager', () => {
	let manager: NoSeriesManager

	beforeEach(() => {
		manager = new NoSeriesManager()
	})

	describe('pattern parsing', () => {
		it('should parse simple pattern with prefix and digits', () => {
			manager.register('users', {
				pattern: 'USER0000000001',
				field: 'code',
			})

			expect(manager.peek('users', 'code')).toBe('USER0000000001')
		})

		it('should parse pattern with dash prefix', () => {
			manager.register('invoices', {
				pattern: 'INV-00001',
				field: 'documentNo',
			})

			expect(manager.peek('invoices', 'documentNo')).toBe('INV-00001')
		})

		it('should parse pattern with complex prefix', () => {
			manager.register('configs', {
				pattern: 'CONF_X-000000000',
				field: 'configNo',
			})

			expect(manager.peek('configs', 'configNo')).toBe('CONF_X-000000000')
		})

		it('should throw for invalid pattern without digits', () => {
			expect(() => {
				manager.register('test', {
					pattern: 'INVALID',
					field: 'code',
				})
			}).toThrow('Invalid No Series pattern')
		})
	})

	describe('getNext', () => {
		it('should return formatted code and increment counter', () => {
			manager.register('users', {
				pattern: 'USER001',
				field: 'code',
			})

			expect(manager.getNext('users', 'code')).toBe('USER001')
			expect(manager.getNext('users', 'code')).toBe('USER002')
			expect(manager.getNext('users', 'code')).toBe('USER003')
		})

		it('should pad with leading zeros', () => {
			manager.register('users', {
				pattern: 'U00001',
				field: 'code',
			})

			// Get 9 more to reach 10
			for (let i = 0; i < 9; i++) {
				manager.getNext('users', 'code')
			}

			expect(manager.getNext('users', 'code')).toBe('U00010')
		})

		it('should use custom increment step', () => {
			manager.register('orders', {
				pattern: 'ORD001',
				field: 'orderNo',
				incrementBy: 10,
			})

			expect(manager.getNext('orders', 'orderNo')).toBe('ORD001')
			expect(manager.getNext('orders', 'orderNo')).toBe('ORD011')
			expect(manager.getNext('orders', 'orderNo')).toBe('ORD021')
		})

		it('should use custom initial value', () => {
			manager.register('invoices', {
				pattern: 'INV0001',
				field: 'invoiceNo',
				initialValue: 100,
			})

			expect(manager.getNext('invoices', 'invoiceNo')).toBe('INV0100')
			expect(manager.getNext('invoices', 'invoiceNo')).toBe('INV0101')
		})
	})

	describe('peek', () => {
		it('should return next value without incrementing', () => {
			manager.register('users', {
				pattern: 'USER001',
				field: 'code',
			})

			expect(manager.peek('users', 'code')).toBe('USER001')
			expect(manager.peek('users', 'code')).toBe('USER001')
			expect(manager.peek('users', 'code')).toBe('USER001')
		})
	})

	describe('reset', () => {
		it('should reset to initial value', () => {
			manager.register('users', {
				pattern: 'USER001',
				field: 'code',
			})

			manager.getNext('users', 'code') // USER001
			manager.getNext('users', 'code') // USER002
			manager.getNext('users', 'code') // USER003

			manager.reset('users', 'code')

			expect(manager.getNext('users', 'code')).toBe('USER001')
		})

		it('should reset to custom value', () => {
			manager.register('users', {
				pattern: 'USER001',
				field: 'code',
			})

			manager.reset('users', 'code', 50)

			expect(manager.getNext('users', 'code')).toBe('USER050')
		})
	})

	describe('registerMany', () => {
		it('should register single config', () => {
			manager.registerMany('users', {
				pattern: 'USER001',
				field: 'code',
			})

			expect(manager.has('users', 'code')).toBe(true)
		})

		it('should register multiple configs', () => {
			manager.registerMany('documents', [
				{ pattern: 'DOC001', field: 'docNo' },
				{ pattern: 'REF001', field: 'refNo' },
			])

			expect(manager.has('documents', 'docNo')).toBe(true)
			expect(manager.has('documents', 'refNo')).toBe(true)
		})
	})

	describe('applyToInsert', () => {
		it('should generate code for missing field', () => {
			manager.register('users', {
				pattern: 'USER001',
				field: 'code',
			})

			const item = { name: 'John' }
			const result = manager.applyToInsert('users', item)

			expect(result).toEqual({ name: 'John', code: 'USER001' })
		})

		it('should not override existing field value', () => {
			manager.register('users', {
				pattern: 'USER001',
				field: 'code',
			})

			const item = { name: 'John', code: 'CUSTOM123' }
			const result = manager.applyToInsert('users', item)

			expect(result).toEqual({ name: 'John', code: 'CUSTOM123' })
		})

		it('should generate for null or empty values', () => {
			manager.register('users', {
				pattern: 'USER001',
				field: 'code',
			})

			expect(
				manager.applyToInsert('users', { name: 'A', code: null }).code,
			).toBe('USER001')
			expect(manager.applyToInsert('users', { name: 'B', code: '' }).code).toBe(
				'USER002',
			)
			expect(
				manager.applyToInsert('users', { name: 'C', code: undefined }).code,
			).toBe('USER003')
		})

		it('should handle multiple series fields', () => {
			manager.registerMany('documents', [
				{ pattern: 'DOC001', field: 'docNo' },
				{ pattern: 'REF001', field: 'refNo' },
			])

			const item = { title: 'Test' }
			const result = manager.applyToInsert('documents', item)

			expect(result).toEqual({
				title: 'Test',
				docNo: 'DOC001',
				refNo: 'REF001',
			})
		})
	})

	describe('exportState / importState', () => {
		it('should export and import state', () => {
			manager.register('users', { pattern: 'USER001', field: 'code' })
			manager.register('orders', { pattern: 'ORD001', field: 'orderNo' })

			manager.getNext('users', 'code') // USER001
			manager.getNext('users', 'code') // USER002
			manager.getNext('orders', 'orderNo') // ORD001

			const state = manager.exportState()
			expect(state).toEqual({
				'users:code': 3,
				'orders:orderNo': 2,
			})

			// Create new manager and import state
			const newManager = new NoSeriesManager()
			newManager.register('users', { pattern: 'USER001', field: 'code' })
			newManager.register('orders', { pattern: 'ORD001', field: 'orderNo' })
			newManager.importState(state)

			expect(newManager.getNext('users', 'code')).toBe('USER003')
			expect(newManager.getNext('orders', 'orderNo')).toBe('ORD002')
		})
	})
})

describe('defineSchema with noSeries', () => {
	it('should auto-generate codes on insert', () => {
		const db = defineSchema(({ createTable }) => ({
			users: createTable('users', {
				schema: {
					name: z.string(),
					code: z.string(),
				},
				seed: false,
				noSeries: {
					pattern: 'USER0000000001',
					field: 'code',
				},
			}).table(),
		}))

		const user1 = db.schemas.users.insert({ name: 'John' } as {
			name: string
			code: string
		})
		expect(user1.code).toBe('USER0000000001')

		const user2 = db.schemas.users.insert({ name: 'Jane' } as {
			name: string
			code: string
		})
		expect(user2.code).toBe('USER0000000002')
	})

	it('should not override provided codes', () => {
		const db = defineSchema(({ createTable }) => ({
			users: createTable('users', {
				schema: {
					name: z.string(),
					code: z.string(),
				},
				seed: false,
				noSeries: {
					pattern: 'USER001',
					field: 'code',
				},
			}).table(),
		}))

		const user = db.schemas.users.insert({ name: 'John', code: 'CUSTOM123' })
		expect(user.code).toBe('CUSTOM123')
	})

	it('should support multiple series per table', () => {
		const db = defineSchema(({ createTable }) => ({
			documents: createTable('documents', {
				schema: {
					title: z.string(),
					docNo: z.string(),
					refNo: z.string(),
				},
				seed: false,
				noSeries: [
					{ pattern: 'DOC-0001', field: 'docNo' },
					{ pattern: 'REF-0001', field: 'refNo' },
				],
			}).table(),
		}))

		const doc = db.schemas.documents.insert({ title: 'Test' } as {
			title: string
			docNo: string
			refNo: string
		})
		expect(doc.docNo).toBe('DOC-0001')
		expect(doc.refNo).toBe('REF-0001')
	})

	it('should expose noSeries via _internals API', () => {
		const db = defineSchema(({ createTable }) => ({
			users: createTable('users', {
				schema: {
					name: z.string(),
					code: z.string(),
				},
				seed: false,
				noSeries: {
					pattern: 'USER001',
					field: 'code',
				},
			}).table(),
		}))

		// V2 API uses code-based access (tableName:fieldName format)
		// Peek at next value
		expect(db._internals.noSeries.peek('users:code')).toBe('USER001')
		expect(db._internals.noSeries.peek('users:code')).toBe('USER001') // unchanged

		// Get next value
		expect(db._internals.noSeries.getNext('users:code')).toBe('USER001')
		expect(db._internals.noSeries.getNext('users:code')).toBe('USER002')

		// Get current
		expect(db._internals.noSeries.getCurrent('users:code')).toBe(3)

		// Reset
		db._internals.noSeries.reset('users:code')
		expect(db._internals.noSeries.peek('users:code')).toBe('USER001')

		// Set value
		db._internals.noSeries.setValue('users:code', 100)
		expect(db._internals.noSeries.getNext('users:code')).toBe('USER100')
	})

	it('should work with insertMany', () => {
		const db = defineSchema(({ createTable }) => ({
			items: createTable('items', {
				schema: {
					name: z.string(),
					sku: z.string(),
				},
				seed: false,
				noSeries: {
					pattern: 'SKU00001',
					field: 'sku',
				},
			}).table(),
		}))

		const items = db.schemas.items.batch.insertMany([
			{ name: 'Item A' },
			{ name: 'Item B' },
			{ name: 'Item C' },
		] as Array<{ name: string; sku: string }>)

		expect(items[0].sku).toBe('SKU00001')
		expect(items[1].sku).toBe('SKU00002')
		expect(items[2].sku).toBe('SKU00003')
	})

	it('should work with computed fields', () => {
		const db = defineSchema(({ createTable }) => ({
			products: createTable('products', {
				schema: {
					name: z.string(),
					code: z.string(),
					price: z.number(),
					quantity: z.number(),
				},
				seed: false,
				noSeries: {
					pattern: 'PROD001',
					field: 'code',
				},
			})
				.table()
				.computed((row) => ({
					total: row.price * row.quantity,
				})),
		}))

		const product = db.schemas.products.insert({
			name: 'Widget',
			price: 10,
			quantity: 5,
		} as { name: string; code: string; price: number; quantity: number })

		expect(product.code).toBe('PROD001')
		expect(product.total).toBe(50)
	})

	it('should export and import state via _internals', () => {
		const db = defineSchema(({ createTable }) => ({
			users: createTable('users', {
				schema: { name: z.string(), code: z.string() },
				seed: false,
				noSeries: { pattern: 'USER001', field: 'code' },
			}).table(),
		}))

		// Insert some users
		db.schemas.users.insert({ name: 'A' } as { name: string; code: string })
		db.schemas.users.insert({ name: 'B' } as { name: string; code: string })

		// Export state via _internals
		const state = db._internals.noSeries.exportState()
		expect(state['users:code']).toBe(3)

		// Import into a new schema
		const db2 = defineSchema(({ createTable }) => ({
			users: createTable('users', {
				schema: { name: z.string(), code: z.string() },
				seed: false,
				noSeries: { pattern: 'USER001', field: 'code' },
			}).table(),
		}))

		db2._internals.noSeries.importState(state)
		expect(db2._internals.noSeries.getNext('users:code')).toBe('USER003')
	})
})

// ============================================================================
// V2 API Tests - _internals.noSeries
// ============================================================================

describe('defineSchema with _internals (V2 API)', () => {
	it('should expose noSeries via _internals', () => {
		const db = defineSchema(({ createTable }) => ({
			users: createTable('users', {
				schema: {
					name: z.string(),
					code: z.string(),
				},
				seed: false,
				noSeries: {
					pattern: 'USER001',
					field: 'code',
				},
			}).table(),
		}))

		// V2 API uses code-based access (tableName:fieldName format)
		expect(db._internals.noSeries.peek('users:code')).toBe('USER001')
		expect(db._internals.noSeries.getNext('users:code')).toBe('USER001')
		expect(db._internals.noSeries.getNext('users:code')).toBe('USER002')
	})

	it('should expose relations via _internals', () => {
		const db = defineSchema(
			({ createTable }) => ({
				users: createTable('users', {
					schema: { name: z.string() },
				}).table(),
				posts: createTable('posts', {
					schema: (one) => ({
						title: z.string(),
						authorId: one('users'),
					}),
				}).table(),
			}),
			{
				relations: (r) => ({
					posts: {
						author: r.one.users({ from: r.posts.authorId, to: r.users._id }),
					},
				}),
			},
		)

		// Relations available via _internals
		expect(db._internals.relations).toBeDefined()
		expect(db._internals.relations.posts).toBeDefined()
	})

	it('should support V2 noSeries API methods', () => {
		const db = defineSchema(({ createTable }) => ({
			invoices: createTable('invoices', {
				schema: {
					title: z.string(),
					invoiceNo: z.string(),
				},
				seed: false,
				noSeries: {
					pattern: 'INV-00001',
					field: 'invoiceNo',
				},
			}).table(),
		}))

		const api = db._internals.noSeries

		// has() - check if series exists
		expect(api.has('invoices:invoiceNo')).toBe(true)
		expect(api.has('nonexistent')).toBe(false)

		// get() - get series record
		const record = api.get('invoices:invoiceNo')
		expect(record).toBeDefined()
		expect(record?.code).toBe('invoices:invoiceNo')
		expect(record?.pattern).toBe('INV-00001')
		expect(record?.next).toBe(1)
		expect(record?.incrementBy).toBe(1)
		expect(record?.active).toBe(true)

		// getAll() - get all series
		const all = api.getAll()
		expect(all.length).toBe(1)
		expect(all[0].code).toBe('invoices:invoiceNo')

		// getCurrent() - get current counter value
		expect(api.getCurrent('invoices:invoiceNo')).toBe(1)

		// getNext() - increment and get
		expect(api.getNext('invoices:invoiceNo')).toBe('INV-00001')
		expect(api.getCurrent('invoices:invoiceNo')).toBe(2)

		// setValue() - set counter value
		api.setValue('invoices:invoiceNo', 100)
		expect(api.getNext('invoices:invoiceNo')).toBe('INV-00100')

		// reset() - reset to initial value
		api.reset('invoices:invoiceNo')
		expect(api.peek('invoices:invoiceNo')).toBe('INV-00001')
	})

	it('should support upsert for creating new series', () => {
		const db = defineSchema(({ createTable }) => ({
			orders: createTable('orders', {
				schema: { name: z.string() },
			}).table(),
		}))

		const api = db._internals.noSeries

		// Create a new series via upsert
		const record = api.upsert({
			code: 'order_number',
			description: 'Order numbers',
			pattern: 'ORD-000001',
			initialValue: 1,
			incrementBy: 1,
		})

		expect(record.code).toBe('order_number')
		expect(record.description).toBe('Order numbers')
		expect(record.pattern).toBe('ORD-000001')
		expect(record.next).toBe(1)

		// Use the new series
		expect(api.getNext('order_number')).toBe('ORD-000001')
		expect(api.getNext('order_number')).toBe('ORD-000002')
	})

	it('should export and import state via _internals', () => {
		const db = defineSchema(({ createTable }) => ({
			users: createTable('users', {
				schema: { name: z.string(), code: z.string() },
				seed: false,
				noSeries: { pattern: 'USER001', field: 'code' },
			}).table(),
		}))

		// Use the series
		db._internals.noSeries.getNext('users:code') // USER001
		db._internals.noSeries.getNext('users:code') // USER002

		// Export state
		const state = db._internals.noSeries.exportState()
		expect(state['users:code']).toBe(3)

		// Import into a new schema
		const db2 = defineSchema(({ createTable }) => ({
			users: createTable('users', {
				schema: { name: z.string(), code: z.string() },
				seed: false,
				noSeries: { pattern: 'USER001', field: 'code' },
			}).table(),
		}))

		db2._internals.noSeries.importState(state)
		expect(db2._internals.noSeries.getNext('users:code')).toBe('USER003')
	})
})

// ============================================================================
// Placeholder Pattern Tests (e.g., 'PUR-{YYYY}-{MM}-####')
// ============================================================================

describe('NoSeriesManager placeholder patterns', () => {
	let manager: NoSeriesManager

	beforeEach(() => {
		manager = new NoSeriesManager()
	})

	describe('pattern parsing', () => {
		it('should parse pattern with date placeholders and hash sequence', () => {
			manager.register('purchases', {
				pattern: 'PUR-{YYYY}-{MM}-####',
				field: 'documentNo',
			})

			const value = manager.peek('purchases', 'documentNo')
			// Should match format like 'PUR-2026-01-0001'
			expect(value).toMatch(/^PUR-\d{4}-\d{2}-0001$/)
		})

		it('should parse pattern with only hash sequence (no date)', () => {
			manager.register('items', {
				pattern: 'ITEM-####',
				field: 'code',
			})

			expect(manager.peek('items', 'code')).toBe('ITEM-0001')
		})

		it('should parse pattern with multiple date placeholders', () => {
			manager.register('reports', {
				pattern: '{YYYY}{MM}{DD}-####',
				field: 'reportNo',
			})

			const value = manager.peek('reports', 'reportNo')
			// Should match format like '20260121-0001'
			expect(value).toMatch(/^\d{8}-0001$/)
		})

		it('should support {YY} two-digit year placeholder', () => {
			manager.register('short', {
				pattern: 'S{YY}-###',
				field: 'code',
			})

			const value = manager.peek('short', 'code')
			// Should match format like 'S26-001'
			expect(value).toMatch(/^S\d{2}-001$/)
		})

		it('should support {Q} quarter placeholder', () => {
			manager.register('quarterly', {
				pattern: 'Q{Q}-{YYYY}-####',
				field: 'quarterNo',
			})

			const value = manager.peek('quarterly', 'quarterNo')
			// Should match format like 'Q1-2026-0001'
			expect(value).toMatch(/^Q[1-4]-\d{4}-0001$/)
		})

		it('should support {WW} week number placeholder', () => {
			manager.register('weekly', {
				pattern: 'WK{WW}-####',
				field: 'weekNo',
			})

			const value = manager.peek('weekly', 'weekNo')
			// Should match format like 'WK03-0001'
			expect(value).toMatch(/^WK\d{2}-0001$/)
		})

		it('should throw for pattern without hash sequence or digit suffix', () => {
			expect(() => {
				manager.register('invalid', {
					pattern: 'PUR-{YYYY}-{MM}-ABC',
					field: 'code',
				})
			}).toThrow('Pattern must contain sequential digits')
		})
	})

	describe('getNext with placeholders', () => {
		it('should increment counter correctly', () => {
			manager.register('orders', {
				pattern: 'ORD-{YYYY}-####',
				field: 'orderNo',
			})

			const first = manager.getNext('orders', 'orderNo')
			const second = manager.getNext('orders', 'orderNo')
			const third = manager.getNext('orders', 'orderNo')

			expect(first).toMatch(/^ORD-\d{4}-0001$/)
			expect(second).toMatch(/^ORD-\d{4}-0002$/)
			expect(third).toMatch(/^ORD-\d{4}-0003$/)
		})

		it('should respect digit count from hash sequence', () => {
			manager.register('big', {
				pattern: 'BIG-########',
				field: 'code',
			})

			expect(manager.getNext('big', 'code')).toBe('BIG-00000001')

			// Increment many times
			for (let i = 0; i < 99; i++) {
				manager.getNext('big', 'code')
			}

			expect(manager.getNext('big', 'code')).toBe('BIG-00000101')
		})
	})

	describe('reset with placeholders', () => {
		it('should reset to initial value', () => {
			manager.register('docs', {
				pattern: 'DOC-{YYYY}-####',
				field: 'docNo',
			})

			manager.getNext('docs', 'docNo') // 0001
			manager.getNext('docs', 'docNo') // 0002
			manager.getNext('docs', 'docNo') // 0003

			manager.reset('docs', 'docNo')

			const value = manager.getNext('docs', 'docNo')
			expect(value).toMatch(/^DOC-\d{4}-0001$/)
		})

		it('should reset to custom value', () => {
			manager.register('invoices', {
				pattern: 'INV-{YYYY}{MM}-####',
				field: 'invoiceNo',
			})

			manager.reset('invoices', 'invoiceNo', 500)

			const value = manager.getNext('invoices', 'invoiceNo')
			expect(value).toMatch(/^INV-\d{6}-0500$/)
		})
	})

	describe('applyToInsert with placeholders', () => {
		it('should generate code for missing field', () => {
			manager.register('purchases', {
				pattern: 'PUR-{YYYY}-{MM}-####',
				field: 'documentNo',
			})

			const item = { vendorId: 'V001', total: 100 }
			const result = manager.applyToInsert('purchases', item) as any

			expect(result.vendorId).toBe('V001')
			expect(result.total).toBe(100)
			expect(result.documentNo).toMatch(/^PUR-\d{4}-\d{2}-0001$/)
		})
	})
})

describe('NoSeriesV2Manager placeholder patterns', () => {
	let manager: import('../../src/server/db/definitions/no-series').NoSeriesV2Manager

	beforeEach(async () => {
		const { NoSeriesV2Manager } = await import(
			'../../src/server/db/definitions/no-series'
		)
		manager = new NoSeriesV2Manager()
	})

	it('should support placeholder patterns', () => {
		manager.register({
			code: 'purchase_orders',
			pattern: 'PO-{YYYY}-{MM}-####',
			description: 'Purchase Order numbers',
		})

		const first = manager.getNext('purchase_orders')
		const second = manager.getNext('purchase_orders')

		expect(first).toMatch(/^PO-\d{4}-\d{2}-0001$/)
		expect(second).toMatch(/^PO-\d{4}-\d{2}-0002$/)
	})

	it('should track lastUsed correctly with placeholders', () => {
		manager.register({
			code: 'test_placeholder',
			pattern: 'TST-####',
		})

		const before = manager.get('test_placeholder')!
		expect(before.lastUsed).toBe(0)
		expect(before.next).toBe(1)

		manager.getNext('test_placeholder')

		const after = manager.get('test_placeholder')!
		expect(after.lastUsed).toBe(1)
		expect(after.next).toBe(2)
	})
})

describe('NoSeriesV2Manager', () => {
	// Import V2 manager directly for testing
	let manager: import('../../src/server/db/definitions/no-series').NoSeriesV2Manager

	beforeEach(async () => {
		const { NoSeriesV2Manager } = await import(
			'../../src/server/db/definitions/no-series'
		)
		manager = new NoSeriesV2Manager()
	})

	it('should register and use series', () => {
		manager.register({
			code: 'test_series',
			pattern: 'TEST001',
		})

		expect(manager.has('test_series')).toBe(true)
		expect(manager.peek('test_series')).toBe('TEST001')
		expect(manager.getNext('test_series')).toBe('TEST001')
		expect(manager.getNext('test_series')).toBe('TEST002')
	})

	it('should support custom increment', () => {
		manager.register({
			code: 'skipping_series',
			pattern: 'SKIP001',
			incrementBy: 10,
		})

		expect(manager.getNext('skipping_series')).toBe('SKIP001')
		expect(manager.getNext('skipping_series')).toBe('SKIP011')
		expect(manager.getNext('skipping_series')).toBe('SKIP021')
	})

	it('should support end value control', () => {
		manager.register({
			code: 'limited_series',
			pattern: 'LIM01',
			endAt: 3,
		})

		expect(manager.getNext('limited_series')).toBe('LIM01')
		expect(manager.getNext('limited_series')).toBe('LIM02')
		expect(manager.getNext('limited_series')).toBe('LIM03')
		expect(() => manager.getNext('limited_series')).toThrow(
			'reached its end value',
		)
	})

	it('should track lastUsed and updatedAt', () => {
		manager.register({
			code: 'tracked_series',
			pattern: 'TRK001',
		})

		const before = manager.get('tracked_series')!
		expect(before.lastUsed).toBe(0)

		manager.getNext('tracked_series')

		const after = manager.get('tracked_series')!
		expect(after.lastUsed).toBe(1)
		expect(after.next).toBe(2)
	})

	it('should upsert existing series', () => {
		manager.register({
			code: 'updatable',
			pattern: 'OLD001',
			description: 'Old description',
		})

		// Update via upsert
		manager.upsert({
			code: 'updatable',
			pattern: 'NEW001',
			description: 'New description',
		})

		const record = manager.get('updatable')!
		expect(record.pattern).toBe('NEW001')
		expect(record.description).toBe('New description')
		// Next value should be preserved
		expect(record.next).toBe(1)
	})
})
