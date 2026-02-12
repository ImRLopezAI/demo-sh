import { Triggers } from "convex-helpers/server/triggers"
import {
	customMutation,
	customQuery,
	customCtx,
} from "convex-helpers/server/customFunctions"
import {
	zCustomMutation,
	zCustomQuery,
} from "convex-helpers/server/zod4"
import type {
	DocumentByName,
	GenericDataModel,
	GenericMutationCtx,
	GenericQueryCtx,
	MutationBuilder,
	PaginationResult,
	QueryBuilder,
	TableNamesInDataModel,
} from "convex/server"
import type { GenericId } from "convex/values"
import {
	createFlowFieldAggregate,
	resolveFlowFields,
	type FlowFieldEntry,
} from "./flowFields"
import { resolveRelations } from "./relations"
import { findMany, findFirst, paginate, type Resolvers } from "./queryHelpers"
import { initAllSeries, getNextCode } from "./noSeries"
import { hasZodInArgs } from "./zod"
import type {
	EngineConfig,
	FindFirstOptions,
	FindManyOptions,
	FlowFieldConfig,
	PaginateOptions,
	RelationConfig,
} from "./types"

// ---------------------------------------------------------------------------
// Engine query context — added to ctx by customQuery
// ---------------------------------------------------------------------------

/** Extended query context with typed query helpers */
export interface EngineQueryCtx<DataModel extends GenericDataModel> {
	findMany<TableName extends TableNamesInDataModel<DataModel>>(
		tableName: TableName,
		options?: FindManyOptions<DataModel, TableName>,
	): Promise<
		Array<DocumentByName<DataModel, TableName> & Record<string, unknown>>
	>

	findFirst<TableName extends TableNamesInDataModel<DataModel>>(
		tableName: TableName,
		options?: FindFirstOptions<DataModel, TableName>,
	): Promise<
		| (DocumentByName<DataModel, TableName> & Record<string, unknown>)
		| null
	>

	paginate<TableName extends TableNamesInDataModel<DataModel>>(
		tableName: TableName,
		options: PaginateOptions<DataModel, TableName>,
	): Promise<
		PaginationResult<
			DocumentByName<DataModel, TableName> & Record<string, unknown>
		>
	>
}

// ---------------------------------------------------------------------------
// createEngine — the main factory
// ---------------------------------------------------------------------------

/**
 * Create a tableEngine instance.
 *
 * Generic over DataModel for full type safety. Wires:
 * - FlowField → @convex-dev/aggregate triggers + query-time resolution
 * - NoSeries → auto-assign formatted codes on insert
 * - Relations → convex-helpers/server/relationships
 * - Query helpers → findMany / findFirst / paginate with filter + enrichment
 */
export function createEngine<DataModel extends GenericDataModel>(
	config: EngineConfig<DataModel>,
) {
	const triggers = new Triggers<DataModel>()

	// FlowField aggregate instances keyed by parent table → field name
	const aggregates: Record<string, Record<string, FlowFieldEntry>> = {}

	// All relation configs keyed by table name
	const allRelations: Record<
		string,
		Record<string, RelationConfig<DataModel>>
	> = {}

	// Component API reference (components.tableEngine)
	const { component: componentApi } = config

	// -----------------------------------------------------------------------
	// 1. Register FlowField aggregates + triggers on SOURCE tables
	// -----------------------------------------------------------------------
	for (const reg of Object.values(config.tables)) {
		if (reg.flowFields) {
			for (const [fieldName, flowConfig] of Object.entries(
				reg.flowFields,
			)) {
				const agg = createFlowFieldAggregate(
					componentApi.aggregate,
					flowConfig,
					fieldName,
				)

				// Store for query-time resolution under the PARENT table
				const tblName = reg.tableName as string
				if (!aggregates[tblName]) aggregates[tblName] = {}
				aggregates[tblName][fieldName] = {
					aggregate: agg as FlowFieldEntry["aggregate"],
					config: flowConfig,
					fieldName,
				}

				// Register idempotent trigger on the SOURCE table
				// (lookup type has no aggregate — resolved via DB query)
				if (agg) {
					triggers.register(
						flowConfig.source as TableNamesInDataModel<DataModel>,
						agg.idempotentTrigger(),
					)
				}
			}
		}

		// 2. Collect relation configs
		if (reg.relations) {
			allRelations[reg.tableName as string] = reg.relations
		}
	}

	// -----------------------------------------------------------------------
	// 3. Register NoSeries triggers (auto-assign codes on insert)
	// -----------------------------------------------------------------------
	for (const reg of Object.values(config.tables)) {
		if (reg.noSeries) {
			const noSeriesConfig = reg.noSeries
			const { code, field } = noSeriesConfig
			triggers.register(
				reg.tableName as TableNamesInDataModel<DataModel>,
				async (ctx, change) => {
					if (
						change.operation === "insert" &&
						!(change.newDoc as Record<string, unknown>)[field]
					) {
						const nextCode = await getNextCode(
							ctx,
							componentApi.convex.noSeries,
							code,
							noSeriesConfig,
						)
						await ctx.db.patch(
							change.id as GenericId<TableNamesInDataModel<DataModel>>,
							{ [field]: nextCode } as never,
						)
					}
				},
			)
		}
	}

	// -----------------------------------------------------------------------
	// Build resolvers for a given table name + ctx at query time
	// -----------------------------------------------------------------------
	function makeResolvers(
		ctx: GenericQueryCtx<DataModel>,
		tbl: string,
	): Resolvers {
		return {
			flowFields: aggregates[tbl]
				? (doc) =>
						resolveFlowFields(
							ctx as Parameters<typeof resolveFlowFields>[0],
							doc,
							aggregates[tbl],
						)
				: undefined,
			relations: allRelations[tbl]
				? (doc, withConfig) =>
						resolveRelations(
							ctx.db,
							doc,
							allRelations[tbl],
							withConfig,
							allRelations,
						)
				: undefined,
		}
	}

	// -----------------------------------------------------------------------
	// Build query context customization (shared by both Convex and Zod paths)
	// -----------------------------------------------------------------------
	const triggerCustomization = customCtx(triggers.wrapDB)

	const queryCustomization = customCtx(
		(
			ctx: GenericQueryCtx<DataModel>,
		): EngineQueryCtx<DataModel> => ({
			findMany: <
				TN extends TableNamesInDataModel<DataModel>,
			>(
				tbl: TN,
				options?: FindManyOptions<DataModel, TN>,
			) =>
				findMany(
					ctx,
					tbl,
					options,
					makeResolvers(ctx, tbl as string),
				),
			findFirst: <
				TN extends TableNamesInDataModel<DataModel>,
			>(
				tbl: TN,
				options?: FindFirstOptions<DataModel, TN>,
			) =>
				findFirst(
					ctx,
					tbl,
					options,
					makeResolvers(ctx, tbl as string),
				),
			paginate: <
				TN extends TableNamesInDataModel<DataModel>,
			>(
				tbl: TN,
				options: PaginateOptions<DataModel, TN>,
			) =>
				paginate(
					ctx,
					tbl,
					options,
					makeResolvers(ctx, tbl as string),
				),
		}),
	)

	// -----------------------------------------------------------------------
	// 4. Return the engine API
	// -----------------------------------------------------------------------
	return {
		triggers,

		/**
		 * Create custom mutation/query builders with engine context.
		 *
		 * The returned builders accept both Convex validators (`v.string()`)
		 * and Zod schemas (`z.string()`). Zod schemas are detected at runtime
		 * and routed through `zCustomMutation`/`zCustomQuery` for full
		 * runtime Zod validation.
		 *
		 * @param rawMutation - `mutation` from _generated/server
		 * @param rawQuery    - `query` from _generated/server
		 */
		functions: <Visibility extends "public" | "internal">(
			rawMutation: MutationBuilder<DataModel, Visibility>,
			rawQuery: QueryBuilder<DataModel, Visibility>,
		) => {
			// Standard Convex validator builders
			const cvxMutation = customMutation(rawMutation, triggerCustomization)
			const cvxQuery = customQuery(rawQuery, queryCustomization)

			// Zod-aware builders (same customization, accept Zod schemas)
			const zodMut = zCustomMutation(rawMutation, triggerCustomization)
			const zodQry = zCustomQuery(rawQuery, queryCustomization)

			return {
				mutation: ((def: Record<string, unknown>) => {
					if (def.args && hasZodInArgs(def.args)) {
						return (zodMut as CallableFunction)(def)
					}
					return (cvxMutation as CallableFunction)(def)
				}) as typeof cvxMutation & typeof zodMut,

				query: ((def: Record<string, unknown>) => {
					if (def.args && hasZodInArgs(def.args)) {
						return (zodQry as CallableFunction)(def)
					}
					return (cvxQuery as CallableFunction)(def)
				}) as typeof cvxQuery & typeof zodQry,
			}
		},

		/**
		 * Initialize all registered NoSeries (call once in a setup mutation).
		 */
		initSeries: (ctx: Pick<GenericMutationCtx<DataModel>, "runMutation" | "runQuery">) =>
			initAllSeries(ctx, componentApi.convex.noSeries, config.tables),
	}
}
