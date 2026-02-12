import type { FieldMeta } from '../types'

// ============================================================================
// Schema introspection interface (Phase 5 - Zod abstraction)
// ============================================================================

/**
 * Abstract interface for introspecting schema field definitions.
 * This decouples the schema engine from Zod internals, making it possible
 * to swap out the underlying schema library (e.g., Zod 4 -> Zod 5, or Valibot).
 */
export interface SchemaIntrospector {
	/** Get custom metadata attached to a field */
	getMeta(schema: unknown): FieldMeta | undefined

	/** Check if a field has a specific metadata trait (e.g., 'flowField', 'related') */
	hasTrait(schema: unknown, trait: string): boolean

	/** Unwrap optional/nullable wrappers to get the inner schema */
	unwrapOptional(schema: unknown): unknown

	/** Get enum values if this is an enum field */
	getEnumValues(schema: unknown): readonly string[] | undefined

	/** Get the default value if one is set */
	getDefaultValue(schema: unknown): unknown | undefined

	/** Check if the field is optional */
	isOptional(schema: unknown): boolean

	/** Check if the field is a string type */
	isString(schema: unknown): boolean

	/** Check if the field is a number type */
	isNumber(schema: unknown): boolean

	/** Check if the field is a boolean type */
	isBoolean(schema: unknown): boolean

	/** Check if the field is a date type */
	isDate(schema: unknown): boolean

	/** Check if the field is an array type */
	isArray(schema: unknown): boolean

	/** Check if the field is an enum type */
	isEnum(schema: unknown): boolean
}
