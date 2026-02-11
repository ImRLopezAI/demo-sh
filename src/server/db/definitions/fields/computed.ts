import type {
	ComputedFn,
	FlowFieldContext,
	FlowFieldDef,
} from '../types/field.types'
import { computeFlowField } from './flow-fields'

/**
 * Configuration for creating a computed field wrapper.
 */
export interface ComputedFieldConfig<T extends object> {
	/** The computed function to execute */
	computedFn?: ComputedFn<T, Record<string, unknown>>
	/** Map of flow field definitions by field name */
	flowFieldDefs?: Map<string, FlowFieldDef>
}

/**
 * Wrap a document with computed fields and flow fields.
 * Creates a Proxy that intercepts property access to compute values on-the-fly.
 *
 * @param doc - The raw document
 * @param tableName - Name of the table (for debugging)
 * @param config - Configuration with computedFn and flowFieldDefs
 * @param ctx - The flow field context for accessing other tables
 * @returns A proxied document with computed fields
 */
export function wrapWithComputedFields<T extends object>(
	doc: T,
	_tableName: string,
	config: ComputedFieldConfig<T>,
	ctx: FlowFieldContext,
): T {
	const { computedFn, flowFieldDefs } = config

	// If no computed fields or flow fields, return as-is
	if (!computedFn && (!flowFieldDefs || flowFieldDefs.size === 0)) {
		return doc
	}

	// Helper to get a flowField value from the raw document
	const getFlowFieldValue = (target: object, fieldName: string): unknown => {
		const def = flowFieldDefs?.get(fieldName)
		if (def) {
			return computeFlowField(target, def, ctx)
		}
		return (target as Record<string, unknown>)[fieldName]
	}

	// Create a wrapper that provides flowField access for computed functions
	const createRowWithFlowFields = (target: object): object => {
		if (!flowFieldDefs || flowFieldDefs.size === 0) return target
		return new Proxy(target, {
			get(t, prop) {
				if (typeof prop === 'string' && flowFieldDefs.has(prop)) {
					return getFlowFieldValue(t, prop)
				}
				return (t as Record<string | symbol, unknown>)[prop]
			},
		})
	}

	return new Proxy(doc, {
		get(target, prop) {
			if (typeof prop === 'string') {
				// Check computed fields first - pass row with flowField access
				if (computedFn) {
					const rowWithFlowFields = createRowWithFlowFields(target)
					const computed = computedFn(rowWithFlowFields as T, ctx)
					if (prop in computed) {
						return computed[prop as keyof typeof computed]
					}
				}

				// Check flowFields
				const def = flowFieldDefs?.get(prop)
				if (def) {
					return computeFlowField(target, def, ctx)
				}
			}
			return (target as Record<string | symbol, unknown>)[prop]
		},
		ownKeys(target) {
			const baseKeys = Reflect.ownKeys(target)
			const flowKeys = flowFieldDefs ? Array.from(flowFieldDefs.keys()) : []
			const rowWithFlowFields = createRowWithFlowFields(target)
			const computedKeys = computedFn
				? Object.keys(computedFn(rowWithFlowFields as T, ctx))
				: []
			return [...new Set([...baseKeys, ...flowKeys, ...computedKeys])]
		},
		getOwnPropertyDescriptor(target, prop) {
			// If the property exists on target, always return its original descriptor
			// to avoid conflicts when the same property is both stored and computed/flowField
			const targetDescriptor = Object.getOwnPropertyDescriptor(target, prop)
			if (targetDescriptor) {
				return targetDescriptor
			}

			if (typeof prop === 'string') {
				const rowWithFlowFields = createRowWithFlowFields(target)
				if (
					flowFieldDefs?.has(prop) ||
					(computedFn && prop in computedFn(rowWithFlowFields as T, ctx))
				) {
					return { enumerable: true, configurable: true, writable: false }
				}
			}
			return undefined
		},
	}) as T
}

/**
 * Apply computed fields to an array of documents.
 *
 * @param docs - Array of raw documents
 * @param tableName - Name of the table
 * @param config - Configuration with computedFn and flowFieldDefs
 * @param ctx - The flow field context
 * @returns Array of documents with computed fields
 */
export function applyComputedFields<T extends object>(
	docs: T[],
	tableName: string,
	config: ComputedFieldConfig<T>,
	ctx: FlowFieldContext,
): T[] {
	const { computedFn, flowFieldDefs } = config

	// If no computed fields or flow fields, return as-is
	if (!computedFn && (!flowFieldDefs || flowFieldDefs.size === 0)) {
		return docs
	}

	return docs.map((doc) => wrapWithComputedFields(doc, tableName, config, ctx))
}

/**
 * Create a simple computed field function that doesn't need flow field access.
 * Useful for straightforward calculations within a single row.
 *
 * @example
 * ```ts
 * const fullNameComputed = simpleComputed<User>((row) => ({
 *   fullName: `${row.firstName} ${row.lastName}`,
 * }))
 * ```
 */
export function simpleComputed<
	TRow extends object,
	TComputed extends Record<string, unknown>,
>(fn: (row: TRow) => TComputed): ComputedFn<TRow, TComputed> {
	return (row, _ctx) => fn(row)
}

/**
 * Combine multiple computed functions into one.
 * Later functions can override earlier ones.
 *
 * @example
 * ```ts
 * const combined = combineComputed(
 *   (row) => ({ fullName: `${row.firstName} ${row.lastName}` }),
 *   (row, ctx) => ({ orderCount: ctx.schemas.orders.toArray().filter(...).length }),
 * )
 * ```
 */
export function combineComputed<TRow extends object>(
	...fns: ComputedFn<TRow, Record<string, unknown>>[]
): ComputedFn<TRow, Record<string, unknown>> {
	return (row, ctx) => {
		return fns.reduce(
			(acc, fn) => ({ ...acc, ...fn(row, ctx) }),
			{} as Record<string, unknown>,
		)
	}
}
