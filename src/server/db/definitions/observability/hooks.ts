import type {
	ErrorEvent,
	MutationEvent,
	ObservabilityConfig,
	ObservabilityHooks,
	QueryEvent,
	TableMetrics,
} from './types'

/**
 * Internal metrics storage for a table.
 */
interface InternalMetrics {
	queryCount: number
	mutationCount: number
	errorCount: number
	totalQueryDurationMs: number
	totalMutationDurationMs: number
}

/**
 * Observability manager for tracking database operations.
 */
export class ObservabilityManager {
	private config: Required<ObservabilityConfig>
	private hooks: ObservabilityHooks
	private metrics: Map<string, InternalMetrics> = new Map()
	private documentCounts: Map<string, () => number> = new Map()

	constructor(config: ObservabilityConfig = {}) {
		this.config = {
			enabled: config.enabled ?? true,
			hooks: config.hooks ?? {},
			trackMetrics: config.trackMetrics ?? true,
			sampleRate: config.sampleRate ?? 1.0,
			logLevel: config.logLevel ?? 'none',
		}
		this.hooks = this.config.hooks
	}

	/**
	 * Check if observability is enabled.
	 */
	isEnabled(): boolean {
		return this.config.enabled
	}

	/**
	 * Set hooks for observability.
	 */
	setHooks(hooks: ObservabilityHooks): void {
		this.hooks = hooks
	}

	/**
	 * Register a table for metrics tracking.
	 */
	registerTable(tableName: string, getCount: () => number): void {
		if (!this.metrics.has(tableName)) {
			this.metrics.set(tableName, {
				queryCount: 0,
				mutationCount: 0,
				errorCount: 0,
				totalQueryDurationMs: 0,
				totalMutationDurationMs: 0,
			})
		}
		this.documentCounts.set(tableName, getCount)
	}

	/**
	 * Check if we should sample this event.
	 */
	private shouldSample(): boolean {
		return Math.random() < this.config.sampleRate
	}

	/**
	 * Get or create metrics for a table.
	 */
	private getMetrics(tableName: string): InternalMetrics {
		let m = this.metrics.get(tableName)
		if (!m) {
			m = {
				queryCount: 0,
				mutationCount: 0,
				errorCount: 0,
				totalQueryDurationMs: 0,
				totalMutationDurationMs: 0,
			}
			this.metrics.set(tableName, m)
		}
		return m
	}

	/**
	 * Log a message based on log level.
	 */
	private log(
		level: 'debug' | 'info' | 'warn' | 'error',
		message: string,
		data?: unknown,
	): void {
		if (this.config.logLevel === 'none') return

		const levels = ['debug', 'info', 'warn', 'error']
		const configLevel = levels.indexOf(this.config.logLevel)
		const msgLevel = levels.indexOf(level)

		if (msgLevel >= configLevel) {
			const prefix = `[db:${level}]`
			if (data) {
				console[level](prefix, message, data)
			} else {
				console[level](prefix, message)
			}
		}
	}

	/**
	 * Record a query event.
	 */
	recordQuery(event: QueryEvent): void {
		if (!this.config.enabled) return

		// Update metrics
		if (this.config.trackMetrics) {
			const m = this.getMetrics(event.tableName)
			m.queryCount++
			m.totalQueryDurationMs += event.durationMs
		}

		// Log
		this.log('debug', `Query ${event.tableName}.${event.operation}`, {
			duration: `${event.durationMs}ms`,
			results: event.resultCount,
		})

		// Call hook
		if (this.shouldSample() && this.hooks.onQuery) {
			try {
				this.hooks.onQuery(event)
			} catch (error) {
				console.error('Error in onQuery hook:', error)
			}
		}
	}

	/**
	 * Record a mutation event.
	 */
	recordMutation(event: MutationEvent): void {
		if (!this.config.enabled) return

		// Update metrics
		if (this.config.trackMetrics) {
			const m = this.getMetrics(event.tableName)
			m.mutationCount++
			m.totalMutationDurationMs += event.durationMs
		}

		// Log
		const logLevel = event.success ? 'debug' : 'warn'
		this.log(logLevel, `Mutation ${event.tableName}.${event.operation}`, {
			duration: `${event.durationMs}ms`,
			success: event.success,
			documentId: event.documentId,
			affectedCount: event.affectedCount,
		})

		// Call hook
		if (this.shouldSample() && this.hooks.onMutation) {
			try {
				this.hooks.onMutation(event)
			} catch (error) {
				console.error('Error in onMutation hook:', error)
			}
		}
	}

	/**
	 * Record an error event.
	 */
	recordError(event: ErrorEvent): void {
		if (!this.config.enabled) return

		// Update metrics
		if (this.config.trackMetrics) {
			const m = this.getMetrics(event.tableName)
			m.errorCount++
		}

		// Log
		this.log('error', `Error in ${event.tableName}.${event.operation}`, {
			error: event.error.message,
			documentId: event.documentId,
			context: event.context,
		})

		// Call hook
		if (this.hooks.onError) {
			try {
				this.hooks.onError(event)
			} catch (err) {
				console.error('Error in onError hook:', err)
			}
		}
	}

	/**
	 * Get metrics for a table.
	 */
	getTableMetrics(tableName: string): TableMetrics {
		const m = this.getMetrics(tableName)
		const getCount = this.documentCounts.get(tableName)

		return {
			tableName,
			queryCount: m.queryCount,
			mutationCount: m.mutationCount,
			errorCount: m.errorCount,
			avgQueryDurationMs:
				m.queryCount > 0 ? m.totalQueryDurationMs / m.queryCount : 0,
			avgMutationDurationMs:
				m.mutationCount > 0 ? m.totalMutationDurationMs / m.mutationCount : 0,
			documentCount: getCount?.() ?? 0,
		}
	}

	/**
	 * Get metrics for all tables.
	 */
	getAllMetrics(): TableMetrics[] {
		return Array.from(this.metrics.keys()).map((tableName) =>
			this.getTableMetrics(tableName),
		)
	}

	/**
	 * Reset metrics for a table.
	 */
	resetMetrics(tableName: string): void {
		this.metrics.set(tableName, {
			queryCount: 0,
			mutationCount: 0,
			errorCount: 0,
			totalQueryDurationMs: 0,
			totalMutationDurationMs: 0,
		})
	}

	/**
	 * Reset all metrics.
	 */
	resetAllMetrics(): void {
		for (const tableName of this.metrics.keys()) {
			this.resetMetrics(tableName)
		}
	}

	/**
	 * Create a timer for measuring operation duration.
	 */
	startTimer(): () => number {
		const start = performance.now()
		return () => performance.now() - start
	}
}

/**
 * Create an observability manager with the given configuration.
 */
export function createObservabilityManager(
	config?: ObservabilityConfig,
): ObservabilityManager {
	return new ObservabilityManager(config)
}

/**
 * No-op observability manager for when observability is disabled.
 */
export const noopObservability: ObservabilityManager = {
	isEnabled: () => false,
	setHooks: () => {},
	registerTable: () => {},
	recordQuery: () => {},
	recordMutation: () => {},
	recordError: () => {},
	getTableMetrics: (tableName: string) => ({
		tableName,
		queryCount: 0,
		mutationCount: 0,
		errorCount: 0,
		avgQueryDurationMs: 0,
		avgMutationDurationMs: 0,
		documentCount: 0,
	}),
	getAllMetrics: () => [],
	resetMetrics: () => {},
	resetAllMetrics: () => {},
	startTimer: () => () => 0,
} as unknown as ObservabilityManager

/**
 * Wrap a function with observability tracking.
 */
export function withQueryObservability<T>(
	manager: ObservabilityManager,
	tableName: string,
	operation: QueryEvent['operation'],
	fn: () => { result: T; resultCount: number },
	options?: QueryEvent['options'],
): T {
	const endTimer = manager.startTimer()
	try {
		const { result, resultCount } = fn()
		manager.recordQuery({
			tableName,
			operation,
			durationMs: endTimer(),
			resultCount,
			options,
		})
		return result
	} catch (error) {
		manager.recordError({
			tableName,
			operation,
			error: error as Error,
		})
		throw error
	}
}

/**
 * Wrap a mutation function with observability tracking.
 */
export function withMutationObservability<T>(
	manager: ObservabilityManager,
	tableName: string,
	operation: MutationEvent['operation'],
	fn: () => T,
	documentId?: string,
): T {
	const endTimer = manager.startTimer()
	try {
		const result = fn()
		manager.recordMutation({
			tableName,
			operation,
			durationMs: endTimer(),
			success: true,
			documentId,
		})
		return result
	} catch (error) {
		manager.recordMutation({
			tableName,
			operation,
			durationMs: endTimer(),
			success: false,
			documentId,
		})
		manager.recordError({
			tableName,
			operation,
			error: error as Error,
			documentId,
		})
		throw error
	}
}
