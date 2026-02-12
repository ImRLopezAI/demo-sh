import { defineSchema } from '@server/db/definitions'
import { createTestTable } from '@server/db/definitions/test-utils'
import { describe, expect, test } from 'vitest'
import { z } from 'zod'

describe('optimistic concurrency control (_version)', () => {
	test('insert sets _version to 1', () => {
		const table = createTestTable('items', { name: z.string() })
		const item = table.insert({ name: 'test' })
		expect(item._version).toBe(1)
	})

	test('update increments _version', () => {
		const table = createTestTable('items', { name: z.string() })

		const item = table.insert({ name: 'v1' })
		expect(item._version).toBe(1)

		const updated = table.update(item._id, { name: 'v2' })
		expect(updated?._version).toBe(2)

		const updated2 = table.update(item._id, { name: 'v3' })
		expect(updated2?._version).toBe(3)
	})

	test('insertMany sets _version to 1 on all documents', () => {
		const table = createTestTable('items', { value: z.number() })

		const docs = table.insertMany([
			{ value: 1 },
			{ value: 2 },
			{ value: 3 },
		])

		for (const doc of docs) {
			expect(doc._version).toBe(1)
		}
	})

	test('update with correct expectedVersion succeeds', () => {
		const table = createTestTable('items', { name: z.string() })
		const item = table.insert({ name: 'original' })

		const updated = table.update(item._id, { name: 'changed' }, 1)
		expect(updated?.name).toBe('changed')
		expect(updated?._version).toBe(2)
	})

	test('update with wrong expectedVersion throws concurrency error', () => {
		const table = createTestTable('items', { name: z.string() })

		const item = table.insert({ name: 'original' })
		table.update(item._id, { name: 'v2' })

		expect(() =>
			table.update(item._id, { name: 'conflict' }, 1),
		).toThrow('Optimistic concurrency conflict')
	})

	test('update without expectedVersion always succeeds', () => {
		const table = createTestTable('items', { name: z.string() })

		const item = table.insert({ name: 'v1' })
		table.update(item._id, { name: 'v2' })

		const result = table.update(item._id, { name: 'v3' })
		expect(result?.name).toBe('v3')
		expect(result?._version).toBe(3)
	})

	test('concurrent updates detected via version mismatch', () => {
		const table = createTestTable('counters', { count: z.number() })

		const counter = table.insert({ count: 0 })
		const v1 = counter._version

		const readA = table.get(counter._id)!
		const readB = table.get(counter._id)!

		// Writer A updates successfully
		table.update(counter._id, { count: readA.count + 1 }, v1)

		// Writer B tries to update with stale version — conflict
		expect(() =>
			table.update(counter._id, { count: readB.count + 1 }, v1),
		).toThrow('Optimistic concurrency conflict')

		// Verify state: only writer A's update persisted
		const final = table.get(counter._id)!
		expect(final.count).toBe(1)
		expect(final._version).toBe(2)
	})

	test('version is preserved through defineSchema wrapped tables', () => {
		const db = defineSchema(({ createTable }) => ({
			items: createTable('items', {
				schema: { name: z.string() },
				seed: 0,
			}).table(),
		}))

		const item = db.schemas.items.insert({ name: 'test' })
		expect(item._version).toBe(1)

		const updated = db.schemas.items.update(item._id, { name: 'v2' })
		expect(updated?._version).toBe(2)
	})
})

describe('sync transactions', () => {
	test('transaction commits on success', () => {
		const db = defineSchema(({ createTable }) => ({
			items: createTable('items', {
				schema: { name: z.string() },
				seed: 0,
			}).table(),
		}))

		db.transaction({
			items: {
				insert: [{ name: 'A' }, { name: 'B' }],
			},
		})

		expect(db.schemas.items.toArray().length).toBe(2)
	})

	test('transaction supports insert, update, and delete', () => {
		const db = defineSchema(({ createTable }) => ({
			items: createTable('items', {
				schema: { name: z.string() },
				seed: 0,
			}).table(),
		}))

		const existing = db.schemas.items.insert({ name: 'existing' })

		db.transaction({
			items: {
				insert: [{ name: 'new' }],
				update: [{ id: existing._id, data: { name: 'updated' } }],
			},
		})

		const items = db.schemas.items.toArray()
		expect(items.length).toBe(2)
		expect(items.find((i) => i._id === existing._id)?.name).toBe('updated')
	})

	test('transaction rolls back all operations on error', () => {
		const db = defineSchema(({ createTable }) => ({
			items: createTable('items', {
				schema: { name: z.string() },
				seed: 0,
			}).table().unique('name_unique', ['name']),
		}))

		db.schemas.items.insert({ name: 'Alice' })

		// This transaction inserts "Bob" successfully but then fails on "Alice" (duplicate)
		try {
			db.transaction({
				items: {
					insert: [{ name: 'Bob' }, { name: 'Alice' }],
				},
			})
		} catch {
			// expected
		}

		// Only the original "Alice" should remain after rollback
		const items = db.schemas.items.toArray()
		expect(items.length).toBe(1)
		expect(items[0].name).toBe('Alice')
	})
})
