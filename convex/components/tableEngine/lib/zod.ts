import type {
	GenericValidator,
	PropertyValidators,
	Validator,
} from 'convex/values'
import { zodToConvex } from 'convex-helpers/server/zod4'
import type { z } from 'zod/v4'
import type { ConvexArgsValidator } from './types'

// ---------------------------------------------------------------------------
// Runtime Zod detection
// ---------------------------------------------------------------------------

export function isZodSchema(value: unknown): value is z.ZodType {
	return (
		value != null &&
		typeof value === 'object' &&
		'_zod' in value &&
		'parse' in value
	)
}

// ---------------------------------------------------------------------------
// Zod → Convex conversion
// ---------------------------------------------------------------------------

export function toConvexValidator<T extends z.ZodType>(
	schema: T,
): PropertyValidators | GenericValidator {
	return zodToConvex(schema as never) as PropertyValidators | GenericValidator
}

// ---------------------------------------------------------------------------
// Input types — accept both Zod schemas and Convex validators
// ---------------------------------------------------------------------------

export type ValidatorInput =
	| PropertyValidators
	| GenericValidator
	| z.ZodObject<Record<string, z.ZodType>>

export type ReturnsValidatorInput = GenericValidator | z.ZodType

// ---------------------------------------------------------------------------
// Conditional type mappings
// ---------------------------------------------------------------------------

export type ToConvexArgsValidator<T extends ValidatorInput> =
	T extends z.ZodObject<infer Shape>
		? {
				[K in keyof Shape]: Shape[K] extends z.ZodType<infer Output>
					? Validator<
							Output,
							Shape[K] extends z.ZodOptional<z.ZodType>
								? 'optional'
								: 'required',
							string
						>
					: never
			}
		: T extends ConvexArgsValidator
			? T
			: ConvexArgsValidator

export type ToConvexReturnsValidator<T extends ReturnsValidatorInput> =
	T extends z.ZodType<infer Output>
		? Validator<Output, 'required', string>
		: T extends GenericValidator
			? T
			: GenericValidator

// ---------------------------------------------------------------------------
// Runtime helper — detect if args contain Zod schemas
// ---------------------------------------------------------------------------

export function hasZodInArgs(args: unknown): boolean {
	if (!args || typeof args !== 'object') return false
	if (isZodSchema(args)) return true
	return Object.values(args as Record<string, unknown>).some((v) =>
		isZodSchema(v),
	)
}
