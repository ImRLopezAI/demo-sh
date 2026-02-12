import { TableAggregate } from "@convex-dev/aggregate"
import type {
	GenericDataModel,
	GenericDatabaseReader,
	GenericQueryCtx,
	TableNamesInDataModel,
} from "convex/server"
import type { GenericId } from "convex/values"
import type { FlowFieldConfig } from "./types"

/**
 * Create a TableAggregate instance for a FlowField.
 *
 * Returns `null` for 'lookup' (no aggregate needed — resolved via DB query).
 *
 * Each FlowField gets a UNIQUE namespace by prefixing `fieldName::` to the
 * FK value. This prevents collisions when multiple FlowFields share the
 * same aggregate component.
 *
 * Aggregate configuration per type:
 * - count/exist:  sortKey=_creationTime, no sumValue
 * - sum/average:  sortKey=_creationTime, sumValue=doc[field]
 * - min/max:      sortKey=doc[field] (so .min()/.max() returns the field value)
 */
export function createFlowFieldAggregate<
	DataModel extends GenericDataModel,
	TableName extends TableNamesInDataModel<DataModel>,
>(
	component: unknown,
	config: FlowFieldConfig,
	fieldName: string,
): TableAggregate<{
	Key: number
	DataModel: DataModel
	TableName: TableName
	Namespace: string
}> | null {
	// lookup doesn't use aggregation
	if (config.type === "lookup") return null

	const useFieldAsSortKey = config.type === "min" || config.type === "max"
	const needsSumValue =
		config.type === "sum" || config.type === "average"

	return new TableAggregate(component as never, {
		// Prefix with fieldName to isolate each FlowField's data
		namespace: (doc: Record<string, unknown>) =>
			`${fieldName}::${doc[config.key] as string}`,
		sortKey: useFieldAsSortKey && config.field
			? (doc: Record<string, unknown>) =>
					(doc[config.field!] as number) ?? 0
			: (doc: Record<string, unknown>) =>
					doc._creationTime as number,
		sumValue:
			needsSumValue && config.field
				? (doc: Record<string, unknown>) =>
						(doc[config.field!] as number) ?? 0
				: undefined,
	})
}

/** FlowField aggregate entry stored per parent table */
export interface FlowFieldEntry {
	aggregate: TableAggregate<{
		Key: number
		DataModel: GenericDataModel
		TableName: string
		Namespace: string
	}> | null
	config: FlowFieldConfig
	fieldName: string
}

/**
 * Resolve all FlowField values for a single document at query time.
 *
 * Returns `{ fieldName: value }` where value is:
 * - count/sum/average/min/max → number | null
 * - exist → boolean
 * - lookup → unknown (the looked-up field value)
 */
export async function resolveFlowFields(
	ctx: Pick<GenericQueryCtx<GenericDataModel>, "runQuery"> & {
		db: GenericDatabaseReader<GenericDataModel>
	},
	doc: { _id: GenericId<string> } & Record<string, unknown>,
	flowFields: Record<string, FlowFieldEntry>,
): Promise<Record<string, unknown>> {
	const entries = Object.entries(flowFields)
	const results = await Promise.all(
		entries.map(async ([fieldName, { aggregate, config }]) => {
			// Build namespaced key: fieldName::parentId
			const ns = `${fieldName}::${doc._id as string}`

			switch (config.type) {
				case "count":
					return aggregate!.count(ctx as never, {
						namespace: ns,
					})

				case "sum":
					return aggregate!.sum(ctx as never, {
						namespace: ns,
					})

				case "average": {
					const [sum, count] = await Promise.all([
						aggregate!.sum(ctx as never, {
							namespace: ns,
						}),
						aggregate!.count(ctx as never, {
							namespace: ns,
						}),
					])
					return count > 0 ? sum / count : 0
				}

				case "min": {
					const minItem = await aggregate!.min(ctx as never, {
						namespace: ns,
					})
					return minItem?.key ?? null
				}

				case "max": {
					const maxItem = await aggregate!.max(ctx as never, {
						namespace: ns,
					})
					return maxItem?.key ?? null
				}

				case "exist":
					return (
						(await aggregate!.count(ctx as never, {
							namespace: ns,
						})) > 0
					)

				case "lookup": {
					const fkValue = doc[config.key] as
						| GenericId<string>
						| undefined
					if (!fkValue) return null
					const related = await ctx.db.get(fkValue as never)
					return related && config.field
						? (related as Record<string, unknown>)[config.field]
						: null
				}

				default:
					return null
			}
		}),
	)

	const out: Record<string, unknown> = {}
	for (let i = 0; i < entries.length; i++) {
		out[entries[i][0]] = results[i]
	}
	return out
}
