import { z } from 'zod'
import type {
	ComputedFn,
	FlowFieldContext,
	FlowFieldDef,
	ZodShape,
} from '../types'
import { getZodMeta } from './zod-utils'
import { computeFlowField } from './flow-fields'
import type { RelationMeta, ReverseRelation } from '../core/schema-helpers'
import { FlowFieldCache } from './flow-field-cache'

// ============================================================================
// FlowField & computed extraction from schema
// ============================================================================

export interface FlowFieldExtractionResult {
	flowFieldDefs: Map<string, Map<string, FlowFieldDef>>
	computedFns: Map<string, ComputedFn<object, Record<string, unknown>>>
	relationMeta: Map<string, RelationMeta[]>
	reverseRelations: Map<string, ReverseRelation[]>
}

/**
 * Extract flow field definitions, computed functions, relation metadata,
 * and reverse relations from table builders.
 */
export function extractFieldsAndRelations(
	tables: Record<string, {
		_definition: {
			schemaInput: unknown
			computedFn?: ComputedFn<object, Record<string, unknown>>
		}
	}>,
	typedOneHelper: (tableName: string) => z.ZodType,
): FlowFieldExtractionResult {
	const flowFieldDefs = new Map<string, Map<string, FlowFieldDef>>()
	const computedFns = new Map<string, ComputedFn<object, Record<string, unknown>>>()
	const relationMeta = new Map<string, RelationMeta[]>()
	const reverseRelations = new Map<string, ReverseRelation[]>()

	for (const [tableName, builder] of Object.entries(tables)) {
		const schemaInput = builder._definition.schemaInput
		const shape =
			typeof schemaInput === 'function'
				? (schemaInput as (one: typeof typedOneHelper) => ZodShape)(typedOneHelper)
				: (schemaInput as ZodShape)

		const fieldDefs = new Map<string, FlowFieldDef>()
		const tableRelations: RelationMeta[] = []

		for (const [fieldName, fieldSchema] of Object.entries(shape)) {
			const meta = getZodMeta(fieldSchema as z.ZodType)
			if (meta?.flowField) {
				fieldDefs.set(fieldName, meta.flowField)
			}

			if (meta?.related) {
				const relationName = fieldName.endsWith('Id')
					? fieldName.slice(0, -2)
					: fieldName
				tableRelations.push({
					fieldName,
					relatedTable: meta.related,
					relationName,
					onDelete: meta.onDelete,
				})

				if (meta.onDelete) {
					const reverseList = reverseRelations.get(meta.related) ?? []
					reverseList.push({
						childTable: tableName,
						fieldName,
						onDelete: meta.onDelete,
					})
					reverseRelations.set(meta.related, reverseList)
				}
			}
		}

		if (tableRelations.length > 0) {
			relationMeta.set(tableName, tableRelations)
		}
		if (fieldDefs.size > 0) {
			flowFieldDefs.set(tableName, fieldDefs)
		}

		// Extract computed function if defined
		const computedFn = (
			builder._definition as { computedFn?: ComputedFn<object, Record<string, unknown>> }
		).computedFn
		if (computedFn) {
			computedFns.set(tableName, computedFn)
		}
	}

	return { flowFieldDefs, computedFns, relationMeta, reverseRelations }
}

// ============================================================================
// FlowField context builder
// ============================================================================

export interface FlowFieldSchemaEntry {
	toArray: () => object[]
	findMany: (options?: { where?: (item: object) => boolean }) => object[]
}

/**
 * Build the flow field context from table instances and computed functions.
 */
export function buildFlowFieldContext<TTable extends { toArray: () => object[] }>(
	tableInstances: Map<string, TTable>,
	computedFns: Map<string, ComputedFn<object, Record<string, unknown>>>,
): { flowFieldContext: FlowFieldContext; flowFieldSchemas: Record<string, FlowFieldSchemaEntry> } {
	const flowFieldSchemas: Record<string, FlowFieldSchemaEntry> = {}

	const applyComputedToItems = (
		tableName: string,
		items: object[],
	): object[] => {
		const computedFn = computedFns.get(tableName)
		if (!computedFn) return items
		return items.map((item) => {
			const computed = computedFn(item, { schemas: flowFieldSchemas })
			return { ...item, ...computed }
		})
	}

	for (const [tableName, table] of tableInstances) {
		flowFieldSchemas[tableName] = {
			toArray: () => applyComputedToItems(tableName, table.toArray()),
			findMany: (options?: { where?: (item: object) => boolean }) => {
				let items: object[] = table.toArray()
				if (options?.where) {
					items = items.filter(options.where)
				}
				return applyComputedToItems(tableName, items)
			},
		}
	}

	return {
		flowFieldContext: { schemas: flowFieldSchemas },
		flowFieldSchemas,
	}
}

// ============================================================================
// FlowField document wrapper
// ============================================================================

/**
 * Create a factory function for wrapping documents with flow fields and computed fields.
 * Returns a function that wraps a single document.
 * Optionally accepts a FlowFieldCache for caching aggregation results.
 */
export function createFlowFieldWrapper(
	flowFieldDefs: Map<string, Map<string, FlowFieldDef>>,
	computedFns: Map<string, ComputedFn<object, Record<string, unknown>>>,
	flowFieldContext: FlowFieldContext,
	computedCache?: WeakMap<object, Record<string, unknown>>,
	flowFieldCache?: FlowFieldCache,
): <D extends object>(doc: D, tableName: string) => D {
	const cache = computedCache ?? new WeakMap<object, Record<string, unknown>>()

	// Register flow field definitions with cache for dependency tracking
	if (flowFieldCache) {
		flowFieldCache.registerFlowFields(flowFieldDefs)
	}

	return function wrapWithFlowFields<D extends object>(
		doc: D,
		tableName: string,
	): D {
		const fieldDefs = flowFieldDefs.get(tableName)
		const computedFn = computedFns.get(tableName)

		if (!fieldDefs && !computedFn) return doc

		const getFlowFieldValue = (target: object, fieldName: string): unknown => {
			const def = fieldDefs?.get(fieldName)
			if (def) {
				// Check flow field cache first
				const docId = (target as Record<string, unknown>)._id as string | undefined
				if (flowFieldCache && docId) {
					const cached = flowFieldCache.get(docId, fieldName)
					if (cached.hit) return cached.value
					const value = computeFlowField(target, def, flowFieldContext)
					flowFieldCache.set(docId, fieldName, value)
					return value
				}
				return computeFlowField(target, def, flowFieldContext)
			}
			return (target as Record<string, unknown>)[fieldName]
		}

		const createRowWithFlowFields = (target: object): object => {
			if (!fieldDefs) return target
			return new Proxy(target, {
				get(t, prop) {
					if (typeof prop === 'string' && fieldDefs.has(prop)) {
						return getFlowFieldValue(t, prop)
					}
					return (t as Record<string | symbol, unknown>)[prop]
				},
			})
		}

		const getComputedFields = (target: object): Record<string, unknown> => {
			if (!computedFn) return {}
			let cached = cache.get(target)
			if (!cached) {
				const rowWithFlowFields = createRowWithFlowFields(target)
				cached = computedFn(rowWithFlowFields, flowFieldContext) as Record<string, unknown>
				cache.set(target, cached)
			}
			return cached
		}

		return new Proxy(doc, {
			get(target, prop) {
				if (typeof prop === 'string') {
					if (computedFn) {
						const computed = getComputedFields(target)
						if (prop in computed) {
							return computed[prop as keyof typeof computed]
						}
					}

					const def = fieldDefs?.get(prop)
					if (def) {
						return computeFlowField(target, def, flowFieldContext)
					}
				}
				return (target as Record<string | symbol, unknown>)[prop]
			},
			ownKeys(target) {
				const baseKeys = Reflect.ownKeys(target)
				const flowKeys = fieldDefs ? Array.from(fieldDefs.keys()) : []
				const computedKeys = computedFn
					? Object.keys(getComputedFields(target))
					: []
				return [...new Set([...baseKeys, ...flowKeys, ...computedKeys])]
			},
			getOwnPropertyDescriptor(target, prop) {
				const targetDescriptor = Object.getOwnPropertyDescriptor(target, prop)
				if (targetDescriptor) {
					return targetDescriptor
				}

				if (typeof prop === 'string') {
					if (
						fieldDefs?.has(prop) ||
						(computedFn && prop in getComputedFields(target))
					) {
						return { enumerable: true, configurable: true, writable: false }
					}
				}
				return undefined
			},
		}) as D
	}
}
