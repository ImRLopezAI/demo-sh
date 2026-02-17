import { z } from 'zod'
import type { FieldMeta } from '../types'
import type { SchemaIntrospector } from './schema-introspection'
import {
	getDefaultValue,
	getEnumValues,
	getZodMeta,
	hasZodTrait,
} from './zod-utils'

// ============================================================================
// Zod 4 implementation of SchemaIntrospector
// ============================================================================

/**
 * Zod 4-based schema introspector.
 * Routes through existing zod-utils.ts logic.
 */
export class Zod4Introspector implements SchemaIntrospector {
	getMeta(schema: unknown): FieldMeta | undefined {
		return getZodMeta(schema as z.ZodType)
	}

	hasTrait(schema: unknown, trait: string): boolean {
		return hasZodTrait(schema as z.ZodType, trait)
	}

	unwrapOptional(schema: unknown): unknown {
		let s = schema as z.ZodType
		while (s instanceof z.ZodOptional || s instanceof z.ZodNullable) {
			s = (s as z.ZodOptional<z.ZodType> | z.ZodNullable<z.ZodType>)._def
				.innerType
		}
		return s
	}

	getEnumValues(schema: unknown): readonly string[] | undefined {
		return getEnumValues(schema as z.ZodType)
	}

	getDefaultValue(schema: unknown): unknown | undefined {
		return getDefaultValue(schema as z.ZodType)
	}

	isOptional(schema: unknown): boolean {
		return schema instanceof z.ZodOptional
	}

	isString(schema: unknown): boolean {
		const unwrapped = this.unwrapOptional(schema)
		return unwrapped instanceof z.ZodString
	}

	isNumber(schema: unknown): boolean {
		const unwrapped = this.unwrapOptional(schema)
		return unwrapped instanceof z.ZodNumber
	}

	isBoolean(schema: unknown): boolean {
		const unwrapped = this.unwrapOptional(schema)
		return unwrapped instanceof z.ZodBoolean
	}

	isDate(schema: unknown): boolean {
		const unwrapped = this.unwrapOptional(schema)
		return unwrapped instanceof z.ZodDate
	}

	isArray(schema: unknown): boolean {
		const unwrapped = this.unwrapOptional(schema)
		return unwrapped instanceof z.ZodArray
	}

	isEnum(schema: unknown): boolean {
		const unwrapped = this.unwrapOptional(schema)
		return unwrapped instanceof z.ZodEnum
	}
}

/** Singleton instance */
export const zod4Introspector = new Zod4Introspector()
