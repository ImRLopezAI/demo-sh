import { faker } from '@faker-js/faker'
import { createId } from '@paralleldrive/cuid2'
import type { z } from 'zod'
import {
	getEnumValues,
	getZodMeta,
	hasZodTrait,
	isOptional,
	unwrapOptional,
} from '../fields/zod-utils'
import type { FieldMeta, FieldType } from '../types/field.types'
import type { ForeignKeyInfo, GenerationContext } from './types'

/**
 * Generate a value based on the shorthand field type.
 *
 * @param type - The field type (e.g., 'email', 'fullname', 'phone')
 * @param meta - Optional field metadata with min/max for numbers
 * @returns A generated value of the appropriate type
 */
export function generateFromShorthandType(
	type: FieldType,
	meta?: FieldMeta,
): unknown {
	const { min, max } = meta ?? {}

	switch (type) {
		case 'string':
			return faker.string.alphanumeric(10)
		case 'number':
			return faker.number.int({ min: min ?? 0, max: max ?? 1000 })
		case 'boolean':
			return faker.datatype.boolean()
		case 'date':
			return faker.date.recent().toISOString()
		case 'datetime':
			return faker.date.past().toISOString()
		case 'email':
			return faker.internet.email()
		case 'phone':
			return faker.phone.number()
		case 'uuid':
			return faker.string.uuid()
		case 'url':
			return faker.internet.url()
		case 'image':
			return faker.image.url()
		case 'address':
			return faker.location.streetAddress()
		case 'city':
			return faker.location.city()
		case 'country':
			return faker.location.country()
		case 'zipcode':
			return faker.location.zipCode()
		case 'firstname':
			return faker.person.firstName()
		case 'lastname':
			return faker.person.lastName()
		case 'fullname':
			return faker.person.fullName()
		case 'username':
			return faker.internet.username()
		case 'password':
			return faker.internet.password({ length: 12 })
		case 'hexcolor':
			return faker.color.rgb({ casing: 'upper', format: 'hex' })
		case 'credit_card':
			return faker.finance.creditCardNumber()
		case 'company':
			return faker.company.name()
		case 'job_title':
			return faker.person.jobTitle()
		case 'ipv4':
			return faker.internet.ipv4()
		case 'ipv6':
			return faker.internet.ipv6()
		case 'latitude':
			return faker.location.latitude()
		case 'longitude':
			return faker.location.longitude()
		case 'sentence':
			return faker.lorem.sentence()
		case 'paragraph':
			return faker.lorem.paragraph()
		case 'word':
			return faker.lorem.word()
		default:
			return faker.string.alphanumeric(10)
	}
}

/**
 * Resolve a faker path like 'internet.email' to a value.
 *
 * @param path - Dot-separated faker path
 * @returns Generated value or undefined
 */
export function resolveFakerPath(path: string): unknown {
	const parts = path.split('.')
	let current: unknown = faker
	for (const part of parts) {
		if (current && typeof current === 'object' && part in current) {
			current = (current as Record<string, unknown>)[part]
		} else {
			return undefined
		}
	}
	if (typeof current === 'function') {
		return current()
	}
	return current
}

/**
 * Generate a value based on the Zod type.
 *
 * @param schema - The Zod schema
 * @returns Generated value matching the schema type
 */
export function generateFromZodType(schema: z.ZodType): unknown {
	let workingSchema = schema

	// Unwrap optional/nullable
	if (isOptional(schema)) {
		// 30% chance to return undefined for optional fields
		if (Math.random() < 0.3) return undefined
		workingSchema = unwrapOptional(schema)
	}

	// Unwrap ZodDefault to get to the inner type for seeding
	// We want random values for seeding, not the defaults
	if (hasZodTrait(workingSchema, 'ZodDefault')) {
		workingSchema = unwrapOptional(workingSchema)
	}

	// Type detection via traits
	if (hasZodTrait(workingSchema, 'ZodString')) {
		return faker.lorem.words(3)
	}
	if (hasZodTrait(workingSchema, 'ZodNumber')) {
		return faker.number.int({ min: 0, max: 1000 })
	}
	if (hasZodTrait(workingSchema, 'ZodBoolean')) {
		return faker.datatype.boolean()
	}
	if (hasZodTrait(workingSchema, 'ZodDate')) {
		return faker.date.recent()
	}
	if (hasZodTrait(workingSchema, 'ZodEnum')) {
		const values = getEnumValues(workingSchema)
		if (values && values.length > 0) {
			return faker.helpers.arrayElement(values)
		}
		return undefined
	}
	if (hasZodTrait(workingSchema, 'ZodArray')) {
		return []
	}
	if (hasZodTrait(workingSchema, 'ZodRecord')) {
		return {}
	}
	if (hasZodTrait(workingSchema, 'ZodObject')) {
		return {}
	}

	return faker.lorem.word()
}

/**
 * Generate a value based on field metadata.
 *
 * @param meta - Field metadata (type, field path, etc.)
 * @param schema - The Zod schema
 * @param context - Generation context with table IDs
 * @returns Generated value
 */
export function generateValueFromMeta(
	meta: FieldMeta | undefined,
	schema: z.ZodType,
	context: GenerationContext,
): unknown {
	// Check for related table reference (legacy meta.related)
	if (meta?.related) {
		const relatedIds = context.tableIds.get(meta.related)
		if (relatedIds && relatedIds.length > 0) {
			return faker.helpers.arrayElement(relatedIds)
		}
		// Return undefined for optional fields, empty string otherwise
		return isOptional(schema) ? undefined : ''
	}

	// Check for shorthand type (preferred)
	if (meta?.type) {
		return generateFromShorthandType(meta.type, meta)
	}

	// Check for custom field generator or faker path
	if (meta?.field) {
		if (typeof meta.field === 'function') {
			return meta.field()
		}
		// It's a faker path like 'lorem.sentence'
		return resolveFakerPath(meta.field)
	}

	// Check for min/max range on number fields (takes precedence over defaults)
	if (meta?.min !== undefined || meta?.max !== undefined) {
		const min = meta.min ?? 0
		const max = meta.max ?? 1000
		return faker.number.int({ min, max })
	}

	// Auto-generate based on Zod type
	return generateFromZodType(schema)
}

/**
 * Generate a guaranteed unique value for a field type.
 * Used when collision resolution is needed for unique constraints.
 *
 * @param fieldSchema - The Zod schema for the field
 * @param meta - Field metadata
 * @param context - Generation context
 * @param counter - Unique counter for suffix generation
 * @returns A unique value
 */
export function generateUniqueValue(
	fieldSchema: z.ZodType,
	meta: FieldMeta | undefined,
	context: GenerationContext,
	counter: number,
): unknown {
	const suffix = `-${counter}-${createId()}`

	// For strings, append unique suffix to a base value
	if (hasZodTrait(fieldSchema, 'ZodString')) {
		const baseValue = generateValueFromMeta(meta, fieldSchema, context)
		return `${String(baseValue)}${suffix}`
	}

	// For numbers (non-autoIncrement), add the counter
	if (hasZodTrait(fieldSchema, 'ZodNumber')) {
		return counter * 1000 + Math.floor(Math.random() * 1000)
	}

	// Fallback: use createId for anything else
	return createId()
}

/**
 * Generate a single record for a table.
 *
 * @param options - Generation options
 * @returns Generated record
 */
export function generateRecord(options: {
	shape: Record<string, z.ZodType>
	overrides?: Record<string, unknown>
	noSeriesFields: Set<string>
	autoIncrementFields: Set<string>
	foreignKeyFields: Map<string, ForeignKeyInfo>
	context: GenerationContext
	getTableData?: (tableName: string) => object[]
}): Record<string, unknown> {
	const {
		shape,
		overrides = {},
		noSeriesFields,
		autoIncrementFields,
		foreignKeyFields,
		context,
		getTableData,
	} = options

	const item: Record<string, unknown> = {}

	for (const [fieldName, fieldSchema] of Object.entries(shape)) {
		// Apply overrides first (for perParent seeding)
		if (fieldName in overrides) {
			item[fieldName] = overrides[fieldName]
			continue
		}

		const zodSchema = fieldSchema as z.ZodType
		const meta = getZodMeta(zodSchema)

		// Skip flowFields - they are computed, not stored
		if (meta?.flowField) continue

		// Skip autoIncrement fields - they are auto-generated
		if (meta?.autoIncrement !== undefined || autoIncrementFields.has(fieldName))
			continue

		// Skip noSeries fields - they are auto-generated by NoSeriesManager
		if (noSeriesFields.has(fieldName)) continue

		// Check if this field is a foreign key from relations
		const fkInfo = foreignKeyFields.get(fieldName)
		if (fkInfo && getTableData) {
			// Pick a random value from the related table's target column
			const relatedData = getTableData(fkInfo.targetTable)
			if (relatedData.length > 0) {
				const randomItem = relatedData[
					Math.floor(Math.random() * relatedData.length)
				] as Record<string, unknown>
				item[fieldName] = randomItem[fkInfo.targetColumn]
				continue
			}
		}

		// Handle legacy meta.related (for backwards compatibility)
		if (meta?.related) {
			const relatedIds = context.tableIds.get(meta.related)
			if (relatedIds && relatedIds.length > 0) {
				item[fieldName] =
					relatedIds[Math.floor(Math.random() * relatedIds.length)]
			}
		} else {
			item[fieldName] = generateValueFromMeta(meta, zodSchema, context)
		}
	}

	return item
}

/**
 * Get a random count from a seed config.
 *
 * @param seedConfig - The seed configuration
 * @param defaultSeed - Default count if not specified
 * @returns Object with count and perParent info
 */
export function getSeedCount(
	seedConfig:
		| number
		| boolean
		| { min?: number; max?: number; perParent?: boolean; parentTable?: string }
		| undefined,
	defaultSeed: number,
): { count: number; isPerParent: boolean; parentTable?: string } {
	if (seedConfig === false) {
		return { count: 0, isPerParent: false }
	}
	if (seedConfig === true) {
		// true means use default seed count
		return { count: defaultSeed, isPerParent: false }
	}
	if (typeof seedConfig === 'number') {
		return { count: seedConfig, isPerParent: false }
	}
	if (seedConfig && typeof seedConfig === 'object') {
		const min = seedConfig.min ?? defaultSeed
		const max = seedConfig.max ?? min
		const count =
			min === max ? min : Math.floor(Math.random() * (max - min + 1)) + min
		return {
			count,
			isPerParent: seedConfig.perParent ?? false,
			parentTable: seedConfig.parentTable,
		}
	}
	return { count: defaultSeed, isPerParent: false }
}

/**
 * Set the faker seed for reproducible data generation.
 *
 * @param seed - The seed value
 */
export function setFakerSeed(seed: number): void {
	faker.seed(seed)
}
