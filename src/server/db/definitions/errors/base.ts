/**
 * Base error class for all database-related errors.
 * Provides consistent error structure with operation context.
 */
export class DatabaseError extends Error {
	/** Error code for programmatic handling */
	readonly code: string
	/** Table name where the error occurred */
	readonly tableName?: string
	/** Document ID involved in the error */
	readonly documentId?: string
	/** Operation that caused the error */
	readonly operation?: string
	/** Original error if this wraps another error */
	readonly cause?: Error

	constructor(
		message: string,
		options: {
			code?: string
			tableName?: string
			documentId?: string
			operation?: string
			cause?: Error
		} = {},
	) {
		super(message)
		this.name = 'DatabaseError'
		this.code = options.code ?? 'DATABASE_ERROR'
		this.tableName = options.tableName
		this.documentId = options.documentId
		this.operation = options.operation
		this.cause = options.cause

		// Capture stack trace
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, this.constructor)
		}
	}

	/**
	 * Create a JSON representation of the error.
	 */
	toJSON(): Record<string, unknown> {
		return {
			name: this.name,
			message: this.message,
			code: this.code,
			tableName: this.tableName,
			documentId: this.documentId,
			operation: this.operation,
			stack: this.stack,
		}
	}
}

/**
 * Error thrown when an operation is not supported.
 */
export class NotImplementedError extends DatabaseError {
	constructor(
		feature: string,
		options: {
			tableName?: string
			operation?: string
		} = {},
	) {
		super(`Feature not implemented: ${feature}`, {
			code: 'NOT_IMPLEMENTED',
			...options,
		})
		this.name = 'NotImplementedError'
	}
}

/**
 * Error thrown when an operation times out.
 */
export class TimeoutError extends DatabaseError {
	/** Timeout duration in milliseconds */
	readonly timeoutMs: number

	constructor(
		message: string,
		timeoutMs: number,
		options: {
			tableName?: string
			documentId?: string
			operation?: string
		} = {},
	) {
		super(message, {
			code: 'TIMEOUT',
			...options,
		})
		this.name = 'TimeoutError'
		this.timeoutMs = timeoutMs
	}
}
