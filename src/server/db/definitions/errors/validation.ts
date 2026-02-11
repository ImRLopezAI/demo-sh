import type { z } from 'zod'
import { DatabaseError } from './base'

/**
 * Error thrown when data validation fails.
 * This includes Zod schema validation errors.
 */
export class ValidationError extends DatabaseError {
	/** Zod validation issues if available */
	readonly issues?: z.ZodIssue[]
	/** Field that failed validation (if single field) */
	readonly field?: string
	/** Expected type or format */
	readonly expected?: string
	/** Received value or type */
	readonly received?: unknown

	constructor(
		message: string,
		options: {
			code?: string
			tableName?: string
			documentId?: string
			operation?: string
			issues?: z.ZodIssue[]
			field?: string
			expected?: string
			received?: unknown
			cause?: Error
		} = {},
	) {
		super(message, {
			...options,
			code: options.code ?? 'VALIDATION_ERROR',
		})
		this.name = 'ValidationError'
		this.issues = options.issues
		this.field = options.field
		this.expected = options.expected
		this.received = options.received
	}

	/**
	 * Create a ValidationError from a Zod error.
	 */
	static fromZodError(
		zodError: z.ZodError,
		options: {
			tableName?: string
			documentId?: string
			operation?: string
		} = {},
	): ValidationError {
		const message = zodError.issues
			.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
			.join('; ')

		return new ValidationError(message, {
			...options,
			issues: zodError.issues,
			cause: zodError,
		})
	}
}

/**
 * Error thrown when a schema definition is invalid.
 */
export class SchemaError extends DatabaseError {
	/** Schema element that has the issue */
	readonly element?: string
	/** Details about what's wrong with the schema */
	readonly details?: string

	constructor(
		message: string,
		options: {
			code?: string
			tableName?: string
			element?: string
			details?: string
			cause?: Error
		} = {},
	) {
		super(message, {
			...options,
			code: options.code ?? 'SCHEMA_ERROR',
		})
		this.name = 'SchemaError'
		this.element = options.element
		this.details = options.details
	}
}

/**
 * Error thrown when a relation definition is invalid.
 */
export class RelationError extends SchemaError {
	/** Source table of the relation */
	readonly fromTable?: string
	/** Target table of the relation */
	readonly toTable?: string
	/** Relation name */
	readonly relationName?: string

	constructor(
		message: string,
		options: {
			tableName?: string
			fromTable?: string
			toTable?: string
			relationName?: string
			element?: string
			details?: string
			cause?: Error
		} = {},
	) {
		super(message, {
			...options,
			code: 'RELATION_ERROR',
		})
		this.name = 'RelationError'
		this.fromTable = options.fromTable
		this.toTable = options.toTable
		this.relationName = options.relationName
	}
}

/**
 * Error thrown when a circular dependency is detected.
 */
export class CircularDependencyError extends SchemaError {
	/** Tables involved in the circular dependency */
	readonly cycle: string[]

	constructor(
		cycle: string[],
		options: {
			details?: string
		} = {},
	) {
		super(`Circular dependency detected: ${cycle.join(' -> ')}`, {
			...options,
			code: 'CIRCULAR_DEPENDENCY',
		})
		this.name = 'CircularDependencyError'
		this.cycle = cycle
	}
}

/**
 * Error thrown when a type mismatch occurs.
 */
export class TypeMismatchError extends ValidationError {
	constructor(options: {
		tableName?: string
		field: string
		expected: string
		received: unknown
		documentId?: string
		operation?: string
	}) {
		const receivedType = typeof options.received
		super(
			`Type mismatch for ${options.field}: expected ${options.expected}, received ${receivedType}`,
			{
				...options,
				code: 'TYPE_MISMATCH',
			},
		)
		this.name = 'TypeMismatchError'
	}
}

/**
 * Error thrown when a required field is missing.
 */
export class RequiredFieldError extends ValidationError {
	constructor(options: {
		tableName?: string
		field: string
		documentId?: string
		operation?: string
	}) {
		super(`Required field missing: ${options.field}`, {
			...options,
			code: 'REQUIRED_FIELD',
		})
		this.name = 'RequiredFieldError'
	}
}
