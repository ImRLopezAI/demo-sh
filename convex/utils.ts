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
import { zid } from 'convex-helpers/server/zod4'
import { z } from 'zod'
import type { TableNames } from './_generated/dataModel'
import { mutation, query } from './functions'

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

export interface TenantRouterConfig<T extends TableNames = TableNames> {
	moduleName: string
	prefix?: string
	primaryTable: T
	statusField?: string
	transitions?: Record<string, string[]>
	reasonRequiredStatuses?: string[]
	createSchema?: z.ZodObject<any>
	updateSchema?: z.ZodObject<any>
}

function collectStatuses(
	rows: Record<string, any>[],
	statusField: string | undefined,
) {
	if (!statusField) return {}
	const counts: Record<string, number> = {}
	for (const row of rows) {
		const val = row[statusField]
		if (!val) continue
		const key = String(val)
		counts[key] = (counts[key] ?? 0) + 1
	}
	return counts
}
export const pagination = z.object({
	id: z.number().optional(),
	endCursor: z.union([z.null(), z.string()]).default(null),
	maximumRowsRead: z.number().optional(),
	maximumBytesRead: z.number().optional(),
	numItems: z.number().default(50),
	cursor: z.union([z.null(), z.string()]).default(null),
})

export function createTenantScoped<T extends TableNames>(
	config: TenantRouterConfig<T>,
) {
	const { primaryTable, statusField } = config
	const NAME = config.prefix ?? config.moduleName

	const createSchema = config.createSchema ?? z.object({}).passthrough()
	const updateSchema = config.updateSchema ?? z.object({}).passthrough()

	const list = query({
		args: {
			paginationOpts: pagination,
			search: z.string().optional(),
			orderBy: z.enum(['asc', 'desc']).optional(),
			with: z.record(z.string(), z.boolean()).optional(),
		},
		handler: async (ctx, args) => {
			const { paginationOpts, search, orderBy } = args
			const searchTerm = search?.trim().toLowerCase()

			return ctx.paginate(primaryTable, {
				paginationOpts,
				orderBy: orderBy ?? 'desc',
				...(searchTerm
					? {
							where: (doc: Record<string, any>) =>
								Object.values(doc).some((v: any) => {
									if (v == null) return false
									return String(v).toLowerCase().includes(searchTerm)
								}),
						}
					: {}),
				...(args.with ? { with: args.with } : {}),
			})
		},
	})

	const getById = query({
		args: {
			id: zid(primaryTable),
			with: z.record(z.string(), z.boolean()).optional(),
		},
		handler: async (ctx, args) => {
			if (args.with) {
				return ctx.findFirst(primaryTable, {
					where: (doc: any) => doc._id === args.id,
					with: args.with,
				})
			}
			return ctx.db.get(args.id)
		},
	})

	const create = mutation({
		args: { data: createSchema },
		handler: async (ctx, args) => {
			return ctx.db.insert(primaryTable as any, args.data as any)
		},
	})

	const update = mutation({
		args: {
			id: zid(primaryTable),
			data: updateSchema,
		},
		handler: async (ctx, args) => {
			await ctx.db.patch(args.id, args.data as any)
			return args.id
		},
	})

	const remove = mutation({
		args: { id: zid(primaryTable) },
		handler: async (ctx, args) => {
			await ctx.db.delete(args.id)
			return { deleted: true }
		},
	})

	const transitionStatus = mutation({
		args: {
			id: zid(primaryTable),
			toStatus: z.string(),
			reason: z.string().optional(),
		},
		handler: async (ctx, args) => {
			if (!statusField) {
				throw new Error(`${NAME} does not have workflow status configured`)
			}

			const existing = await ctx.db.get(args.id)
			if (!existing) {
				throw new Error(`${NAME} record not found`)
			}

			const currentStatus = String((existing as any)[statusField] ?? '')

			if (config.transitions && currentStatus in config.transitions) {
				const allowed = config.transitions[currentStatus] ?? []
				if (!allowed.includes(args.toStatus)) {
					throw new Error(
						`Transition "${currentStatus}" -> "${args.toStatus}" is not allowed`,
					)
				}
			}

			if (
				config.reasonRequiredStatuses?.includes(args.toStatus) &&
				!args.reason
			) {
				throw new Error(`A reason is required for status "${args.toStatus}"`)
			}

			const updatePayload: Record<string, unknown> = {
				[statusField]: args.toStatus,
			}

			if ('statusUpdatedAt' in (existing as any)) {
				updatePayload.statusUpdatedAt = Date.now()
			}
			if ('statusReason' in (existing as any) && args.reason) {
				updatePayload.statusReason = args.reason
			}

			await ctx.db.patch(args.id, updatePayload as any)
			return args.id
		},
	})

	const kpis = query({
		args: {},
		handler: async (ctx) => {
			const allRows = await ctx.findMany(primaryTable, { limit: 1000 })
			const recent = await ctx.findMany(primaryTable, {
				orderBy: 'desc',
				limit: 5,
			})

			return {
				total: allRows.length,
				statusCounts: collectStatuses(allRows as any, statusField),
				recent,
			}
		},
	})

	return { list, getById, create, update, remove, transitionStatus, kpis }
}
