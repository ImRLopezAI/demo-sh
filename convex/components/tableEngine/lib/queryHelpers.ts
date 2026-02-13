import type {
	DocumentByName,
	GenericDatabaseReader,
	GenericDataModel,
	NamedTableInfo,
	PaginationResult,
	QueryInitializer,
	TableNamesInDataModel,
} from 'convex/server'
import type { GenericId } from 'convex/values'
import { filter } from 'convex-helpers/server/filter'
import type {
	FindFirstOptions,
	FindManyOptions,
	PaginateOptions,
} from './types'

const MAX_LIMIT = 1000
const DEFAULT_LIMIT = 100

export interface Resolvers {
	flowFields?: (
		doc: { _id: GenericId<string> } & Record<string, unknown>,
	) => Promise<Record<string, unknown>>
	relations?: (
		doc: { _id: GenericId<string> },
		withConfig: Record<string, boolean | { with?: Record<string, boolean> }>,
	) => Promise<Record<string, unknown>>
}

/** Enrich a single document with FlowField values + relations */
async function enrichDoc<
	DataModel extends GenericDataModel,
	TableName extends TableNamesInDataModel<DataModel>,
>(
	doc: DocumentByName<DataModel, TableName>,
	resolvers: Resolvers | undefined,
	withConfig?: Record<string, boolean | { with?: Record<string, boolean> }>,
): Promise<DocumentByName<DataModel, TableName> & Record<string, unknown>> {
	if (!resolvers)
		return doc as DocumentByName<DataModel, TableName> & Record<string, unknown>
	let enriched: Record<string, unknown> = { ...doc }
	if (resolvers.flowFields) {
		const flowValues = await resolvers.flowFields(
			doc as unknown as { _id: GenericId<string> } & Record<string, unknown>,
		)
		enriched = { ...enriched, ...flowValues }
	}
	if (resolvers.relations && withConfig) {
		const related = await resolvers.relations(
			doc as unknown as { _id: GenericId<string> },
			withConfig,
		)
		enriched = { ...enriched, ...related }
	}
	return enriched as DocumentByName<DataModel, TableName> &
		Record<string, unknown>
}

/**
 * Type-safe findMany: returns Doc[] with FlowFields + relations resolved.
 *
 * Uses convex-helpers/server/filter for server-side JS predicates,
 * Convex indexes for narrowing, and configurable limits for 16MB safety.
 */
export async function findMany<
	DataModel extends GenericDataModel,
	TableName extends TableNamesInDataModel<DataModel>,
>(
	ctx: { db: GenericDatabaseReader<DataModel> },
	tableName: TableName,
	options?: FindManyOptions<DataModel, TableName>,
	resolvers?: Resolvers,
): Promise<
	Array<DocumentByName<DataModel, TableName> & Record<string, unknown>>
> {
	let query: QueryInitializer<NamedTableInfo<DataModel, TableName>> =
		ctx.db.query(tableName)

	if (options?.index && options?.indexRange) {
		query = query.withIndex(
			options.index as never,
			options.indexRange as never,
		) as unknown as QueryInitializer<NamedTableInfo<DataModel, TableName>>
	}

	const ordered = query.order(options?.orderBy ?? 'asc')

	const filtered = options?.where
		? filter(ordered, options.where as never)
		: ordered

	const limit = Math.min(options?.limit ?? DEFAULT_LIMIT, MAX_LIMIT)
	const docs = await filtered.take(limit)

	return Promise.all(
		docs.map((doc) =>
			enrichDoc<DataModel, TableName>(doc, resolvers, options?.with),
		),
	)
}

/**
 * Type-safe findFirst: returns Doc | null.
 */
export async function findFirst<
	DataModel extends GenericDataModel,
	TableName extends TableNamesInDataModel<DataModel>,
>(
	ctx: { db: GenericDatabaseReader<DataModel> },
	tableName: TableName,
	options?: FindFirstOptions<DataModel, TableName>,
	resolvers?: Resolvers,
): Promise<
	(DocumentByName<DataModel, TableName> & Record<string, unknown>) | null
> {
	let query: QueryInitializer<NamedTableInfo<DataModel, TableName>> =
		ctx.db.query(tableName)

	if (options?.index && options?.indexRange) {
		query = query.withIndex(
			options.index as never,
			options.indexRange as never,
		) as unknown as QueryInitializer<NamedTableInfo<DataModel, TableName>>
	}

	const ordered = query.order('asc')

	const filtered = options?.where
		? filter(ordered, options.where as never)
		: ordered

	const doc = await filtered.first()
	if (!doc) return null

	return enrichDoc<DataModel, TableName>(doc, resolvers, options?.with)
}

/**
 * Paginate: uses Convex built-in .paginate() with convex-helpers/filter.
 */
export async function paginate<
	DataModel extends GenericDataModel,
	TableName extends TableNamesInDataModel<DataModel>,
>(
	ctx: { db: GenericDatabaseReader<DataModel> },
	tableName: TableName,
	options: PaginateOptions<DataModel, TableName>,
	resolvers?: Resolvers,
): Promise<
	PaginationResult<
		DocumentByName<DataModel, TableName> & Record<string, unknown>
	>
> {
	let query: QueryInitializer<NamedTableInfo<DataModel, TableName>> =
		ctx.db.query(tableName)

	if (options.index && options.indexRange) {
		query = query.withIndex(
			options.index as never,
			options.indexRange as never,
		) as unknown as QueryInitializer<NamedTableInfo<DataModel, TableName>>
	}

	const ordered = query.order(options.orderBy ?? 'asc')

	const filtered = options.where
		? filter(ordered, options.where as never)
		: ordered

	const result = await filtered.paginate(options.paginationOpts)

	const enrichedPage = await Promise.all(
		result.page.map((doc) =>
			enrichDoc<DataModel, TableName>(doc, resolvers, options.with),
		),
	)

	return {
		...result,
		page: enrichedPage,
	}
}
