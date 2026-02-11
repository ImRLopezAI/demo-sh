import type { PaginatedResult } from '../adapters'
import { decodeCursor, encodeCursor } from '../adapters'
import { type ComputedFieldConfig, wrapWithComputedFields } from '../fields'
import type { NoSeriesV2Manager } from '../no-series'
import type { ReactiveTable, TableSnapshot, WithSystemFields } from '../table'
import type {
	ComputedFn,
	FlowFieldContext,
	FlowFieldDef,
} from '../types/field.types'
import type { QueryHelpers, WithConfig } from '../types/query.types'
import {
	applyColumnSelection,
	applyOrdering,
	applyPagination,
	createQueryHelpers,
} from './query-helpers'

/**
 * Configuration for creating a wrapped table.
 */
export interface WrappedTableConfig {
	/** Table name */
	tableName: string
	/** The underlying reactive table instance */
	table: ReactiveTable<object>
	/** Flow field definitions for this table */
	flowFieldDefs?: Map<string, FlowFieldDef>
	/** Computed function for this table */
	computedFn?: ComputedFn<object, Record<string, unknown>>
	/** No Series configurations for auto-generated fields */
	noSeriesConfigs?: Array<{ code: string; field: string }>
	/** No Series manager instance */
	noSeriesManager?: NoSeriesV2Manager
	/** Auto-increment configurations */
	autoIncrementConfigs?: Array<{ fieldName: string; initialValue: number }>
	/** Auto-increment state map */
	autoIncrementState?: Map<string, number>
	/** Reverse relations for cascade/setNull/restrict handling */
	reverseRelations?: Array<{
		childTable: string
		fieldName: string
		onDelete: 'cascade' | 'setNull' | 'restrict'
	}>
	/** Function to get table instance by name (for cascade operations) */
	getTableInstance?: (tableName: string) => ReactiveTable<object> | undefined
	/** Function to get wrapped table by name (for cascade operations) */
	getWrappedTable?: (
		tableName: string,
	) => ReturnType<typeof createWrappedTable> | undefined
	/** Flow field context for computing fields */
	flowFieldContext: FlowFieldContext
	/** Function to resolve relations for eager loading */
	resolveRelations?: <T extends object>(
		doc: T,
		tableName: string,
		withConfig: WithConfig | undefined,
	) => T
}

/**
 * Apply auto-increment values to an insert item.
 *
 * @param config - Wrapped table config
 * @param item - The item to process
 * @returns The item with auto-increment values applied
 */
function applyAutoIncrement(
	config: WrappedTableConfig,
	item: Record<string, unknown>,
): Record<string, unknown> {
	const { tableName, autoIncrementConfigs, autoIncrementState } = config
	if (
		!autoIncrementConfigs ||
		autoIncrementConfigs.length === 0 ||
		!autoIncrementState
	) {
		return item
	}

	const result = { ...item }
	for (const { fieldName } of autoIncrementConfigs) {
		// Only apply if field is not provided or is undefined
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

/**
 * Wrap a document with flow fields and computed fields.
 *
 * @param doc - The raw document
 * @param config - Wrapped table config
 * @returns The document with computed fields accessible via proxy
 */
function wrapDocument<T extends object>(doc: T, config: WrappedTableConfig): T {
	const { flowFieldDefs, computedFn, flowFieldContext } = config

	if (!flowFieldDefs && !computedFn) return doc

	return wrapWithComputedFields(
		doc,
		config.tableName,
		{ computedFn, flowFieldDefs } as ComputedFieldConfig<T>,
		flowFieldContext,
	)
}

/**
 * Create a wrapped table that applies flow field proxies and handles
 * auto-increment, no-series, and cascade operations.
 *
 * @param config - Configuration for the wrapped table
 * @returns A wrapped table API
 */
export function createWrappedTable(config: WrappedTableConfig) {
	const {
		tableName,
		table,
		flowFieldDefs,
		computedFn,
		noSeriesConfigs,
		noSeriesManager,
		reverseRelations,
		getTableInstance,
		getWrappedTable,
		flowFieldContext: _flowFieldContext,
		resolveRelations,
	} = config

	const hasFlowFields = Boolean(flowFieldDefs?.size) || Boolean(computedFn)
	const hasNoSeries =
		noSeriesConfigs && noSeriesConfigs.length > 0 && noSeriesManager
	const hasAutoIncrement =
		config.autoIncrementConfigs && config.autoIncrementConfigs.length > 0

	return {
		get size() {
			return table.size
		},

		insert: (item: object): WithSystemFields<object> => {
			// Apply autoIncrement for fields not provided
			let processedItem = hasAutoIncrement
				? applyAutoIncrement(config, item as Record<string, unknown>)
				: item
			// Apply No Series auto-generation for fields not provided
			processedItem = hasNoSeries
				? noSeriesManager.applyToInsert(
						noSeriesConfigs,
						processedItem as Record<string, unknown>,
					)
				: processedItem
			const result = table.insert(processedItem)
			return hasFlowFields ? wrapDocument(result, config) : result
		},

		update: (
			id: string,
			updates: Partial<object>,
		): WithSystemFields<object> | undefined => {
			const result = table.update(id, updates)
			return result && hasFlowFields ? wrapDocument(result, config) : result
		},

		delete: (id: string): boolean => {
			// Check for restrict constraints
			if (reverseRelations && getTableInstance) {
				for (const { childTable, fieldName, onDelete } of reverseRelations) {
					if (onDelete === 'restrict') {
						const childTableInstance = getTableInstance(childTable)
						if (childTableInstance) {
							// Check if any records reference this ID
							const hasReferences = childTableInstance
								.toArray()
								.some(
									(doc) => (doc as Record<string, unknown>)[fieldName] === id,
								)
							if (hasReferences) {
								throw new Error(
									`Cannot delete ${tableName} with id ${id}: referenced by ${childTable}.${fieldName} with restrict constraint`,
								)
							}
						}
					}
				}
			}

			// Perform the delete
			const result = table.delete(id)

			// Handle cascade and setNull after successful delete
			if (result && reverseRelations && getTableInstance && getWrappedTable) {
				for (const { childTable, fieldName, onDelete } of reverseRelations) {
					const childTableInstance = getTableInstance(childTable)
					if (!childTableInstance) continue

					if (onDelete === 'cascade') {
						// Find all child records that reference this ID and delete them recursively
						const childWrapper = getWrappedTable(childTable)
						const childRecords = childTableInstance
							.toArray()
							.filter(
								(doc) => (doc as Record<string, unknown>)[fieldName] === id,
							)
						// Delete each record individually to trigger cascades recursively
						for (const childRecord of childRecords) {
							childWrapper?.delete(childRecord._id)
						}
					} else if (onDelete === 'setNull') {
						// Set the foreign key to null for all child records
						childTableInstance.updateMany(
							(doc) => (doc as Record<string, unknown>)[fieldName] === id,
							{ [fieldName]: null } as Partial<object>,
						)
					}
				}
			}

			return result
		},

		get: (id: string): WithSystemFields<object> | undefined => {
			const result = table.get(id)
			return result && hasFlowFields ? wrapDocument(result, config) : result
		},

		toArray: (): WithSystemFields<object>[] => {
			const results = table.toArray()
			return hasFlowFields
				? results.map((doc) => wrapDocument(doc, config))
				: results
		},

		query: (
			indexName: string,
			...values: unknown[]
		): WithSystemFields<object>[] => {
			const results = table.query(indexName, ...values)
			return hasFlowFields
				? results.map((doc) => wrapDocument(doc, config))
				: results
		},

		filter: (
			predicate: (item: object) => boolean,
		): WithSystemFields<object>[] => {
			if (hasFlowFields) {
				return table
					.toArray()
					.map((doc) => wrapDocument(doc, config))
					.filter(predicate)
			}
			return table.filter(predicate)
		},

		find: (
			predicate: (item: object) => boolean,
		): WithSystemFields<object> | undefined => {
			if (hasFlowFields) {
				return table
					.toArray()
					.map((doc) => wrapDocument(doc, config))
					.find(predicate)
			}
			return table.find(predicate)
		},

		batch: {
			insertMany: (items: object[]): WithSystemFields<object>[] => {
				// Apply autoIncrement and No Series auto-generation for each item
				const processedItems = items.map((item) => {
					let processed = hasAutoIncrement
						? applyAutoIncrement(config, item as Record<string, unknown>)
						: item
					processed = hasNoSeries
						? noSeriesManager.applyToInsert(
								noSeriesConfigs,
								processed as Record<string, unknown>,
							)
						: processed
					return processed
				})
				const results = table.insertMany(processedItems)
				return hasFlowFields
					? results.map((doc) => wrapDocument(doc, config))
					: results
			},

			updateMany: (
				predicate: (item: object) => boolean,
				updates: Partial<object>,
			): WithSystemFields<object>[] => {
				const results = table.updateMany(predicate, updates)
				return hasFlowFields
					? results.map((doc) => wrapDocument(doc, config))
					: results
			},

			deleteMany: (predicate: (item: object) => boolean): number => {
				return table.deleteMany(predicate)
			},
		},

		findMany: (options?: {
			where?: (item: object, helpers: QueryHelpers<object>) => boolean
			orderBy?:
				| { field: string; direction: 'asc' | 'desc' }
				| Array<{ field: string; direction: 'asc' | 'desc' }>
			limit?: number
			offset?: number
			columns?: Partial<Record<string, boolean>>
			with?: WithConfig
		}): WithSystemFields<object>[] => {
			let results = table.toArray()

			if (hasFlowFields) {
				results = results.map((doc) => wrapDocument(doc, config))
			}

			if (options?.where) {
				results = results.filter((item) =>
					options.where?.(
						item,
						createQueryHelpers(item) as QueryHelpers<object>,
					),
				)
			}

			if (options?.orderBy) {
				results = applyOrdering(results, options.orderBy)
			}

			results = applyPagination(results, options?.offset, options?.limit)

			if (options?.columns) {
				results = applyColumnSelection(results, options.columns)
			}

			// Resolve relations (eager loading with `with`)
			if (options?.with && resolveRelations) {
				results = results.map((doc) =>
					resolveRelations(doc, tableName, options.with),
				)
			}

			return results
		},

		findFirst: (options?: {
			where?: (item: object, helpers: QueryHelpers<object>) => boolean
			orderBy?:
				| { field: string; direction: 'asc' | 'desc' }
				| Array<{ field: string; direction: 'asc' | 'desc' }>
			columns?: Partial<Record<string, boolean>>
			with?: WithConfig
		}): WithSystemFields<object> | undefined => {
			const wrappedTable = createWrappedTable(config)
			const results = wrappedTable.findMany({
				...options,
				limit: 1,
			})
			return results[0]
		},

		paginate: (options: {
			where?: (item: object, helpers: QueryHelpers<object>) => boolean
			orderBy?: { field: string; direction: 'asc' | 'desc' }
			pageSize: number
			cursor?: string | null
			columns?: Partial<Record<string, boolean>>
		}): PaginatedResult<WithSystemFields<object>> => {
			const { pageSize, cursor, orderBy, where, columns } = options

			const wrappedTable = createWrappedTable(config)
			const results = wrappedTable.findMany({
				where,
				orderBy,
				columns,
			})

			let startIndex = 0
			if (cursor) {
				const decoded = decodeCursor(cursor)
				if (decoded) {
					const cursorIndex = results.findIndex(
						(item) => item._id === decoded.lastId,
					)
					if (cursorIndex !== -1) {
						startIndex =
							decoded.direction === 'forward'
								? cursorIndex + 1
								: Math.max(0, cursorIndex - pageSize)
					}
				}
			}

			const pageItems = results.slice(startIndex, startIndex + pageSize)
			const hasMore = startIndex + pageSize < results.length
			const hasPrev = startIndex > 0

			return {
				items: pageItems,
				nextCursor:
					hasMore && pageItems.length > 0
						? encodeCursor({
								lastId: pageItems[pageItems.length - 1]._id,
								direction: 'forward',
							})
						: null,
				prevCursor:
					hasPrev && pageItems.length > 0
						? encodeCursor({
								lastId: pageItems[0]._id,
								direction: 'backward',
							})
						: null,
				hasMore,
				totalCount: results.length,
			}
		},

		search: (
			query: string,
			fields?: (keyof object)[],
		): WithSystemFields<object>[] => {
			return table.search(query, fields)
		},

		clear: (): void => table.clear(),

		subscribe: (callback: () => void): (() => void) =>
			table.subscribe(callback),

		history: {
			createSnapshot: (): TableSnapshot<object> => table.createSnapshot(),
			restoreSnapshot: (snapshot: TableSnapshot<object>): void =>
				table.restoreSnapshot(snapshot),
			undo: (): boolean => table.undo(),
			redo: (): boolean => table.redo(),
			canUndo: (): boolean => table.canUndo(),
			canRedo: (): boolean => table.canRedo(),
		},
	}
}

/**
 * Create a setup table wrapper for single-document configuration tables.
 *
 * @param config - Configuration for the setup table
 * @returns A SetupTableApi instance
 */
export function createSetupTableWrapper(config: {
	tableName: string
	table: ReactiveTable<object>
	defaultValues: Partial<object>
	flowFieldDefs?: Map<string, FlowFieldDef>
	computedFn?: ComputedFn<object, Record<string, unknown>>
	autoIncrementConfigs?: Array<{ fieldName: string; initialValue: number }>
	autoIncrementState?: Map<string, number>
	flowFieldContext: FlowFieldContext
}) {
	const {
		tableName,
		table,
		defaultValues,
		flowFieldDefs,
		computedFn,
		autoIncrementConfigs,
		autoIncrementState,
		flowFieldContext,
	} = config

	const hasFlowFields = Boolean(flowFieldDefs?.size) || Boolean(computedFn)
	const hasAutoIncrement =
		autoIncrementConfigs && autoIncrementConfigs.length > 0

	const wrapDoc = (doc: WithSystemFields<object>): WithSystemFields<object> => {
		if (!hasFlowFields) return doc
		return wrapWithComputedFields(
			doc,
			tableName,
			{ computedFn, flowFieldDefs } as ComputedFieldConfig<object>,
			flowFieldContext,
		) as WithSystemFields<object>
	}

	const applyAutoInc = (
		item: Record<string, unknown>,
	): Record<string, unknown> => {
		if (!hasAutoIncrement || !autoIncrementState || !autoIncrementConfigs)
			return item

		const result = { ...item }
		for (const { fieldName } of autoIncrementConfigs) {
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

	// Helper to get or create the single document
	const getOrCreate = (): WithSystemFields<object> => {
		const docs = table.toArray()
		if (docs.length > 0) {
			return wrapDoc(docs[0] as WithSystemFields<object>)
		}
		// Create with defaults
		let initialData = { ...defaultValues } as Record<string, unknown>
		if (hasAutoIncrement) {
			initialData = applyAutoInc(initialData)
		}
		const created = table.insert(initialData as object)
		return wrapDoc(created as WithSystemFields<object>)
	}

	return {
		get: (): WithSystemFields<object> => getOrCreate(),

		edit: (updates: Partial<object>): WithSystemFields<object> => {
			const docs = table.toArray()
			if (docs.length > 0) {
				const doc = docs[0] as WithSystemFields<object>
				const updated = table.update(doc._id, updates)
				if (!updated) return getOrCreate()
				return wrapDoc(updated as WithSystemFields<object>)
			}
			// No document exists, create with defaults merged with updates
			let initialData = {
				...defaultValues,
				...updates,
			} as Record<string, unknown>
			if (hasAutoIncrement) {
				initialData = applyAutoInc(initialData)
			}
			const created = table.insert(initialData as object)
			return wrapDoc(created as WithSystemFields<object>)
		},

		subscribe: (callback: () => void): (() => void) =>
			table.subscribe(callback),
	}
}
