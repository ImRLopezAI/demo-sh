import { defineSchema } from '@server/db/definitions'
import {
	createInMemoryVersionStorage,
	createMigrationRunner,
	defineMigration,
} from '@server/db/definitions/migrations'
import { describe, expect, test } from 'vitest'
import { z } from 'zod'

describe('migrations with defineSchema', () => {
	test('runs migrations on a real schema', async () => {
		const db = defineSchema(({ createTable }) => ({
			users: createTable('users', {
				schema: { name: z.string(), email: z.string() },
				seed: 0,
			}).table(),
			posts: createTable('posts', {
				schema: (one) => ({
					title: z.string(),
					authorId: one('users'),
				}),
				seed: 0,
			}).table(),
		}))

		const migrations = [
			defineMigration({
				version: 1,
				name: 'seed_admin_user',
				up: (schema) => {
					schema.schemas.users.insert({
						name: 'Admin',
						email: 'admin@test.com',
					})
				},
				down: (schema) => {
					const admin = schema.schemas.users.findMany({
						where: (u) => u.email === 'admin@test.com',
					})[0]
					if (admin) schema.schemas.users.delete(admin._id)
				},
			}),
			defineMigration({
				version: 2,
				name: 'seed_welcome_post',
				up: (schema) => {
					const admin = schema.schemas.users.findMany({
						where: (u) => u.email === 'admin@test.com',
					})[0]
					if (admin) {
						schema.schemas.posts.insert({
							title: 'Welcome!',
							authorId: admin._id,
						})
					}
				},
				down: (schema) => {
					const welcome = schema.schemas.posts.findMany({
						where: (p) => p.title === 'Welcome!',
					})[0]
					if (welcome) schema.schemas.posts.delete(welcome._id)
				},
			}),
		]

		const runner = createMigrationRunner(db, migrations)

		// Verify initial state
		expect(db.schemas.users.toArray().length).toBe(0)
		expect(db.schemas.posts.toArray().length).toBe(0)

		// Run migrations
		const result = await runner.up()
		expect(result.success).toBe(true)
		expect(result.applied.length).toBe(2)

		// Verify data was created
		const users = db.schemas.users.toArray()
		expect(users.length).toBe(1)
		expect(users[0].name).toBe('Admin')

		const posts = db.schemas.posts.toArray()
		expect(posts.length).toBe(1)
		expect(posts[0].title).toBe('Welcome!')
		expect(posts[0].authorId).toBe(users[0]._id)

		// Rollback all migrations
		const rollbackResult = await runner.reset()
		expect(rollbackResult.success).toBe(true)

		// Verify data was removed
		expect(db.schemas.users.toArray().length).toBe(0)
		expect(db.schemas.posts.toArray().length).toBe(0)
	})

	test('migrations with target version', async () => {
		const db = defineSchema(({ createTable }) => ({
			items: createTable('items', {
				schema: { value: z.number() },
				seed: 0,
			}).table(),
		}))

		const migrations = [
			defineMigration({
				version: 1,
				name: 'add_item_1',
				up: (schema) => {
					schema.schemas.items.insert({ value: 10 })
				},
				down: (schema) => {
					const item = schema.schemas.items.findMany({
						where: (i) => i.value === 10,
					})[0]
					if (item) schema.schemas.items.delete(item._id)
				},
			}),
			defineMigration({
				version: 2,
				name: 'add_item_2',
				up: (schema) => {
					schema.schemas.items.insert({ value: 20 })
				},
				down: (schema) => {
					const item = schema.schemas.items.findMany({
						where: (i) => i.value === 20,
					})[0]
					if (item) schema.schemas.items.delete(item._id)
				},
			}),
			defineMigration({
				version: 3,
				name: 'add_item_3',
				up: (schema) => {
					schema.schemas.items.insert({ value: 30 })
				},
				down: (schema) => {
					const item = schema.schemas.items.findMany({
						where: (i: any) => i.value === 30,
					})[0]
					if (item) schema.schemas.items.delete(item._id)
				},
			}),
		]

		const runner = createMigrationRunner(db, migrations)

		// Run only up to version 2
		await runner.up({ targetVersion: 2 })

		const items = db.schemas.items.toArray()
		expect(items.length).toBe(2)
		expect(items.map((i) => i.value).sort((a, b) => a - b)).toEqual([10, 20])

		// Check status
		const status = runner.getStatus()
		expect(status.currentVersion).toBe(2)
		expect(status.pending.length).toBe(1)
	})

	test('dry run does not modify data', async () => {
		const db = defineSchema(({ createTable }) => ({
			data: createTable('data', {
				schema: { text: z.string() },
				seed: 0,
			}).table(),
		}))

		const migrations = [
			defineMigration({
				version: 1,
				name: 'add_data',
				up: (schema) => {
					schema.schemas.data.insert({ text: 'should not exist' })
				},
				down: () => {},
			}),
		]

		const runner = createMigrationRunner(db, migrations)

		const result = await runner.up({ dryRun: true })
		expect(result.success).toBe(true)
		expect(result.applied.length).toBe(1)

		// Data should NOT be in the database
		expect(db.schemas.data.toArray().length).toBe(0)
	})

	test('validates migration versions', () => {
		const db = defineSchema(({ createTable }) => ({
			test: createTable('test', {
				schema: { x: z.string() },
				seed: 0,
			}).table(),
		}))

		// Duplicate versions should throw
		expect(() =>
			createMigrationRunner(db, [
				defineMigration({
					version: 1,
					name: 'a',
					up: () => {},
					down: () => {},
				}),
				defineMigration({
					version: 1,
					name: 'b',
					up: () => {},
					down: () => {},
				}),
			]),
		).toThrow('Duplicate migration version')

		// Zero/negative versions should throw
		expect(() =>
			createMigrationRunner(db, [
				defineMigration({
					version: 0,
					name: 'zero',
					up: () => {},
					down: () => {},
				}),
			]),
		).toThrow('Invalid migration version')
	})

	test('onProgress callback tracks migration progress', async () => {
		const db = defineSchema(({ createTable }) => ({
			log: createTable('log', {
				schema: { message: z.string() },
				seed: 0,
			}).table(),
		}))

		const migrations = [
			defineMigration({
				version: 1,
				name: 'migration_one',
				up: (schema) => {
					schema.schemas.log.insert({ message: 'one' })
				},
				down: () => {},
			}),
			defineMigration({
				version: 2,
				name: 'migration_two',
				up: (schema) => {
					schema.schemas.log.insert({ message: 'two' })
				},
				down: () => {},
			}),
		]

		const runner = createMigrationRunner(db, migrations)
		const progressEvents: Array<{
			type: string
			version: number
			name: string
		}> = []

		await runner.up({
			onProgress: (event) => {
				progressEvents.push({
					type: event.type,
					version: event.version,
					name: event.name,
				})
			},
		})

		expect(progressEvents).toEqual([
			{ type: 'start', version: 1, name: 'migration_one' },
			{ type: 'complete', version: 1, name: 'migration_one' },
			{ type: 'start', version: 2, name: 'migration_two' },
			{ type: 'complete', version: 2, name: 'migration_two' },
		])
	})

	test('version storage persists between runner instances', async () => {
		const db = defineSchema(({ createTable }) => ({
			counter: createTable('counter', {
				schema: { count: z.number() },
				seed: 0,
			}).table(),
		}))

		const migrations = [
			defineMigration({
				version: 1,
				name: 'init_counter',
				up: (schema) => {
					schema.schemas.counter.insert({ count: 0 })
				},
				down: (schema) => {
					const c = schema.schemas.counter.toArray()[0]
					if (c) schema.schemas.counter.delete(c._id)
				},
			}),
			defineMigration({
				version: 2,
				name: 'increment_counter',
				up: (schema) => {
					const c = schema.schemas.counter.toArray()[0] as
						| { _id: string; count: number }
						| undefined
					if (c) schema.schemas.counter.update(c._id, { count: c.count + 1 })
				},
				down: (schema) => {
					const c = schema.schemas.counter.toArray()[0] as
						| { _id: string; count: number }
						| undefined
					if (c) schema.schemas.counter.update(c._id, { count: c.count - 1 })
				},
			}),
		]

		// Use shared storage
		const storage = createInMemoryVersionStorage()

		// First runner - run migration 1
		const runner1 = createMigrationRunner(db, migrations, storage)
		await runner1.up({ targetVersion: 1 })

		expect(db.schemas.counter.toArray()[0].count).toBe(0)

		// Second runner with same storage - should only run migration 2
		const runner2 = createMigrationRunner(db, migrations, storage)
		const status = runner2.getStatus()

		expect(status.currentVersion).toBe(1)
		expect(status.pending.length).toBe(1)
		expect(status.pending[0].version).toBe(2)

		await runner2.up()
		expect(db.schemas.counter.toArray()[0].count).toBe(1)
	})
})
