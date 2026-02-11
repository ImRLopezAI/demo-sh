import type { WithSystemFields } from '../table'
import type { QueryHelpers, WithConfig } from '../types/query.types'

/**
 * Order by direction type.
 */
export type OrderDirection = 'asc' | 'desc'

/**
 * Order by clause configuration.
 */
export interface OrderByConfig<T> {
	field: keyof T | '_id' | '_createdAt' | '_updatedAt'
	direction: OrderDirection
}

/**
 * Query builder state.
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
 * Chainable query builder for type-safe queries.
 *
 * @example
 * ```ts
 * const results = new QueryBuilder(db.schemas.users)
 *   .where((u, { gt, eq }) => gt('age', 18) && eq('status', 'active'))
 *   .orderBy('name', 'asc')
 *   .limit(10)
 *   .execute()
 * ```
 */
export class QueryBuilder<T extends object> {
	private state: QueryState<T> = {
		orderBy: [],
	}

	private executor: QueryExecutor<T>

	constructor(executor: QueryExecutor<T>) {
		this.executor = executor
	}

	/**
	 * Add a where filter to the query.
	 * Multiple where calls are ANDed together.
	 *
	 * @param predicate - Filter function
	 * @returns This builder for chaining
	 */
	where(
		predicate: (item: WithSystemFields<T>, helpers: QueryHelpers<T>) => boolean,
	): this {
		const existingWhere = this.state.where
		if (existingWhere) {
			// Combine with existing where using AND
			this.state.where = (item, helpers) =>
				existingWhere(item, helpers) && predicate(item, helpers)
		} else {
			this.state.where = predicate
		}
		return this
	}

	/**
	 * Add an orderBy clause.
	 * Multiple orderBy calls create compound ordering.
	 *
	 * @param field - Field to order by
	 * @param direction - Sort direction
	 * @returns This builder for chaining
	 */
	orderBy(
		field: keyof T | '_id' | '_createdAt' | '_updatedAt',
		direction: OrderDirection = 'asc',
	): this {
		this.state.orderBy.push({ field, direction })
		return this
	}

	/**
	 * Order by ascending.
	 *
	 * @param field - Field to order by
	 * @returns This builder for chaining
	 */
	asc(field: keyof T | '_id' | '_createdAt' | '_updatedAt'): this {
		return this.orderBy(field, 'asc')
	}

	/**
	 * Order by descending.
	 *
	 * @param field - Field to order by
	 * @returns This builder for chaining
	 */
	desc(field: keyof T | '_id' | '_createdAt' | '_updatedAt'): this {
		return this.orderBy(field, 'desc')
	}

	/**
	 * Limit the number of results.
	 *
	 * @param count - Maximum number of results
	 * @returns This builder for chaining
	 */
	limit(count: number): this {
		this.state.limit = count
		return this
	}

	/**
	 * Skip a number of results.
	 *
	 * @param count - Number of results to skip
	 * @returns This builder for chaining
	 */
	offset(count: number): this {
		this.state.offset = count
		return this
	}

	/**
	 * Skip and take (alias for offset + limit).
	 *
	 * @param skip - Number to skip
	 * @param take - Number to take
	 * @returns This builder for chaining
	 */
	skip(skip: number): this {
		return this.offset(skip)
	}

	/**
	 * Take a number of results (alias for limit).
	 *
	 * @param count - Number to take
	 * @returns This builder for chaining
	 */
	take(count: number): this {
		return this.limit(count)
	}

	/**
	 * Select specific columns.
	 * Pass true to include, false to exclude.
	 *
	 * @param columns - Column selection
	 * @returns This builder for chaining
	 */
	select(
		columns: Partial<
			Record<keyof T | '_id' | '_createdAt' | '_updatedAt', boolean>
		>,
	): this {
		this.state.columns = columns
		return this
	}

	/**
	 * Include only the specified columns.
	 *
	 * @param fields - Fields to include
	 * @returns This builder for chaining
	 */
	include(...fields: (keyof T | '_id' | '_createdAt' | '_updatedAt')[]): this {
		const columns: Partial<Record<string, boolean>> = {}
		for (const field of fields) {
			columns[field as string] = true
		}
		this.state.columns = columns as QueryState<T>['columns']
		return this
	}

	/**
	 * Exclude the specified columns.
	 *
	 * @param fields - Fields to exclude
	 * @returns This builder for chaining
	 */
	exclude(...fields: (keyof T | '_id' | '_createdAt' | '_updatedAt')[]): this {
		const columns: Partial<Record<string, boolean>> = {}
		for (const field of fields) {
			columns[field as string] = false
		}
		this.state.columns = columns as QueryState<T>['columns']
		return this
	}

	/**
	 * Eager load relations.
	 *
	 * @param config - Relations to load
	 * @returns This builder for chaining
	 */
	with(config: WithConfig): this {
		this.state.withRelations = config
		return this
	}

	/**
	 * Execute the query and return all results.
	 *
	 * @returns Array of matching documents
	 */
	execute(): WithSystemFields<T>[] {
		return this.executor.execute(this.state)
	}

	/**
	 * Execute the query and return all results (alias for execute).
	 */
	findMany(): WithSystemFields<T>[] {
		return this.execute()
	}

	/**
	 * Execute the query and return the first result.
	 *
	 * @returns First matching document or undefined
	 */
	findFirst(): WithSystemFields<T> | undefined {
		const results = this.limit(1).execute()
		return results[0]
	}

	/**
	 * Execute the query and return the first result, throwing if not found.
	 *
	 * @throws Error if no document is found
	 * @returns First matching document
	 */
	findFirstOrThrow(): WithSystemFields<T> {
		const result = this.findFirst()
		if (!result) {
			throw new Error('No document found')
		}
		return result
	}

	/**
	 * Execute the query and return the count.
	 *
	 * @returns Number of matching documents
	 */
	count(): number {
		// Remove limit/offset for counting
		const countState = { ...this.state, limit: undefined, offset: undefined }
		return this.executor.execute(countState).length
	}

	/**
	 * Check if any documents match the query.
	 *
	 * @returns True if at least one document matches
	 */
	exists(): boolean {
		return this.limit(1).execute().length > 0
	}

	/**
	 * Get a copy of the current query state.
	 * Useful for debugging or serialization.
	 */
	getState(): QueryState<T> {
		return { ...this.state, orderBy: [...this.state.orderBy] }
	}

	/**
	 * Clone this builder to create an independent copy.
	 */
	clone(): QueryBuilder<T> {
		const cloned = new QueryBuilder(this.executor)
		cloned.state = {
			...this.state,
			orderBy: [...this.state.orderBy],
		}
		return cloned
	}
}

/**
 * Query executor interface.
 * Implemented by the table to actually run queries.
 */
export interface QueryExecutor<T extends object> {
	execute(state: QueryState<T>): WithSystemFields<T>[]
}

/**
 * Create a query builder for a table.
 *
 * @param executor - The query executor (usually the table)
 * @returns A new QueryBuilder instance
 */
export function createQueryBuilder<T extends object>(
	executor: QueryExecutor<T>,
): QueryBuilder<T> {
	return new QueryBuilder(executor)
}
