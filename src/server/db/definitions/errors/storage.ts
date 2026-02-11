import { DatabaseError } from './base'

/**
 * Error thrown when storage operations fail.
 * This includes adapter-level failures like read/write errors.
 */
export class StorageError extends DatabaseError {
	/** Adapter type (memory, redis, etc.) */
	readonly adapterType?: string

	constructor(
		message: string,
		options: {
			code?: string
			adapterType?: string
			tableName?: string
			documentId?: string
			operation?: string
			cause?: Error
		} = {},
	) {
		super(message, {
			...options,
			code: options.code ?? 'STORAGE_ERROR',
		})
		this.name = 'StorageError'
		this.adapterType = options.adapterType
	}
}

/**
 * Error thrown when connection to storage fails.
 */
export class ConnectionError extends StorageError {
	/** Host/URL that failed to connect */
	readonly host?: string
	/** Port that failed to connect */
	readonly port?: number

	constructor(
		message: string,
		options: {
			host?: string
			port?: number
			adapterType?: string
			cause?: Error
		} = {},
	) {
		super(message, {
			...options,
			code: 'CONNECTION_ERROR',
		})
		this.name = 'ConnectionError'
		this.host = options.host
		this.port = options.port
	}
}

/**
 * Error thrown when adapter is not ready for operations.
 */
export class AdapterNotReadyError extends StorageError {
	constructor(
		adapterType: string,
		options: {
			tableName?: string
			operation?: string
		} = {},
	) {
		super(`Adapter ${adapterType} is not ready. Did you call init()?`, {
			adapterType,
			...options,
			code: 'ADAPTER_NOT_READY',
		})
		this.name = 'AdapterNotReadyError'
	}
}

/**
 * Error thrown when adapter operations fail during transaction.
 */
export class TransactionError extends StorageError {
	/** Operations that were attempted in the transaction */
	readonly operations?: Array<{
		type: string
		tableName: string
		documentId?: string
	}>

	constructor(
		message: string,
		options: {
			adapterType?: string
			operations?: Array<{
				type: string
				tableName: string
				documentId?: string
			}>
			cause?: Error
		} = {},
	) {
		super(message, {
			...options,
			code: 'TRANSACTION_ERROR',
		})
		this.name = 'TransactionError'
		this.operations = options.operations
	}
}

/**
 * Error thrown when a rollback fails.
 */
export class RollbackError extends StorageError {
	/** Original error that triggered the rollback */
	readonly originalError?: Error

	constructor(
		message: string,
		options: {
			adapterType?: string
			tableName?: string
			originalError?: Error
			cause?: Error
		} = {},
	) {
		super(message, {
			...options,
			code: 'ROLLBACK_ERROR',
		})
		this.name = 'RollbackError'
		this.originalError = options.originalError
	}
}

/**
 * Error thrown when a document is not found.
 */
export class DocumentNotFoundError extends StorageError {
	constructor(
		tableName: string,
		documentId: string,
		options: {
			adapterType?: string
			operation?: string
		} = {},
	) {
		super(`Document ${documentId} not found in table ${tableName}`, {
			tableName,
			documentId,
			...options,
			code: 'DOCUMENT_NOT_FOUND',
		})
		this.name = 'DocumentNotFoundError'
	}
}

/**
 * Error thrown when a table is not found.
 */
export class TableNotFoundError extends StorageError {
	constructor(
		tableName: string,
		options: {
			adapterType?: string
			operation?: string
		} = {},
	) {
		super(`Table ${tableName} not found`, {
			tableName,
			...options,
			code: 'TABLE_NOT_FOUND',
		})
		this.name = 'TableNotFoundError'
	}
}
