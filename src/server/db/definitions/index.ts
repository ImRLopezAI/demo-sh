/**
 * Database schema definitions and utilities.
 *
 * @example
 * ```ts
 * // Basic usage (backward compatible)
 * import { defineSchema, redisAdapter } from '@server/db/definitions'
 *
 * // New module imports
 * import { DatabaseError, UniqueConstraintError } from '@server/db/definitions/errors'
 * import { QueryBuilder } from '@server/db/definitions/query'
 * import type { TablePlugin } from '@server/db/definitions/plugins'
 * ```
 */

// ============================================================================
// Core exports (backward compatible)
// ============================================================================

// Adapters
export { redisAdapter } from './adapters'
// Main defineSchema function
export { defineSchema, flowField } from './schema'

// ============================================================================
// Type exports (from types module)
// ============================================================================

export {
	type AnyLegacyTableBuilder,
	type AnyTableBuilder,
	type AnyTypedSetupTableBuilder,
	type AnyTypedTableBuilder,
	type AsyncDatabaseSchema,
	type AsyncTableWithSchemas,
	type BatchOperations,
	type ComputedFn,
	type CursorPaginationOptions,
	type DatabaseSchema,
	type DerivedView,
	// Field types
	FIELD_TYPES,
	type FieldMeta,
	type FieldType,
	type FlowFieldConfig,
	type FlowFieldContext,
	type FlowFieldDef,
	type FlowFieldType,
	type HistoryOperations,
	// Table types
	type IdHelper,
	type IndexDefinition,
	type OrderByClause,
	// Query types
	type OrderDirection,
	type QueryHelpers,
	type QueryOptions,
	type RelationField,
	type SchemaContext,
	type SchemaInput,
	type SchemaOptions,
	// Schema types
	type SeedConfig,
	type SetupTableApi,
	type TableBuilder,
	type TableDefinition,
	type TableWithSchemas,
	type TypedDatabaseSchema,
	type TypedOneHelper,
	type TypedSchemaFn,
	type TypedSetupTableBuilder,
	type TypedTableBuilder,
	type TypedTableConfig,
	type TypedTableDef,
	type TypedTableMap,
	type TypedTableMapWithRelations,
	type TypedTableWithRelations,
	type TypedTableWithSchemas,
	type TypedTransactionOp,
	type UniqueConstraintDefinition,
	type WithConfig,
	type ZodShape,
} from './types'

// ============================================================================
// Error exports
// ============================================================================

export {
	AdapterNotReadyError,
	CheckConstraintError,
	CircularDependencyError,
	ConnectionError,
	// Constraint errors
	ConstraintError,
	// Base errors
	DatabaseError,
	DocumentNotFoundError,
	ForeignKeyError,
	NotImplementedError,
	NotNullConstraintError,
	RelationError,
	RequiredFieldError,
	RollbackError,
	SchemaError,
	// Storage errors
	StorageError,
	TableNotFoundError,
	TimeoutError,
	TransactionError,
	TypeMismatchError,
	UniqueConstraintError,
	// Validation errors
	ValidationError,
} from './errors'

// ============================================================================
// Table and relations (existing)
// ============================================================================

export type {
	RelationsCallback,
	RelationsContext,
	RelationsSchema,
	TableRelations,
} from './relations'
export type {
	TableIndex,
	TableSnapshot,
	UniqueConstraint,
	WithSystemFields,
} from './table'

// ============================================================================
// Plugin exports
// ============================================================================

export type {
	PluginContext,
	PluginHookResult,
	SchemaPluginConfig,
	TablePlugin,
	TablePluginConfig,
} from './plugins'

export { createPluginManager, PluginHookManager } from './plugins'

// ============================================================================
// Observability exports
// ============================================================================

export type {
	ErrorEvent,
	MutationEvent,
	ObservabilityConfig,
	ObservabilityHooks,
	QueryEvent,
	TableMetrics,
} from './observability'

// ============================================================================
// Schema API types (Plugin and Observability APIs)
// ============================================================================

export type { ObservabilityApi, PluginApi } from './types'
