import type { z } from 'zod'
import { getZodMeta } from '../fields/zod-utils'
import type { ReactiveTable } from '../table'
import type { ZodShape } from '../types/field.types'
import {
	generateRecord,
	generateUniqueValue,
	getSeedCount,
	setFakerSeed,
} from './generator'
import type {
	GenerationContext,
	ParentChildRelation,
	SeedRunnerOptions,
	TableSeedConfig,
	TableSeedResult,
} from './types'

/**
 * Resolve table seeding order based on foreign key dependencies.
 * Tables are ordered so that referenced tables are seeded before referencing tables.
 *
 * @param tableConfigs - Map of table name to seed config
 * @param childToParentMap - Map of child table to parent relations
 * @returns Ordered array of table names
 */
export function resolveTableOrder(
	tableConfigs: Map<string, TableSeedConfig>,
	childToParentMap: Map<string, ParentChildRelation[]>,
): string[] {
	const dependencies = new Map<string, Set<string>>()
	const allTables = new Set<string>()

	for (const [tableName, config] of tableConfigs) {
		allTables.add(tableName)
		const deps = new Set<string>()

		// Use explicit relations for dependencies
		const parentRels = childToParentMap.get(tableName)
		if (parentRels) {
			for (const { parentTable } of parentRels) {
				if (parentTable !== tableName) {
					deps.add(parentTable)
				}
			}
		}

		// Also check foreign key fields
		for (const [_fieldName, fkInfo] of config.foreignKeyFields) {
			if (fkInfo.targetTable !== tableName) {
				deps.add(fkInfo.targetTable)
			}
		}

		dependencies.set(tableName, deps)
	}

	const sorted: string[] = []
	const visited = new Set<string>()
	const visiting = new Set<string>()

	function visit(name: string) {
		if (visited.has(name)) return
		if (visiting.has(name)) return // Circular dependency, skip
		visiting.add(name)

		const deps = dependencies.get(name) ?? new Set()
		for (const dep of deps) {
			if (allTables.has(dep)) {
				visit(dep)
			}
		}

		visiting.delete(name)
		visited.add(name)
		sorted.push(name)
	}

	for (const name of allTables) {
		visit(name)
	}

	return sorted
}

/**
 * Ensure unique constraint fields have unique values.
 * Regenerates fields if collision is detected.
 *
 * @param tableName - Table name
 * @param item - The record to check
 * @param shape - Zod shape
 * @param uniqueConstraints - Unique constraints to enforce
 * @param usedValues - Map of used unique values
 * @param context - Generation context
 * @param counter - Counter for unique value generation
 * @param maxRetries - Maximum retries before giving up
 * @returns Record with unique values
 */
export function ensureUniqueFields(
	tableName: string,
	item: Record<string, unknown>,
	shape: ZodShape,
	uniqueConstraints: Array<{ name: string; fields: string[] }>,
	usedValues: Map<string, Set<string>>,
	context: GenerationContext,
	counter: { value: number },
	maxRetries = 100,
): Record<string, unknown> {
	if (uniqueConstraints.length === 0) return item

	const result = { ...item }
	let retries = 0

	for (const constraint of uniqueConstraints) {
		const key = `${tableName}:${constraint.fields.join(',')}`
		let usedSet = usedValues.get(key)
		if (!usedSet) {
			usedSet = new Set<string>()
			usedValues.set(key, usedSet)
		}

		// Generate unique value for this constraint
		let valueKey = constraint.fields
			.map((f) => String(result[f] ?? ''))
			.join('|')

		while (usedSet.has(valueKey) && retries < maxRetries) {
			retries++
			counter.value++
			// Regenerate fields in this constraint with guaranteed unique values
			for (const fieldName of constraint.fields) {
				const fieldSchema = shape[fieldName]
				if (!fieldSchema) continue
				const meta = getZodMeta(fieldSchema as z.ZodType)
				// Skip if it's autoIncrement (handled separately)
				if (meta?.autoIncrement !== undefined) continue
				// Use guaranteed unique value generator for collision resolution
				result[fieldName] = generateUniqueValue(
					fieldSchema as z.ZodType,
					meta,
					context,
					counter.value,
				)
			}
			valueKey = constraint.fields.map((f) => String(result[f] ?? '')).join('|')
		}

		usedSet.add(valueKey)
	}

	return result
}

/**
 * Seed runner - orchestrates seeding of multiple tables.
 */
export class SeedRunner {
	private options: SeedRunnerOptions
	private tableInstances: Map<string, ReactiveTable<object>>
	private tableConfigs: Map<string, TableSeedConfig>
	private childToParentMap: Map<string, ParentChildRelation[]>
	private context: GenerationContext
	private usedUniqueValues: Map<string, Set<string>>
	private uniqueCounter: { value: number }

	constructor(
		options: SeedRunnerOptions,
		tableInstances: Map<string, ReactiveTable<object>>,
		tableConfigs: Map<string, TableSeedConfig>,
		childToParentMap: Map<string, ParentChildRelation[]>,
	) {
		this.options = options
		this.tableInstances = tableInstances
		this.tableConfigs = tableConfigs
		this.childToParentMap = childToParentMap
		this.context = { tableIds: new Map() }
		this.usedUniqueValues = new Map()
		this.uniqueCounter = { value: 0 }

		// Set faker seed if provided
		if (options.fakerSeed !== undefined) {
			setFakerSeed(options.fakerSeed)
		}
	}

	/**
	 * Run seeding for all tables in dependency order.
	 *
	 * @returns Array of seed results
	 */
	run(): TableSeedResult[] {
		const results: TableSeedResult[] = []
		const tableOrder = resolveTableOrder(
			this.tableConfigs,
			this.childToParentMap,
		)

		for (const tableName of tableOrder) {
			const config = this.tableConfigs.get(tableName)
			if (!config) continue

			const result = this.seedTable(tableName, config)
			results.push(result)
		}

		return results
	}

	/**
	 * Seed a single table.
	 *
	 * @param tableName - Table name
	 * @param config - Seed configuration
	 * @returns Seed result
	 */
	private seedTable(
		tableName: string,
		config: TableSeedConfig,
	): TableSeedResult {
		const table = this.tableInstances.get(tableName)
		if (!table) {
			this.context.tableIds.set(tableName, [])
			return { tableName, count: 0, ids: [] }
		}

		const {
			count,
			isPerParent,
			parentTable: explicitParent,
		} = getSeedCount(config.seedConfig, this.options.defaultSeed)

		if (count === 0) {
			this.context.tableIds.set(tableName, [])
			return { tableName, count: 0, ids: [] }
		}

		const ids: string[] = []

		// Check if this table should use perParent seeding
		const parentRels = this.childToParentMap.get(tableName)
		const parentRel = explicitParent
			? parentRels?.find((r) => r.parentTable === explicitParent)
			: parentRels?.[0]

		if (isPerParent && parentRel) {
			// Hierarchical seeding: create `count` records per parent
			const parentIds = this.context.tableIds.get(parentRel.parentTable)
			if (parentIds && parentIds.length > 0) {
				const parentTable = this.tableInstances.get(parentRel.parentTable)

				for (const parentId of parentIds) {
					// Get parent record to access its field value
					const parentRecord = parentTable?.get(parentId) as
						| Record<string, unknown>
						| undefined
					const parentValue =
						parentRel.parentField === '_id'
							? parentId
							: parentRecord?.[parentRel.parentField]

					// Generate random count for this parent (re-randomize for each)
					const seedConfig = config.seedConfig
					const perParentCount =
						typeof seedConfig === 'object' &&
						seedConfig &&
						'min' in seedConfig &&
						seedConfig.min !== undefined
							? Math.floor(
									Math.random() *
										(((seedConfig as { min?: number; max?: number }).max ??
											(seedConfig as { min?: number }).min!) -
											(seedConfig as { min?: number }).min! +
											1),
								) + (seedConfig as { min: number }).min
							: count

					for (let i = 0; i < perParentCount; i++) {
						const overrides = { [parentRel.childField]: parentValue }
						const id = this.insertRecord(tableName, config, overrides)
						if (id) ids.push(id)
					}
				}
			}
		} else {
			// Standard seeding: create `count` records total
			for (let i = 0; i < count; i++) {
				const id = this.insertRecord(tableName, config)
				if (id) ids.push(id)
			}
		}

		this.context.tableIds.set(tableName, ids)
		return { tableName, count: ids.length, ids }
	}

	/**
	 * Insert a single record with all processing.
	 *
	 * @param tableName - Table name
	 * @param config - Seed config
	 * @param overrides - Field overrides
	 * @returns The inserted document ID, or undefined on failure
	 */
	private insertRecord(
		tableName: string,
		config: TableSeedConfig,
		overrides?: Record<string, unknown>,
	): string | undefined {
		const table = this.tableInstances.get(tableName)
		if (!table) return undefined

		let item = generateRecord({
			shape: config.shape,
			overrides,
			noSeriesFields: config.noSeriesFields,
			autoIncrementFields: config.autoIncrementFields,
			foreignKeyFields: config.foreignKeyFields,
			context: this.context,
			getTableData: (tn) => this.tableInstances.get(tn)?.toArray() ?? [],
		})

		// Ensure unique constraint fields have unique values
		item = ensureUniqueFields(
			tableName,
			item,
			config.shape,
			config.uniqueConstraints,
			this.usedUniqueValues,
			this.context,
			this.uniqueCounter,
		)

		const doc = table.insert(item)
		return doc._id
	}

	/**
	 * Get the generation context (for access to generated IDs).
	 */
	getContext(): GenerationContext {
		return this.context
	}
}

/**
 * Create and run a seed runner.
 *
 * @param options - Seed runner options
 * @param tableInstances - Map of table instances
 * @param tableConfigs - Map of table configurations
 * @param childToParentMap - Parent-child relationship map
 * @returns Seed results and generation context
 */
export function runSeeding(
	options: SeedRunnerOptions,
	tableInstances: Map<string, ReactiveTable<object>>,
	tableConfigs: Map<string, TableSeedConfig>,
	childToParentMap: Map<string, ParentChildRelation[]>,
): { results: TableSeedResult[]; context: GenerationContext } {
	const runner = new SeedRunner(
		options,
		tableInstances,
		tableConfigs,
		childToParentMap,
	)
	const results = runner.run()
	return { results, context: runner.getContext() }
}
