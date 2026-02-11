/**
 * Base schema interface for migrations.
 * This is a simplified interface that works with any schema.
 */
export interface MigrationSchema {
	schemas: Record<string, MigrationTable>
	clear: () => void
}

/**
 * Base table interface for migrations.
 * Provides the essential CRUD operations needed for migrations.
 */
export interface MigrationTable {
	insert: (
		item: Record<string, unknown>,
	) => { _id: string } & Record<string, unknown>
	update: (
		id: string,
		updates: Record<string, unknown>,
	) => Record<string, unknown> | undefined
	delete: (id: string) => boolean
	get: (id: string) => Record<string, unknown> | undefined
	toArray: () => Array<{ _id: string } & Record<string, unknown>>
	findMany: (options?: {
		where?: (item: Record<string, unknown>) => boolean
	}) => Array<{ _id: string } & Record<string, unknown>>
	clear: () => void
}

/**
 * Migration definition.
 * Uses a simplified schema interface for maximum compatibility.
 */
export interface Migration {
	/** Migration version number (must be unique and sequential) */
	version: number
	/** Human-readable name for the migration */
	name: string
	/**
	 * Apply the migration.
	 *
	 * @param db - The database schema instance
	 */
	up: (db: MigrationSchema) => Promise<void> | void
	/**
	 * Revert the migration.
	 *
	 * @param db - The database schema instance
	 */
	down: (db: MigrationSchema) => Promise<void> | void
}

/**
 * Migration record stored in the _migrations table.
 */
export interface MigrationRecord {
	/** Migration version */
	version: number
	/** Migration name */
	name: string
	/** Timestamp when migration was applied */
	appliedAt: number
	/** Whether the migration completed successfully */
	success: boolean
	/** Error message if migration failed */
	error?: string
	/** Duration in milliseconds */
	durationMs?: number
}

/**
 * Migration status.
 */
export interface MigrationStatus {
	/** Current schema version */
	currentVersion: number
	/** Target version (highest available migration) */
	targetVersion: number
	/** Pending migrations to apply */
	pending: Migration[]
	/** Applied migrations */
	applied: MigrationRecord[]
	/** Whether the schema is up to date */
	isUpToDate: boolean
}

/**
 * Migration run result.
 */
export interface MigrationRunResult {
	/** Whether the run was successful */
	success: boolean
	/** Migrations that were applied */
	applied: Array<{
		version: number
		name: string
		durationMs: number
	}>
	/** Migrations that failed */
	failed: Array<{
		version: number
		name: string
		error: string
	}>
	/** Current version after the run */
	currentVersion: number
}

/**
 * Options for running migrations.
 */
export interface MigrationRunOptions {
	/** Target version to migrate to (default: latest) */
	targetVersion?: number
	/** Run migrations in dry-run mode (don't actually apply) */
	dryRun?: boolean
	/** Continue on error instead of stopping */
	continueOnError?: boolean
	/** Callback for progress updates */
	onProgress?: (event: {
		type: 'start' | 'complete' | 'error'
		version: number
		name: string
		direction: 'up' | 'down'
		error?: Error
	}) => void
}
