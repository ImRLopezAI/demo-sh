import type { WithSystemFields } from '../table'
import type { AsyncStorageAdapter, SyncStorageAdapter } from './types'

/**
 * Transaction operation type.
 */
export type TransactionOpType = 'set' | 'delete' | 'clear'

/**
 * A single operation in a transaction.
 */
export interface TransactionOperation<T extends object = object> {
	type: TransactionOpType
	tableName: string
	id?: string
	doc?: WithSystemFields<T>
}

/**
 * Transaction state for tracking changes.
 */
export interface TransactionState {
	/** Operations to be committed */
	operations: TransactionOperation[]
	/** Snapshot of data before transaction (for rollback) */
	snapshots: Map<string, Map<string, WithSystemFields<object>>>
	/** Whether the transaction is active */
	active: boolean
	/** Transaction ID */
	id: string
}

/**
 * Transaction context for managing atomic operations.
 * Provides begin/commit/rollback functionality.
 */
export class TransactionContext {
	private adapter: SyncStorageAdapter
	private state: TransactionState | null = null
	private idCounter = 0

	constructor(adapter: SyncStorageAdapter) {
		this.adapter = adapter
	}

	/**
	 * Begin a new transaction.
	 * @throws If a transaction is already in progress
	 */
	begin(): void {
		if (this.state?.active) {
			throw new Error('Transaction already in progress')
		}
		this.state = {
			operations: [],
			snapshots: new Map(),
			active: true,
			id: `txn_${++this.idCounter}`,
		}
	}

	/**
	 * Check if a transaction is currently active.
	 */
	isActive(): boolean {
		return this.state?.active ?? false
	}

	/**
	 * Get the current transaction ID.
	 */
	getTransactionId(): string | undefined {
		return this.state?.id
	}

	/**
	 * Snapshot a table's current state before modifying it.
	 */
	private snapshotTable(tableName: string): void {
		if (!this.state) return
		if (this.state.snapshots.has(tableName)) return

		const docs = this.adapter.getAll<object>(tableName)
		const snapshot = new Map<string, WithSystemFields<object>>()
		for (const doc of docs) {
			snapshot.set(doc._id, { ...doc })
		}
		this.state.snapshots.set(tableName, snapshot)
	}

	/**
	 * Record a set operation.
	 */
	set<T extends object>(
		tableName: string,
		id: string,
		doc: WithSystemFields<T>,
	): void {
		if (!this.state?.active) {
			// No transaction, execute directly
			this.adapter.set(tableName, id, doc)
			return
		}

		this.snapshotTable(tableName)
		this.state.operations.push({
			type: 'set',
			tableName,
			id,
			doc: doc as WithSystemFields<object>,
		})
		// Apply immediately (optimistic)
		this.adapter.set(tableName, id, doc)
	}

	/**
	 * Record a delete operation.
	 */
	delete(tableName: string, id: string): boolean {
		if (!this.state?.active) {
			// No transaction, execute directly
			return this.adapter.delete(tableName, id)
		}

		this.snapshotTable(tableName)
		this.state.operations.push({
			type: 'delete',
			tableName,
			id,
		})
		// Apply immediately (optimistic)
		return this.adapter.delete(tableName, id)
	}

	/**
	 * Record a clear operation.
	 */
	clear(tableName: string): void {
		if (!this.state?.active) {
			// No transaction, execute directly
			this.adapter.clear(tableName)
			return
		}

		this.snapshotTable(tableName)
		this.state.operations.push({
			type: 'clear',
			tableName,
		})
		// Apply immediately (optimistic)
		this.adapter.clear(tableName)
	}

	/**
	 * Commit the transaction.
	 * Since operations are applied optimistically, commit just clears state.
	 */
	commit(): void {
		if (!this.state?.active) {
			throw new Error('No active transaction to commit')
		}
		this.state = null
	}

	/**
	 * Rollback the transaction.
	 * Restores all tables to their pre-transaction state.
	 */
	rollback(): void {
		if (!this.state?.active) {
			throw new Error('No active transaction to rollback')
		}

		// Restore each table from its snapshot
		for (const [tableName, snapshot] of this.state.snapshots) {
			// Clear current data
			this.adapter.clear(tableName)
			// Restore from snapshot
			for (const [id, doc] of snapshot) {
				this.adapter.set(tableName, id, doc)
			}
		}

		this.state = null
	}

	/**
	 * Execute a function within a transaction.
	 * Automatically commits on success, rolls back on error.
	 *
	 * @param fn - Function to execute within transaction
	 * @returns The result of the function
	 */
	execute<R>(fn: () => R): R {
		this.begin()
		try {
			const result = fn()
			this.commit()
			return result
		} catch (error) {
			this.rollback()
			throw error
		}
	}
}

/**
 * Async transaction context for async adapters.
 */
export class AsyncTransactionContext {
	private adapter: AsyncStorageAdapter
	private state: TransactionState | null = null
	private idCounter = 0

	constructor(adapter: AsyncStorageAdapter) {
		this.adapter = adapter
	}

	/**
	 * Begin a new transaction.
	 */
	async begin(): Promise<void> {
		if (this.state?.active) {
			throw new Error('Transaction already in progress')
		}
		this.state = {
			operations: [],
			snapshots: new Map(),
			active: true,
			id: `txn_${++this.idCounter}`,
		}
	}

	/**
	 * Check if a transaction is currently active.
	 */
	isActive(): boolean {
		return this.state?.active ?? false
	}

	/**
	 * Snapshot a table's current state.
	 */
	private async snapshotTable(tableName: string): Promise<void> {
		if (!this.state) return
		if (this.state.snapshots.has(tableName)) return

		const docs = await this.adapter.getAll<object>(tableName)
		const snapshot = new Map<string, WithSystemFields<object>>()
		for (const doc of docs) {
			snapshot.set(doc._id, { ...doc })
		}
		this.state.snapshots.set(tableName, snapshot)
	}

	/**
	 * Record and execute a set operation.
	 */
	async set<T extends object>(
		tableName: string,
		id: string,
		doc: WithSystemFields<T>,
	): Promise<void> {
		if (!this.state?.active) {
			await this.adapter.set(tableName, id, doc)
			return
		}

		await this.snapshotTable(tableName)
		this.state.operations.push({
			type: 'set',
			tableName,
			id,
			doc: doc as WithSystemFields<object>,
		})
		await this.adapter.set(tableName, id, doc)
	}

	/**
	 * Record and execute a delete operation.
	 */
	async delete(tableName: string, id: string): Promise<boolean> {
		if (!this.state?.active) {
			return this.adapter.delete(tableName, id)
		}

		await this.snapshotTable(tableName)
		this.state.operations.push({
			type: 'delete',
			tableName,
			id,
		})
		return this.adapter.delete(tableName, id)
	}

	/**
	 * Record and execute a clear operation.
	 */
	async clear(tableName: string): Promise<void> {
		if (!this.state?.active) {
			await this.adapter.clear(tableName)
			return
		}

		await this.snapshotTable(tableName)
		this.state.operations.push({
			type: 'clear',
			tableName,
		})
		await this.adapter.clear(tableName)
	}

	/**
	 * Commit the transaction.
	 */
	async commit(): Promise<void> {
		if (!this.state?.active) {
			throw new Error('No active transaction to commit')
		}
		this.state = null
	}

	/**
	 * Rollback the transaction.
	 */
	async rollback(): Promise<void> {
		if (!this.state?.active) {
			throw new Error('No active transaction to rollback')
		}

		// Restore each table from its snapshot
		for (const [tableName, snapshot] of this.state.snapshots) {
			await this.adapter.clear(tableName)
			for (const [id, doc] of snapshot) {
				await this.adapter.set(tableName, id, doc)
			}
		}

		this.state = null
	}

	/**
	 * Execute an async function within a transaction.
	 */
	async execute<R>(fn: () => Promise<R>): Promise<R> {
		await this.begin()
		try {
			const result = await fn()
			await this.commit()
			return result
		} catch (error) {
			await this.rollback()
			throw error
		}
	}
}

/**
 * Create a transaction context for a sync adapter.
 */
export function createTransactionContext(
	adapter: SyncStorageAdapter,
): TransactionContext {
	return new TransactionContext(adapter)
}

/**
 * Create an async transaction context for an async adapter.
 */
export function createAsyncTransactionContext(
	adapter: AsyncStorageAdapter,
): AsyncTransactionContext {
	return new AsyncTransactionContext(adapter)
}
