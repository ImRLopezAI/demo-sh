import type {
	ActionBuilder,
	GenericActionCtx,
	GenericDataModel,
	GenericMutationCtx,
	MutationBuilder,
} from 'convex/server'
import { v } from 'convex/values'
import type { z } from 'zod'
import { generateTableRecord, setFakerSeed } from './generator'
import {
	buildDependencyGraph,
	extractForeignKeys,
	getFlowFieldNames,
	getNoSeriesField,
	getSeedCount,
	topologicalSort,
} from './resolver'
import type { SeederComponentApi, SeederConfig } from './types'

const BATCH_SIZE = 50

// ---------------------------------------------------------------------------
// createSeeder — main factory
// ---------------------------------------------------------------------------

export function createSeeder(config: SeederConfig) {
	const { tables, engineTables } = config

	// Pre-compute dependency order (uses engine relations for FK deps)
	const graph = buildDependencyGraph(tables, engineTables)
	const seedOrder = topologicalSort(graph)

	// Pre-compute shapes (cast once)
	const shapes = new Map<string, Record<string, z.ZodType>>()
	for (const [name, entry] of Object.entries(tables)) {
		shapes.set(name, entry.def.schema.shape as Record<string, z.ZodType>)
	}

	/**
	 * Build the insert mutation — a RAW internalMutation (no engine trigger wrapper).
	 *
	 * Uses raw ctx.db.insert to avoid FlowField aggregate triggers that require
	 * nested component resolution. Handles NoSeries code assignment directly
	 * via the tableEngine's NoSeries component API.
	 */
	function buildInsertMutation(
		rawMutation: MutationBuilder<GenericDataModel, 'internal'>,
		noSeriesApi: unknown,
	) {
		return rawMutation({
			args: {
				tableName: v.string(),
				records: v.array(v.any()),
				noSeriesField: v.optional(v.string()),
				noSeriesCode: v.optional(v.string()),
				noSeriesPattern: v.optional(v.string()),
			},
			handler: async (
				ctx: GenericMutationCtx<GenericDataModel>,
				args: {
					tableName: string
					records: Record<string, unknown>[]
					noSeriesField?: string
					noSeriesCode?: string
					noSeriesPattern?: string
				},
			) => {
				const ids: string[] = []
				for (const record of args.records) {
					// Handle NoSeries — fill in the code before inserting
					if (
						args.noSeriesField &&
						args.noSeriesCode &&
						noSeriesApi &&
						record[args.noSeriesField] === ''
					) {
						const nextCode = await ctx.runMutation(
							(noSeriesApi as Record<string, unknown>).getNextCode as never,
							{
								code: args.noSeriesCode,
								pattern: args.noSeriesPattern,
							} as never,
						)
						record[args.noSeriesField] = nextCode
					}
					const id = await ctx.db.insert(
						args.tableName as never,
						record as never,
					)
					ids.push(id as unknown as string)
				}
				return ids
			},
		})
	}

	/**
	 * Build the seedAll internal action.
	 * Generates + inserts all tables in dependency order.
	 */
	function buildSeedAllAction(
		rawAction: ActionBuilder<GenericDataModel, 'internal'>,
		insertRef: unknown,
		componentApi?: SeederComponentApi,
	) {
		return rawAction({
			args: {
				fakerSeed: v.optional(v.number()),
			},
			handler: async (
				ctx: GenericActionCtx<GenericDataModel>,
				args: { fakerSeed?: number },
			) => {
				const seed = args.fakerSeed ?? config.fakerSeed
				if (seed !== undefined) setFakerSeed(seed)

				// Track generated IDs per table
				const tableIds = new Map<string, string[]>()
				const results: Array<{ table: string; count: number }> = []

				for (const tableName of seedOrder) {
					const entry = tables[tableName]
					if (!entry) continue

					const shape = shapes.get(tableName)!
					const noSeriesField = getNoSeriesField(
						entry.def.tableName,
						engineTables,
					)
					const flowFieldNames = getFlowFieldNames(
						entry.def.tableName,
						engineTables,
					)

					// Get NoSeries config for passing to insert mutation
					const noSeriesReg = engineTables[entry.def.tableName]?.noSeries

					// Build FK map from engine relations — keyed by field name
					const fkRelations = extractForeignKeys(
						entry.def.tableName,
						engineTables,
					)
					const fkMap = new Map<string, string[]>()
					for (const [fkField, targetTable] of fkRelations) {
						const ids = tableIds.get(targetTable)
						if (ids && ids.length > 0) {
							fkMap.set(fkField, ids)
						}
					}

					const seedConfig = entry.seed
					const isPerParent =
						typeof seedConfig === 'object' && seedConfig.perParent
					const allRecords: Record<string, unknown>[] = []

					if (isPerParent) {
						const parentTableName = seedConfig.perParent!
						const parentIds = tableIds.get(parentTableName) ?? []

						// Find which FK field points to the parent table (from engine relations)
						let parentFkField: string | undefined
						for (const [fkField, targetTable] of fkRelations) {
							if (targetTable === parentTableName) {
								parentFkField = fkField
								break
							}
						}

						for (const parentId of parentIds) {
							const count = getSeedCount(seedConfig)

							for (let i = 0; i < count; i++) {
								const parentOverrides: Record<string, unknown> = {}
								if (parentFkField) {
									parentOverrides[parentFkField] = parentId
								}

								const record = generateTableRecord(entry.def.tableName, shape, {
									noSeriesField,
									flowFieldNames,
									fkMap,
									fieldOverrides: entry.fields,
									parentOverrides,
								})
								allRecords.push(record)
							}
						}
					} else {
						const count = getSeedCount(seedConfig)
						for (let i = 0; i < count; i++) {
							const record = generateTableRecord(entry.def.tableName, shape, {
								noSeriesField,
								flowFieldNames,
								fkMap,
								fieldOverrides: entry.fields,
							})
							allRecords.push(record)
						}
					}

					// Insert in batches
					const ids: string[] = []
					for (let i = 0; i < allRecords.length; i += BATCH_SIZE) {
						const batch = allRecords.slice(i, i + BATCH_SIZE)
						const batchIds = (await ctx.runMutation(
							insertRef as never,
							{
								tableName: entry.def.tableName,
								records: batch,
								noSeriesField: noSeriesReg?.field,
								noSeriesCode: noSeriesReg?.code,
								noSeriesPattern: noSeriesReg?.pattern,
							} as never,
						)) as string[]
						ids.push(...batchIds)
					}

					tableIds.set(entry.def.tableName, ids)
					// Also store by config key if different
					if (tableName !== entry.def.tableName) {
						tableIds.set(tableName, ids)
					}

					results.push({ table: entry.def.tableName, count: ids.length })

					// Log to component
					if (componentApi) {
						await ctx.runMutation(
							componentApi.log.logSeed as never,
							{
								tableName: entry.def.tableName,
								count: ids.length,
								status: 'seeded',
							} as never,
						)
					}
				}

				return results
			},
		})
	}

	/**
	 * Build seed single table action.
	 */
	function buildSeedTableAction(
		rawAction: ActionBuilder<GenericDataModel, 'internal'>,
		insertRef: unknown,
	) {
		return rawAction({
			args: {
				table: v.string(),
				count: v.optional(v.number()),
				fakerSeed: v.optional(v.number()),
			},
			handler: async (
				ctx: GenericActionCtx<GenericDataModel>,
				args: { table: string; count?: number; fakerSeed?: number },
			) => {
				const seed = args.fakerSeed ?? config.fakerSeed
				if (seed !== undefined) setFakerSeed(seed)

				// Find the entry by config key or tableName
				let entryKey: string | undefined
				for (const [key, entry] of Object.entries(tables)) {
					if (key === args.table || entry.def.tableName === args.table) {
						entryKey = key
						break
					}
				}
				if (!entryKey) {
					throw new Error(`Table not found in seed config: ${args.table}`)
				}

				const entry = tables[entryKey]
				const shape = shapes.get(entryKey)!
				const noSeriesField = getNoSeriesField(
					entry.def.tableName,
					engineTables,
				)
				const flowFieldNames = getFlowFieldNames(
					entry.def.tableName,
					engineTables,
				)
				const noSeriesReg = engineTables[entry.def.tableName]?.noSeries

				const count = args.count ?? getSeedCount(entry.seed)
				const records: Record<string, unknown>[] = []

				for (let i = 0; i < count; i++) {
					const record = generateTableRecord(entry.def.tableName, shape, {
						noSeriesField,
						flowFieldNames,
						fkMap: new Map(), // No FK resolution for standalone seeding
						fieldOverrides: entry.fields,
					})
					records.push(record)
				}

				const ids: string[] = []
				for (let i = 0; i < records.length; i += BATCH_SIZE) {
					const batch = records.slice(i, i + BATCH_SIZE)
					const batchIds = (await ctx.runMutation(
						insertRef as never,
						{
							tableName: entry.def.tableName,
							records: batch,
							noSeriesField: noSeriesReg?.field,
							noSeriesCode: noSeriesReg?.code,
							noSeriesPattern: noSeriesReg?.pattern,
						} as never,
					)) as string[]
					ids.push(...batchIds)
				}

				return { table: entry.def.tableName, count: ids.length }
			},
		})
	}

	/**
	 * Build clear action — deletes all seeded data.
	 */
	function buildClearAction(
		rawAction: ActionBuilder<GenericDataModel, 'internal'>,
		clearMutRef: unknown,
		componentApi?: SeederComponentApi,
	) {
		return rawAction({
			args: {},
			handler: async (ctx: GenericActionCtx<GenericDataModel>) => {
				// Clear all tables in reverse dependency order
				const reverseOrder = [...seedOrder].reverse()

				for (const tableName of reverseOrder) {
					const entry = tables[tableName]
					if (!entry) continue

					await ctx.runMutation(
						clearMutRef as never,
						{
							tableName: entry.def.tableName,
						} as never,
					)
				}

				// Clear seed log
				if (componentApi) {
					await ctx.runMutation(componentApi.log.clearLog as never, {} as never)
				}

				return { cleared: reverseOrder.length }
			},
		})
	}

	/**
	 * Build clear mutation — raw mutation that deletes all records from a table.
	 */
	function buildClearMutation(
		rawMutation: MutationBuilder<GenericDataModel, 'internal'>,
	) {
		return rawMutation({
			args: {
				tableName: v.string(),
			},
			handler: async (
				ctx: GenericMutationCtx<GenericDataModel>,
				args: { tableName: string },
			) => {
				const docs = await ctx.db.query(args.tableName as never).collect()
				for (const doc of docs) {
					await ctx.db.delete((doc as { _id: string })._id as never)
				}
				return null
			},
		})
	}

	// -----------------------------------------------------------------------
	// Return a function that wires up with the engine
	// -----------------------------------------------------------------------

	return {
		/**
		 * Wire up the seeder with raw mutations (no engine trigger wrapper).
		 *
		 * Uses raw mutations to avoid FlowField aggregate component resolution
		 * issues. Handles NoSeries directly via the tableEngine's component API.
		 * FlowField aggregates are NOT updated during seeding — rebuild if needed.
		 *
		 * @param rawAction - internalAction from _generated/server
		 * @param rawMutation - internalMutation from _generated/server
		 * @param componentApi - Optional seeder component API for logging
		 * @param tableEngineApi - Optional tableEngine component API (for NoSeries)
		 */
		wire(
			rawAction: ActionBuilder<any, 'internal'>,
			rawMutation: MutationBuilder<any, 'internal'>,
			componentApi?: SeederComponentApi,
			tableEngineApi?: { convex: { noSeries: unknown } },
		) {
			const noSeriesApi = tableEngineApi?.convex?.noSeries
			const insertMutation = buildInsertMutation(
				rawMutation as MutationBuilder<GenericDataModel, 'internal'>,
				noSeriesApi,
			)
			const clearMutation = buildClearMutation(
				rawMutation as MutationBuilder<GenericDataModel, 'internal'>,
			)
			const action = rawAction as ActionBuilder<GenericDataModel, 'internal'>

			return {
				_seedInsert: insertMutation,
				_seedClear: clearMutation,

				/** Deferred: requires insertRef to be set after export */
				buildActions(insertRef: unknown, clearRef: unknown) {
					return {
						seedAll: buildSeedAllAction(action, insertRef, componentApi),
						seedTable: buildSeedTableAction(action, insertRef),
						clearSeeds: buildClearAction(action, clearRef, componentApi),
					}
				},
			}
		},

		/** Expose the computed seed order for debugging */
		seedOrder,
	}
}
