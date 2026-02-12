
import type {
  DocumentByInfo,
  GenericTableInfo,
  IndexNames,
  IndexRange,
  IndexRangeBuilder,
  NamedIndex,
  QueryInitializer,
} from 'convex/server'
import { v } from 'convex/values'

type WithMatching<T extends GenericTableInfo> = QueryInitializer<T> & {
	matching<IndexName extends IndexNames<T>>(
		indexName: IndexName,
		indexRange?: (
			q: IndexRangeBuilder<DocumentByInfo<T>, NamedIndex<T, IndexName>>,
		) => IndexRange,
		shouldMatch?: boolean,
	): WithMatching<T>
	execute<Result = Awaited<ReturnType<QueryInitializer<T>['collect']>>>(
		transform?: (
			data: Awaited<ReturnType<QueryInitializer<T>['collect']>>,
		) => Result | Promise<Result>,
	): Promise<Result>
}

/**
 * This utility function extends a Convex query with a `matching` and `execute` method
 * `matching` conditionally applies index filters based on a boolean flag.
 * `execute` runs the query and collects the results.
 * @param query - The initial Convex query to extend.
 * @returns The extended query with the `matching` method.
 * @example
 * import { includes } from 'path/to/utils'
 *
 * const results = await includes(db.query('cases'))
 *   .matching(
 *     'public_cases',
 *     (q) => q.eq('verification.verifiedAt', undefined),
 *     isPublicOnly
 *   )
 *   .execute((data) => data.map(item => ({ id: item._id, ...item })));
 */
export function includes<T extends GenericTableInfo>(
	query: QueryInitializer<T>,
): WithMatching<T> {
	const attach = (current: QueryInitializer<T>): WithMatching<T> => {
		const matching = <IndexName extends IndexNames<T>>(
			indexName: IndexName,
			indexRange?: (
				q: IndexRangeBuilder<DocumentByInfo<T>, NamedIndex<T, IndexName>>,
			) => IndexRange,
			shouldMatch = true,
		): WithMatching<T> => {
			if (!shouldMatch) {
				return attach(current)
			}

			return attach(
				current.withIndex(indexName, indexRange) as QueryInitializer<T>,
			)
		}

		const execute = async <
			Result = Awaited<ReturnType<QueryInitializer<T>['collect']>>,
		>(
			transform?: (
				data: Awaited<ReturnType<QueryInitializer<T>['collect']>>,
			) => Result | Promise<Result>,
		): Promise<Result> => {
			const data = await current.collect()
			if (!transform) return data as Result

			return transform(data)
		}

		return { matching, execute } as WithMatching<T>
	}

	return attach(query)
}

/**
 * Create a Convex union validator from an array of literals.
 * More flexible than convex-helpers `literals` as it accepts arrays directly.
 *
 * @example
 * const STATUS = ['pending', 'processing', 'completed'] as const
 * const statusValidator = convexEnum(STATUS)
 */
export function convexEnum<T extends string | number | bigint | boolean>(
	arr: readonly T[] | T[],
) {
	return v.union(...arr.map((value) => v.literal(value)))
}
