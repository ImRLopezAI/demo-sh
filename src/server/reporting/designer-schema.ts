import z from 'zod'
import type { ReportDefinition } from './designer-contracts'

const colorHexSchema = z
	.string()
	.regex(/^#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, 'Must be a hex color')

const borderSideSchema = z.object({
	width: z.number().min(0).max(16),
	color: colorHexSchema,
	style: z.enum(['solid', 'dashed', 'dotted']),
})

const baseElementSchema = z.object({
	id: z.string().trim().min(1),
	x: z.number().min(0),
	y: z.number().min(0),
	width: z.number().min(1).max(5000),
	height: z.number().min(1).max(5000),
	expression: z.string().max(2000).optional(),
	staticText: z.string().max(8000).optional(),
	font: z
		.object({
			family: z.enum(['Helvetica', 'Courier', 'Times-Roman']),
			size: z.number().min(6).max(96),
			weight: z.enum(['normal', 'bold']),
			style: z.enum(['normal', 'italic']),
			color: colorHexSchema,
			align: z.enum(['left', 'center', 'right']),
			lineHeight: z.number().min(0.5).max(4),
		})
		.optional(),
	border: z
		.object({
			top: borderSideSchema.optional(),
			right: borderSideSchema.optional(),
			bottom: borderSideSchema.optional(),
			left: borderSideSchema.optional(),
		})
		.optional(),
	background: colorHexSchema.optional(),
	canGrow: z.boolean().optional(),
	canShrink: z.boolean().optional(),
	visibility: z.string().max(800).optional(),
	imageSource: z.string().max(4000).optional(),
	imageFit: z.enum(['contain', 'cover', 'stretch']).optional(),
	shapeType: z.enum(['rectangle', 'ellipse', 'roundedRect']).optional(),
	cornerRadius: z.number().min(0).max(300).optional(),
	lineDirection: z.enum(['horizontal', 'vertical', 'diagonal']).optional(),
	lineStyle: z.enum(['solid', 'dashed', 'dotted']).optional(),
	lineColor: colorHexSchema.optional(),
	lineWidth: z.number().min(0.5).max(20).optional(),
})

export const reportElementSchema = z.discriminatedUnion('kind', [
	baseElementSchema.extend({ kind: z.literal('textbox') }),
	baseElementSchema.extend({ kind: z.literal('image') }),
	baseElementSchema.extend({ kind: z.literal('shape') }),
	baseElementSchema.extend({ kind: z.literal('line') }),
	baseElementSchema.extend({ kind: z.literal('barcode') }),
])

export const reportBandSchema = z.object({
	id: z.string().trim().min(1),
	type: z.enum([
		'reportHeader',
		'pageHeader',
		'groupHeader',
		'detail',
		'groupFooter',
		'pageFooter',
		'reportFooter',
	]),
	height: z.number().min(8).max(4000),
	canGrow: z.boolean(),
	elements: z.array(reportElementSchema).max(2000),
	groupExpression: z.string().max(1200).optional(),
	repeatOnNewPage: z.boolean().optional(),
	keepTogether: z.boolean().optional(),
	pageBreakBefore: z.boolean().optional(),
	pageBreakAfter: z.boolean().optional(),
	locked: z.boolean().optional(),
})

const pageSizeSchema = z.union([
	z.enum(['A4', 'LETTER', 'THERMAL']),
	z.object({
		width: z.number().min(50).max(10000),
		height: z.number().min(50).max(10000),
	}),
])

export const reportDefinitionSchema = z.object({
	version: z.literal(1),
	name: z.string().trim().min(1).max(240),
	description: z.string().max(2000).optional(),
	page: z.object({
		size: pageSizeSchema,
		orientation: z.enum(['portrait', 'landscape']),
		margins: z.object({
			top: z.number().min(0).max(300),
			right: z.number().min(0).max(300),
			bottom: z.number().min(0).max(300),
			left: z.number().min(0).max(300),
		}),
	}),
	bands: z.array(reportBandSchema).min(1).max(200),
	parameters: z
		.array(
			z.object({
				name: z.string().trim().min(1).max(120),
				label: z.string().trim().min(1).max(240),
				type: z.enum(['string', 'number', 'date', 'boolean', 'select']),
				defaultValue: z.unknown().optional(),
				options: z
					.array(
						z.object({
							value: z.string().max(200),
							label: z.string().max(240),
						}),
					)
					.optional(),
				required: z.boolean(),
			}),
		)
		.optional(),
	calculatedFields: z
		.array(
			z.object({
				name: z.string().trim().min(1).max(120),
				expression: z.string().trim().min(1).max(1200),
			}),
		)
		.optional(),
})

export function validateReportDefinition(value: unknown): ReportDefinition {
	return reportDefinitionSchema.parse(value)
}

export function parseReportDefinitionDraft(
	reportDefinitionDraft: string | undefined,
): ReportDefinition | null {
	if (!reportDefinitionDraft) return null
	try {
		const parsed = JSON.parse(reportDefinitionDraft) as unknown
		return validateReportDefinition(parsed)
	} catch {
		return null
	}
}
