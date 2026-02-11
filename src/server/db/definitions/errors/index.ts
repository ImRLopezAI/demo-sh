/**
 * Database error classes for typed error handling.
 * @module errors
 */

// Base errors
export {
	DatabaseError,
	NotImplementedError,
	TimeoutError,
} from './base'
// Constraint errors
export {
	CheckConstraintError,
	ConstraintError,
	ForeignKeyError,
	NotNullConstraintError,
	UniqueConstraintError,
} from './constraint'
// Storage errors
export {
	AdapterNotReadyError,
	ConnectionError,
	DocumentNotFoundError,
	RollbackError,
	StorageError,
	TableNotFoundError,
	TransactionError,
} from './storage'

// Validation errors
export {
	CircularDependencyError,
	RelationError,
	RequiredFieldError,
	SchemaError,
	TypeMismatchError,
	ValidationError,
} from './validation'
