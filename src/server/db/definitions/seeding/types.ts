import type { ZodShape } from '../types/field.types'

/**
 * Configuration for seeding a table with mock data.
 * Can be a fixed number, a range, or hierarchical (per-parent) seeding.
 *
 * @example
 * ```ts
 * // Fixed count
 * seed: 10
 *
 * // Random range
 * seed: { min: 5, max: 15 }
 *
 * // Hierarchical - create records per parent (inferred from relations)
 * seed: { min: 3, max: 8, perParent: true }
 *
 * // Disable seeding
 * seed: false
 * ```
 */
export interface SeedConfig {
	/** Minimum number of records to generate (default: uses defaultSeed) */
	min?: number
	/** Maximum number of records to generate (default: same as min) */
	max?: number
	/**
	 * Enable hierarchical seeding - creates min-max records per parent.
	 * Parent relationship is inferred from relations config.
	 * If multiple parents exist, uses the first one found.
	 */
	perParent?: boolean
	/**
	 * Explicitly specify which parent table to use for perParent seeding.
	 * Use when a table has multiple foreign keys and you want to control
	 * which one drives the hierarchical seeding.
	 */
	parentTable?: string
}

/**
 * Context passed during mock data generation.
 * Tracks generated IDs for relation resolution.
 */
export interface GenerationContext {
	/** Map of table name to array of generated IDs */
	tableIds: Map<string, string[]>
	/** Optional organization ID for multi-tenant seeding */
	organizationId?: string
}

/**
 * Foreign key information for seeding.
 */
export interface ForeignKeyInfo {
	/** Target table to reference */
	targetTable: string
	/** Target column to reference */
	targetColumn: string
}

/**
 * Parent-child relationship information for hierarchical seeding.
 */
export interface ParentChildRelation {
	/** Parent table name */
	parentTable: string
	/** Field in parent table to match */
	parentField: string
	/** Field in child table that references parent */
	childField: string
}

/**
 * Configuration for seeding a single table.
 */
export interface TableSeedConfig {
	/** Table name */
	tableName: string
	/** Zod schema shape */
	shape: ZodShape
	/** Seed configuration */
	seedConfig?: number | boolean | SeedConfig
	/** Unique constraints to respect */
	uniqueConstraints: Array<{ name: string; fields: string[] }>
	/** No Series fields to skip (auto-generated) */
	noSeriesFields: Set<string>
	/** Auto-increment fields to skip (auto-generated) */
	autoIncrementFields: Set<string>
	/** Foreign key fields with their target info */
	foreignKeyFields: Map<string, ForeignKeyInfo>
	/** Parent relations for hierarchical seeding */
	parentRelations?: ParentChildRelation[]
}

/**
 * Result of seeding a table.
 */
export interface TableSeedResult {
	/** Table name */
	tableName: string
	/** Number of records created */
	count: number
	/** IDs of created records */
	ids: string[]
}

/**
 * Options for the seed runner.
 */
export interface SeedRunnerOptions {
	/** Default number of records per table */
	defaultSeed: number
	/** Faker seed for reproducible data */
	fakerSeed?: number
}
