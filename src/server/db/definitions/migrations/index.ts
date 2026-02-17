/**
 * Schema migration utilities.
 * @module migrations
 */

// Adapter-backed version storage
export {
	AdapterVersionStorage,
	createAdapterVersionStorage,
} from './adapter-version-storage'
// Migration generator
export { generateMigration } from './migration-generator'
// Migration runner
export {
	createMigrationRunner,
	createPersistentMigrationRunner,
	defineMigration,
	MigrationRunner,
} from './runner'
// Schema diffing
export {
	diffSchemas,
	type FieldSnapshot,
	type SchemaDiff,
	type SchemaDiffType,
	type SchemaSnapshot,
	snapshotSchema,
	type TableSnapshot as SchemaTableSnapshot,
} from './schema-diff'
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
