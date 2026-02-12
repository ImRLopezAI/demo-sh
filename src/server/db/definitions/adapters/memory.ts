import type { WithSystemFields } from '../table'
import type { AdapterFilter, AdapterQueryOptions, SyncStorageAdapter } from './types'

/**
 * Internal in-memory storage adapter.
 * Uses Map for fast sync operations.
 * @internal Not exported to consumers - used as default when no adapter specified.
 */
export class MemoryAdapter implements SyncStorageAdapter {
	readonly type = 'sync' as const
	private tables = new Map<string, Map<string, WithSystemFields<object>>>()

	private getTable(tableName: string): Map<string, WithSystemFields<object>> {
		let table = this.tables.get(tableName)
		if (!table) {
			table = new Map()
			this.tables.set(tableName, table)
		}
		return table
	}

	get<T extends object>(
		tableName: string,
		id: string,
	): WithSystemFields<T> | undefined {
		return this.getTable(tableName).get(id) as WithSystemFields<T> | undefined
	}

	getAll<T extends object>(tableName: string): WithSystemFields<T>[] {
		return Array.from(
			this.getTable(tableName).values(),
		) as WithSystemFields<T>[]
	}

	set<T extends object>(
		tableName: string,
		id: string,
		doc: WithSystemFields<T>,
	): void {
		this.getTable(tableName).set(id, doc as WithSystemFields<object>)
	}

	delete(tableName: string, id: string): boolean {
		return this.getTable(tableName).delete(id)
	}

	clear(tableName: string): void {
		this.getTable(tableName).clear()
	}

	has(tableName: string, id: string): boolean {
		return this.getTable(tableName).has(id)
	}

	count(tableName: string): number {
		return this.getTable(tableName).size
	}

	getMany<T extends object>(
		tableName: string,
		ids: string[],
	): WithSystemFields<T>[] {
		const table = this.getTable(tableName)
		return ids
			.map((id) => table.get(id))
			.filter(
				(doc): doc is WithSystemFields<object> => doc !== undefined,
			) as WithSystemFields<T>[]
	}

	setMany<T extends object>(
		tableName: string,
		docs: Array<{ id: string; doc: WithSystemFields<T> }>,
	): void {
		const table = this.getTable(tableName)
		for (const { id, doc } of docs) {
			table.set(id, doc as WithSystemFields<object>)
		}
	}

	deleteMany(tableName: string, ids: string[]): number {
		const table = this.getTable(tableName)
		let count = 0
		for (const id of ids) {
			if (table.delete(id)) count++
		}
		return count
	}

	query<T extends object>(
		tableName: string,
		options: AdapterQueryOptions,
	): WithSystemFields<T>[] {
		let results = this.getAll<T>(tableName)

		if (options.filter) {
			results = results.filter((doc) =>
				matchesFilter(doc as Record<string, unknown>, options.filter!),
			)
		}

		if (options.orderBy) {
			const { field, direction } = options.orderBy
			results.sort((a, b) => {
				const aVal = (a as Record<string, unknown>)[field] as string | number
				const bVal = (b as Record<string, unknown>)[field] as string | number
				if (aVal < bVal) return direction === 'asc' ? -1 : 1
				if (aVal > bVal) return direction === 'asc' ? 1 : -1
				return 0
			})
		}

		if (options.offset) {
			results = results.slice(options.offset)
		}

		if (options.limit) {
			results = results.slice(0, options.limit)
		}

		return results
	}

	close(): void {
		this.tables.clear()
	}
}

function matchesFilter(item: Record<string, unknown>, filter: AdapterFilter): boolean {
	switch (filter.type) {
		case 'eq':
			return item[filter.field] === filter.value
		case 'ne':
			return item[filter.field] !== filter.value
		case 'gt':
			return (item[filter.field] as number | string) > filter.value
		case 'gte':
			return (item[filter.field] as number | string) >= filter.value
		case 'lt':
			return (item[filter.field] as number | string) < filter.value
		case 'lte':
			return (item[filter.field] as number | string) <= filter.value
		case 'in':
			return filter.values.includes(item[filter.field])
		case 'isNull':
			return item[filter.field] == null
		case 'isNotNull':
			return item[filter.field] != null
		case 'and':
			return filter.filters.every((f) => matchesFilter(item, f))
		case 'or':
			return filter.filters.some((f) => matchesFilter(item, f))
	}
}

/**
 * Create internal memory adapter instance.
 * @internal
 */
export function createMemoryAdapter(): SyncStorageAdapter {
	return new MemoryAdapter()
}
