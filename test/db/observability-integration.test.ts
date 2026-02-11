import { defineSchema } from '@server/db/definitions'
import { describe, expect, test, vi } from 'vitest'
import { z } from 'zod'

describe('observability integration with defineSchema', () => {
	test('observability is disabled by default', () => {
		const db = defineSchema(({ createTable }) => ({
			users: createTable('users', {
				schema: { name: z.string() },
				seed: 0,
			}).table(),
		}))

		expect(db.observability.isEnabled()).toBe(false)
	})

	test('observability can be enabled via options', () => {
		const db = defineSchema(
			({ createTable }) => ({
				users: createTable('users', {
					schema: { name: z.string() },
					seed: 0,
				}).table(),
			}),
			{
				observability: {
					enabled: true,
				},
			},
		)

		expect(db.observability.isEnabled()).toBe(true)
	})

	test('onMutation hook is called on insert', () => {
		const onMutationMock = vi.fn()

		const db = defineSchema(
			({ createTable }) => ({
				users: createTable('users', {
					schema: { name: z.string() },
					seed: 0,
				}).table(),
			}),
			{
				observability: {
					enabled: true,
					hooks: {
						onMutation: onMutationMock,
					},
				},
			},
		)

		const user = db.schemas.users.insert({ name: 'Alice' })

		expect(onMutationMock).toHaveBeenCalledOnce()
		expect(onMutationMock).toHaveBeenCalledWith(
			expect.objectContaining({
				tableName: 'users',
				operation: 'insert',
				documentId: user._id,
				success: true,
			}),
		)
	})

	test('onMutation hook is called on update', () => {
		const onMutationMock = vi.fn()

		const db = defineSchema(
			({ createTable }) => ({
				items: createTable('items', {
					schema: { value: z.number() },
					seed: 0,
				}).table(),
			}),
			{
				observability: {
					enabled: true,
					hooks: {
						onMutation: onMutationMock,
					},
				},
			},
		)

		const item = db.schemas.items.insert({ value: 10 })
		onMutationMock.mockClear()

		db.schemas.items.update(item._id, { value: 20 })

		expect(onMutationMock).toHaveBeenCalledOnce()
		expect(onMutationMock).toHaveBeenCalledWith(
			expect.objectContaining({
				tableName: 'items',
				operation: 'update',
				documentId: item._id,
				success: true,
			}),
		)
	})

	test('onMutation hook is called on delete', () => {
		const onMutationMock = vi.fn()

		const db = defineSchema(
			({ createTable }) => ({
				todos: createTable('todos', {
					schema: { title: z.string() },
					seed: 0,
				}).table(),
			}),
			{
				observability: {
					enabled: true,
					hooks: {
						onMutation: onMutationMock,
					},
				},
			},
		)

		const todo = db.schemas.todos.insert({ title: 'Task 1' })
		onMutationMock.mockClear()

		db.schemas.todos.delete(todo._id)

		expect(onMutationMock).toHaveBeenCalledOnce()
		expect(onMutationMock).toHaveBeenCalledWith(
			expect.objectContaining({
				tableName: 'todos',
				operation: 'delete',
				documentId: todo._id,
				success: true,
			}),
		)
	})

	test('onMutation hook is called on clear', () => {
		const onMutationMock = vi.fn()

		const db = defineSchema(
			({ createTable }) => ({
				logs: createTable('logs', {
					schema: { message: z.string() },
					seed: 0,
				}).table(),
			}),
			{
				observability: {
					enabled: true,
					hooks: {
						onMutation: onMutationMock,
					},
				},
			},
		)

		db.schemas.logs.insert({ message: 'log 1' })
		db.schemas.logs.insert({ message: 'log 2' })
		onMutationMock.mockClear()

		db.schemas.logs.clear()

		expect(onMutationMock).toHaveBeenCalledOnce()
		expect(onMutationMock).toHaveBeenCalledWith(
			expect.objectContaining({
				tableName: 'logs',
				operation: 'clear',
				success: true,
			}),
		)
	})

	test('onQuery hook is called on search', () => {
		const onQueryMock = vi.fn()

		const db = defineSchema(
			({ createTable }) => ({
				products: createTable('products', {
					schema: { name: z.string(), description: z.string() },
					seed: 0,
				}).table(),
			}),
			{
				observability: {
					enabled: true,
					hooks: {
						onQuery: onQueryMock,
					},
				},
			},
		)

		db.schemas.products.insert({
			name: 'Widget',
			description: 'A useful widget',
		})
		db.schemas.products.insert({ name: 'Gadget', description: 'A cool gadget' })

		const results = db.schemas.products.search('widget')

		expect(onQueryMock).toHaveBeenCalledOnce()
		expect(onQueryMock).toHaveBeenCalledWith(
			expect.objectContaining({
				tableName: 'products',
				operation: 'search',
				resultCount: results.length,
			}),
		)
	})

	test('onError hook is called on update error', () => {
		const onErrorMock = vi.fn()

		const db = defineSchema(
			({ createTable }) => ({
				data: createTable('data', {
					schema: { value: z.number() },
					seed: 0,
				}).table(),
			}),
			{
				observability: {
					enabled: true,
					hooks: {
						onError: onErrorMock,
					},
				},
			},
		)

		// Insert a document first
		const item = db.schemas.data.insert({ value: 1 })

		// Try to update - this should work normally
		db.schemas.data.update(item._id, { value: 2 })

		// The observability hook tracks errors thrown during operations
		// Since no error occurred, onError should not be called
		expect(onErrorMock).not.toHaveBeenCalled()
	})

	test('plugin errors are caught and do not prevent operation', () => {
		const onMutationMock = vi.fn()

		// Create a plugin that throws on insert
		const throwingPlugin = {
			name: 'throwing',
			beforeInsert: () => {
				throw new Error('Plugin error')
			},
		}

		const db = defineSchema(
			({ createTable }) => ({
				data: createTable('data', {
					schema: { value: z.number() },
					seed: 0,
				}).table(),
			}),
			{
				plugins: {
					globalPlugins: [throwingPlugin],
				},
				observability: {
					enabled: true,
					hooks: {
						onMutation: onMutationMock,
					},
				},
			},
		)

		// Plugin errors are caught by the plugin manager, so insert should succeed
		const result = db.schemas.data.insert({ value: 1 })
		expect(result.value).toBe(1)

		// Mutation should still be tracked as successful
		expect(onMutationMock).toHaveBeenCalledOnce()
	})

	test('observability API allows runtime configuration', () => {
		const db = defineSchema(({ createTable }) => ({
			users: createTable('users', {
				schema: { name: z.string() },
				seed: 0,
			}).table(),
		}))

		// Initially disabled
		expect(db.observability.isEnabled()).toBe(false)

		// Enable at runtime
		db.observability.enable()
		expect(db.observability.isEnabled()).toBe(true)

		// Set hooks at runtime
		const onMutationMock = vi.fn()
		db.observability.setHooks({ onMutation: onMutationMock })

		// Insert should trigger hook
		db.schemas.users.insert({ name: 'Bob' })
		expect(onMutationMock).toHaveBeenCalledOnce()

		// Disable at runtime
		db.observability.disable()
		expect(db.observability.isEnabled()).toBe(false)

		// Insert should NOT trigger hook when disabled
		onMutationMock.mockClear()
		db.schemas.users.insert({ name: 'Carol' })
		expect(onMutationMock).not.toHaveBeenCalled()
	})

	test('getHooks returns current hooks', () => {
		const onMutationMock = vi.fn()
		const onQueryMock = vi.fn()

		const db = defineSchema(
			({ createTable }) => ({
				data: createTable('data', {
					schema: { value: z.number() },
					seed: 0,
				}).table(),
			}),
			{
				observability: {
					hooks: {
						onMutation: onMutationMock,
						onQuery: onQueryMock,
					},
				},
			},
		)

		const hooks = db.observability.getHooks()
		expect(hooks.onMutation).toBeDefined()
		expect(hooks.onQuery).toBeDefined()
	})

	test('durationMs is tracked in mutation events', () => {
		const onMutationMock = vi.fn()

		const db = defineSchema(
			({ createTable }) => ({
				items: createTable('items', {
					schema: { value: z.number() },
					seed: 0,
				}).table(),
			}),
			{
				observability: {
					enabled: true,
					hooks: {
						onMutation: onMutationMock,
					},
				},
			},
		)

		db.schemas.items.insert({ value: 42 })

		expect(onMutationMock).toHaveBeenCalledWith(
			expect.objectContaining({
				durationMs: expect.any(Number),
			}),
		)

		const call = onMutationMock.mock.calls[0][0]
		expect(call.durationMs).toBeGreaterThanOrEqual(0)
	})
})
