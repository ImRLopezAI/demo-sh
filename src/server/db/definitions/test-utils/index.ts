import { z } from 'zod'
import { createMemoryAdapter } from '../adapters'
import { ReactiveTable, type TableIndex } from '../table'
import type { ZodShape } from '../types'

// ============================================================================
// Test utilities module (Phase 7)
// ============================================================================

/**
 * Create a standalone reactive table backed by an in-memory adapter.
 * Useful for unit testing individual table operations in isolation.
 *
 * @example
 * ```ts
 * const users = createTestTable('users', {
 *   name: z.string(),
 *   age: z.number(),
 * })
 *
 * const user = users.insert({ name: 'Alice', age: 30 })
 * expect(users.get(user._id)?.name).toBe('Alice')
 * ```
 */
export function createTestTable<T extends ZodShape>(
	name: string,
	_schema: T,
	options?: {
		indexes?: Array<{ name: string; fields: string[] }>
		uniqueConstraints?: Array<{ name: string; fields: string[] }>
		defaultValues?: Record<string, unknown>
		enableHistory?: boolean
	},
): ReactiveTable<z.infer<z.ZodObject<T>>> {
	const adapter = createMemoryAdapter()

	const indexes: TableIndex<object>[] = (options?.indexes ?? []).map((idx) => ({
		name: idx.name,
		fields: idx.fields as (keyof object)[],
	}))

	const uniqueConstraints = (options?.uniqueConstraints ?? []).map((uc) => ({
		name: uc.name,
		fields: uc.fields as (keyof object)[],
	}))

	return new ReactiveTable<z.infer<z.ZodObject<T>>>(name, {
		indexes,
		uniqueConstraints,
		defaultValues: (options?.defaultValues ?? {}) as Partial<z.infer<z.ZodObject<T>>>,
		enableHistory: options?.enableHistory ?? false,
		adapter,
	})
}

/**
 * Create a test schema with sensible defaults for testing.
 * Wraps defineSchema with seed: 0 to avoid auto-seeding overhead.
 *
 * @example
 * ```ts
 * const db = createTestSchema(({ createTable }) => ({
 *   users: createTable('users', {
 *     schema: { name: z.string() },
 *     seed: 0,
 *   }).table(),
 * }))
 * ```
 */
export { defineSchema as createTestSchema } from '../schema'
