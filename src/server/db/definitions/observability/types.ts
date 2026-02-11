/**
 * Query event information.
 */
export interface QueryEvent {
	/** Table being queried */
	tableName: string
	/** Type of query operation */
	operation:
		| 'findMany'
		| 'findFirst'
		| 'toArray'
		| 'get'
		| 'query'
		| 'filter'
		| 'find'
		| 'search'
		| 'paginate'
	/** Duration in milliseconds */
	durationMs: number
	/** Number of results returned */
	resultCount: number
	/** Query options (sanitized) */
	options?: {
		hasWhere: boolean
		hasOrderBy: boolean
		limit?: number
		offset?: number
		hasColumns: boolean
		hasRelations: boolean
	}
}

/**
 * Mutation event information.
 */
export interface MutationEvent {
	/** Table being mutated */
	tableName: string
	/** Type of mutation */
	operation:
		| 'insert'
		| 'update'
		| 'delete'
		| 'clear'
		| 'insertMany'
		| 'updateMany'
		| 'deleteMany'
	/** Document ID (for single operations) */
	documentId?: string
	/** Duration in milliseconds */
	durationMs: number
	/** Whether the operation succeeded */
	success: boolean
	/** Number of affected documents (for batch operations) */
	affectedCount?: number
}

/**
 * Error event information.
 */
export interface ErrorEvent {
	/** Table where error occurred */
	tableName: string
	/** Operation that caused the error */
	operation: string
	/** The error that occurred */
	error: Error
	/** Document ID if applicable */
	documentId?: string
	/** Additional context */
	context?: Record<string, unknown>
}

/**
 * Performance metrics for a table.
 */
export interface TableMetrics {
	/** Table name */
	tableName: string
	/** Total queries executed */
	queryCount: number
	/** Total mutations executed */
	mutationCount: number
	/** Total errors */
	errorCount: number
	/** Average query duration in ms */
	avgQueryDurationMs: number
	/** Average mutation duration in ms */
	avgMutationDurationMs: number
	/** Current document count */
	documentCount: number
}

/**
 * Hooks for observability/monitoring.
 */
export interface ObservabilityHooks {
	/**
	 * Called after a query operation completes.
	 *
	 * @param event - Query event information
	 */
	onQuery?: (event: QueryEvent) => void

	/**
	 * Called after a mutation operation completes.
	 *
	 * @param event - Mutation event information
	 */
	onMutation?: (event: MutationEvent) => void

	/**
	 * Called when an error occurs.
	 *
	 * @param event - Error event information
	 */
	onError?: (event: ErrorEvent) => void

	/**
	 * Called when metrics are updated.
	 *
	 * @param metrics - Current table metrics
	 */
	onMetrics?: (metrics: TableMetrics) => void
}

/**
 * Configuration for observability.
 */
export interface ObservabilityConfig {
	/** Enable/disable observability */
	enabled?: boolean
	/** Hooks for events */
	hooks?: ObservabilityHooks
	/** Whether to track detailed metrics */
	trackMetrics?: boolean
	/** Sample rate for logging (0.0 to 1.0) */
	sampleRate?: number
	/** Log level for console output */
	logLevel?: 'debug' | 'info' | 'warn' | 'error' | 'none'
}
