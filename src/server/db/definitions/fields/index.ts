/**
 * Field utilities for Zod schemas, flow fields, and computed fields.
 * @module fields
 */

// Computed fields
export {
	applyComputedFields,
	type ComputedFieldConfig,
	combineComputed,
	simpleComputed,
	wrapWithComputedFields,
} from './computed'

// Flow fields
export {
	computeFlowField,
	createFlowFieldContext,
	flowField,
} from './flow-fields'
// Zod utilities
export {
	getDefaultValue,
	getEnumValues,
	getSchemaTypeDescription,
	getZodMeta,
	getZodTraits,
	hasZodTrait,
	isBooleanSchema,
	isEnumSchema,
	isNumberSchema,
	isOptional,
	isStringSchema,
	unwrapOptional,
} from './zod-utils'
