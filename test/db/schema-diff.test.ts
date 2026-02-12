import { defineSchema } from '@server/db/definitions'
import {
	createAdapterVersionStorage,
	createPersistentMigrationRunner,
	defineMigration,
	diffSchemas,
	generateMigration,
} from '@server/db/definitions/migrations'
import type { SchemaSnapshot } from '@server/db/definitions/migrations'
import { createMemoryAdapter } from '@server/db/definitions/adapters/memory'
import { createTestTable } from '@server/db/definitions/test-utils'
import { describe, expect, test } from 'vitest'
import { z } from 'zod'

describe('schema diffing', () => {
	test('detects table additions', () => {
		const oldSnapshot: SchemaSnapshot = {
			tables: {
				users: { name: 'users', fields: [], indexes: [], uniqueConstraints: [] },
			},
			createdAt: 1,
		}

		const newSnapshot: SchemaSnapshot = {
			tables: {
				users: { name: 'users', fields: [], indexes: [], uniqueConstraints: [] },
				posts: { name: 'posts', fields: [], indexes: [], uniqueConstraints: [] },
			},
			createdAt: 2,
		}

		const diffs = diffSchemas(oldSnapshot, newSnapshot)
		expect(diffs).toContainEqual({ type: 'table_added', tableName: 'posts' })
	})

	test('detects table removals', () => {
		const oldSnapshot: SchemaSnapshot = {
			tables: {
				users: { name: 'users', fields: [], indexes: [], uniqueConstraints: [] },
				posts: { name: 'posts', fields: [], indexes: [], uniqueConstraints: [] },
			},
			createdAt: 1,
		}

		const newSnapshot: SchemaSnapshot = {
			tables: {
				users: { name: 'users', fields: [], indexes: [], uniqueConstraints: [] },
			},
			createdAt: 2,
		}

		const diffs = diffSchemas(oldSnapshot, newSnapshot)
		expect(diffs).toContainEqual({ type: 'table_removed', tableName: 'posts' })
	})

	test('detects field additions', () => {
		const oldSnapshot: SchemaSnapshot = {
			tables: {
				users: {
					name: 'users',
					fields: [
						{ name: 'name', type: 'string', isOptional: false, isFlowField: false, isAutoIncrement: false },
					],
					indexes: [],
					uniqueConstraints: [],
				},
			},
			createdAt: 1,
		}

		const newSnapshot: SchemaSnapshot = {
			tables: {
				users: {
					name: 'users',
					fields: [
						{ name: 'name', type: 'string', isOptional: false, isFlowField: false, isAutoIncrement: false },
						{ name: 'email', type: 'string', isOptional: false, isFlowField: false, isAutoIncrement: false },
					],
					indexes: [],
					uniqueConstraints: [],
				},
			},
			createdAt: 2,
		}

		const diffs = diffSchemas(oldSnapshot, newSnapshot)
		expect(diffs).toContainEqual(
			expect.objectContaining({ type: 'field_added', tableName: 'users', fieldName: 'email' }),
		)
	})

	test('detects field removals', () => {
		const oldSnapshot: SchemaSnapshot = {
			tables: {
				users: {
					name: 'users',
					fields: [
						{ name: 'name', type: 'string', isOptional: false, isFlowField: false, isAutoIncrement: false },
						{ name: 'age', type: 'number', isOptional: false, isFlowField: false, isAutoIncrement: false },
					],
					indexes: [],
					uniqueConstraints: [],
				},
			},
			createdAt: 1,
		}

		const newSnapshot: SchemaSnapshot = {
			tables: {
				users: {
					name: 'users',
					fields: [
						{ name: 'name', type: 'string', isOptional: false, isFlowField: false, isAutoIncrement: false },
					],
					indexes: [],
					uniqueConstraints: [],
				},
			},
			createdAt: 2,
		}

		const diffs = diffSchemas(oldSnapshot, newSnapshot)
		expect(diffs).toContainEqual(
			expect.objectContaining({ type: 'field_removed', tableName: 'users', fieldName: 'age' }),
		)
	})

	test('detects field type changes', () => {
		const oldSnapshot: SchemaSnapshot = {
			tables: {
				items: {
					name: 'items',
					fields: [
						{ name: 'price', type: 'string', isOptional: false, isFlowField: false, isAutoIncrement: false },
					],
					indexes: [],
					uniqueConstraints: [],
				},
			},
			createdAt: 1,
		}

		const newSnapshot: SchemaSnapshot = {
			tables: {
				items: {
					name: 'items',
					fields: [
						{ name: 'price', type: 'number', isOptional: false, isFlowField: false, isAutoIncrement: false },
					],
					indexes: [],
					uniqueConstraints: [],
				},
			},
			createdAt: 2,
		}

		const diffs = diffSchemas(oldSnapshot, newSnapshot)
		expect(diffs).toContainEqual(
			expect.objectContaining({
				type: 'field_type_changed',
				tableName: 'items',
				fieldName: 'price',
				oldValue: 'string',
				newValue: 'number',
			}),
		)
	})

	test('detects index additions and removals', () => {
		const oldSnapshot: SchemaSnapshot = {
			tables: {
				items: {
					name: 'items',
					fields: [],
					indexes: [{ name: 'idx_old', fields: ['a'] }],
					uniqueConstraints: [],
				},
			},
			createdAt: 1,
		}

		const newSnapshot: SchemaSnapshot = {
			tables: {
				items: {
					name: 'items',
					fields: [],
					indexes: [{ name: 'idx_new', fields: ['b'] }],
					uniqueConstraints: [],
				},
			},
			createdAt: 2,
		}

		const diffs = diffSchemas(oldSnapshot, newSnapshot)
		expect(diffs).toContainEqual({ type: 'index_added', tableName: 'items', indexName: 'idx_new' })
		expect(diffs).toContainEqual({ type: 'index_removed', tableName: 'items', indexName: 'idx_old' })
	})

	test('detects no changes for identical snapshots', () => {
		const snapshot: SchemaSnapshot = {
			tables: {
				users: {
					name: 'users',
					fields: [
						{ name: 'name', type: 'string', isOptional: false, isFlowField: false, isAutoIncrement: false },
					],
					indexes: [{ name: 'idx_name', fields: ['name'] }],
					uniqueConstraints: [],
				},
			},
			createdAt: 1,
		}

		const diffs = diffSchemas(snapshot, snapshot)
		expect(diffs).toEqual([])
	})
})

describe('migration generator', () => {
	test('generates migration from field_added diff', async () => {
		const db = defineSchema(({ createTable }) => ({
			users: createTable('users', {
				schema: { name: z.string(), email: z.string().optional() },
				seed: 0,
			}).table(),
		}))

		// Insert existing data
		db.schemas.users.insert({ name: 'Alice' })

		const migration = generateMigration(
			[{ type: 'field_added', tableName: 'users', fieldName: 'email' }],
			1,
			'add_email_field',
		)

		expect(migration.version).toBe(1)
		expect(migration.name).toBe('add_email_field')

		// Run migration
		await migration.up(db as any)

		// email field should be set to null for existing records
		const users = db.schemas.users.toArray()
		expect(users[0].email).toBeNull()
	})

	test('generates migration from field_type_changed diff', async () => {
		const db = defineSchema(({ createTable }) => ({
			items: createTable('items', {
				schema: { price: z.string() },
				seed: 0,
			}).table(),
		}))

		db.schemas.items.insert({ price: '42' })

		const migration = generateMigration(
			[{
				type: 'field_type_changed',
				tableName: 'items',
				fieldName: 'price',
				oldValue: 'number',
				newValue: 'string',
			}],
			1,
		)

		await migration.up(db as any)

		const items = db.schemas.items.toArray()
		// Should coerce to string
		expect(items[0].price).toBe('42')
	})

	test('generates auto-named migration', () => {
		const migration = generateMigration(
			[{ type: 'table_added', tableName: 'logs' }],
			5,
		)
		expect(migration.name).toBe('auto_migration_v5')
	})
})

describe('adapter-backed version storage', () => {
	test('persists migration state in adapter', async () => {
		const adapter = createMemoryAdapter()
		const storage = createAdapterVersionStorage(adapter)

		expect(storage.getCurrentVersion()).toBe(0)

		storage.recordApplied({
			version: 1,
			name: 'test_migration',
			appliedAt: Date.now(),
			success: true,
			durationMs: 10,
		})

		expect(storage.getCurrentVersion()).toBe(1)

		const applied = storage.getApplied()
		expect(applied.length).toBe(1)
		expect(applied[0].name).toBe('test_migration')
	})

	test('persistent migration runner uses adapter storage', async () => {
		const adapter = createMemoryAdapter()

		const db = defineSchema(({ createTable }) => ({
			data: createTable('data', {
				schema: { value: z.number() },
				seed: 0,
			}).table(),
		}))

		const migrations = [
			defineMigration({
				version: 1,
				name: 'insert_data',
				up: (schema) => {
					schema.schemas.data.insert({ value: 42 })
				},
				down: (schema) => {
					const item = schema.schemas.data.findMany({
						where: (d) => d.value === 42,
					})[0]
					if (item) schema.schemas.data.delete(item._id)
				},
			}),
		]

		// Run with persistent storage
		const runner = createPersistentMigrationRunner(db, migrations, adapter)
		await runner.up()

		expect(db.schemas.data.toArray().length).toBe(1)

		// Create a new runner with the same adapter - should see migration as applied
		const runner2 = createPersistentMigrationRunner(db, migrations, adapter)
		const status = runner2.getStatus()
		expect(status.currentVersion).toBe(1)
		expect(status.isUpToDate).toBe(true)
		expect(status.pending.length).toBe(0)
	})

	test('adapter version storage handles replace on same version', () => {
		const adapter = createMemoryAdapter()
		const storage = createAdapterVersionStorage(adapter)

		// Record version 1 as failed
		storage.recordApplied({
			version: 1,
			name: 'test',
			appliedAt: Date.now(),
			success: false,
			error: 'initial error',
			durationMs: 5,
		})

		expect(storage.getCurrentVersion()).toBe(0) // Failed, so still 0

		// Re-record version 1 as success (retry)
		storage.recordApplied({
			version: 1,
			name: 'test',
			appliedAt: Date.now(),
			success: true,
			durationMs: 10,
		})

		expect(storage.getCurrentVersion()).toBe(1)
		expect(storage.getApplied().length).toBe(1)
	})

	test('clear removes all migration records', () => {
		const adapter = createMemoryAdapter()
		const storage = createAdapterVersionStorage(adapter)

		storage.recordApplied({
			version: 1,
			name: 'a',
			appliedAt: Date.now(),
			success: true,
			durationMs: 1,
		})
		storage.recordApplied({
			version: 2,
			name: 'b',
			appliedAt: Date.now(),
			success: true,
			durationMs: 1,
		})

		expect(storage.getCurrentVersion()).toBe(2)

		storage.clear()
		expect(storage.getCurrentVersion()).toBe(0)
		expect(storage.getApplied().length).toBe(0)
	})
})

describe('test utilities', () => {
	test('createTestTable creates standalone table', () => {
		const users = createTestTable('users', {
			name: z.string(),
			age: z.number(),
		})

		const user = users.insert({ name: 'Alice', age: 30 })
		expect(user._id).toBeDefined()
		expect(user.name).toBe('Alice')
		expect(user._version).toBe(1)

		const found = users.get(user._id)
		expect(found?.name).toBe('Alice')
	})

	test('createTestTable supports indexes', () => {
		const items = createTestTable(
			'items',
			{ name: z.string(), category: z.string() },
			{
				indexes: [{ name: 'category_idx', fields: ['category'] }],
			},
		)

		items.insert({ name: 'A', category: 'electronics' })
		items.insert({ name: 'B', category: 'books' })
		items.insert({ name: 'C', category: 'electronics' })

		const electronics = items.query('category_idx', 'electronics')
		expect(electronics.length).toBe(2)
	})

	test('createTestTable supports unique constraints', () => {
		const users = createTestTable(
			'users',
			{ email: z.string(), name: z.string() },
			{
				uniqueConstraints: [{ name: 'email_unique', fields: ['email'] }],
			},
		)

		users.insert({ email: 'alice@test.com', name: 'Alice' })
		expect(() =>
			users.insert({ email: 'alice@test.com', name: 'Not Alice' }),
		).toThrow()
	})
})
