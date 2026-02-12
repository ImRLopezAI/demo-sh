import { createId } from '@paralleldrive/cuid2'
import { z } from 'zod'
import type { NoSeriesV2Manager } from '../no-series'
import type { ObservabilityHooks } from '../observability/types'
import type { PluginHookManager } from '../plugins/hook-manager'
import type { TablePlugin } from '../plugins/types'
import type {
	FieldMeta,
	ObservabilityApi,
	PluginApi,
	QueryHelpers,
	SeedConfig,
	ZodShape,
} from '../types'
import { getZodMeta, hasZodTrait } from '../fields/zod-utils'
import type { GenerationContext } from '../seeding'
import { generateValueFromMeta } from '../seeding'

// ============================================================================
// Relation metadata types
// ============================================================================

export type RelationMeta = {
	fieldName: string
	relatedTable: string
	relationName: string
	onDelete?: 'cascade' | 'setNull' | 'restrict'
}

export type ReverseRelation = {
	childTable: string
	fieldName: string
	onDelete: 'cascade' | 'setNull' | 'restrict'
}

export type ParentChildRelation = {
	parentTable: string
	parentField: string
	childField: string
}

export type AutoIncrementConfig = { fieldName: string; initialValue: number }

export type ForeignKeyInfo = { targetTable: string; targetColumn: string }

// ============================================================================
// Table order resolution (topological sort)
// ============================================================================

export function resolveTableOrder(
	tables: Record<string, { _definition: { schemaInput: unknown }; _noSeriesConfig?: unknown }>,
	childToParentMap: Map<string, ParentChildRelation[]>,
	typedOneHelper: (tableName: string) => z.ZodType,
): string[] {
	const dependencies = new Map<string, Set<string>>()
	const allTables = new Set<string>()

	for (const [tableName, builder] of Object.entries(tables)) {
		allTables.add(tableName)
		const deps = new Set<string>()

		const parentRels = childToParentMap.get(tableName)
		if (parentRels) {
			for (const { parentTable } of parentRels) {
				if (parentTable !== tableName) {
					deps.add(parentTable)
				}
			}
		}

		const schemaInput = builder._definition.schemaInput
		const shape =
			typeof schemaInput === 'function'
				? (schemaInput as (one: typeof typedOneHelper) => ZodShape)(typedOneHelper)
				: (schemaInput as ZodShape)

		for (const fieldSchema of Object.values(shape)) {
			const meta = getZodMeta(fieldSchema as z.ZodType)
			if (meta?.related && meta.related !== tableName && allTables.has(meta.related)) {
				deps.add(meta.related)
			}
		}

		dependencies.set(tableName, deps)
	}

	const sorted: string[] = []
	const visited = new Set<string>()
	const visiting = new Set<string>()

	function visit(name: string) {
		if (visited.has(name)) return
		if (visiting.has(name)) return
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

// ============================================================================
// Seed count helper
// ============================================================================

export function getSeedCount(
	seedConfig: number | boolean | SeedConfig | undefined,
	defaultSeed: number,
): { count: number; isPerParent: boolean; parentTable?: string } {
	if (seedConfig === false) {
		return { count: 0, isPerParent: false }
	}
	if (seedConfig === true) {
		return { count: defaultSeed, isPerParent: false }
	}
	if (typeof seedConfig === 'number') {
		return { count: seedConfig, isPerParent: false }
	}
	if (seedConfig && typeof seedConfig === 'object') {
		const min = seedConfig.min ?? defaultSeed
		const max = seedConfig.max ?? min
		const count =
			min === max ? min : Math.floor(Math.random() * (max - min + 1)) + min
		return {
			count,
			isPerParent: seedConfig.perParent ?? false,
			parentTable: seedConfig.parentTable,
		}
	}
	return { count: defaultSeed, isPerParent: false }
}

// ============================================================================
// AutoIncrement helpers
// ============================================================================

export function extractAutoIncrementConfigs(
	tables: Record<string, { _definition: { schemaInput: unknown } }>,
	typedOneHelper: (tableName: string) => z.ZodType,
): {
	tableAutoIncrementConfigs: Map<string, AutoIncrementConfig[]>
	autoIncrementState: Map<string, number>
} {
	const tableAutoIncrementConfigs = new Map<string, AutoIncrementConfig[]>()
	const autoIncrementState = new Map<string, number>()

	for (const [tableName, builder] of Object.entries(tables)) {
		const schemaInput = builder._definition.schemaInput
		const shape =
			typeof schemaInput === 'function'
				? (schemaInput as (one: typeof typedOneHelper) => ZodShape)(typedOneHelper)
				: (schemaInput as ZodShape)

		const configs: AutoIncrementConfig[] = []
		for (const [fieldName, fieldSchema] of Object.entries(shape)) {
			const meta = getZodMeta(fieldSchema as z.ZodType)
			if (meta?.autoIncrement !== undefined) {
				const initialValue =
					typeof meta.autoIncrement === 'number' ? meta.autoIncrement : 1
				configs.push({ fieldName, initialValue })
				autoIncrementState.set(`${tableName}:${fieldName}`, initialValue - 1)
			}
		}
		if (configs.length > 0) {
			tableAutoIncrementConfigs.set(tableName, configs)
		}
	}

	return { tableAutoIncrementConfigs, autoIncrementState }
}

export function applyAutoIncrementToItem(
	tableName: string,
	item: Record<string, unknown>,
	tableAutoIncrementConfigs: Map<string, AutoIncrementConfig[]>,
	autoIncrementState: Map<string, number>,
): Record<string, unknown> {
	const configs = tableAutoIncrementConfigs.get(tableName)
	if (!configs || configs.length === 0) return item

	const result = { ...item }
	for (const { fieldName } of configs) {
		if (result[fieldName] === undefined) {
			const key = `${tableName}:${fieldName}`
			const currentValue = autoIncrementState.get(key) ?? 0
			const nextValue = currentValue + 1
			autoIncrementState.set(key, nextValue)
			result[fieldName] = nextValue
		}
	}
	return result
}

// ============================================================================
// NoSeries config extraction
// ============================================================================

export function extractNoSeriesConfigs(
	tables: Record<string, { _noSeriesConfig?: unknown }>,
	noSeriesManager: NoSeriesV2Manager,
): Map<string, Array<{ code: string; field: string }>> {
	const tableNoSeriesConfigs = new Map<
		string,
		Array<{ code: string; field: string }>
	>()

	for (const [tableName, builder] of Object.entries(tables)) {
		const noSeriesConfig = builder._noSeriesConfig as
			| { field: string; pattern: string; initialValue?: number; incrementBy?: number }
			| Array<{ field: string; pattern: string; initialValue?: number; incrementBy?: number }>
			| undefined

		if (noSeriesConfig) {
			const configs = Array.isArray(noSeriesConfig)
				? noSeriesConfig
				: [noSeriesConfig]
			const v2Configs: Array<{ code: string; field: string }> = []
			for (const config of configs) {
				const seriesCode = `${tableName}:${config.field}`
				noSeriesManager.register({
					code: seriesCode,
					pattern: config.pattern,
					initialValue: config.initialValue,
					incrementBy: config.incrementBy,
				})
				v2Configs.push({ code: seriesCode, field: config.field })
			}
			tableNoSeriesConfigs.set(tableName, v2Configs)
		}
	}

	return tableNoSeriesConfigs
}

// ============================================================================
// Query helpers factory
// ============================================================================

export function createTypedQueryHelpers<T extends object>(item: T): QueryHelpers<T> {
	const rec = item as Record<string, unknown>
	return {
		eq: (field, value) => rec[field as string] === value,
		ne: (field, value) => rec[field as string] !== value,
		gt: (field, value) =>
			(rec[field as string] as number) > (value as number),
		gte: (field, value) =>
			(rec[field as string] as number) >= (value as number),
		lt: (field, value) =>
			(rec[field as string] as number) < (value as number),
		lte: (field, value) =>
			(rec[field as string] as number) <= (value as number),
		like: (field, pattern) => {
			const value = rec[field as string]
			if (typeof value !== 'string') return false
			const regex = new RegExp(
				pattern.replace(/%/g, '.*').replace(/_/g, '.'),
				'i',
			)
			return regex.test(value)
		},
		inArray: (field, values) =>
			(values as unknown[]).includes(rec[field as string]),
		isNull: (field) => rec[field as string] == null,
		isNotNull: (field) => rec[field as string] != null,
		and: (...conditions) => conditions.every(Boolean),
		or: (...conditions) => conditions.some(Boolean),
		not: (condition) => !condition,
	}
}

// ============================================================================
// Plugin API factory
// ============================================================================

export function createPluginApi(pluginManager: PluginHookManager): PluginApi {
	return {
		registerGlobal: (plugin: TablePlugin) =>
			pluginManager.registerGlobal(plugin),
		registerForTable: (tableName: string, plugin: TablePlugin) =>
			pluginManager.registerForTable(tableName, plugin),
		unregister: (pluginName: string, tableName?: string) =>
			pluginManager.unregister(pluginName, tableName),
		getPluginsForTable: (tableName: string) =>
			pluginManager.getPluginsForTable(tableName),
	}
}

// ============================================================================
// Observability API factory
// ============================================================================

export function createObservabilityApi(
	observabilityState: {
		enabled: boolean
		hooks: ObservabilityHooks
	},
): ObservabilityApi {
	return {
		setHooks: (hooks: ObservabilityHooks) => {
			observabilityState.hooks = { ...hooks }
		},
		getHooks: () => ({ ...observabilityState.hooks }),
		enable: () => {
			observabilityState.enabled = true
		},
		disable: () => {
			observabilityState.enabled = false
		},
		isEnabled: () => observabilityState.enabled,
	}
}

// ============================================================================
// Unique value generation for seeding
// ============================================================================

export function generateUniqueValue(
	fieldSchema: z.ZodType,
	meta: FieldMeta | undefined,
	generationContext: GenerationContext,
	counter: { value: number },
): unknown {
	counter.value++
	const suffix = `-${counter.value}-${createId()}`

	if (hasZodTrait(fieldSchema, 'ZodString')) {
		const baseValue = generateValueFromMeta(meta, fieldSchema, generationContext)
		return `${String(baseValue)}${suffix}`
	}

	if (hasZodTrait(fieldSchema, 'ZodNumber')) {
		return counter.value * 1000 + Math.floor(Math.random() * 1000)
	}

	return createId()
}

export function ensureUniqueFields(
	tableName: string,
	item: Record<string, unknown>,
	shape: ZodShape,
	uniqueConstraints: Array<{ name: string; fields: string[] }>,
	usedUniqueValues: Map<string, Set<string>>,
	generationContext: GenerationContext,
	uniqueSuffixCounter: { value: number },
	maxRetries = 100,
): Record<string, unknown> {
	if (uniqueConstraints.length === 0) return item

	const result = { ...item }
	let retries = 0

	for (const constraint of uniqueConstraints) {
		const key = `${tableName}:${constraint.fields.join(',')}`
		let usedSet = usedUniqueValues.get(key)
		if (!usedSet) {
			usedSet = new Set<string>()
			usedUniqueValues.set(key, usedSet)
		}

		let valueKey = constraint.fields
			.map((f) => String(result[f] ?? ''))
			.join('|')

		while (usedSet.has(valueKey) && retries < maxRetries) {
			retries++
			for (const fieldName of constraint.fields) {
				const fieldSchema = shape[fieldName]
				if (!fieldSchema) continue
				const meta = getZodMeta(fieldSchema as z.ZodType)
				if (meta?.autoIncrement !== undefined) continue
				result[fieldName] = generateUniqueValue(
					fieldSchema as z.ZodType,
					meta,
					generationContext,
					uniqueSuffixCounter,
				)
			}
			valueKey = constraint.fields
				.map((f) => String(result[f] ?? ''))
				.join('|')
		}

		usedSet.add(valueKey)
	}

	return result
}
