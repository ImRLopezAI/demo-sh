import type { WithSystemFields } from '../table'
import type { SyncStorageAdapter } from './types'

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

	close(): void {
		this.tables.clear()
	}
}

/**
 * Create internal memory adapter instance.
 * @internal
 */
export function createMemoryAdapter(): SyncStorageAdapter {
	return new MemoryAdapter()
}
