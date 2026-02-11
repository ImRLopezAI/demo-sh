import type { Redis } from '@upstash/redis'
import type { WithSystemFields } from '../table'
import type { AsyncStorageAdapter } from './types'

/**
 * Configuration for Redis adapter
 */
export interface RedisAdapterConfig {
	/** Key prefix for all tables (default: 'db') */
	prefix?: string
	/** TTL in seconds for all keys (optional, no expiration by default) */
	ttl?: number
}

/**
 * Redis storage adapter using @upstash/redis.
 * All operations are async.
 * Stores documents as JSON strings with a set index for table membership.
 */
export class RedisAdapter implements AsyncStorageAdapter {
	readonly type = 'async' as const
	private prefix: string
	private ttl?: number

	constructor(
		private redis: Redis,
		config: RedisAdapterConfig = {},
	) {
		this.prefix = config.prefix ?? 'db'
		this.ttl = config.ttl
	}

	private docKey(tableName: string, id: string): string {
		return `${this.prefix}:${tableName}:${id}`
	}

	private indexKey(tableName: string): string {
		return `${this.prefix}:${tableName}:_ids`
	}

	async get<T extends object>(
		tableName: string,
		id: string,
	): Promise<WithSystemFields<T> | undefined> {
		const data = await this.redis.get<WithSystemFields<T>>(
			this.docKey(tableName, id),
		)
		return data ?? undefined
	}

	async getAll<T extends object>(
		tableName: string,
	): Promise<WithSystemFields<T>[]> {
		const ids = await this.redis.smembers(this.indexKey(tableName))
		if (ids.length === 0) return []

		const pipeline = this.redis.pipeline()
		for (const id of ids) {
			pipeline.get(this.docKey(tableName, id))
		}
		const results = await pipeline.exec<Array<WithSystemFields<T> | null>>()
		return results.filter((doc): doc is WithSystemFields<T> => doc !== null)
	}

	async set<T extends object>(
		tableName: string,
		id: string,
		doc: WithSystemFields<T>,
	): Promise<void> {
		const pipeline = this.redis.pipeline()

		if (this.ttl) {
			pipeline.set(this.docKey(tableName, id), doc, { ex: this.ttl })
		} else {
			pipeline.set(this.docKey(tableName, id), doc)
		}
		pipeline.sadd(this.indexKey(tableName), id)

		await pipeline.exec()
	}

	async delete(tableName: string, id: string): Promise<boolean> {
		const pipeline = this.redis.pipeline()
		pipeline.del(this.docKey(tableName, id))
		pipeline.srem(this.indexKey(tableName), id)
		const [deleted] = await pipeline.exec<[number, number]>()
		return deleted > 0
	}

	async clear(tableName: string): Promise<void> {
		const ids = await this.redis.smembers(this.indexKey(tableName))

		if (ids.length > 0) {
			const pipeline = this.redis.pipeline()
			for (const id of ids) {
				pipeline.del(this.docKey(tableName, id))
			}
			pipeline.del(this.indexKey(tableName))
			await pipeline.exec()
		}
	}

	async has(tableName: string, id: string): Promise<boolean> {
		return (await this.redis.sismember(this.indexKey(tableName), id)) === 1
	}

	async count(tableName: string): Promise<number> {
		return await this.redis.scard(this.indexKey(tableName))
	}

	async getMany<T extends object>(
		tableName: string,
		ids: string[],
	): Promise<WithSystemFields<T>[]> {
		if (ids.length === 0) return []

		const pipeline = this.redis.pipeline()
		for (const id of ids) {
			pipeline.get(this.docKey(tableName, id))
		}
		const results = await pipeline.exec<Array<WithSystemFields<T> | null>>()
		return results.filter((doc): doc is WithSystemFields<T> => doc !== null)
	}

	async setMany<T extends object>(
		tableName: string,
		docs: Array<{ id: string; doc: WithSystemFields<T> }>,
	): Promise<void> {
		if (docs.length === 0) return

		const pipeline = this.redis.pipeline()
		for (const { id, doc } of docs) {
			if (this.ttl) {
				pipeline.set(this.docKey(tableName, id), doc, { ex: this.ttl })
			} else {
				pipeline.set(this.docKey(tableName, id), doc)
			}
			pipeline.sadd(this.indexKey(tableName), id)
		}
		await pipeline.exec()
	}

	async deleteMany(tableName: string, ids: string[]): Promise<number> {
		if (ids.length === 0) return 0

		const pipeline = this.redis.pipeline()
		for (const id of ids) {
			pipeline.del(this.docKey(tableName, id))
			pipeline.srem(this.indexKey(tableName), id)
		}
		const results = await pipeline.exec<number[]>()
		// Every other result is the del result
		return results.filter((_, i) => i % 2 === 0).reduce((sum, n) => sum + n, 0)
	}

	async close(): Promise<void> {
		// Upstash Redis doesn't need explicit closing
	}
}

/**
 * Create a Redis adapter instance.
 *
 * @example
 * ```ts
 * import { Redis } from '@upstash/redis'
 * import { redisAdapter, defineSchema } from '@server/db'
 *
 * const redis = new Redis({ url: '...', token: '...' })
 *
 * const db = defineSchema({ users: users.table() }, {
 *   adapter: redisAdapter(redis, { prefix: 'myapp' })
 * })
 *
 * // All operations are now async
 * const id = await db.schemas.users.insert({ name: 'John' })
 * const user = await db.schemas.users.get(id)
 * ```
 */
export function redisAdapter(
	redis: Redis,
	config?: RedisAdapterConfig,
): AsyncStorageAdapter {
	return new RedisAdapter(redis, config)
}
