/**
 * Core schema definition and table creation utilities.
 * @module core
 */

// Query helpers
export {
	applyColumnSelection,
	applyOrdering,
	applyPagination,
	applyWhereFilter,
	createQueryHelpers,
	executeQuery,
} from './query-helpers'

// Table builder
export {
	createTableDefinition,
	createTypedOneHelper,
	createTypedSetupTableBuilder,
	createTypedTableBuilder,
	extractIndexes,
	extractUniqueConstraints,
} from './table-builder'

// Wrapped table
export {
	createSetupTableWrapper,
	createWrappedTable,
	type WrappedTableConfig,
} from './wrapped-table'
