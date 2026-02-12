import type { RunQueryCtx, RunMutationCtx } from "@convex-dev/aggregate"
import type { components } from "../_generated/api"
import type {
	DocumentByName,
	FunctionReference,
	GenericDataModel,
	IndexNames,
	IndexRange,
	IndexRangeBuilder,
	NamedIndex,
	NamedTableInfo,
	TableNamesInDataModel,
} from "convex/server"
import type { PropertyValidators } from "convex/values"

// ---------------------------------------------------------------------------
// Re-export aggregate context types for consumers
// ---------------------------------------------------------------------------

export type { RunQueryCtx, RunMutationCtx }

// ---------------------------------------------------------------------------
// Convex args validator alias — used by Zod integration
// ---------------------------------------------------------------------------

export type ConvexArgsValidator = PropertyValidators

// ---------------------------------------------------------------------------
// FlowField — backed by @convex-dev/aggregate
// ---------------------------------------------------------------------------

export type FlowFieldType =
	| "sum"
	| "count"
	| "average"
	| "min"
	| "max"
	| "lookup"
	| "exist"

export interface FlowFieldConfig {
	/** Aggregate type */
	type: FlowFieldType
	/**
	 * For aggregation types (count, sum, average, min, max, exist):
	 *   Source/child table whose rows are aggregated.
	 * For lookup:
	 *   Target table to look up a value from.
	 */
	source: string
	/**
	 * For aggregation types:
	 *   FK field in the source table pointing to the parent document.
	 * For lookup:
	 *   FK field on the CURRENT document pointing to the source table.
	 */
	key: string
	/**
	 * For sum, average:  field to aggregate (required).
	 * For min, max:      field to find min/max of (required).
	 * For lookup:        field to extract from the looked-up document (required).
	 * For count, exist:  not used.
	 */
	field?: string
}

// ---------------------------------------------------------------------------
// Relation — resolved via convex-helpers/server/relationships
// ---------------------------------------------------------------------------

export interface RelationConfig<
	DataModel extends GenericDataModel = GenericDataModel,
> {
	/** Related table name */
	table: TableNamesInDataModel<DataModel>
	/** Index name used for the lookup (e.g. "by_itemId") */
	field: string
	/** 'one' → getOneFrom, 'many' → getManyFrom */
	type: "one" | "many"
}

// ---------------------------------------------------------------------------
// NoSeries — auto-incrementing formatted codes
// ---------------------------------------------------------------------------

export interface NoSeriesConfig {
	/** Unique series identifier (e.g. "ITEM", "SO") */
	code: string
	/** Document field that receives the generated code */
	field: string
	/** Pattern template (e.g. "ITEM0000001") */
	pattern: string
	/** Increment step (default 1) */
	incrementBy?: number
}

// ---------------------------------------------------------------------------
// Table registration — per-table config bag
// ---------------------------------------------------------------------------

export interface TableRegistration<
	DataModel extends GenericDataModel = GenericDataModel,
> {
	tableName: TableNamesInDataModel<DataModel>
	flowFields?: Record<string, FlowFieldConfig>
	noSeries?: NoSeriesConfig
	relations?: Record<string, RelationConfig<DataModel>>
}

// ---------------------------------------------------------------------------
// Component API — typed references to component functions
// ---------------------------------------------------------------------------

export interface NoSeriesApi {
	initSeries: FunctionReference<
		"mutation",
		"internal",
		{ code: string; incrementBy?: number; pattern: string },
		null
	>
	getNextCode: FunctionReference<
		"mutation",
		"internal",
		{ code: string; incrementBy?: number; pattern?: string },
		string
	>
	peekNextCode: FunctionReference<
		"query",
		"internal",
		{ code: string },
		string
	>
	resetSeries: FunctionReference<
		"mutation",
		"internal",
		{ code: string; startAt?: number },
		null
	>
}

/** Aggregate component API — matches @convex-dev/aggregate's ComponentApi */
export type AggregateComponentApi = (typeof components)["aggregate"]

export interface TableEngineComponentApi {
	/** @convex-dev/aggregate sub-component */
	aggregate: AggregateComponentApi
	/** Component functions exposed under convex/ */
	convex: {
		noSeries: NoSeriesApi
	}
}

// ---------------------------------------------------------------------------
// Engine config — passed to createEngine()
// ---------------------------------------------------------------------------

export interface EngineConfig<DataModel extends GenericDataModel> {
	tables: Record<string, TableRegistration<DataModel>>
	/** ComponentApi reference — `components.tableEngine` from _generated/api */
	component: TableEngineComponentApi
}

// ---------------------------------------------------------------------------
// Query option types — fully generic over DataModel + TableName
// ---------------------------------------------------------------------------

export interface FindManyOptions<
	DataModel extends GenericDataModel,
	TableName extends TableNamesInDataModel<DataModel>,
> {
	/** Server-side JS predicate (runs via convex-helpers/server/filter) */
	where?: (
		doc: DocumentByName<DataModel, TableName>,
	) => boolean | Promise<boolean>
	/** Convex index name */
	index?: IndexNames<NamedTableInfo<DataModel, TableName>>
	/** Index range builder for .withIndex() */
	indexRange?: (
		q: IndexRangeBuilder<
			DocumentByName<DataModel, TableName>,
			NamedIndex<
				NamedTableInfo<DataModel, TableName>,
				IndexNames<NamedTableInfo<DataModel, TableName>>
			>
		>,
	) => IndexRange
	/** Sort direction (default 'asc') */
	orderBy?: "asc" | "desc"
	/** Max rows to return (default 100, hard cap 1000) */
	limit?: number
	/** Eager-load relations */
	with?: Record<string, boolean | { with?: Record<string, boolean> }>
}

export interface FindFirstOptions<
	DataModel extends GenericDataModel,
	TableName extends TableNamesInDataModel<DataModel>,
> {
	where?: (
		doc: DocumentByName<DataModel, TableName>,
	) => boolean | Promise<boolean>
	index?: IndexNames<NamedTableInfo<DataModel, TableName>>
	indexRange?: (
		q: IndexRangeBuilder<
			DocumentByName<DataModel, TableName>,
			NamedIndex<
				NamedTableInfo<DataModel, TableName>,
				IndexNames<NamedTableInfo<DataModel, TableName>>
			>
		>,
	) => IndexRange
	with?: Record<string, boolean | { with?: Record<string, boolean> }>
}

export interface PaginateOptions<
	DataModel extends GenericDataModel,
	TableName extends TableNamesInDataModel<DataModel>,
> {
	where?: (
		doc: DocumentByName<DataModel, TableName>,
	) => boolean | Promise<boolean>
	index?: IndexNames<NamedTableInfo<DataModel, TableName>>
	indexRange?: (
		q: IndexRangeBuilder<
			DocumentByName<DataModel, TableName>,
			NamedIndex<
				NamedTableInfo<DataModel, TableName>,
				IndexNames<NamedTableInfo<DataModel, TableName>>
			>
		>,
	) => IndexRange
	orderBy?: "asc" | "desc"
	paginationOpts: { numItems: number; cursor: string | null }
	with?: Record<string, boolean | { with?: Record<string, boolean> }>
}

// ---------------------------------------------------------------------------
// Enriched document type — Doc + FlowField values + relation results
// ---------------------------------------------------------------------------

/** Document type enriched with flow field values and eagerly-loaded relations */
export type EnrichedDocument<
	DataModel extends GenericDataModel,
	TableName extends TableNamesInDataModel<DataModel>,
> = DocumentByName<DataModel, TableName> & Record<string, unknown>
