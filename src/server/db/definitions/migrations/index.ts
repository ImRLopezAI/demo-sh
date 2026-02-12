/**
 * Schema migration utilities.
 * @module migrations
 */

// Migration runner
export {
	createMigrationRunner,
	createPersistentMigrationRunner,
	defineMigration,
	MigrationRunner,
} from './runner'
// Migration generator
export { generateMigration } from './migration-generator'
// Schema diffing
export {
	diffSchemas,
	snapshotSchema,
	type FieldSnapshot,
	type SchemaDiff,
	type SchemaDiffType,
	type SchemaSnapshot,
	type TableSnapshot as SchemaTableSnapshot,
} from './schema-diff'
// Adapter-backed version storage
export {
	AdapterVersionStorage,
	createAdapterVersionStorage,
} from './adapter-version-storage'
// Types
export type {
	Migration,
	MigrationRecord,
	MigrationRunOptions,
	MigrationRunResult,
	MigrationStatus,
} from './types'
// Version storage
export {
	createInMemoryVersionStorage,
	createTableVersionStorage,
	InMemoryVersionStorage,
	TableVersionStorage,
	type VersionStorage,
} from './version'
