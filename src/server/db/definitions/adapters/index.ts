// Internal - not exported to consumers
export { createMemoryAdapter } from './memory'

// Public exports
export { RedisAdapter, type RedisAdapterConfig, redisAdapter } from './redis'
// Transaction support
export {
	AsyncTransactionContext,
	createAsyncTransactionContext,
	createTransactionContext,
	TransactionContext,
	type TransactionOperation,
	type TransactionOpType,
	type TransactionState,
} from './transaction'
export {
	type AnyStorageAdapter,
	type AsyncStorageAdapter,
	type Cursor,
	decodeCursor,
	encodeCursor,
	type PaginatedResult,
	type StorageAdapter,
	type SyncStorageAdapter,
} from './types'
