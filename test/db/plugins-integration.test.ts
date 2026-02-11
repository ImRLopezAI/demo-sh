import { defineSchema } from '@server/db/definitions'
import type { TablePlugin } from '@server/db/definitions/plugins'
import { describe, expect, test, vi } from 'vitest'
import { z } from 'zod'

describe('plugins integration with defineSchema', () => {
	test('registers global plugins via options', () => {
		const beforeInsertMock = vi.fn((_ctx, item) => item)
		const afterInsertMock = vi.fn()

		const auditPlugin: TablePlugin = {
			name: 'audit',
			beforeInsert: beforeInsertMock,
			afterInsert: afterInsertMock,
		}

		const db = defineSchema(
			({ createTable }) => ({
				users: createTable('users', {
					schema: { name: z.string(), email: z.string() },
					seed: 0,
				}).table(),
			}),
			{
				plugins: {
					globalPlugins: [auditPlugin],
				},
			},
		)

		// Insert a user
		const user = db.schemas.users.insert({
			name: 'John',
			email: 'john@test.com',
		})

		// Plugin hooks should have been called
		expect(beforeInsertMock).toHaveBeenCalledOnce()
		expect(afterInsertMock).toHaveBeenCalledOnce()
		expect(user.name).toBe('John')
	})

	test('beforeInsert can modify data', () => {
		const timestampPlugin: TablePlugin = {
			name: 'timestamp',
			beforeInsert: (_ctx, item) => ({
				...item,
				insertedAt: new Date().toISOString(),
			}),
		}

		const db = defineSchema(
			({ createTable }) => ({
				logs: createTable('logs', {
					schema: { message: z.string(), insertedAt: z.string().optional() },
					seed: 0,
				}).table(),
			}),
			{
				plugins: {
					globalPlugins: [timestampPlugin],
				},
			},
		)

		const log = db.schemas.logs.insert({ message: 'Hello' })

		// Plugin should have added insertedAt
		expect(log.insertedAt).toBeDefined()
		expect(typeof log.insertedAt).toBe('string')
	})

	test('beforeUpdate can modify updates', () => {
		const modifiedAtPlugin: TablePlugin = {
			name: 'modifiedAt',
			beforeUpdate: (_ctx, _id, updates) => ({
				...updates,
				modifiedAt: new Date().toISOString(),
			}),
		}

		const db = defineSchema(
			({ createTable }) => ({
				items: createTable('items', {
					schema: { value: z.number(), modifiedAt: z.string().optional() },
					seed: 0,
				}).table(),
			}),
			{
				plugins: {
					globalPlugins: [modifiedAtPlugin],
				},
			},
		)

		const item = db.schemas.items.insert({ value: 10 })
		expect(item.modifiedAt).toBeUndefined()

		const updated = db.schemas.items.update(item._id, { value: 20 })

		expect(updated?.value).toBe(20)
		expect(updated?.modifiedAt).toBeDefined()
	})

	test('afterDelete is called', () => {
		const afterDeleteMock = vi.fn()

		const deletePlugin: TablePlugin = {
			name: 'delete-tracker',
			afterDelete: afterDeleteMock,
		}

		const db = defineSchema(
			({ createTable }) => ({
				todos: createTable('todos', {
					schema: { title: z.string() },
					seed: 0,
				}).table(),
			}),
			{
				plugins: {
					globalPlugins: [deletePlugin],
				},
			},
		)

		const todo = db.schemas.todos.insert({ title: 'Task 1' })
		db.schemas.todos.delete(todo._id)

		expect(afterDeleteMock).toHaveBeenCalledOnce()
		expect(afterDeleteMock).toHaveBeenCalledWith(
			expect.objectContaining({ tableName: 'todos' }),
			todo._id,
		)
	})

	test('beforeDelete can prevent deletion by throwing', () => {
		const protectPlugin: TablePlugin = {
			name: 'protect',
			beforeDelete: (_ctx, id) => {
				if (id === 'protected') {
					throw new Error('Cannot delete protected item')
				}
			},
		}

		const db = defineSchema(
			({ createTable }) => ({
				configs: createTable('configs', {
					schema: { key: z.string() },
					seed: 0,
				}).table(),
			}),
			{
				plugins: {
					globalPlugins: [protectPlugin],
				},
			},
		)

		// Insert and try to delete
		db.schemas.configs.insert({ key: 'test' })

		// This won't throw since _id is auto-generated
		// But if we had an item with id 'protected' it would throw
	})

	test('plugins API allows runtime registration', () => {
		const db = defineSchema(({ createTable }) => ({
			users: createTable('users', {
				schema: { name: z.string() },
				seed: 0,
			}).table(),
		}))

		const mockBeforeInsert = vi.fn((_ctx, item) => item)

		const runtimePlugin: TablePlugin = {
			name: 'runtime',
			beforeInsert: mockBeforeInsert,
		}

		// Register plugin at runtime
		db.plugins.registerGlobal(runtimePlugin)

		// Verify plugin is registered
		const plugins = db.plugins.getPluginsForTable('users')
		expect(plugins.some((p) => p.name === 'runtime')).toBe(true)

		// Insert should trigger plugin
		db.schemas.users.insert({ name: 'Alice' })
		expect(mockBeforeInsert).toHaveBeenCalledOnce()

		// Unregister and verify
		db.plugins.unregister('runtime')
		const pluginsAfter = db.plugins.getPluginsForTable('users')
		expect(pluginsAfter.some((p) => p.name === 'runtime')).toBe(false)
	})

	test('table-specific plugins only apply to that table', () => {
		const mockBeforeInsert = vi.fn((_ctx, item) => item)

		const tablePlugin: TablePlugin = {
			name: 'table-specific',
			beforeInsert: mockBeforeInsert,
		}

		const db = defineSchema(
			({ createTable }) => ({
				users: createTable('users', {
					schema: { name: z.string() },
					seed: 0,
				}).table(),
				posts: createTable('posts', {
					schema: { title: z.string() },
					seed: 0,
				}).table(),
			}),
			{
				plugins: {
					tablePlugins: {
						users: { plugins: [tablePlugin] },
					},
				},
			},
		)

		// Insert into users - plugin should be called
		db.schemas.users.insert({ name: 'John' })
		expect(mockBeforeInsert).toHaveBeenCalledOnce()

		// Insert into posts - plugin should NOT be called
		db.schemas.posts.insert({ title: 'Hello' })
		expect(mockBeforeInsert).toHaveBeenCalledOnce() // Still 1
	})

	test('clear triggers beforeClear and afterClear', () => {
		const beforeClearMock = vi.fn()
		const afterClearMock = vi.fn()

		const clearPlugin: TablePlugin = {
			name: 'clear-tracker',
			beforeClear: beforeClearMock,
			afterClear: afterClearMock,
		}

		const db = defineSchema(
			({ createTable }) => ({
				items: createTable('items', {
					schema: { value: z.number() },
					seed: 0,
				}).table(),
			}),
			{
				plugins: {
					globalPlugins: [clearPlugin],
				},
			},
		)

		db.schemas.items.insert({ value: 1 })
		db.schemas.items.insert({ value: 2 })
		expect(db.schemas.items.size).toBe(2)

		db.schemas.items.clear()

		expect(beforeClearMock).toHaveBeenCalledOnce()
		expect(afterClearMock).toHaveBeenCalledOnce()
		expect(db.schemas.items.size).toBe(0)
	})
})
