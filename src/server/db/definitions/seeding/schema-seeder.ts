import type { z } from 'zod'
import {
	type AutoIncrementConfig,
	applyAutoIncrementToItem,
	ensureUniqueFields,
	type ForeignKeyInfo,
	getSeedCount,
	type ParentChildRelation,
} from '../core/schema-helpers'
import { getZodMeta } from '../fields/zod-utils'
import type { NoSeriesV2Manager } from '../no-series'
import type { SeedConfig, ZodShape } from '../types'
import type { GenerationContext } from './index'
import { generateValueFromMeta } from './index'

// ============================================================================
// Schema seeder types
// ============================================================================

export interface SchemaSeederConfig {
	tables: Record<
		string,
		{
			_definition: {
				schemaInput: unknown
				seedConfig?: number | boolean | SeedConfig
			}
			_noSeriesConfig?: unknown
			_uniqueConstraints?: Array<{ name: string; fields: string[] }>
		}
	>
	typedOneHelper: (tableName: string) => z.ZodType
	tableOrder: string[]
	defaultSeed: number
	noSeriesManager: NoSeriesV2Manager
	tableNoSeriesConfigs: Map<string, Array<{ code: string; field: string }>>
	tableAutoIncrementConfigs: Map<string, AutoIncrementConfig[]>
	autoIncrementState: Map<string, number>
	childToParentMap: Map<string, ParentChildRelation[]>
	foreignKeyFields: Map<string, Map<string, ForeignKeyInfo>>
	/** Get table instance for data access. Insert can return sync or async. */
	getTableInstance: (tableName: string) =>
		| {
				toArray: () => Array<{ _id: string } & Record<string, unknown>>
				get?: (
					id: string,
				) => (Record<string, unknown> & { _id: string }) | undefined
				insert: (item: object) => { _id: string } | Promise<{ _id: string }>
		  }
		| undefined
}

export interface SeedingState {
	generationContext: GenerationContext
	usedUniqueValues: Map<string, Set<string>>
	uniqueSuffixCounter: { value: number }
}

// ============================================================================
// Schema seeder factory
// ============================================================================

export function createSchemaSeeder(config: SchemaSeederConfig) {
	const {
		tables,
		typedOneHelper,
		tableOrder,
		defaultSeed,
		noSeriesManager,
		tableNoSeriesConfigs,
		tableAutoIncrementConfigs,
		autoIncrementState,
		childToParentMap,
		foreignKeyFields,
		getTableInstance,
	} = config

	const state: SeedingState = {
		generationContext: { tableIds: new Map<string, string[]>() },
		usedUniqueValues: new Map<string, Set<string>>(),
		uniqueSuffixCounter: { value: 0 },
	}

	function generateRecord(
		tableName: string,
		shape: ZodShape,
		overrides: Record<string, unknown> = {},
		noSeriesFields: Set<string> = new Set(),
	): Record<string, unknown> {
		const item: Record<string, unknown> = {}
		const tableForeignKeys = foreignKeyFields.get(tableName)

		for (const [fieldName, fieldSchema] of Object.entries(shape)) {
			if (fieldName in overrides) {
				item[fieldName] = overrides[fieldName]
				continue
			}

			const zodSchema = fieldSchema as z.ZodType
			const meta = getZodMeta(zodSchema)

			if (meta?.flowField) continue
			if (meta?.autoIncrement !== undefined) continue
			if (noSeriesFields.has(fieldName)) continue

			const fkInfo = tableForeignKeys?.get(fieldName)
			if (fkInfo) {
				const relatedTable = getTableInstance(fkInfo.targetTable)
				if (relatedTable) {
					const relatedData = relatedTable.toArray()
					if (relatedData.length > 0) {
						const randomItem = relatedData[
							Math.floor(Math.random() * relatedData.length)
						] as Record<string, unknown>
						item[fieldName] = randomItem[fkInfo.targetColumn]
						continue
					}
				}
			}

			if (meta?.related) {
				const relatedIds = state.generationContext.tableIds.get(meta.related)
				if (relatedIds && relatedIds.length > 0) {
					item[fieldName] =
						relatedIds[Math.floor(Math.random() * relatedIds.length)]
				}
			} else {
				item[fieldName] = generateValueFromMeta(
					meta,
					zodSchema,
					state.generationContext,
				)
			}
		}
		return item
	}

	function prepareItem(
		tableName: string,
		shape: ZodShape,
		overrides: Record<string, unknown>,
		noSeriesFields: Set<string>,
		uniqueConstraints: Array<{ name: string; fields: string[] }>,
	): Record<string, unknown> {
		let item = generateRecord(tableName, shape, overrides, noSeriesFields)
		item = applyAutoIncrementToItem(
			tableName,
			item,
			tableAutoIncrementConfigs,
			autoIncrementState,
		)
		if (noSeriesFields.size > 0) {
			const noSeriesConfigs = tableNoSeriesConfigs.get(tableName)
			if (noSeriesConfigs) {
				item = noSeriesManager.applyToInsert(noSeriesConfigs, item)
			}
		}
		item = ensureUniqueFields(
			tableName,
			item,
			shape,
			uniqueConstraints,
			state.usedUniqueValues,
			state.generationContext,
			state.uniqueSuffixCounter,
		)
		return item
	}

	function getTableConfig(tableName: string) {
		const builder = tables[tableName]
		if (!builder) return null

		const definition = builder._definition
		const seedConfig = definition.seedConfig
		const {
			count,
			isPerParent,
			parentTable: explicitParent,
		} = getSeedCount(seedConfig, defaultSeed)

		const schemaInput = definition.schemaInput
		const shape =
			typeof schemaInput === 'function'
				? (schemaInput as (one: typeof typedOneHelper) => ZodShape)(
						typedOneHelper,
					)
				: (schemaInput as ZodShape)

		const uniqueConstraints = builder._uniqueConstraints ?? []

		const noSeriesConfig = builder._noSeriesConfig
		const noSeriesFields = new Set<string>()
		if (noSeriesConfig) {
			const configs = Array.isArray(noSeriesConfig)
				? noSeriesConfig
				: [noSeriesConfig as { field: string }]
			for (const c of configs) {
				noSeriesFields.add(c.field)
			}
		}

		return {
			seedConfig,
			count,
			isPerParent,
			explicitParent,
			shape,
			uniqueConstraints,
			noSeriesFields,
		}
	}

	/**
	 * Sync seeding - for sync tables (ReactiveTable)
	 */
	function seedTables(): void {
		for (const tableName of tableOrder) {
			const table = getTableInstance(tableName)
			if (!table) continue

			if (table.toArray().length > 0) {
				state.generationContext.tableIds.set(
					tableName,
					table.toArray().map((doc) => doc._id),
				)
				continue
			}

			const cfg = getTableConfig(tableName)
			if (!cfg) continue

			const {
				seedConfig,
				count,
				isPerParent,
				explicitParent,
				shape,
				uniqueConstraints,
				noSeriesFields,
			} = cfg

			if (count === 0) {
				state.generationContext.tableIds.set(tableName, [])
				continue
			}

			const ids: string[] = []

			const parentRels = childToParentMap.get(tableName)
			const parentRel = explicitParent
				? parentRels?.find((r) => r.parentTable === explicitParent)
				: parentRels?.[0]

			if (isPerParent && parentRel) {
				const parentIds = state.generationContext.tableIds.get(
					parentRel.parentTable,
				)
				if (parentIds && parentIds.length > 0) {
					const parentTable = getTableInstance(parentRel.parentTable)

					for (const parentId of parentIds) {
						const parentRecord = parentTable?.get
							? (parentTable.get(parentId) as
									| Record<string, unknown>
									| undefined)
							: (parentTable?.toArray().find((d) => d._id === parentId) as
									| Record<string, unknown>
									| undefined)
						const parentValue =
							parentRel.parentField === '_id'
								? parentId
								: parentRecord?.[parentRel.parentField]

						const perParentCount =
							typeof seedConfig === 'object' &&
							seedConfig &&
							(seedConfig as SeedConfig).min !== undefined
								? Math.floor(
										Math.random() *
											(((seedConfig as SeedConfig).max ??
												(seedConfig as SeedConfig).min!) -
												(seedConfig as SeedConfig).min! +
												1),
									) + (seedConfig as SeedConfig).min!
								: count

						for (let i = 0; i < perParentCount; i++) {
							const overrides = { [parentRel.childField]: parentValue }
							const item = prepareItem(
								tableName,
								shape,
								overrides,
								noSeriesFields,
								uniqueConstraints,
							)
							const doc = table.insert(item) as { _id: string }
							ids.push(doc._id)
						}
					}
				}
			} else {
				for (let i = 0; i < count; i++) {
					const item = prepareItem(
						tableName,
						shape,
						{},
						noSeriesFields,
						uniqueConstraints,
					)
					const doc = table.insert(item) as { _id: string }
					ids.push(doc._id)
				}
			}

			state.generationContext.tableIds.set(tableName, ids)
		}
	}

	/**
	 * Async seeding - for async tables (AsyncReactiveTable)
	 */
	async function seedTablesAsync(): Promise<void> {
		for (const tableName of tableOrder) {
			const table = getTableInstance(tableName)
			if (!table) continue

			if (table.toArray().length > 0) {
				state.generationContext.tableIds.set(
					tableName,
					table.toArray().map((doc) => doc._id),
				)
				continue
			}

			const cfg = getTableConfig(tableName)
			if (!cfg) continue

			const {
				seedConfig,
				count,
				isPerParent,
				explicitParent,
				shape,
				uniqueConstraints,
				noSeriesFields,
			} = cfg

			if (count === 0) {
				state.generationContext.tableIds.set(tableName, [])
				continue
			}

			const ids: string[] = []

			const parentRels = childToParentMap.get(tableName)
			const parentRel = explicitParent
				? parentRels?.find((r) => r.parentTable === explicitParent)
				: parentRels?.[0]

			if (isPerParent && parentRel) {
				const parentIds = state.generationContext.tableIds.get(
					parentRel.parentTable,
				)
				if (parentIds && parentIds.length > 0) {
					const parentTable = getTableInstance(parentRel.parentTable)

					for (const parentId of parentIds) {
						const parentRecord = parentTable?.get
							? (parentTable.get(parentId) as
									| Record<string, unknown>
									| undefined)
							: (parentTable?.toArray().find((d) => d._id === parentId) as
									| Record<string, unknown>
									| undefined)
						const parentValue =
							parentRel.parentField === '_id'
								? parentId
								: parentRecord?.[parentRel.parentField]

						const perParentCount =
							typeof seedConfig === 'object' &&
							seedConfig &&
							(seedConfig as SeedConfig).min !== undefined
								? Math.floor(
										Math.random() *
											(((seedConfig as SeedConfig).max ??
												(seedConfig as SeedConfig).min!) -
												(seedConfig as SeedConfig).min! +
												1),
									) + (seedConfig as SeedConfig).min!
								: count

						for (let i = 0; i < perParentCount; i++) {
							const overrides = { [parentRel.childField]: parentValue }
							const item = prepareItem(
								tableName,
								shape,
								overrides,
								noSeriesFields,
								uniqueConstraints,
							)
							const doc = await table.insert(item)
							ids.push(doc._id)
						}
					}
				}
			} else {
				for (let i = 0; i < count; i++) {
					const item = prepareItem(
						tableName,
						shape,
						{},
						noSeriesFields,
						uniqueConstraints,
					)
					const doc = await table.insert(item)
					ids.push(doc._id)
				}
			}

			state.generationContext.tableIds.set(tableName, ids)
		}
	}

	function resetState() {
		state.generationContext.tableIds.clear()
		state.usedUniqueValues.clear()
		state.uniqueSuffixCounter.value = 0
	}

	return {
		seedTables,
		seedTablesAsync,
		resetState,
		get generationContext() {
			return state.generationContext
		},
	}
}
