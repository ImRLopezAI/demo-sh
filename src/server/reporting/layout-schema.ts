import z from 'zod'
import type { ReportBlock, ReportLayout } from './contracts'

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
	align: z.enum(['left', 'center', 'right']).optional(),
	bold: z.boolean().optional(),
})

const sectionHeaderBlockSchema = z.object({
	kind: z.literal('sectionHeader'),
	text: z.string().trim().min(1).max(200),
	color: z
		.string()
		.regex(/^#[0-9a-fA-F]{6}$/)
		.optional(),
})

const keyValueGroupBlockSchema = z.object({
	kind: z.literal('keyValueGroup'),
	pairs: z
		.array(
			z.object({
				key: z.string().trim().min(1).max(120),
				valuePath: z.string().trim().min(1).max(200),
			}),
		)
		.min(1)
		.max(20),
	align: z.enum(['left', 'right']).optional(),
})

const dividerBlockSchema = z.object({
	kind: z.literal('divider'),
	color: z
		.string()
		.regex(/^#[0-9a-fA-F]{6}$/)
		.optional(),
	thickness: z.number().min(0.5).max(5).optional(),
})

// Non-recursive block schema (everything except row)
const leafBlockSchema = z.discriminatedUnion('kind', [
	headingBlockSchema,
	keyValueBlockSchema,
	tableBlockSchema,
	spacerBlockSchema,
	paragraphBlockSchema,
	sectionHeaderBlockSchema,
	keyValueGroupBlockSchema,
	dividerBlockSchema,
])

const rowColumnSchema = z.object({
	width: z.number().min(10).max(90),
	blocks: z.array(leafBlockSchema).min(0).max(50),
})

const rowBlockSchema = z.object({
	kind: z.literal('row'),
	columns: z.array(rowColumnSchema).min(2).max(4),
})

export const reportBlockSchema = z.discriminatedUnion('kind', [
	headingBlockSchema,
	keyValueBlockSchema,
	tableBlockSchema,
	spacerBlockSchema,
	paragraphBlockSchema,
	sectionHeaderBlockSchema,
	keyValueGroupBlockSchema,
	dividerBlockSchema,
	rowBlockSchema,
])

export const reportLayoutSchema = z.object({
	key: z.string().trim().min(1).max(50),
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
