import type { z } from 'zod'

// ---------------------------------------------------------------------------
// Zod v4 introspection helpers
// Adapted from src/server/db/definitions/fields/zod-utils.ts
// ---------------------------------------------------------------------------

interface ZodInternal {
	_zod?: {
		traits?: Set<string>
		def?: {
			innerType?: z.ZodType
			defaultValue?: unknown
			entries?: Record<string, string>
		}
	}
	options?: string[]
	description?: string
}

function getTraits(schema: z.ZodType): Set<string> {
	return (schema as unknown as ZodInternal)._zod?.traits ?? new Set()
}

function hasTrait(schema: z.ZodType, trait: string): boolean {
	return getTraits(schema).has(trait)
}

/** Unwrap optional/nullable/default wrappers to get the base schema */
export function unwrapField(schema: z.ZodType): z.ZodType {
	let current = schema
	for (let i = 0; i < 5; i++) {
		if (
			hasTrait(current, 'ZodOptional') ||
			hasTrait(current, 'ZodNullable') ||
			hasTrait(current, 'ZodDefault')
		) {
			const inner = (current as unknown as ZodInternal)._zod?.def?.innerType
			if (inner) {
				current = inner
				continue
			}
		}
		break
	}
	return current
}

/** Check if a field is optional (wrapped in ZodOptional or ZodNullable) */
export function isOptionalField(schema: z.ZodType): boolean {
	return hasTrait(schema, 'ZodOptional') || hasTrait(schema, 'ZodNullable')
}

/** Check if a field has a default value */
export function hasDefault(schema: z.ZodType): boolean {
	return hasTrait(schema, 'ZodDefault')
}

/** Get the base type of a field */
export function getFieldBaseType(
	schema: z.ZodType,
): 'string' | 'number' | 'boolean' | 'enum' | 'id' | 'unknown' {
	const base = unwrapField(schema)

	// Check for Convex ID (zid) — description contains "Convex Id<tableName>"
	const desc = (base as unknown as ZodInternal).description
	if (desc?.startsWith('Convex Id<')) {
		return 'id'
	}

	if (hasTrait(base, 'ZodString')) return 'string'
	if (hasTrait(base, 'ZodNumber')) return 'number'
	if (hasTrait(base, 'ZodBoolean')) return 'boolean'
	if (hasTrait(base, 'ZodEnum')) return 'enum'

	return 'unknown'
}

/** Extract the target table from a zid() field (reads "Convex Id<tableName>") */
export function getIdTargetTable(schema: z.ZodType): string | undefined {
	const base = unwrapField(schema)
	const desc = (base as unknown as ZodInternal).description
	if (desc) {
		const match = desc.match(/^Convex Id<(.+)>$/)
		if (match) return match[1]
	}
	return undefined
}

/** Get enum values from a Zod enum schema */
export function getEnumValues(schema: z.ZodType): string[] | undefined {
	const base = unwrapField(schema)
	const asInternal = base as unknown as ZodInternal
	if (asInternal.options) return asInternal.options
	const entries = asInternal._zod?.def?.entries
	if (entries) return Object.values(entries)
	return undefined
}
