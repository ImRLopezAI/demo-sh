import type { FunctionReference } from 'convex/server'

// ---------------------------------------------------------------------------
// Seed count config
// ---------------------------------------------------------------------------

export interface SeedRange {
	min: number
	max: number
	/** Parent table name for hierarchical seeding */
	perParent?: string
}

// ---------------------------------------------------------------------------
// Field-level overrides
// ---------------------------------------------------------------------------

export type FieldOverride =
	| string // Faker path: 'commerce.productName'
	| readonly string[] // Enum values to pick from
	| { faker: string } // Explicit faker path
	| { min: number; max: number } // Number range
	| { fn: () => unknown } // Custom generator

// ---------------------------------------------------------------------------
// Per-table seed entry
// ---------------------------------------------------------------------------

export interface TableSeedEntry {
	/** The zodTable definition from src/server/convex/ */
	def: {
		tableName: string
		schema: { shape: Record<string, unknown> }
	}
	/** Count or range config */
	seed: number | SeedRange
	/** Optional explicit field overrides */
	fields?: Record<string, FieldOverride>
}

// ---------------------------------------------------------------------------
// Table registration reference (from engine config)
// ---------------------------------------------------------------------------

export interface TableRegistrationRef {
	noSeries?: {
		code: string
		field: string
		pattern: string
		incrementBy?: number
	}
	relations?: Record<
		string,
		{
			table: string
			field: string
			type: 'one' | 'many'
		}
	>
	flowFields?: Record<
		string,
		{
			type: string
			source: string
			key: string
			field?: string
		}
	>
}

// ---------------------------------------------------------------------------
// Seeder configuration
// ---------------------------------------------------------------------------

export interface SeederConfig {
	tables: Record<string, TableSeedEntry>
	engineTables: Record<string, TableRegistrationRef>
	defaultSeed?: number
	fakerSeed?: number
}

// ---------------------------------------------------------------------------
// Component API types (for the seed log)
// ---------------------------------------------------------------------------

export interface SeedLogApi {
	logSeed: FunctionReference<
		'mutation',
		'internal',
		{ tableName: string; count: number; status: string },
		null
	>
	clearLog: FunctionReference<
		'mutation',
		'internal',
		Record<string, never>,
		null
	>
	getSeedStatus: FunctionReference<
		'query',
		'internal',
		Record<string, never>,
		unknown
	>
}

export interface SeederComponentApi {
	log: SeedLogApi
}
