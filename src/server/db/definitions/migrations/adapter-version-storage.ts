import type { SyncStorageAdapter } from '../adapters/types'
import type { WithSystemFields } from '../table'
import type { MigrationRecord } from './types'
import type { VersionStorage } from './version'

// ============================================================================
// Adapter-backed version storage (Phase 6)
// ============================================================================

const MIGRATION_TABLE = '_migrations'

/**
 * VersionStorage backed by a SyncStorageAdapter.
 * Stores migration records in a '_migrations' namespace within the adapter,
 * ensuring migration state persists alongside the data.
 */
export class AdapterVersionStorage implements VersionStorage {
	constructor(private adapter: SyncStorageAdapter) {}

	getApplied(): MigrationRecord[] {
		const docs = this.adapter.getAll<MigrationRecord>(MIGRATION_TABLE) as WithSystemFields<MigrationRecord>[]
		return docs
			.map((doc) => ({
				version: doc.version,
				name: doc.name,
				appliedAt: doc.appliedAt,
				success: doc.success,
				durationMs: doc.durationMs,
				error: doc.error,
			}))
			.sort((a, b) => a.version - b.version)
	}

	getCurrentVersion(): number {
		const applied = this.getApplied().filter((r) => r.success)
		if (applied.length === 0) return 0
		return Math.max(...applied.map((r) => r.version))
	}

	recordApplied(record: MigrationRecord): void {
		// Remove any existing record for this version
		const existing = this.adapter.getAll<MigrationRecord>(MIGRATION_TABLE) as WithSystemFields<MigrationRecord>[]
		const existingRecord = existing.find((r) => r.version === record.version)
		if (existingRecord) {
			this.adapter.delete(MIGRATION_TABLE, existingRecord._id)
		}

		// Insert new record
		const id = `migration_v${record.version}`
		this.adapter.set(MIGRATION_TABLE, id, {
			_id: id,
			_createdAt: Date.now(),
			_updatedAt: Date.now(),
			...record,
		} as WithSystemFields<MigrationRecord>)
	}

	removeRecord(version: number): void {
		const existing = this.adapter.getAll<MigrationRecord>(MIGRATION_TABLE) as WithSystemFields<MigrationRecord>[]
		const record = existing.find((r) => r.version === version)
		if (record) {
			this.adapter.delete(MIGRATION_TABLE, record._id)
		}
	}

	clear(): void {
		this.adapter.clear(MIGRATION_TABLE)
	}
}

/**
 * Create an adapter-backed version storage.
 */
export function createAdapterVersionStorage(
	adapter: SyncStorageAdapter,
): VersionStorage {
	return new AdapterVersionStorage(adapter)
}
