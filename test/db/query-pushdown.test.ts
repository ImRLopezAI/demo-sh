import { MemoryAdapter } from '@server/db/definitions/adapters/memory'
import type { AdapterFilter } from '@server/db/definitions/adapters/types'
import { applyAdapterFilter } from '@server/db/definitions/query/filter-compiler'
import { describe, expect, test } from 'vitest'

describe('MemoryAdapter query pushdown', () => {
	test('query with eq filter', () => {
		const adapter = new MemoryAdapter()

		adapter.set('users', '1', {
			_id: '1',
			_createdAt: 1,
			_updatedAt: 1,
			_version: 1,
			name: 'Alice',
			status: 'active',
		} as any)
		adapter.set('users', '2', {
			_id: '2',
			_createdAt: 2,
			_updatedAt: 2,
			_version: 1,
			name: 'Bob',
			status: 'inactive',
		} as any)
		adapter.set('users', '3', {
			_id: '3',
			_createdAt: 3,
			_updatedAt: 3,
			_version: 1,
			name: 'Carol',
			status: 'active',
		} as any)

		const results = adapter.query('users', {
			filter: { type: 'eq', field: 'status', value: 'active' },
		})

		expect(results.length).toBe(2)
		expect(results.map((r: any) => r.name).sort()).toEqual(['Alice', 'Carol'])
	})

	test('query with ne filter', () => {
		const adapter = new MemoryAdapter()

		adapter.set('items', '1', {
			_id: '1',
			_createdAt: 1,
			_updatedAt: 1,
			_version: 1,
			type: 'A',
		} as any)
		adapter.set('items', '2', {
			_id: '2',
			_createdAt: 2,
			_updatedAt: 2,
			_version: 1,
			type: 'B',
		} as any)
		adapter.set('items', '3', {
			_id: '3',
			_createdAt: 3,
			_updatedAt: 3,
			_version: 1,
			type: 'A',
		} as any)

		const results = adapter.query('items', {
			filter: { type: 'ne', field: 'type', value: 'A' },
		})

		expect(results.length).toBe(1)
		expect((results[0] as any).type).toBe('B')
	})

	test('query with gt/lt filters (exclusive boundaries)', () => {
		const adapter = new MemoryAdapter()

		for (let i = 1; i <= 5; i++) {
			adapter.set('scores', `${i}`, {
				_id: `${i}`,
				_createdAt: i,
				_updatedAt: i,
				_version: 1,
				score: i * 10,
			} as any)
		}

		// gt 20 and lt 50 → scores 30, 40
		const results = adapter.query('scores', {
			filter: {
				type: 'and',
				filters: [
					{ type: 'gt', field: 'score', value: 20 },
					{ type: 'lt', field: 'score', value: 50 },
				],
			},
		})

		expect(results.length).toBe(2)
		expect(
			results.map((r: any) => r.score).sort((a: number, b: number) => a - b),
		).toEqual([30, 40])
	})

	test('query with gte/lte filters (inclusive boundaries)', () => {
		const adapter = new MemoryAdapter()

		for (let i = 1; i <= 5; i++) {
			adapter.set('scores', `${i}`, {
				_id: `${i}`,
				_createdAt: i,
				_updatedAt: i,
				_version: 1,
				score: i * 10,
			} as any)
		}

		// gte 20 and lte 40 → scores 20, 30, 40
		const results = adapter.query('scores', {
			filter: {
				type: 'and',
				filters: [
					{ type: 'gte', field: 'score', value: 20 },
					{ type: 'lte', field: 'score', value: 40 },
				],
			},
		})

		expect(results.length).toBe(3)
	})

	test('query with in filter', () => {
		const adapter = new MemoryAdapter()

		adapter.set('items', '1', {
			_id: '1',
			_createdAt: 1,
			_updatedAt: 1,
			_version: 1,
			color: 'red',
		} as any)
		adapter.set('items', '2', {
			_id: '2',
			_createdAt: 2,
			_updatedAt: 2,
			_version: 1,
			color: 'blue',
		} as any)
		adapter.set('items', '3', {
			_id: '3',
			_createdAt: 3,
			_updatedAt: 3,
			_version: 1,
			color: 'green',
		} as any)

		const results = adapter.query('items', {
			filter: { type: 'in', field: 'color', values: ['red', 'green'] },
		})

		expect(results.length).toBe(2)
	})

	test('query with orderBy', () => {
		const adapter = new MemoryAdapter()

		adapter.set('items', '1', {
			_id: '1',
			_createdAt: 1,
			_updatedAt: 1,
			_version: 1,
			name: 'Charlie',
		} as any)
		adapter.set('items', '2', {
			_id: '2',
			_createdAt: 2,
			_updatedAt: 2,
			_version: 1,
			name: 'Alice',
		} as any)
		adapter.set('items', '3', {
			_id: '3',
			_createdAt: 3,
			_updatedAt: 3,
			_version: 1,
			name: 'Bob',
		} as any)

		const asc = adapter.query('items', {
			orderBy: { field: 'name', direction: 'asc' },
		})
		expect(asc.map((r: any) => r.name)).toEqual(['Alice', 'Bob', 'Charlie'])

		const desc = adapter.query('items', {
			orderBy: { field: 'name', direction: 'desc' },
		})
		expect(desc.map((r: any) => r.name)).toEqual(['Charlie', 'Bob', 'Alice'])
	})

	test('query with limit and offset', () => {
		const adapter = new MemoryAdapter()

		for (let i = 1; i <= 10; i++) {
			adapter.set('items', `${i}`, {
				_id: `${i}`,
				_createdAt: i,
				_updatedAt: i,
				_version: 1,
				value: i,
			} as any)
		}

		const results = adapter.query('items', {
			orderBy: { field: 'value', direction: 'asc' },
			limit: 3,
			offset: 2,
		})

		expect(results.length).toBe(3)
		expect(results.map((r: any) => r.value)).toEqual([3, 4, 5])
	})

	test('query with isNull and isNotNull', () => {
		const adapter = new MemoryAdapter()

		adapter.set('items', '1', {
			_id: '1',
			_createdAt: 1,
			_updatedAt: 1,
			_version: 1,
			label: 'has value',
		} as any)
		adapter.set('items', '2', {
			_id: '2',
			_createdAt: 2,
			_updatedAt: 2,
			_version: 1,
			label: null,
		} as any)
		adapter.set('items', '3', {
			_id: '3',
			_createdAt: 3,
			_updatedAt: 3,
			_version: 1,
		} as any)

		const nullResults = adapter.query('items', {
			filter: { type: 'isNull', field: 'label' },
		})
		expect(nullResults.length).toBe(2)

		const notNullResults = adapter.query('items', {
			filter: { type: 'isNotNull', field: 'label' },
		})
		expect(notNullResults.length).toBe(1)
		expect((notNullResults[0] as any).label).toBe('has value')
	})

	test('query with or filter', () => {
		const adapter = new MemoryAdapter()

		adapter.set('items', '1', {
			_id: '1',
			_createdAt: 1,
			_updatedAt: 1,
			_version: 1,
			status: 'active',
			priority: 'high',
		} as any)
		adapter.set('items', '2', {
			_id: '2',
			_createdAt: 2,
			_updatedAt: 2,
			_version: 1,
			status: 'inactive',
			priority: 'low',
		} as any)
		adapter.set('items', '3', {
			_id: '3',
			_createdAt: 3,
			_updatedAt: 3,
			_version: 1,
			status: 'inactive',
			priority: 'high',
		} as any)

		const results = adapter.query('items', {
			filter: {
				type: 'or',
				filters: [
					{ type: 'eq', field: 'status', value: 'active' },
					{ type: 'eq', field: 'priority', value: 'high' },
				],
			},
		})

		expect(results.length).toBe(2)
	})

	test('query with no results returns empty array', () => {
		const adapter = new MemoryAdapter()

		adapter.set('items', '1', {
			_id: '1',
			_createdAt: 1,
			_updatedAt: 1,
			_version: 1,
			status: 'active',
		} as any)

		const results = adapter.query('items', {
			filter: { type: 'eq', field: 'status', value: 'nonexistent' },
		})

		expect(results).toEqual([])
	})

	test('query on empty table returns empty array', () => {
		const adapter = new MemoryAdapter()
		const results = adapter.query('empty', {})
		expect(results).toEqual([])
	})
})

describe('applyAdapterFilter', () => {
	const items = [
		{ name: 'Alice', age: 30, active: true },
		{ name: 'Bob', age: 25, active: false },
		{ name: 'Carol', age: 35, active: true },
	]

	test('filters with eq', () => {
		const result = applyAdapterFilter(items, {
			type: 'eq',
			field: 'name',
			value: 'Bob',
		})
		expect(result.length).toBe(1)
		expect(result[0].name).toBe('Bob')
	})

	test('filters with ne', () => {
		const result = applyAdapterFilter(items, {
			type: 'ne',
			field: 'active',
			value: true,
		})
		expect(result.length).toBe(1)
		expect(result[0].name).toBe('Bob')
	})

	test('filters with gte and lte', () => {
		const filter: AdapterFilter = {
			type: 'and',
			filters: [
				{ type: 'gte', field: 'age', value: 25 },
				{ type: 'lte', field: 'age', value: 30 },
			],
		}
		const result = applyAdapterFilter(items, filter)
		expect(result.length).toBe(2)
		expect(result.map((r) => r.name).sort()).toEqual(['Alice', 'Bob'])
	})

	test('filters with or', () => {
		const filter: AdapterFilter = {
			type: 'or',
			filters: [
				{ type: 'eq', field: 'name', value: 'Alice' },
				{ type: 'eq', field: 'name', value: 'Carol' },
			],
		}
		const result = applyAdapterFilter(items, filter)
		expect(result.length).toBe(2)
	})

	test('filters with in', () => {
		const result = applyAdapterFilter(items, {
			type: 'in',
			field: 'age',
			values: [25, 35],
		})
		expect(result.length).toBe(2)
		expect(result.map((r) => r.name).sort()).toEqual(['Bob', 'Carol'])
	})
})
