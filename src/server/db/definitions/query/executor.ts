import {
	applyColumnSelection,
	applyOrdering,
	applyPagination,
	createQueryHelpers,
} from '../core/query-helpers'
import type { WithSystemFields } from '../table'
import type { QueryHelpers, WithConfig } from '../types/query.types'
import type { OrderByConfig, QueryExecutor } from './builder'

/**
 * Query state interface matching the builder's internal state.
 */
interface QueryState<T extends object> {
	where?: (item: WithSystemFields<T>, helpers: QueryHelpers<T>) => boolean
	orderBy: OrderByConfig<T>[]
	limit?: number
	offset?: number
	columns?: Partial<
		Record<keyof T | '_id' | '_createdAt' | '_updatedAt', boolean>
	>
	withRelations?: WithConfig
}

/**
 * Options for creating a query executor.
 */
export interface QueryExecutorOptions<T extends object> {
	/** Function to get all documents from the table */
	getAll: () => WithSystemFields<T>[]
	/** Optional function to wrap documents with computed fields */
	wrapDocument?: (doc: WithSystemFields<T>) => WithSystemFields<T>
	/** Optional function to resolve relations */
	resolveRelations?: (
		doc: WithSystemFields<T>,
		withConfig: WithConfig | undefined,
	) => WithSystemFields<T>
}

/**
 * Create a query executor for use with QueryBuilder.
 *
 * @param options - Executor options
 * @returns A QueryExecutor implementation
 */
export function createQueryExecutor<T extends object>(
	options: QueryExecutorOptions<T>,
): QueryExecutor<T> {
	const { getAll, wrapDocument, resolveRelations } = options

	return {
		execute(state: QueryState<T>): WithSystemFields<T>[] {
			// Get all documents
			let results = getAll()

			// Apply document wrapping (computed fields, flow fields)
			if (wrapDocument) {
				results = results.map(wrapDocument)
			}

			// Apply where filter
			if (state.where) {
				results = results.filter((item) =>
					state.where?.(item, createQueryHelpers(item) as QueryHelpers<T>),
				)
			}

			// Apply ordering
			if (state.orderBy.length > 0) {
				const orderClauses = state.orderBy.map((ob) => ({
					field: ob.field as string,
					direction: ob.direction,
				}))
				results = applyOrdering(results, orderClauses)
			}

			// Apply pagination
			results = applyPagination(results, state.offset, state.limit)

			// Apply column selection
			if (state.columns) {
				results = applyColumnSelection(
					results,
					state.columns as Partial<Record<string, boolean>>,
				)
			}

			// Resolve relations
			if (state.withRelations && resolveRelations) {
				results = results.map((doc) =>
					resolveRelations(doc, state.withRelations),
				)
			}

			return results
		},
	}
}

/**
 * Table query interface that can be used with QueryBuilder.
 * This interface defines the minimum required for query execution.
 */
export interface QueryableTable<T extends object> {
	/** Get all documents */
	toArray(): WithSystemFields<T>[]
	/** Create a query builder */
	query(): import('./builder').QueryBuilder<T>
}

/**
 * Add query builder support to a table.
 * Returns a function that creates a query builder when called.
 *
 * @param getAll - Function to get all documents
 * @param options - Additional options
 * @returns Function that creates QueryBuilder instances
 */
export function createQueryBuilderFactory<T extends object>(
	getAll: () => WithSystemFields<T>[],
	options?: {
		wrapDocument?: (doc: WithSystemFields<T>) => WithSystemFields<T>
		resolveRelations?: (
			doc: WithSystemFields<T>,
			withConfig: WithConfig | undefined,
		) => WithSystemFields<T>
	},
): () => import('./builder').QueryBuilder<T> {
	const executor = createQueryExecutor({
		getAll,
		wrapDocument: options?.wrapDocument,
		resolveRelations: options?.resolveRelations,
	})

	return () => new (require('./builder').QueryBuilder)(executor)
}
