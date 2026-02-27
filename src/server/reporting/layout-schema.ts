import z from 'zod'
import {
	BUILT_IN_LAYOUT_KEYS,
	type ReportBlock,
	type ReportLayout,
} from './contracts'

const headingBlockSchema = z.object({
	kind: z.literal('heading'),
	text: z.string().trim().min(1).max(200),
	level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
})

const keyValueBlockSchema = z.object({
	kind: z.literal('keyValue'),
	key: z.string().trim().min(1).max(120),
	valuePath: z.string().trim().min(1).max(200),
})

const tableBlockSchema = z.object({
	kind: z.literal('table'),
	columns: z
		.array(
			z.object({
				key: z.string().trim().min(1).max(120),
				label: z.string().trim().min(1).max(120),
			}),
		)
		.min(1)
		.max(20),
	maxRows: z.number().int().min(1).max(1000).optional(),
})

const spacerBlockSchema = z.object({
	kind: z.literal('spacer'),
	size: z.enum(['sm', 'md', 'lg']),
})

const paragraphBlockSchema = z.object({
	kind: z.literal('paragraph'),
	text: z.string().trim().min(1).max(5000),
})

export const reportBlockSchema = z.discriminatedUnion('kind', [
	headingBlockSchema,
	keyValueBlockSchema,
	tableBlockSchema,
	spacerBlockSchema,
	paragraphBlockSchema,
])

export const reportLayoutSchema = z.object({
	key: z.enum(BUILT_IN_LAYOUT_KEYS),
	name: z.string().trim().min(1).max(120),
	pageSize: z.enum(['A4', 'LETTER', 'THERMAL']),
	orientation: z.enum(['portrait', 'landscape']),
	blocks: z.array(reportBlockSchema).min(1).max(200),
})

export function validateLayout(layout: unknown): ReportLayout {
	return reportLayoutSchema.parse(layout)
}

export function parseLayoutDraft(
	layoutDraft: string | undefined,
): ReportLayout | null {
	if (!layoutDraft) return null
	try {
		const parsed = JSON.parse(layoutDraft) as unknown
		return validateLayout(parsed)
	} catch {
		return null
	}
}

export function asReportBlocks(blocks: unknown): ReportBlock[] {
	return z.array(reportBlockSchema).parse(blocks) as ReportBlock[]
}
