import type { WithSystemFields } from '../table'

/**
 * Base storage adapter interface.
 * Adapters handle where and how data is stored.
 *
 * @template TAsync - Whether the adapter is async (true) or sync (false)
 */
export interface StorageAdapter<TAsync extends boolean = false> {
	/** Adapter type for TypeScript inference */
	readonly type: TAsync extends true ? 'async' : 'sync'

	/** Get a document by ID */
	get<T extends object>(
		tableName: string,
		id: string,
	): TAsync extends true
		? Promise<WithSystemFields<T> | undefined>
		: WithSystemFields<T> | undefined

	/** Get all documents from a table */
	getAll<T extends object>(
		tableName: string,
	): TAsync extends true
		? Promise<WithSystemFields<T>[]>
		: WithSystemFields<T>[]

	/** Set/insert a document */
	set<T extends object>(
		tableName: string,
		id: string,
		doc: WithSystemFields<T>,
	): TAsync extends true ? Promise<void> : void

	/** Delete a document by ID */
	delete(
		tableName: string,
		id: string,
	): TAsync extends true ? Promise<boolean> : boolean

	/** Clear all documents from a table */
	clear(tableName: string): TAsync extends true ? Promise<void> : void

	/** Check if a document exists */
	has(
		tableName: string,
		id: string,
	): TAsync extends true ? Promise<boolean> : boolean

	/** Get count of documents in a table */
	count(tableName: string): TAsync extends true ? Promise<number> : number

	/** Get multiple documents by IDs */
	getMany?<T extends object>(
		tableName: string,
		ids: string[],
	): TAsync extends true
		? Promise<WithSystemFields<T>[]>
		: WithSystemFields<T>[]

	/** Set multiple documents */
	setMany?<T extends object>(
		tableName: string,
		docs: Array<{ id: string; doc: WithSystemFields<T> }>,
	): TAsync extends true ? Promise<void> : void

	/** Delete multiple documents */
	deleteMany?(
		tableName: string,
		ids: string[],
	): TAsync extends true ? Promise<number> : number

	/** Close/cleanup adapter resources */
	close?(): TAsync extends true ? Promise<void> : void

	/**
	 * Optional query pushdown.
	 * Adapters can implement this to filter/sort at the storage level
	 * rather than loading all data into memory.
	 */
	query?<T extends object>(
		tableName: string,
		options: AdapterQueryOptions,
	): TAsync extends true
		? Promise<WithSystemFields<T>[]>
		: WithSystemFields<T>[]
}

/**
 * Serializable filter descriptors for adapter query pushdown.
 */
export type AdapterFilter =
	| { type: 'eq'; field: string; value: unknown }
	| { type: 'ne'; field: string; value: unknown }
	| { type: 'gt'; field: string; value: number | string }
	| { type: 'gte'; field: string; value: number | string }
	| { type: 'lt'; field: string; value: number | string }
	| { type: 'lte'; field: string; value: number | string }
	| { type: 'in'; field: string; values: unknown[] }
	| { type: 'isNull'; field: string }
	| { type: 'isNotNull'; field: string }
	| { type: 'and'; filters: AdapterFilter[] }
	| { type: 'or'; filters: AdapterFilter[] }

/**
 * Query options for adapter pushdown.
 */
export interface AdapterQueryOptions {
	filter?: AdapterFilter
	orderBy?: { field: string; direction: 'asc' | 'desc' }
	limit?: number
	offset?: number
}

/** Sync storage adapter type */
export type SyncStorageAdapter = StorageAdapter<false>

/** Async storage adapter type */
export type AsyncStorageAdapter = StorageAdapter<true>

/** Any storage adapter */
export type AnyStorageAdapter = SyncStorageAdapter | AsyncStorageAdapter

/**
 * Cursor for pagination
 */
export interface Cursor {
	/** The ID of the last item (for keyset pagination) */
	lastId: string
	/** Optional: timestamp for time-based cursors */
	lastTimestamp?: number
	/** Direction of pagination */
	direction: 'forward' | 'backward'
}

/**
 * Paginated result with cursor
 */
export interface PaginatedResult<T> {
	/** Items in this page */
	items: T[]
	/** Cursor for next page (null if no more items) */
	nextCursor: string | null
	/** Cursor for previous page (null if at start) */
	prevCursor: string | null
	/** Whether there are more items */
	hasMore: boolean
	/** Total count (if available) */
	totalCount?: number
}

/**
 * Encode a cursor object to a string
 */
export function encodeCursor(cursor: Cursor): string {
	return Buffer.from(JSON.stringify(cursor)).toString('base64url')
}

/**
 * Decode a cursor string to a cursor object
 */
export function decodeCursor(cursorString: string): Cursor | null {
	try {
		return JSON.parse(Buffer.from(cursorString, 'base64url').toString('utf8'))
	} catch {
		return null
	}
}
