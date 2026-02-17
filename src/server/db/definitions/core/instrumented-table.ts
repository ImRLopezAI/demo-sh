import type { PaginatedResult } from '../adapters'
import { decodeCursor, encodeCursor } from '../adapters'
import type { FlowFieldCache } from '../fields/flow-field-cache'
import type { NoSeriesV2Manager } from '../no-series'
import type { ObservabilityHooks } from '../observability/types'
import type { PluginHookManager } from '../plugins/hook-manager'
import type { ReactiveTable, TableSnapshot, WithSystemFields } from '../table'
import type { QueryHelpers, WithConfig } from '../types'
import {
	applyColumnSelection,
	applyOrdering,
	applyPagination,
	createQueryHelpers,
} from './query-helpers'
import type { AutoIncrementConfig, ReverseRelation } from './schema-helpers'
import { applyAutoIncrementToItem } from './schema-helpers'

// ============================================================================
// Configuration for creating an instrumented table
// ============================================================================

export interface InstrumentedTableConfig {
	tableName: string
	table: ReactiveTable<object>
	pluginManager: PluginHookManager
	observabilityState: {
		enabled: boolean
		hooks: ObservabilityHooks
	}
	// Flow fields
	hasFlowFields: boolean
	wrapWithFlowFields: <D extends object>(doc: D, tableName: string) => D
	// NoSeries
	noSeriesConfigs?: Array<{ code: string; field: string }>
	noSeriesManager?: NoSeriesV2Manager
	// AutoIncrement
	tableAutoIncrementConfigs: Map<string, AutoIncrementConfig[]>
	autoIncrementState: Map<string, number>
	// Relations
	reverseRelations?: ReverseRelation[]
	tableInstances: Map<string, ReactiveTable<object>>
	/** Get a fully instrumented table by name (for recursive cascade deletes) */
	getInstrumentedTable?: (
		tableName: string,
	) => { delete: (id: string) => boolean } | undefined
	resolveRelations?: <T extends object>(
		doc: T,
		tableName: string,
		withConfig: WithConfig | undefined,
	) => T
	/** Optional FlowField cache for invalidation on mutations */
	flowFieldCache?: FlowFieldCache
}

// ============================================================================
// Instrumented table factory
// ============================================================================

/**
 * Create an instrumented wrapped table that adds plugin hooks + observability
 * on top of the base operations from wrapped-table.
 */
export function createInstrumentedTable(config: InstrumentedTableConfig) {
	const {
		tableName,
		table,
		pluginManager,
		observabilityState,
		hasFlowFields,
		wrapWithFlowFields,
		noSeriesConfigs,
		noSeriesManager,
		tableAutoIncrementConfigs,
		autoIncrementState,
		reverseRelations,
		tableInstances,
		resolveRelations,
	} = config

	const hasNoSeries =
		noSeriesConfigs && noSeriesConfigs.length > 0 && noSeriesManager
	const hasAutoIncrement = tableAutoIncrementConfigs.has(tableName)

	const wrapDoc = <D extends object>(doc: D): D =>
		hasFlowFields ? wrapWithFlowFields(doc, tableName) : doc

	const wrapDocs = (docs: object[]): object[] =>
		hasFlowFields ? docs.map((doc) => wrapWithFlowFields(doc, tableName)) : docs

	const applyAutoIncrement = (item: Record<string, unknown>) =>
		hasAutoIncrement
			? applyAutoIncrementToItem(
					tableName,
					item,
					tableAutoIncrementConfigs,
					autoIncrementState,
				)
			: item

	const applyNoSeries = (item: Record<string, unknown>) =>
		hasNoSeries ? noSeriesManager?.applyToInsert(noSeriesConfigs!, item) : item

	const trackMutation = (
		operation:
			| 'insert'
			| 'update'
			| 'delete'
			| 'clear'
			| 'insertMany'
			| 'updateMany'
			| 'deleteMany',
		documentId: string | undefined,
		startTime: number,
		success: boolean,
	) => {
		if (observabilityState.enabled && observabilityState.hooks.onMutation) {
			observabilityState.hooks.onMutation({
				tableName,
				operation,
				documentId,
				durationMs: Date.now() - startTime,
				success,
			})
		}
		// Invalidate flow field cache for tables that depend on this table
		if (success && config.flowFieldCache) {
			config.flowFieldCache.invalidateBySource(tableName)
		}
	}

	const trackError = (operation: string, error: Error, documentId?: string) => {
		if (observabilityState.enabled && observabilityState.hooks.onError) {
			observabilityState.hooks.onError({
				tableName,
				operation,
				error,
				documentId,
			})
		}
	}

	// Helper for cascade/restrict/setNull on delete
	const handleDeleteConstraints = (id: string) => {
		if (!reverseRelations) return

		// Check restrict
		for (const { childTable, fieldName, onDelete } of reverseRelations) {
			if (onDelete === 'restrict') {
				const childTableInstance = tableInstances.get(childTable)
				if (childTableInstance) {
					const hasReferences = childTableInstance
						.toArray()
						.some((doc) => (doc as Record<string, unknown>)[fieldName] === id)
					if (hasReferences) {
						throw new Error(
							`Cannot delete ${tableName} with id ${id}: referenced by ${childTable}.${fieldName} with restrict constraint`,
						)
					}
				}
			}
		}
	}

	const handlePostDeleteCascade = (id: string) => {
		if (!reverseRelations) return

		for (const { childTable, fieldName, onDelete } of reverseRelations) {
			const childTableInstance = tableInstances.get(childTable)
			if (!childTableInstance) continue

			if (onDelete === 'cascade') {
				const childRecords = childTableInstance
					.toArray()
					.filter((doc) => (doc as Record<string, unknown>)[fieldName] === id)
				for (const childRecord of childRecords) {
					const instrumented = config.getInstrumentedTable?.(childTable)
					if (instrumented) {
						instrumented.delete(childRecord._id)
					} else {
						childTableInstance.delete(childRecord._id)
					}
				}
			} else if (onDelete === 'setNull') {
				childTableInstance.updateMany(
					(doc) => (doc as Record<string, unknown>)[fieldName] === id,
					{ [fieldName]: null } as Partial<object>,
				)
			}
		}
	}

	return {
		get size() {
			return table.size
		},

		insert: (item: object) => {
			const startTime = Date.now()
			try {
				let processedItem = item as Record<string, unknown>
				const hookResult = pluginManager.executeBeforeInsert(
					tableName,
					processedItem,
				)
				processedItem = hookResult.value
				processedItem = applyAutoIncrement(processedItem)
				processedItem = applyNoSeries(processedItem)

				const result = table.insert(processedItem)
				const wrappedResult = wrapDoc(result)

				pluginManager.executeAfterInsert(tableName, result)
				trackMutation('insert', result._id, startTime, true)

				return wrappedResult
			} catch (error) {
				trackError('insert', error as Error)
				throw error
			}
		},

		update: (id: string, updates: Partial<object>) => {
			const startTime = Date.now()
			try {
				const hookResult = pluginManager.executeBeforeUpdate(
					tableName,
					id,
					updates,
				)
				const processedUpdates = hookResult.value

				const result = table.update(id, processedUpdates)
				const wrappedResult = result ? wrapDoc(result) : result

				if (result) {
					pluginManager.executeAfterUpdate(tableName, result)
				}

				trackMutation('update', id, startTime, result !== undefined)

				return wrappedResult
			} catch (error) {
				trackError('update', error as Error, id)
				throw error
			}
		},

		delete: (id: string) => {
			const startTime = Date.now()
			try {
				pluginManager.executeBeforeDelete(tableName, id)
				handleDeleteConstraints(id)

				const result = table.delete(id)

				if (result) {
					handlePostDeleteCascade(id)
					pluginManager.executeAfterDelete(tableName, id)
				}

				trackMutation('delete', id, startTime, result)

				return result
			} catch (error) {
				trackError('delete', error as Error, id)
				throw error
			}
		},

		get: (id: string) => {
			const result = table.get(id)
			return result ? wrapDoc(result) : result
		},

		toArray: () => wrapDocs(table.toArray()),

		query: (indexName: string, ...values: unknown[]) =>
			wrapDocs(table.query(indexName, ...values)),

		filter: (predicate: (item: object) => boolean) => {
			if (hasFlowFields) {
				return wrapDocs(table.toArray()).filter(predicate)
			}
			return table.filter(predicate)
		},

		find: (predicate: (item: object) => boolean) => {
			if (hasFlowFields) {
				return wrapDocs(table.toArray()).find(predicate)
			}
			return table.find(predicate)
		},

		batch: {
			insertMany: (items: object[]) => {
				const processedItems = items.map((item) => {
					let processed = applyAutoIncrement(item as Record<string, unknown>)
					processed = applyNoSeries(processed)
					return processed
				})
				const results = table.insertMany(processedItems)
				return hasFlowFields ? results.map((doc) => wrapDoc(doc)) : results
			},

			updateMany: (
				predicate: (item: object) => boolean,
				updates: Partial<object>,
			) => {
				const results = table.updateMany(predicate, updates)
				return hasFlowFields ? results.map((doc) => wrapDoc(doc)) : results
			},

			deleteMany: (predicate: (item: object) => boolean) => {
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
		}) => {
			let results = table.toArray()

			if (hasFlowFields) {
				results = wrapDocs(results) as WithSystemFields<object>[]
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
		}) => {
			// Delegate to findMany with limit 1
			const wrappedSelf = createInstrumentedTable(config)
			const results = wrappedSelf.findMany({
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

			const wrappedSelf = createInstrumentedTable(config)
			const results = wrappedSelf.findMany({ where, orderBy, columns })

			let startIndex = 0
			if (cursor) {
				const decoded = decodeCursor(cursor)
				if (decoded) {
					const cursorIndex = results.findIndex(
						(item) => (item as WithSystemFields<object>)._id === decoded.lastId,
					)
					if (cursorIndex !== -1) {
						startIndex =
							decoded.direction === 'forward'
								? cursorIndex + 1
								: Math.max(0, cursorIndex - pageSize)
					}
				}
			}

			const pageItems = results.slice(
				startIndex,
				startIndex + pageSize,
			) as WithSystemFields<object>[]
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

		search: (query: string, fields?: (keyof object)[]) => {
			const startTime = Date.now()
			const results = table.search(query, fields)

			if (observabilityState.enabled && observabilityState.hooks.onQuery) {
				observabilityState.hooks.onQuery({
					tableName,
					operation: 'search',
					durationMs: Date.now() - startTime,
					resultCount: results.length,
				})
			}

			return results
		},

		clear: () => {
			const startTime = Date.now()
			try {
				pluginManager.executeBeforeClear(tableName)
				table.clear()
				pluginManager.executeAfterClear(tableName)
				trackMutation('clear', undefined, startTime, true)
			} catch (error) {
				trackError('clear', error as Error)
				throw error
			}
		},

		subscribe: (callback: () => void) => table.subscribe(callback),

		history: {
			createSnapshot: () => table.createSnapshot(),
			restoreSnapshot: (snapshot: TableSnapshot<object>) =>
				table.restoreSnapshot(snapshot),
			undo: () => table.undo(),
			redo: () => table.redo(),
			canUndo: () => table.canUndo(),
			canRedo: () => table.canRedo(),
		},
	}
}
