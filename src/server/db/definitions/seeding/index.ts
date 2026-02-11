/**
 * Seeding utilities for generating mock data.
 * @module seeding
 */

// Generator functions
export {
	generateFromShorthandType,
	generateFromZodType,
	generateRecord,
	generateUniqueValue,
	generateValueFromMeta,
	getSeedCount,
	resolveFakerPath,
	setFakerSeed,
} from './generator'
// Seed runner
export {
	ensureUniqueFields,
	resolveTableOrder,
	runSeeding,
	SeedRunner,
} from './seed-runner'
// Types
export type {
	ForeignKeyInfo,
	GenerationContext,
	ParentChildRelation,
	SeedConfig,
	SeedRunnerOptions,
	TableSeedConfig,
	TableSeedResult,
} from './types'
