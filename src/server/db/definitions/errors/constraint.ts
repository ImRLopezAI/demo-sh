import { DatabaseError } from './base'

/**
 * Error thrown when a constraint is violated.
 * Base class for all constraint-related errors.
 */
export class ConstraintError extends DatabaseError {
	/** Name of the constraint that was violated */
	readonly constraintName?: string

	constructor(
		message: string,
		options: {
			code?: string
			constraintName?: string
			tableName?: string
			documentId?: string
			operation?: string
			cause?: Error
		} = {},
	) {
		super(message, {
			...options,
			code: options.code ?? 'CONSTRAINT_ERROR',
		})
		this.name = 'ConstraintError'
		this.constraintName = options.constraintName
	}
}

/**
 * Error thrown when a unique constraint is violated.
 * Includes details about which fields caused the violation.
 */
export class UniqueConstraintError extends ConstraintError {
	/** Fields that form the unique constraint */
	readonly fields: string[]
	/** Values that caused the violation */
	readonly values?: Record<string, unknown>
	/** ID of the existing document that has the same values */
	readonly existingDocumentId?: string

	constructor(options: {
		constraintName?: string
		tableName: string
		fields: string[]
		values?: Record<string, unknown>
		existingDocumentId?: string
		documentId?: string
		operation?: string
	}) {
		const fieldsStr = options.fields.join(', ')
		const message = options.constraintName
			? `Unique constraint "${options.constraintName}" violated on table ${options.tableName}`
			: `Unique constraint violated on fields (${fieldsStr}) in table ${options.tableName}`

		super(message, {
			...options,
			code: 'UNIQUE_CONSTRAINT_ERROR',
		})
		this.name = 'UniqueConstraintError'
		this.fields = options.fields
		this.values = options.values
		this.existingDocumentId = options.existingDocumentId
	}
}

/**
 * Error thrown when a foreign key constraint is violated.
 * This includes both reference failures and cascade failures.
 */
export class ForeignKeyError extends ConstraintError {
	/** Field containing the foreign key */
	readonly field: string
	/** Table being referenced */
	readonly referencedTable: string
	/** Field being referenced in the target table */
	readonly referencedField: string
	/** The foreign key value that caused the violation */
	readonly value?: unknown
	/** Type of violation: 'missing' (reference not found) or 'restrict' (delete blocked) */
	readonly violationType: 'missing' | 'restrict'

	constructor(options: {
		tableName: string
		field: string
		referencedTable: string
		referencedField: string
		value?: unknown
		violationType: 'missing' | 'restrict'
		documentId?: string
		operation?: string
	}) {
		const message =
			options.violationType === 'missing'
				? `Foreign key constraint violated: ${options.tableName}.${options.field} references ${options.referencedTable}.${options.referencedField}, but referenced record not found`
				: `Cannot delete ${options.referencedTable} record: referenced by ${options.tableName}.${options.field} with restrict constraint`

		super(message, {
			tableName: options.tableName,
			documentId: options.documentId,
			operation: options.operation,
			code: 'FOREIGN_KEY_ERROR',
		})
		this.name = 'ForeignKeyError'
		this.field = options.field
		this.referencedTable = options.referencedTable
		this.referencedField = options.referencedField
		this.value = options.value
		this.violationType = options.violationType
	}
}

/**
 * Error thrown when a check constraint is violated.
 */
export class CheckConstraintError extends ConstraintError {
	/** The check expression that failed */
	readonly expression?: string

	constructor(
		message: string,
		options: {
			constraintName?: string
			tableName?: string
			expression?: string
			documentId?: string
			operation?: string
		} = {},
	) {
		super(message, {
			...options,
			code: 'CHECK_CONSTRAINT_ERROR',
		})
		this.name = 'CheckConstraintError'
		this.expression = options.expression
	}
}

/**
 * Error thrown when a not-null constraint is violated.
 */
export class NotNullConstraintError extends ConstraintError {
	/** Field that violated the not-null constraint */
	readonly field: string

	constructor(options: {
		tableName: string
		field: string
		documentId?: string
		operation?: string
	}) {
		super(
			`Not-null constraint violated: ${options.tableName}.${options.field} cannot be null`,
			{
				tableName: options.tableName,
				documentId: options.documentId,
				operation: options.operation,
				code: 'NOT_NULL_CONSTRAINT_ERROR',
			},
		)
		this.name = 'NotNullConstraintError'
		this.field = options.field
	}
}
