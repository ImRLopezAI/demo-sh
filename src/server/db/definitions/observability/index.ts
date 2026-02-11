/**
 * Observability and monitoring utilities.
 * @module observability
 */

// Hooks and manager
export {
	createObservabilityManager,
	noopObservability,
	ObservabilityManager,
	withMutationObservability,
	withQueryObservability,
} from './hooks'
// Types
export type {
	ErrorEvent,
	MutationEvent,
	ObservabilityConfig,
	ObservabilityHooks,
	QueryEvent,
	TableMetrics,
} from './types'
