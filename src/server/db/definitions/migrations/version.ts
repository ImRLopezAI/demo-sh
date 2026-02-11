import type { MigrationRecord } from './types'

/**
 * Interface for version tracking storage.
 */
export interface VersionStorage {
	/** Get all applied migration records */
	getApplied(): MigrationRecord[]
	/** Get the current version (highest applied migration) */
	getCurrentVersion(): number
	/** Record a migration as applied */
	recordApplied(record: MigrationRecord): void
	/** Remove a migration record (for rollback) */
	removeRecord(version: number): void
	/** Clear all migration records */
	clear(): void
}

/**
 * In-memory version storage.
 * Used when no persistent storage is available.
 */
export class InMemoryVersionStorage implements VersionStorage {
	private records: MigrationRecord[] = []

	getApplied(): MigrationRecord[] {
		return [...this.records].sort((a, b) => a.version - b.version)
	}

	getCurrentVersion(): number {
		if (this.records.length === 0) return 0
		return Math.max(
			...this.records.filter((r) => r.success).map((r) => r.version),
		)
	}

	recordApplied(record: MigrationRecord): void {
		// Remove any existing record for this version
		this.records = this.records.filter((r) => r.version !== record.version)
		this.records.push(record)
	}

	removeRecord(version: number): void {
		this.records = this.records.filter((r) => r.version !== version)
	}

	clear(): void {
		this.records = []
	}
}

/**
 * Version storage backed by a database table.
 * Uses the _migrations internal table.
 */
export class TableVersionStorage implements VersionStorage {
	private table: {
		toArray: () => MigrationRecord[]
		insert: (
			record: Omit<MigrationRecord, '_id' | '_createdAt' | '_updatedAt'>,
		) => unknown
		delete: (id: string) => boolean
		find: (
			predicate: (r: MigrationRecord) => boolean,
		) => (MigrationRecord & { _id: string }) | undefined
		clear: () => void
	}

	constructor(table: TableVersionStorage['table']) {
		this.table = table
	}

	getApplied(): MigrationRecord[] {
		return this.table.toArray().sort((a, b) => a.version - b.version)
	}

	getCurrentVersion(): number {
		const applied = this.table.toArray().filter((r) => r.success)
		if (applied.length === 0) return 0
		return Math.max(...applied.map((r) => r.version))
	}

	recordApplied(record: MigrationRecord): void {
		// Remove any existing record for this version
		const existing = this.table.find((r) => r.version === record.version)
		if (existing) {
			this.table.delete(existing._id)
		}
		this.table.insert(record)
	}

	removeRecord(version: number): void {
		const existing = this.table.find((r) => r.version === version)
		if (existing) {
			this.table.delete(existing._id)
		}
	}

	clear(): void {
		this.table.clear()
	}
}

/**
 * Create an in-memory version storage.
 */
export function createInMemoryVersionStorage(): VersionStorage {
	return new InMemoryVersionStorage()
}

/**
 * Create a table-backed version storage.
 */
export function createTableVersionStorage(
	table: TableVersionStorage['table'],
): VersionStorage {
	return new TableVersionStorage(table)
}
