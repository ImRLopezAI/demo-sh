import { createId } from '@paralleldrive/cuid2'
import { createMemoryAdapter } from './adapters/memory'
import type { AsyncStorageAdapter, SyncStorageAdapter } from './adapters/types'

/** Callback function for table change notifications */
export type Listener = () => void

/** Function to unsubscribe from table change notifications */
export type Unsubscribe = () => void

/** Index definition for a table */
export interface TableIndex<T> {
	/** Index name used for queries */
	name: string
	/** Fields included in this index */
	fields: (keyof T)[]
}

/** Unique constraint definition */
export interface UniqueConstraint<T> {
	/** Constraint name */
	name: string
	/** Fields that must be unique together */
	fields: (keyof T)[]
}

/**
 * System fields automatically added to every document.
 */
export interface TableDocument {
	/** Unique document identifier */
	_id: string
	/** Timestamp when document was created */
	_createdAt: number
	/** Timestamp when document was last updated */
	_updatedAt: number
	/** Document version for optimistic concurrency control */
	_version: number
	_meta?: Record<string, unknown>
}

/** Document type with system fields included */
export type WithSystemFields<T> = T & TableDocument

/** Sort direction */
export type SortDirection = 'asc' | 'desc'

/** Order by configuration */
export interface OrderByConfig<T> {
	field: keyof T | '_id' | '_createdAt' | '_updatedAt'
	direction: SortDirection
}

/** History entry for undo/redo */
export interface HistoryEntry<T extends object> {
	type: 'insert' | 'update' | 'delete' | 'clear'
	timestamp: number
	data: {
		id?: string
		before?: WithSystemFields<T>
		after?: WithSystemFields<T>
		all?: Map<string, WithSystemFields<T>>
	}
}

/** Transaction operation */
export interface TransactionOp {
	type: 'insert' | 'update' | 'delete'
	table: string
	id?: string
	data?: object
	updates?: object
}

/** Snapshot of table state */
export interface TableSnapshot<T extends object> {
	name: string
	timestamp: number
	data: Array<WithSystemFields<T>>
}

/** Options for ReactiveTable constructor */
export interface ReactiveTableOptions<T extends object> {
	indexes?: TableIndex<T>[]
	uniqueConstraints?: UniqueConstraint<T>[]
	defaultValues?: Partial<T>
	enableHistory?: boolean
	/** Storage adapter - defaults to internal memory adapter */
	adapter?: SyncStorageAdapter
}

/**
 * Internal reactive table implementation (sync version).
 * Provides CRUD operations, indexing, and pub/sub reactivity.
 * Uses a sync storage adapter for data persistence.
 * @internal Use `createTable` and `defineSchema` instead.
 */
export class ReactiveTable<T extends object> {
	private adapter: SyncStorageAdapter
	private listeners = new Set<Listener>()
	private indexes: Map<string, TableIndex<T>> = new Map()
	private indexCache: Map<string, Map<string, Set<string>>> = new Map()
	private uniqueConstraints: Map<string, UniqueConstraint<T>> = new Map()
	private uniqueCache: Map<string, Set<string>> = new Map()
	private history: HistoryEntry<T>[] = []
	private historyIndex = -1
	private maxHistorySize = 100
	private defaultValues: Partial<T> = {}
	private historyEnabled = false

	readonly name: string
	readonly proxy: ReactiveTableProxy<T>

	constructor(name: string, options?: ReactiveTableOptions<T>) {
		this.name = name
		this.adapter = options?.adapter ?? createMemoryAdapter()

		if (options?.indexes) {
			for (const index of options.indexes) {
				this.indexes.set(index.name, index)
				this.indexCache.set(index.name, new Map())
			}
		}

		if (options?.uniqueConstraints) {
			for (const constraint of options.uniqueConstraints) {
				this.uniqueConstraints.set(constraint.name, constraint)
				this.uniqueCache.set(constraint.name, new Set())
			}
		}

		if (options?.defaultValues) {
			this.defaultValues = options.defaultValues
		}

		if (options?.enableHistory) {
			this.historyEnabled = true
		}

		this.proxy = this.createProxy()
	}

	private createProxy(): ReactiveTableProxy<T> {
		const self = this
		return new Proxy({} as ReactiveTableProxy<T>, {
			get(_target, prop: string) {
				if (prop === 'toArray') return () => self.toArray()
				if (prop === 'size') return self.size
				if (prop === 'subscribe') return (cb: Listener) => self.subscribe(cb)
				if (prop === 'insert') return (item: T) => self.insert(item)
				if (prop === 'update')
					return (id: string, updates: Partial<T>) => self.update(id, updates)
				if (prop === 'delete') return (id: string) => self.delete(id)
				if (prop === 'get') return (id: string) => self.get(id)
				if (prop === 'query')
					return (indexName: string, value: unknown) =>
						self.query(indexName, value)
				if (prop === 'clear') return () => self.clear()
				if (prop === 'has')
					return (id: string) => self.adapter.has(self.name, id)

				// Direct property access returns the item
				return self.adapter.get<T>(self.name, prop)
			},
			set(_target, prop: string, value: T) {
				self.insert(value, prop)
				return true
			},
			deleteProperty(_target, prop: string) {
				return self.delete(prop)
			},
			has(_target, prop: string) {
				return self.adapter.has(self.name, prop)
			},
			ownKeys() {
				return self.adapter.getAll<T>(self.name).map((doc) => doc._id)
			},
			getOwnPropertyDescriptor(_target, prop: string) {
				if (self.adapter.has(self.name, prop)) {
					return {
						enumerable: true,
						configurable: true,
						value: self.adapter.get<T>(self.name, prop),
					}
				}
				return undefined
			},
		})
	}

	private notify(): void {
		for (const listener of this.listeners) {
			listener()
		}
	}

	private buildIndexKey(item: T, fields: (keyof T)[]): string {
		return fields.map((f) => String(item[f] ?? '')).join(':')
	}

	private addToIndexes(id: string, item: WithSystemFields<T>): void {
		for (const [indexName, index] of this.indexes) {
			const cache = this.indexCache.get(indexName)!
			const key = this.buildIndexKey(item, index.fields)
			if (!cache.has(key)) {
				cache.set(key, new Set())
			}
			cache.get(key)?.add(id)
		}
	}

	private removeFromIndexes(id: string, item: WithSystemFields<T>): void {
		for (const [indexName, index] of this.indexes) {
			const cache = this.indexCache.get(indexName)!
			const key = this.buildIndexKey(item, index.fields)
			cache.get(key)?.delete(id)
		}
	}

	private buildUniqueKey(item: T, fields: (keyof T)[]): string {
		return fields.map((f) => String(item[f] ?? '')).join(':')
	}

	private checkUniqueConstraints(item: T, excludeId?: string): void {
		for (const [constraintName, constraint] of this.uniqueConstraints) {
			const cache = this.uniqueCache.get(constraintName)!
			const key = this.buildUniqueKey(item, constraint.fields)

			// Check if this key already exists (excluding current document on update)
			if (cache.has(key)) {
				// Find the existing document with this key
				for (const doc of this.adapter.getAll<T>(this.name)) {
					if (
						doc._id !== excludeId &&
						this.buildUniqueKey(doc, constraint.fields) === key
					) {
						throw new Error(
							`Unique constraint violation: "${constraintName}" on fields [${constraint.fields.join(', ')}]`,
						)
					}
				}
			}
		}
	}

	private addToUniqueCache(item: T): void {
		for (const [constraintName, constraint] of this.uniqueConstraints) {
			const cache = this.uniqueCache.get(constraintName)!
			const key = this.buildUniqueKey(item, constraint.fields)
			cache.add(key)
		}
	}

	private removeFromUniqueCache(item: T): void {
		for (const [constraintName, constraint] of this.uniqueConstraints) {
			const cache = this.uniqueCache.get(constraintName)!
			const key = this.buildUniqueKey(item, constraint.fields)
			cache.delete(key)
		}
	}

	private addHistoryEntry(entry: Omit<HistoryEntry<T>, 'timestamp'>): void {
		if (!this.historyEnabled) return

		// Truncate any redo history
		if (this.historyIndex < this.history.length - 1) {
			this.history = this.history.slice(0, this.historyIndex + 1)
		}

		this.history.push({ ...entry, timestamp: Date.now() })
		this.historyIndex++

		// Limit history size
		if (this.history.length > this.maxHistorySize) {
			this.history.shift()
			this.historyIndex--
		}
	}

	private applyDefaults(item: T): T {
		return { ...this.defaultValues, ...item }
	}

	/**
	 * Subscribe to table changes.
	 * @param callback - Function called when data changes
	 * @returns Unsubscribe function
	 */
	subscribe(callback: Listener): Unsubscribe {
		this.listeners.add(callback)
		return () => {
			this.listeners.delete(callback)
		}
	}

	/**
	 * Insert a new document into the table.
	 * @param item - Document data (without system fields)
	 * @param customId - Optional custom ID (auto-generated if not provided)
	 * @returns The inserted document with system fields
	 * @throws Error if unique constraint is violated
	 */
	insert(item: T, customId?: string): WithSystemFields<T> {
		const itemWithDefaults = this.applyDefaults(item)
		this.checkUniqueConstraints(itemWithDefaults)

		const id = customId ?? createId()
		const now = Date.now()
		const doc: WithSystemFields<T> = {
			...itemWithDefaults,
			_id: id,
			_createdAt: now,
			_updatedAt: now,
			_version: 1,
		}

		this.adapter.set(this.name, id, doc)
		this.addToIndexes(id, doc)
		this.addToUniqueCache(doc)
		this.addHistoryEntry({ type: 'insert', data: { id, after: doc } })
		this.notify()
		return doc
	}

	/**
	 * Insert multiple documents at once.
	 * @param items - Array of documents to insert
	 * @returns Array of inserted documents with system fields
	 * @throws Error if unique constraint is violated
	 */
	insertMany(items: T[]): WithSystemFields<T>[] {
		// First validate all unique constraints
		const itemsWithDefaults = items.map((item) => this.applyDefaults(item))
		for (const item of itemsWithDefaults) {
			this.checkUniqueConstraints(item)
		}

		const docs: WithSystemFields<T>[] = []
		const now = Date.now()
		for (const item of itemsWithDefaults) {
			const id = createId()
			const doc: WithSystemFields<T> = {
				...item,
				_id: id,
				_createdAt: now,
				_updatedAt: now,
				_version: 1,
			}
			this.adapter.set(this.name, id, doc)
			this.addToIndexes(id, doc)
			this.addToUniqueCache(doc)
			this.addHistoryEntry({ type: 'insert', data: { id, after: doc } })
			docs.push(doc)
		}
		this.notify()
		return docs
	}

	/**
	 * Update an existing document.
	 * @param id - Document ID to update
	 * @param updates - Partial document with fields to update
	 * @param expectedVersion - Optional expected version for optimistic concurrency control
	 * @returns Updated document or undefined if not found
	 * @throws Error if unique constraint is violated
	 * @throws Error if expectedVersion doesn't match (optimistic concurrency conflict)
	 */
	update(id: string, updates: Partial<T>, expectedVersion?: number): WithSystemFields<T> | undefined {
		const existing = this.adapter.get<T>(this.name, id)
		if (!existing) return undefined

		if (expectedVersion !== undefined && existing._version !== expectedVersion) {
			throw new Error(
				`Optimistic concurrency conflict: expected version ${expectedVersion} but found ${existing._version} for document ${id}`,
			)
		}

		const merged = { ...existing, ...updates }
		this.checkUniqueConstraints(merged, id)

		this.removeFromIndexes(id, existing)
		this.removeFromUniqueCache(existing)

		const updated: WithSystemFields<T> = {
			...existing,
			...updates,
			_id: id,
			_createdAt: existing._createdAt,
			_updatedAt: Date.now(),
			_version: (existing._version ?? 0) + 1,
		}
		this.adapter.set(this.name, id, updated)
		this.addToIndexes(id, updated)
		this.addToUniqueCache(updated)
		this.addHistoryEntry({
			type: 'update',
			data: { id, before: existing, after: updated },
		})
		this.notify()
		return updated
	}

	/**
	 * Update multiple documents matching a predicate.
	 * @param predicate - Function that returns true for documents to update
	 * @param updates - Partial document with fields to update
	 * @returns Array of updated documents
	 */
	updateMany(
		predicate: (item: WithSystemFields<T>) => boolean,
		updates: Partial<T>,
	): WithSystemFields<T>[] {
		const toUpdate = this.toArray().filter(predicate)
		const updated: WithSystemFields<T>[] = []

		for (const doc of toUpdate) {
			const result = this.update(doc._id, updates)
			if (result) updated.push(result)
		}

		return updated
	}

	/**
	 * Delete a document by ID.
	 * @param id - Document ID to delete
	 * @returns true if deleted, false if not found
	 */
	delete(id: string): boolean {
		const existing = this.adapter.get<T>(this.name, id)
		if (!existing) return false

		this.removeFromIndexes(id, existing)
		this.removeFromUniqueCache(existing)
		this.addHistoryEntry({ type: 'delete', data: { id, before: existing } })

		const result = this.adapter.delete(this.name, id)
		if (result) this.notify()
		return result
	}

	/**
	 * Delete multiple documents matching a predicate.
	 * @param predicate - Function that returns true for documents to delete
	 * @returns Number of deleted documents
	 */
	deleteMany(predicate: (item: WithSystemFields<T>) => boolean): number {
		const toDelete = this.toArray().filter(predicate)
		let count = 0

		for (const doc of toDelete) {
			if (this.delete(doc._id)) count++
		}

		return count
	}

	/**
	 * Get a document by ID.
	 * @param id - Document ID
	 * @returns Document or undefined if not found
	 */
	get(id: string): WithSystemFields<T> | undefined {
		return this.adapter.get<T>(this.name, id)
	}

	/**
	 * Get all documents as an array.
	 * @returns Array of all documents
	 */
	toArray(): WithSystemFields<T>[] {
		return this.adapter.getAll<T>(this.name)
	}

	/**
	 * Query documents using an index.
	 * @param indexName - Name of the index to use
	 * @param values - Values to match against index fields
	 * @returns Array of matching documents
	 */
	query(indexName: string, ...values: unknown[]): WithSystemFields<T>[] {
		const cache = this.indexCache.get(indexName)
		if (!cache) {
			console.warn(`Index "${indexName}" not found on table "${this.name}"`)
			return []
		}
		const key = values.map(String).join(':')
		const ids = cache.get(key)
		if (!ids) return []
		return Array.from(ids)
			.map((id) => this.adapter.get<T>(this.name, id))
			.filter((item): item is WithSystemFields<T> => item !== undefined)
	}

	/**
	 * Filter documents using a predicate function.
	 * @param predicate - Function that returns true for matching documents
	 * @returns Array of matching documents
	 */
	filter(
		predicate: (item: WithSystemFields<T>) => boolean,
	): WithSystemFields<T>[] {
		return this.toArray().filter(predicate)
	}

	/**
	 * Find the first document matching a predicate.
	 * @param predicate - Function that returns true for matching document
	 * @returns First matching document or undefined
	 */
	find(
		predicate: (item: WithSystemFields<T>) => boolean,
	): WithSystemFields<T> | undefined {
		return this.toArray().find(predicate)
	}

	/**
	 * Remove all documents from the table.
	 */
	clear(): void {
		// Save current state for history (only if there's data to clear)
		const currentCount = this.adapter.count(this.name)
		if (this.historyEnabled && currentCount > 0) {
			const allDocs = this.adapter.getAll<T>(this.name)
			const allData = new Map(allDocs.map((doc) => [doc._id, doc]))
			this.addHistoryEntry({ type: 'clear', data: { all: allData } })
		}

		this.adapter.clear(this.name)
		for (const cache of this.indexCache.values()) {
			cache.clear()
		}
		for (const cache of this.uniqueCache.values()) {
			cache.clear()
		}
		this.notify()
	}

	/**
	 * Create a snapshot of the current table state.
	 * @returns Snapshot object that can be restored later
	 */
	createSnapshot(): TableSnapshot<T> {
		return {
			name: this.name,
			timestamp: Date.now(),
			data: this.toArray(),
		}
	}

	/**
	 * Restore table state from a snapshot.
	 * @param snapshot - Snapshot to restore
	 */
	restoreSnapshot(snapshot: TableSnapshot<T>): void {
		this.adapter.clear(this.name)
		for (const cache of this.indexCache.values()) {
			cache.clear()
		}
		for (const cache of this.uniqueCache.values()) {
			cache.clear()
		}

		for (const doc of snapshot.data) {
			this.adapter.set(this.name, doc._id, doc)
			this.addToIndexes(doc._id, doc)
			this.addToUniqueCache(doc)
		}

		this.notify()
	}

	/**
	 * Undo the last operation.
	 * @returns true if undo was successful, false if no history
	 */
	undo(): boolean {
		if (!this.historyEnabled || this.historyIndex < 0) return false

		const entry = this.history[this.historyIndex]
		this.historyIndex--

		switch (entry.type) {
			case 'insert':
				if (entry.data.id) {
					const doc = this.adapter.get<T>(this.name, entry.data.id)
					if (doc) {
						this.removeFromIndexes(entry.data.id, doc)
						this.removeFromUniqueCache(doc)
						this.adapter.delete(this.name, entry.data.id)
					}
				}
				break
			case 'update':
				if (entry.data.id && entry.data.before) {
					const current = this.adapter.get<T>(this.name, entry.data.id)
					if (current) {
						this.removeFromIndexes(entry.data.id, current)
						this.removeFromUniqueCache(current)
					}
					this.adapter.set(this.name, entry.data.id, entry.data.before)
					this.addToIndexes(entry.data.id, entry.data.before)
					this.addToUniqueCache(entry.data.before)
				}
				break
			case 'delete':
				if (entry.data.id && entry.data.before) {
					this.adapter.set(this.name, entry.data.id, entry.data.before)
					this.addToIndexes(entry.data.id, entry.data.before)
					this.addToUniqueCache(entry.data.before)
				}
				break
			case 'clear':
				if (entry.data.all) {
					for (const [id, doc] of entry.data.all) {
						this.adapter.set(this.name, id, doc)
						this.addToIndexes(id, doc)
						this.addToUniqueCache(doc)
					}
				}
				break
		}

		this.notify()
		return true
	}

	/**
	 * Redo the last undone operation.
	 * @returns true if redo was successful, false if no redo history
	 */
	redo(): boolean {
		if (!this.historyEnabled || this.historyIndex >= this.history.length - 1)
			return false

		this.historyIndex++
		const entry = this.history[this.historyIndex]

		switch (entry.type) {
			case 'insert':
				if (entry.data.after) {
					this.adapter.set(this.name, entry.data.after._id, entry.data.after)
					this.addToIndexes(entry.data.after._id, entry.data.after)
					this.addToUniqueCache(entry.data.after)
				}
				break
			case 'update':
				if (entry.data.id && entry.data.after) {
					const current = this.adapter.get<T>(this.name, entry.data.id)
					if (current) {
						this.removeFromIndexes(entry.data.id, current)
						this.removeFromUniqueCache(current)
					}
					this.adapter.set(this.name, entry.data.id, entry.data.after)
					this.addToIndexes(entry.data.id, entry.data.after)
					this.addToUniqueCache(entry.data.after)
				}
				break
			case 'delete':
				if (entry.data.id && entry.data.before) {
					this.removeFromIndexes(entry.data.id, entry.data.before)
					this.removeFromUniqueCache(entry.data.before)
					this.adapter.delete(this.name, entry.data.id)
				}
				break
			case 'clear':
				this.adapter.clear(this.name)
				for (const cache of this.indexCache.values()) {
					cache.clear()
				}
				for (const cache of this.uniqueCache.values()) {
					cache.clear()
				}
				break
		}

		this.notify()
		return true
	}

	/**
	 * Check if undo is available.
	 */
	canUndo(): boolean {
		return this.historyEnabled && this.historyIndex >= 0
	}

	/**
	 * Check if redo is available.
	 */
	canRedo(): boolean {
		return this.historyEnabled && this.historyIndex < this.history.length - 1
	}

	/**
	 * Full-text search across specified fields.
	 * @param query - Search query string
	 * @param fields - Fields to search in (searches all string fields if not specified)
	 * @returns Array of matching documents sorted by relevance
	 */
	search(query: string, fields?: (keyof T)[]): WithSystemFields<T>[] {
		if (!query.trim()) return []

		const searchTerms = query.toLowerCase().split(/\s+/).filter(Boolean)
		const results: Array<{ doc: WithSystemFields<T>; score: number }> = []

		for (const doc of this.adapter.getAll<T>(this.name)) {
			let score = 0
			const fieldsToSearch = fields ?? (Object.keys(doc) as (keyof T)[])

			for (const field of fieldsToSearch) {
				const value = doc[field as keyof WithSystemFields<T>]
				if (typeof value === 'string') {
					const lowerValue = value.toLowerCase()
					for (const term of searchTerms) {
						if (lowerValue.includes(term)) {
							// Exact match scores higher
							if (lowerValue === term) score += 10
							// Word boundary match
							else if (new RegExp(`\\b${term}\\b`).test(lowerValue)) score += 5
							// Partial match
							else score += 1
						}
					}
				}
			}

			if (score > 0) {
				results.push({ doc, score })
			}
		}

		// Sort by score descending
		return results.sort((a, b) => b.score - a.score).map((r) => r.doc)
	}

	/**
	 * Enable or disable history tracking.
	 * @param enabled - Whether to enable history
	 */
	setHistoryEnabled(enabled: boolean): void {
		this.historyEnabled = enabled
		if (!enabled) {
			this.history = []
			this.historyIndex = -1
		}
	}

	/** Number of documents in the table */
	get size(): number {
		return this.adapter.count(this.name)
	}

	[Symbol.iterator](): Iterator<[string, WithSystemFields<T>]> {
		const docs = this.adapter.getAll<T>(this.name)
		const entries = docs.map(
			(doc) => [doc._id, doc] as [string, WithSystemFields<T>],
		)
		return entries[Symbol.iterator]()
	}
}

/**
 * Proxy interface for reactive table access.
 * Provides typed access to table methods and documents.
 */
export interface ReactiveTableProxy<T extends object> {
	/** Get all documents as an array */
	toArray(): WithSystemFields<T>[]
	/** Number of documents in the table */
	size: number
	/** Subscribe to table changes */
	subscribe(callback: Listener): Unsubscribe
	/** Insert a new document */
	insert(item: T): WithSystemFields<T>
	/** Insert multiple documents */
	insertMany(items: T[]): WithSystemFields<T>[]
	/** Update an existing document */
	update(id: string, updates: Partial<T>): WithSystemFields<T> | undefined
	/** Delete a document by ID */
	delete(id: string): boolean
	/** Get a document by ID */
	get(id: string): WithSystemFields<T> | undefined
	/** Query documents using an index */
	query(indexName: string, ...values: unknown[]): WithSystemFields<T>[]
	/** Remove all documents */
	clear(): void
	/** Check if a document exists */
	has(id: string): boolean
	/** Direct access to documents by ID */
	[id: string]: WithSystemFields<T> | undefined | unknown
}

/** Options for AsyncReactiveTable constructor */
export interface AsyncReactiveTableOptions<T extends object> {
	indexes?: TableIndex<T>[]
	uniqueConstraints?: UniqueConstraint<T>[]
	defaultValues?: Partial<T>
	enableHistory?: boolean
	adapter: AsyncStorageAdapter
	/** Callback when optimistic update fails and rollback occurs */
	onRollback?: (error: Error, operation: string, id: string) => void
}

/** Pending operation for optimistic updates (reserved for future use) */
// @ts-expect-error - Interface reserved for future use
interface _PendingOperation<T extends object> {
	type: 'insert' | 'update' | 'delete'
	doc?: WithSystemFields<T>
	previousDoc?: WithSystemFields<T>
}

/**
 * Async reactive table implementation with optimistic updates.
 * All operations update local state immediately, then sync to adapter in background.
 * On adapter failure, changes are rolled back and subscribers are notified.
 * @internal Use `createTable` and `defineSchema` instead.
 */
export class AsyncReactiveTable<T extends object> {
	private adapter: AsyncStorageAdapter
	private listeners = new Set<Listener>()
	private indexes: Map<string, TableIndex<T>> = new Map()
	private indexCache: Map<string, Map<string, Set<string>>> = new Map()
	private uniqueConstraints: Map<string, UniqueConstraint<T>> = new Map()
	private uniqueCache: Map<string, Set<string>> = new Map()
	private history: HistoryEntry<T>[] = []
	private historyIndex = -1
	private maxHistorySize = 100
	private defaultValues: Partial<T> = {}
	private historyEnabled = false
	private onRollback?: (error: Error, operation: string, id: string) => void

	// Optimistic update state
	private pendingWrites: Map<string, WithSystemFields<T>> = new Map()
	private pendingDeletes: Set<string> = new Set()
	private confirmedData: Map<string, WithSystemFields<T>> = new Map()
	private initialized = false

	readonly name: string
	readonly proxy: AsyncReactiveTableProxy<T>

	constructor(name: string, options: AsyncReactiveTableOptions<T>) {
		this.name = name
		this.adapter = options.adapter
		this.onRollback = options.onRollback

		if (options.indexes) {
			for (const index of options.indexes) {
				this.indexes.set(index.name, index)
				this.indexCache.set(index.name, new Map())
			}
		}

		if (options.uniqueConstraints) {
			for (const constraint of options.uniqueConstraints) {
				this.uniqueConstraints.set(constraint.name, constraint)
				this.uniqueCache.set(constraint.name, new Set())
			}
		}

		if (options.defaultValues) {
			this.defaultValues = options.defaultValues
		}

		if (options.enableHistory) {
			this.historyEnabled = true
		}

		this.proxy = this.createProxy()
	}

	/** Initialize table by loading data from adapter */
	async init(): Promise<void> {
		if (this.initialized) return
		const docs = await this.adapter.getAll<T>(this.name)
		for (const doc of docs) {
			this.confirmedData.set(doc._id, doc)
			this.addToIndexes(doc._id, doc)
			this.addToUniqueCache(doc)
		}
		this.initialized = true
	}

	private createProxy(): AsyncReactiveTableProxy<T> {
		const self = this
		return new Proxy({} as AsyncReactiveTableProxy<T>, {
			get(_target, prop: string) {
				if (prop === 'toArray') return () => self.toArray()
				if (prop === 'size') return self.size
				if (prop === 'subscribe') return (cb: Listener) => self.subscribe(cb)
				if (prop === 'insert') return (item: T) => self.insert(item)
				if (prop === 'update')
					return (id: string, updates: Partial<T>) => self.update(id, updates)
				if (prop === 'delete') return (id: string) => self.delete(id)
				if (prop === 'get') return (id: string) => self.get(id)
				if (prop === 'query')
					return (indexName: string, value: unknown) =>
						self.query(indexName, value)
				if (prop === 'clear') return () => self.clear()
				if (prop === 'has') return (id: string) => self.has(id)

				// Direct property access returns the item
				return self.getSync(prop)
			},
			set(_target, prop: string, value: T) {
				self.insert(value, prop)
				return true
			},
			deleteProperty(_target, prop: string) {
				self.delete(prop)
				return true
			},
			has(_target, prop: string) {
				return self.has(prop)
			},
			ownKeys() {
				return self.toArray().map((doc) => doc._id)
			},
			getOwnPropertyDescriptor(_target, prop: string) {
				const doc = self.getSync(prop)
				if (doc) {
					return {
						enumerable: true,
						configurable: true,
						value: doc,
					}
				}
				return undefined
			},
		})
	}

	private notify(): void {
		for (const listener of this.listeners) {
			listener()
		}
	}

	private buildIndexKey(
		item: T | WithSystemFields<T>,
		fields: (keyof T)[],
	): string {
		return fields.map((f) => String(item[f as keyof typeof item])).join(':')
	}

	private addToIndexes(id: string, item: WithSystemFields<T>): void {
		for (const [indexName, index] of this.indexes) {
			const cache = this.indexCache.get(indexName)!
			const key = this.buildIndexKey(item, index.fields)
			let ids = cache.get(key)
			if (!ids) {
				ids = new Set()
				cache.set(key, ids)
			}
			ids.add(id)
		}
	}

	private removeFromIndexes(id: string, item: WithSystemFields<T>): void {
		for (const [indexName, index] of this.indexes) {
			const cache = this.indexCache.get(indexName)!
			const key = this.buildIndexKey(item, index.fields)
			const ids = cache.get(key)
			if (ids) {
				ids.delete(id)
				if (ids.size === 0) cache.delete(key)
			}
		}
	}

	private buildUniqueKey(
		item: T | WithSystemFields<T>,
		fields: (keyof T)[],
	): string {
		return fields.map((f) => String(item[f as keyof typeof item])).join(':')
	}

	private checkUniqueConstraints(
		item: T | WithSystemFields<T>,
		excludeId?: string,
	): void {
		for (const [constraintName, constraint] of this.uniqueConstraints) {
			const cache = this.uniqueCache.get(constraintName)!
			const key = this.buildUniqueKey(item, constraint.fields)

			if (cache.has(key)) {
				for (const doc of this.toArray()) {
					if (
						doc._id !== excludeId &&
						this.buildUniqueKey(doc, constraint.fields) === key
					) {
						throw new Error(
							`Unique constraint violation: "${constraintName}" on fields [${constraint.fields.join(', ')}]`,
						)
					}
				}
			}
		}
	}

	private addToUniqueCache(item: T | WithSystemFields<T>): void {
		for (const [constraintName, constraint] of this.uniqueConstraints) {
			const cache = this.uniqueCache.get(constraintName)!
			const key = this.buildUniqueKey(item, constraint.fields)
			cache.add(key)
		}
	}

	private removeFromUniqueCache(item: T | WithSystemFields<T>): void {
		for (const [constraintName, constraint] of this.uniqueConstraints) {
			const cache = this.uniqueCache.get(constraintName)!
			const key = this.buildUniqueKey(item, constraint.fields)
			cache.delete(key)
		}
	}

	private applyDefaults(item: T): T {
		return { ...this.defaultValues, ...item } as T
	}

	private addHistoryEntry(entry: Omit<HistoryEntry<T>, 'timestamp'>): void {
		if (!this.historyEnabled) return

		if (this.historyIndex < this.history.length - 1) {
			this.history = this.history.slice(0, this.historyIndex + 1)
		}

		this.history.push({
			...entry,
			timestamp: Date.now(),
		})

		if (this.history.length > this.maxHistorySize) {
			this.history.shift()
		} else {
			this.historyIndex++
		}
	}

	/** Get merged view: pending writes + confirmed data - pending deletes */
	private getMergedData(): Map<string, WithSystemFields<T>> {
		const result = new Map(this.confirmedData)

		// Apply pending writes (inserts and updates)
		for (const [id, doc] of this.pendingWrites) {
			result.set(id, doc)
		}

		// Apply pending deletes
		for (const id of this.pendingDeletes) {
			result.delete(id)
		}

		return result
	}

	/** Sync version of get for proxy access */
	private getSync(id: string): WithSystemFields<T> | undefined {
		if (this.pendingDeletes.has(id)) return undefined
		return this.pendingWrites.get(id) ?? this.confirmedData.get(id)
	}

	/** Check if document exists (sync, for optimistic reads) */
	has(id: string): boolean {
		if (this.pendingDeletes.has(id)) return false
		return this.pendingWrites.has(id) || this.confirmedData.has(id)
	}

	subscribe(callback: Listener): Unsubscribe {
		this.listeners.add(callback)
		return () => {
			this.listeners.delete(callback)
		}
	}

	/**
	 * Insert a new document (optimistic).
	 * Updates local state immediately, syncs to adapter in background.
	 * @returns The inserted document with system fields
	 */
	async insert(item: T, customId?: string): Promise<WithSystemFields<T>> {
		const itemWithDefaults = this.applyDefaults(item)
		this.checkUniqueConstraints(itemWithDefaults)

		const id = customId ?? createId()
		const now = Date.now()
		const doc: WithSystemFields<T> = {
			...itemWithDefaults,
			_id: id,
			_createdAt: now,
			_updatedAt: now,
			_version: 1,
		}

		// Optimistic update
		this.pendingWrites.set(id, doc)
		this.addToIndexes(id, doc)
		this.addToUniqueCache(doc)
		this.addHistoryEntry({ type: 'insert', data: { id, after: doc } })
		this.notify()

		// Background sync
		try {
			await this.adapter.set(this.name, id, doc)
			// Confirm: move from pending to confirmed
			this.pendingWrites.delete(id)
			this.confirmedData.set(id, doc)
		} catch (error) {
			// Rollback
			this.pendingWrites.delete(id)
			this.removeFromIndexes(id, doc)
			this.removeFromUniqueCache(doc)
			this.notify()
			this.onRollback?.(error as Error, 'insert', id)
			throw error
		}

		return doc
	}

	/**
	 * Insert multiple documents (optimistic).
	 * @returns Array of inserted documents with system fields
	 */
	async insertMany(items: T[]): Promise<WithSystemFields<T>[]> {
		const docs: WithSystemFields<T>[] = []
		for (const item of items) {
			const doc = await this.insert(item)
			docs.push(doc)
		}
		return docs
	}

	/**
	 * Update an existing document (optimistic).
	 * @param expectedVersion - Optional expected version for optimistic concurrency control
	 */
	async update(
		id: string,
		updates: Partial<T>,
		expectedVersion?: number,
	): Promise<WithSystemFields<T> | undefined> {
		const existing = this.getSync(id)
		if (!existing) return undefined

		if (expectedVersion !== undefined && existing._version !== expectedVersion) {
			throw new Error(
				`Optimistic concurrency conflict: expected version ${expectedVersion} but found ${existing._version} for document ${id}`,
			)
		}

		const merged = { ...existing, ...updates }
		this.checkUniqueConstraints(merged, id)

		this.removeFromIndexes(id, existing)
		this.removeFromUniqueCache(existing)

		const updated: WithSystemFields<T> = {
			...existing,
			...updates,
			_id: id,
			_createdAt: existing._createdAt,
			_updatedAt: Date.now(),
			_version: (existing._version ?? 0) + 1,
		}

		// Optimistic update
		this.pendingWrites.set(id, updated)
		this.addToIndexes(id, updated)
		this.addToUniqueCache(updated)
		this.addHistoryEntry({
			type: 'update',
			data: { id, before: existing, after: updated },
		})
		this.notify()

		// Background sync
		try {
			await this.adapter.set(this.name, id, updated)
			// Confirm
			this.pendingWrites.delete(id)
			this.confirmedData.set(id, updated)
		} catch (error) {
			// Rollback
			this.pendingWrites.delete(id)
			this.removeFromIndexes(id, updated)
			this.addToIndexes(id, existing)
			this.removeFromUniqueCache(updated)
			this.addToUniqueCache(existing)
			// Restore previous state
			if (this.confirmedData.has(id)) {
				// Was an update to existing confirmed doc
			} else {
				// Was pending, remove entirely
				this.confirmedData.delete(id)
			}
			this.notify()
			this.onRollback?.(error as Error, 'update', id)
			throw error
		}

		return updated
	}

	/**
	 * Update multiple documents matching a predicate (optimistic).
	 */
	async updateMany(
		predicate: (item: WithSystemFields<T>) => boolean,
		updates: Partial<T>,
	): Promise<WithSystemFields<T>[]> {
		const toUpdate = this.toArray().filter(predicate)
		const updated: WithSystemFields<T>[] = []

		for (const doc of toUpdate) {
			const result = await this.update(doc._id, updates)
			if (result) updated.push(result)
		}

		return updated
	}

	/**
	 * Delete a document by ID (optimistic).
	 */
	async delete(id: string): Promise<boolean> {
		const existing = this.getSync(id)
		if (!existing) return false

		this.removeFromIndexes(id, existing)
		this.removeFromUniqueCache(existing)
		this.addHistoryEntry({ type: 'delete', data: { id, before: existing } })

		// Optimistic delete
		this.pendingWrites.delete(id)
		this.pendingDeletes.add(id)
		this.notify()

		// Background sync
		try {
			await this.adapter.delete(this.name, id)
			// Confirm
			this.pendingDeletes.delete(id)
			this.confirmedData.delete(id)
		} catch (error) {
			// Rollback
			this.pendingDeletes.delete(id)
			this.addToIndexes(id, existing)
			this.addToUniqueCache(existing)
			// Restore to confirmed if it was there
			if (!this.pendingWrites.has(id)) {
				this.confirmedData.set(id, existing)
			}
			this.notify()
			this.onRollback?.(error as Error, 'delete', id)
			throw error
		}

		return true
	}

	/**
	 * Delete multiple documents matching a predicate (optimistic).
	 */
	async deleteMany(
		predicate: (item: WithSystemFields<T>) => boolean,
	): Promise<number> {
		const toDelete = this.toArray().filter(predicate)
		let count = 0

		for (const doc of toDelete) {
			if (await this.delete(doc._id)) count++
		}

		return count
	}

	/**
	 * Get a document by ID.
	 * Returns from optimistic state (pending + confirmed - deleted).
	 */
	get(id: string): WithSystemFields<T> | undefined {
		return this.getSync(id)
	}

	/**
	 * Get all documents as an array.
	 * Returns merged optimistic state.
	 */
	toArray(): WithSystemFields<T>[] {
		return Array.from(this.getMergedData().values())
	}

	/**
	 * Query documents using an index.
	 */
	query(indexName: string, ...values: unknown[]): WithSystemFields<T>[] {
		const cache = this.indexCache.get(indexName)
		if (!cache) {
			console.warn(`Index "${indexName}" not found on table "${this.name}"`)
			return []
		}
		const key = values.map(String).join(':')
		const ids = cache.get(key)
		if (!ids) return []
		return Array.from(ids)
			.map((id) => this.getSync(id))
			.filter((item): item is WithSystemFields<T> => item !== undefined)
	}

	/**
	 * Filter documents using a predicate function.
	 */
	filter(
		predicate: (item: WithSystemFields<T>) => boolean,
	): WithSystemFields<T>[] {
		return this.toArray().filter(predicate)
	}

	/**
	 * Find the first document matching a predicate.
	 */
	find(
		predicate: (item: WithSystemFields<T>) => boolean,
	): WithSystemFields<T> | undefined {
		return this.toArray().find(predicate)
	}

	/**
	 * Remove all documents (optimistic).
	 */
	async clear(): Promise<void> {
		const currentDocs = this.toArray()
		if (currentDocs.length === 0) return

		if (this.historyEnabled) {
			const allData = new Map(currentDocs.map((doc) => [doc._id, doc]))
			this.addHistoryEntry({ type: 'clear', data: { all: allData } })
		}

		// Optimistic clear
		const previousConfirmed = new Map(this.confirmedData)
		const previousPending = new Map(this.pendingWrites)

		this.confirmedData.clear()
		this.pendingWrites.clear()
		this.pendingDeletes.clear()
		for (const cache of this.indexCache.values()) {
			cache.clear()
		}
		for (const cache of this.uniqueCache.values()) {
			cache.clear()
		}
		this.notify()

		// Background sync
		try {
			await this.adapter.clear(this.name)
		} catch (error) {
			// Rollback
			this.confirmedData = previousConfirmed
			this.pendingWrites = previousPending
			for (const doc of this.toArray()) {
				this.addToIndexes(doc._id, doc)
				this.addToUniqueCache(doc)
			}
			this.notify()
			this.onRollback?.(error as Error, 'clear', '*')
			throw error
		}
	}

	/**
	 * Create a snapshot of the current table state.
	 */
	createSnapshot(): TableSnapshot<T> {
		return {
			name: this.name,
			timestamp: Date.now(),
			data: this.toArray(),
		}
	}

	/**
	 * Restore table state from a snapshot.
	 */
	async restoreSnapshot(snapshot: TableSnapshot<T>): Promise<void> {
		await this.clear()

		for (const doc of snapshot.data) {
			this.pendingWrites.set(doc._id, doc)
			this.addToIndexes(doc._id, doc)
			this.addToUniqueCache(doc)
		}
		this.notify()

		// Sync all to adapter
		try {
			for (const doc of snapshot.data) {
				await this.adapter.set(this.name, doc._id, doc)
				this.pendingWrites.delete(doc._id)
				this.confirmedData.set(doc._id, doc)
			}
		} catch (error) {
			this.onRollback?.(error as Error, 'restoreSnapshot', '*')
			throw error
		}
	}

	/**
	 * Full-text search across specified fields.
	 */
	search(query: string, fields?: (keyof T)[]): WithSystemFields<T>[] {
		if (!query.trim()) return []

		const searchTerms = query.toLowerCase().split(/\s+/).filter(Boolean)
		const results: Array<{ doc: WithSystemFields<T>; score: number }> = []

		for (const doc of this.toArray()) {
			let score = 0
			const fieldsToSearch = fields ?? (Object.keys(doc) as (keyof T)[])

			for (const field of fieldsToSearch) {
				const value = doc[field as keyof WithSystemFields<T>]
				if (typeof value === 'string') {
					const lowerValue = value.toLowerCase()
					for (const term of searchTerms) {
						if (lowerValue.includes(term)) {
							if (lowerValue === term) score += 10
							else if (new RegExp(`\\b${term}\\b`).test(lowerValue)) score += 5
							else score += 1
						}
					}
				}
			}

			if (score > 0) {
				results.push({ doc, score })
			}
		}

		return results.sort((a, b) => b.score - a.score).map((r) => r.doc)
	}

	/** Number of documents in the table */
	get size(): number {
		return this.getMergedData().size
	}

	[Symbol.iterator](): Iterator<[string, WithSystemFields<T>]> {
		const entries = Array.from(this.getMergedData().entries())
		return entries[Symbol.iterator]()
	}
}

/**
 * Proxy interface for async reactive table access.
 */
export interface AsyncReactiveTableProxy<T extends object> {
	toArray(): WithSystemFields<T>[]
	size: number
	subscribe(callback: Listener): Unsubscribe
	insert(item: T): Promise<WithSystemFields<T>>
	insertMany(items: T[]): Promise<WithSystemFields<T>[]>
	update(
		id: string,
		updates: Partial<T>,
	): Promise<WithSystemFields<T> | undefined>
	delete(id: string): Promise<boolean>
	get(id: string): WithSystemFields<T> | undefined
	query(indexName: string, ...values: unknown[]): WithSystemFields<T>[]
	clear(): Promise<void>
	has(id: string): boolean
	[id: string]: WithSystemFields<T> | undefined | unknown
}
