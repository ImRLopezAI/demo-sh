import {
	getOneFrom,
	getManyFrom,
} from "convex-helpers/server/relationships"
import type {
	DocumentByName,
	GenericDataModel,
	GenericDatabaseReader,
	TableNamesInDataModel,
} from "convex/server"
import type { GenericId } from "convex/values"
import type { RelationConfig } from "./types"

const MANY_RELATION_WARN_THRESHOLD = 1000

/**
 * Resolve relations for a single document using convex-helpers.
 *
 * - 'one'  → getOneFrom(db, table, index, doc._id)
 * - 'many' → getManyFrom(db, table, index, doc._id)
 *
 * Supports nested resolution via `withConfig` objects.
 */
export async function resolveRelations<
	DataModel extends GenericDataModel,
>(
	db: GenericDatabaseReader<DataModel>,
	doc: { _id: GenericId<string> },
	relations: Record<string, RelationConfig<DataModel>>,
	withConfig: Record<string, boolean | { with?: Record<string, boolean> }>,
	allRelations: Record<
		string,
		Record<string, RelationConfig<DataModel>>
	>,
): Promise<Record<string, unknown>> {
	const resolved: Record<string, unknown> = {}

	const entries = Object.entries(withConfig).filter(
		([, shouldLoad]) => shouldLoad,
	)

	await Promise.all(
		entries.map(async ([relationName, shouldLoad]) => {
			const rel = relations[relationName]
			if (!rel) return

			if (rel.type === "one") {
				const related = await getOneFrom(
					db,
					rel.table as never,
					rel.field as never,
					doc._id as never,
				)

				if (
					related &&
					typeof shouldLoad === "object" &&
					shouldLoad.with
				) {
					const nestedRelations =
						allRelations[rel.table as string]
					if (nestedRelations) {
						const nested = await resolveRelations(
							db,
							related as { _id: GenericId<string> },
							nestedRelations,
							shouldLoad.with,
							allRelations,
						)
						resolved[relationName] = {
							...related,
							...nested,
						}
					} else {
						resolved[relationName] = related
					}
				} else {
					resolved[relationName] = related
				}
			} else {
				// 'many' — index-based server-side lookup
				const items = await getManyFrom(
					db,
					rel.table as never,
					rel.field as never,
					doc._id as never,
				)

				if (items.length > MANY_RELATION_WARN_THRESHOLD) {
					console.warn(
						`[tableEngine] Relation "${relationName}" on ${rel.table as string} returned ${items.length} docs (>${MANY_RELATION_WARN_THRESHOLD}). Consider pagination.`,
					)
				}

				if (
					typeof shouldLoad === "object" &&
					shouldLoad.with
				) {
					const nestedRelations =
						allRelations[rel.table as string]
					resolved[relationName] = nestedRelations
						? await Promise.all(
								items.map(
									async (
										item: Record<string, unknown> & {
											_id: GenericId<string>
										},
									) => ({
										...item,
										...(await resolveRelations(
											db,
											item,
											nestedRelations,
											shouldLoad.with!,
											allRelations,
										)),
									}),
								),
							)
						: items
				} else {
					resolved[relationName] = items
				}
			}
		}),
	)

	return resolved
}
