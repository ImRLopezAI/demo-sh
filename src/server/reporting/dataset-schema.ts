import z from 'zod'

export const DATASET_OPERATORS = [
	'contains',
	'notContains',
	'startsWith',
	'endsWith',
	'equals',
	'notEquals',
	'greaterThan',
	'greaterThanOrEqual',
	'lessThan',
	'lessThanOrEqual',
	'isBetween',
	'before',
	'after',
	'onOrBefore',
	'onOrAfter',
	'is',
	'isNot',
	'isAnyOf',
	'isNoneOf',
	'isTrue',
	'isFalse',
	'isEmpty',
	'isNotEmpty',
] as const

export const dataSetFilterSchema = z
	.object({
		name: z.string().min(1),
		operator: z.enum(DATASET_OPERATORS).default('equals'),
		value: z
			.union([z.string(), z.number(), z.boolean(), z.array(z.string())])
			.optional(),
		endValue: z.union([z.string(), z.number()]).optional(),
	})
	.refine(
		(f) => {
			if (f.operator === 'isBetween')
				return f.value !== undefined && f.endValue !== undefined
			if (['isEmpty', 'isNotEmpty', 'isTrue', 'isFalse'].includes(f.operator))
				return true
			return f.value !== undefined
		},
		{ message: 'Filter value required for this operator' },
	)

export const directFieldSchema = z.object({
	name: z.string().min(1),
	label: z.string().min(1),
})

export const nestedRelatedFieldSchema = z.object({
	type: z.literal('related'),
	name: z.string().min(1),
	label: z.string().min(1),
	relatedModel: z.string().min(1),
	joinField: z.string().optional(),
	relatedJoinField: z.string().optional(),
	filters: z.array(dataSetFilterSchema).optional(),
	fields: z.array(directFieldSchema),
})

export const topLevelRelatedFieldSchema = z.object({
	type: z.literal('related'),
	name: z.string().min(1),
	label: z.string().min(1),
	relatedModel: z.string().min(1),
	joinField: z.string().optional(),
	relatedJoinField: z.string().optional(),
	filters: z.array(dataSetFilterSchema).optional(),
	fields: z.array(z.union([directFieldSchema, nestedRelatedFieldSchema])),
})

export const dataSetFieldSchema = z.union([
	directFieldSchema,
	topLevelRelatedFieldSchema,
])

export const dataSetDefinitionSchema = z.object({
	name: z.string().optional(),
	type: z.enum(['single', 'list']),
	primaryTable: z.string().min(1),
	fields: z.array(dataSetFieldSchema).min(1),
	filters: z.array(dataSetFilterSchema).optional(),
})

export type ParsedDataSetDefinition = z.infer<typeof dataSetDefinitionSchema>

export function parseDataSetDefinition(raw: string): ParsedDataSetDefinition {
	const parsed = JSON.parse(raw) as unknown
	return dataSetDefinitionSchema.parse(parsed)
}

export function parseDataSetObject(obj: unknown): ParsedDataSetDefinition {
	return dataSetDefinitionSchema.parse(obj)
}
