import type { TypedDatabaseSchema } from '../types/schema.types'
import type { AnyTableBuilder } from '../types/table.types'
import type {
	Migration,
	MigrationRecord,
	MigrationRunOptions,
	MigrationRunResult,
	MigrationSchema,
	MigrationStatus,
} from './types'
import type { VersionStorage } from './version'
import { InMemoryVersionStorage } from './version'

/**
 * Migration runner for applying and reverting migrations.
 */
export class MigrationRunner<
	Tables extends Record<string, AnyTableBuilder> = Record<
		string,
		AnyTableBuilder
	>,
> {
	private migrations: Migration[]
	private versionStorage: VersionStorage
	private db: TypedDatabaseSchema<Tables>

	constructor(
		db: TypedDatabaseSchema<Tables>,
		migrations: Migration[],
		versionStorage?: VersionStorage,
	) {
		this.db = db
		this.migrations = this.sortMigrations(migrations)
		this.versionStorage = versionStorage ?? new InMemoryVersionStorage()
		this.validateMigrations()
	}

	/**
	 * Get the database as MigrationSchema for passing to migrations.
	 */
	private get migrationDb(): MigrationSchema {
		return this.db as unknown as MigrationSchema
	}

	/**
	 * Sort migrations by version.
	 */
	private sortMigrations(migrations: Migration[]): Migration[] {
		return [...migrations].sort((a, b) => a.version - b.version)
	}

	/**
	 * Validate migration versions are unique and sequential.
	 */
	private validateMigrations(): void {
		const versions = new Set<number>()
		for (const m of this.migrations) {
			if (versions.has(m.version)) {
				throw new Error(`Duplicate migration version: ${m.version}`)
			}
			if (m.version <= 0) {
				throw new Error(
					`Invalid migration version: ${m.version}. Must be positive.`,
				)
			}
			versions.add(m.version)
		}
	}

	/**
	 * Get the current migration status.
	 */
	getStatus(): MigrationStatus {
		const currentVersion = this.versionStorage.getCurrentVersion()
		const targetVersion =
			this.migrations.length > 0
				? Math.max(...this.migrations.map((m) => m.version))
				: 0

		const applied = this.versionStorage.getApplied()
		const appliedVersions = new Set(
			applied.filter((r) => r.success).map((r) => r.version),
		)

		const pending = this.migrations.filter(
			(m) => !appliedVersions.has(m.version),
		)

		return {
			currentVersion,
			targetVersion,
			pending: pending as Migration[],
			applied,
			isUpToDate: pending.length === 0,
		}
	}

	/**
	 * Run migrations up to the target version.
	 *
	 * @param options - Migration options
	 * @returns Migration run result
	 */
	async up(options: MigrationRunOptions = {}): Promise<MigrationRunResult> {
		const {
			targetVersion,
			dryRun = false,
			continueOnError = false,
			onProgress,
		} = options

		const status = this.getStatus()
		const target = targetVersion ?? status.targetVersion

		// Get migrations to apply
		const toApply = status.pending
			.filter((m) => m.version <= target)
			.sort((a, b) => a.version - b.version)

		const result: MigrationRunResult = {
			success: true,
			applied: [],
			failed: [],
			currentVersion: status.currentVersion,
		}

		for (const migration of toApply) {
			onProgress?.({
				type: 'start',
				version: migration.version,
				name: migration.name,
				direction: 'up',
			})

			const startTime = Date.now()

			try {
				if (!dryRun) {
					await migration.up(this.migrationDb)
				}

				const durationMs = Date.now() - startTime
				result.applied.push({
					version: migration.version,
					name: migration.name,
					durationMs,
				})

				if (!dryRun) {
					const record: MigrationRecord = {
						version: migration.version,
						name: migration.name,
						appliedAt: Date.now(),
						success: true,
						durationMs,
					}
					this.versionStorage.recordApplied(record)
					result.currentVersion = migration.version
				}

				onProgress?.({
					type: 'complete',
					version: migration.version,
					name: migration.name,
					direction: 'up',
				})
			} catch (error) {
				const err = error as Error
				result.failed.push({
					version: migration.version,
					name: migration.name,
					error: err.message,
				})
				result.success = false

				if (!dryRun) {
					const record: MigrationRecord = {
						version: migration.version,
						name: migration.name,
						appliedAt: Date.now(),
						success: false,
						error: err.message,
						durationMs: Date.now() - startTime,
					}
					this.versionStorage.recordApplied(record)
				}

				onProgress?.({
					type: 'error',
					version: migration.version,
					name: migration.name,
					direction: 'up',
					error: err,
				})

				if (!continueOnError) {
					break
				}
			}
		}

		return result
	}

	/**
	 * Roll back migrations to the target version.
	 *
	 * @param options - Migration options
	 * @returns Migration run result
	 */
	async down(options: MigrationRunOptions = {}): Promise<MigrationRunResult> {
		const {
			targetVersion = 0,
			dryRun = false,
			continueOnError = false,
			onProgress,
		} = options

		const status = this.getStatus()
		const appliedVersions = new Set(
			status.applied.filter((r) => r.success).map((r) => r.version),
		)

		// Get migrations to roll back (in reverse order)
		const toRollback = this.migrations
			.filter(
				(m) => appliedVersions.has(m.version) && m.version > targetVersion,
			)
			.sort((a, b) => b.version - a.version)

		const result: MigrationRunResult = {
			success: true,
			applied: [],
			failed: [],
			currentVersion: status.currentVersion,
		}

		for (const migration of toRollback) {
			onProgress?.({
				type: 'start',
				version: migration.version,
				name: migration.name,
				direction: 'down',
			})

			const startTime = Date.now()

			try {
				if (!dryRun) {
					await migration.down(this.migrationDb)
				}

				const durationMs = Date.now() - startTime
				result.applied.push({
					version: migration.version,
					name: migration.name,
					durationMs,
				})

				if (!dryRun) {
					this.versionStorage.removeRecord(migration.version)
					result.currentVersion = this.versionStorage.getCurrentVersion()
				}

				onProgress?.({
					type: 'complete',
					version: migration.version,
					name: migration.name,
					direction: 'down',
				})
			} catch (error) {
				const err = error as Error
				result.failed.push({
					version: migration.version,
					name: migration.name,
					error: err.message,
				})
				result.success = false

				onProgress?.({
					type: 'error',
					version: migration.version,
					name: migration.name,
					direction: 'down',
					error: err,
				})

				if (!continueOnError) {
					break
				}
			}
		}

		return result
	}

	/**
	 * Run all pending migrations.
	 */
	async latest(
		options?: Omit<MigrationRunOptions, 'targetVersion'>,
	): Promise<MigrationRunResult> {
		return this.up(options)
	}

	/**
	 * Roll back all migrations.
	 */
	async reset(
		options?: Omit<MigrationRunOptions, 'targetVersion'>,
	): Promise<MigrationRunResult> {
		return this.down({ ...options, targetVersion: 0 })
	}

	/**
	 * Roll back the last N migrations.
	 */
	async rollback(
		steps = 1,
		options?: Omit<MigrationRunOptions, 'targetVersion'>,
	): Promise<MigrationRunResult> {
		const status = this.getStatus()
		const appliedVersions = status.applied
			.filter((r) => r.success)
			.map((r) => r.version)
			.sort((a, b) => b - a)

		const targetIndex = Math.min(steps, appliedVersions.length)
		const targetVersion =
			targetIndex < appliedVersions.length ? appliedVersions[targetIndex] : 0

		return this.down({ ...options, targetVersion })
	}

	/**
	 * Add a migration to the registry.
	 */
	addMigration(migration: Migration): void {
		if (this.migrations.some((m) => m.version === migration.version)) {
			throw new Error(`Migration version ${migration.version} already exists`)
		}
		this.migrations.push(migration)
		this.migrations = this.sortMigrations(this.migrations)
	}
}

/**
 * Create a migration runner.
 */
export function createMigrationRunner<
	Tables extends Record<string, AnyTableBuilder>,
>(
	db: TypedDatabaseSchema<Tables>,
	migrations: Migration[],
	versionStorage?: VersionStorage,
): MigrationRunner<Tables> {
	return new MigrationRunner(db, migrations, versionStorage)
}

/**
 * Define a migration with type safety.
 */
export function defineMigration(migration: Migration): Migration {
	return migration
}
