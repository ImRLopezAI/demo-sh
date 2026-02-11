import { z } from 'zod'
import type { FieldMeta } from '../types/field.types'

/**
 * Get metadata from a Zod schema using the global registry.
 * Handles wrapped types (optional, nullable) by checking the inner type.
 *
 * @param schema - The Zod schema to get metadata from
 * @returns The field metadata if present, undefined otherwise
 */
export function getZodMeta(schema: z.ZodType): FieldMeta | undefined {
	// Zod 4 stores meta in globalRegistry via .meta()
	const registry = (
		z as unknown as {
			globalRegistry: { get: (s: z.ZodType) => FieldMeta | undefined }
		}
	).globalRegistry

	// Check the schema itself first
	const meta = registry?.get?.(schema)
	if (meta) return meta

	// If wrapped (optional/nullable), check the inner type
	const inner = (
		schema as unknown as { _zod?: { def?: { innerType?: z.ZodType } } }
	)._zod?.def?.innerType
	if (inner) {
		return registry?.get?.(inner)
	}

	return undefined
}

/**
 * Get the traits set from a Zod schema.
 * Traits are strings that identify the schema type (e.g., 'ZodString', 'ZodNumber').
 *
 * @param schema - The Zod schema to get traits from
 * @returns A Set of trait strings
 */
export function getZodTraits(schema: z.ZodType): Set<string> {
	const zod = (schema as unknown as { _zod?: { traits?: Set<string> } })._zod
	return zod?.traits ?? new Set()
}

/**
 * Check if a Zod schema has a specific trait.
 *
 * @param schema - The Zod schema to check
 * @param trait - The trait to check for (e.g., 'ZodString', 'ZodNumber')
 * @returns True if the schema has the trait
 */
export function hasZodTrait(schema: z.ZodType, trait: string): boolean {
	return getZodTraits(schema).has(trait)
}

/**
 * Get enum values from a Zod enum schema.
 *
 * @param schema - The Zod enum schema
 * @returns Array of enum values, or undefined if not an enum
 */
export function getEnumValues(schema: z.ZodType): string[] | undefined {
	// Zod 4: options property or def.entries
	const schemaAny = schema as unknown as {
		options?: string[]
		_zod?: { def?: { entries?: Record<string, string> } }
	}
	if (schemaAny.options) return schemaAny.options
	const entries = schemaAny._zod?.def?.entries
	if (entries) return Object.values(entries)
	return undefined
}

/**
 * Get the default value from a Zod schema with .default().
 *
 * @param schema - The Zod schema
 * @returns The default value, or undefined if no default
 */
export function getDefaultValue(schema: z.ZodType): unknown {
	const zod = (
		schema as unknown as { _zod?: { def?: { defaultValue?: unknown } } }
	)._zod
	const defaultValue = zod?.def?.defaultValue
	if (typeof defaultValue === 'function') return defaultValue()
	return defaultValue
}

/**
 * Check if a Zod schema is optional or nullable.
 *
 * @param schema - The Zod schema to check
 * @returns True if the schema is optional or nullable
 */
export function isOptional(schema: z.ZodType): boolean {
	return (
		hasZodTrait(schema, 'ZodOptional') || hasZodTrait(schema, 'ZodNullable')
	)
}

/**
 * Unwrap an optional or nullable Zod schema to get the inner type.
 *
 * @param schema - The Zod schema to unwrap
 * @returns The inner schema if wrapped, or the original schema
 */
export function unwrapOptional(schema: z.ZodType): z.ZodType {
	const zod = (
		schema as unknown as { _zod?: { def?: { innerType?: z.ZodType } } }
	)._zod
	return zod?.def?.innerType ?? schema
}

/**
 * Get the inner type description for a Zod schema.
 * Useful for debugging and error messages.
 *
 * @param schema - The Zod schema
 * @returns A string describing the schema type
 */
export function getSchemaTypeDescription(schema: z.ZodType): string {
	const traits = getZodTraits(schema)

	if (traits.has('ZodString')) return 'string'
	if (traits.has('ZodNumber')) return 'number'
	if (traits.has('ZodBoolean')) return 'boolean'
	if (traits.has('ZodDate')) return 'date'
	if (traits.has('ZodEnum')) return 'enum'
	if (traits.has('ZodArray')) return 'array'
	if (traits.has('ZodObject')) return 'object'
	if (traits.has('ZodRecord')) return 'record'
	if (traits.has('ZodUnion')) return 'union'
	if (traits.has('ZodOptional')) {
		const inner = unwrapOptional(schema)
		return `optional<${getSchemaTypeDescription(inner)}>`
	}
	if (traits.has('ZodNullable')) {
		const inner = unwrapOptional(schema)
		return `nullable<${getSchemaTypeDescription(inner)}>`
	}
	if (traits.has('ZodDefault')) {
		const inner = unwrapOptional(schema)
		return `default<${getSchemaTypeDescription(inner)}>`
	}

	return 'unknown'
}

/**
 * Check if a Zod schema is a string type (including wrapped).
 *
 * @param schema - The Zod schema to check
 * @returns True if the schema represents a string
 */
export function isStringSchema(schema: z.ZodType): boolean {
	let workingSchema = schema
	if (isOptional(schema)) {
		workingSchema = unwrapOptional(schema)
	}
	if (hasZodTrait(workingSchema, 'ZodDefault')) {
		workingSchema = unwrapOptional(workingSchema)
	}
	return hasZodTrait(workingSchema, 'ZodString')
}

/**
 * Check if a Zod schema is a number type (including wrapped).
 *
 * @param schema - The Zod schema to check
 * @returns True if the schema represents a number
 */
export function isNumberSchema(schema: z.ZodType): boolean {
	let workingSchema = schema
	if (isOptional(schema)) {
		workingSchema = unwrapOptional(schema)
	}
	if (hasZodTrait(workingSchema, 'ZodDefault')) {
		workingSchema = unwrapOptional(workingSchema)
	}
	return hasZodTrait(workingSchema, 'ZodNumber')
}

/**
 * Check if a Zod schema is a boolean type (including wrapped).
 *
 * @param schema - The Zod schema to check
 * @returns True if the schema represents a boolean
 */
export function isBooleanSchema(schema: z.ZodType): boolean {
	let workingSchema = schema
	if (isOptional(schema)) {
		workingSchema = unwrapOptional(schema)
	}
	if (hasZodTrait(workingSchema, 'ZodDefault')) {
		workingSchema = unwrapOptional(workingSchema)
	}
	return hasZodTrait(workingSchema, 'ZodBoolean')
}

/**
 * Check if a Zod schema is an enum type (including wrapped).
 *
 * @param schema - The Zod schema to check
 * @returns True if the schema represents an enum
 */
export function isEnumSchema(schema: z.ZodType): boolean {
	let workingSchema = schema
	if (isOptional(schema)) {
		workingSchema = unwrapOptional(schema)
	}
	if (hasZodTrait(workingSchema, 'ZodDefault')) {
		workingSchema = unwrapOptional(workingSchema)
	}
	return hasZodTrait(workingSchema, 'ZodEnum')
}
