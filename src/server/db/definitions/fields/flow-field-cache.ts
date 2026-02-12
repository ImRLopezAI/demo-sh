import type { FlowFieldDef } from '../types'

// ============================================================================
// FlowField result cache
// ============================================================================

/**
 * Two-level cache for FlowField computed values.
 * Maps docId -> fieldName -> cached value.
 *
 * Invalidation strategy:
 * - On insert/update/delete of any source table, invalidate all docs
 *   that reference that source table via their flow field definitions.
 * - This is coarse-grained but effective for the common case.
 */
export class FlowFieldCache {
	private cache = new Map<string, Map<string, unknown>>()
	/** Maps source table name -> set of table names that have flow fields referencing it */
	private sourceDependencies = new Map<string, Set<string>>()
	/** Maps table name -> set of field names that are flow fields */
	private tableFlowFields = new Map<string, Set<string>>()

	/**
	 * Register flow field definitions so the cache knows about dependencies.
	 */
	registerFlowFields(
		flowFieldDefs: Map<string, Map<string, FlowFieldDef>>,
	): void {
		for (const [tableName, fieldDefs] of flowFieldDefs) {
			const fieldNames = new Set<string>()
			for (const [fieldName, def] of fieldDefs) {
				fieldNames.add(fieldName)

				// Track source dependencies for aggregation flow fields
				if (typeof def !== 'function' && def.source) {
					const deps = this.sourceDependencies.get(def.source) ?? new Set()
					deps.add(tableName)
					this.sourceDependencies.set(def.source, deps)
				}
			}
			this.tableFlowFields.set(tableName, fieldNames)
		}
	}

	/**
	 * Get a cached flow field value.
	 * Returns undefined if not cached (caller should compute and store).
	 */
	get(docId: string, fieldName: string): { value: unknown; hit: boolean } {
		const docCache = this.cache.get(docId)
		if (!docCache || !docCache.has(fieldName)) {
			return { value: undefined, hit: false }
		}
		return { value: docCache.get(fieldName), hit: true }
	}

	/**
	 * Store a computed flow field value.
	 */
	set(docId: string, fieldName: string, value: unknown): void {
		let docCache = this.cache.get(docId)
		if (!docCache) {
			docCache = new Map()
			this.cache.set(docId, docCache)
		}
		docCache.set(fieldName, value)
	}

	/**
	 * Invalidate a single document's cached values.
	 */
	invalidateDoc(docId: string): void {
		this.cache.delete(docId)
	}

	/**
	 * Invalidate all flow field caches for documents in tables that depend on
	 * the given source table. Called when a mutation occurs on a source table.
	 */
	invalidateBySource(sourceTableName: string): void {
		const dependentTables = this.sourceDependencies.get(sourceTableName)
		if (!dependentTables) return

		// For coarse invalidation, just clear all caches for dependent tables.
		// We could be more precise by tracking which doc IDs belong to which tables,
		// but that adds complexity for marginal gain in the common case.
		this.cache.clear()
	}

	/**
	 * Invalidate all caches for a specific table's documents.
	 */
	invalidateTable(tableName: string): void {
		// Also invalidate dependents of this table
		this.invalidateBySource(tableName)
	}

	/**
	 * Clear the entire cache.
	 */
	invalidateAll(): void {
		this.cache.clear()
	}
}
