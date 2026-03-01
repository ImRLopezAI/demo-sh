import type {
	BandType,
	DatasetSchemaJson,
	ReportBand,
	ReportDefinition,
	ReportElement,
} from '@server/reporting/designer-contracts'
import { createDefaultReportDefinition } from '@server/reporting/designer-contracts'
import {
	BAND_LABELS,
	DEFAULT_GRID_SIZE,
	ELEMENT_DEFAULT_SIZE,
} from './constants'
import { getElementDefinition } from './elements/registry'
import type { DesignerFieldItem } from './types'

export const POINTS_PER_INCH = 72
export const POINTS_PER_MM = 2.835

export function toPoints(value: number, unit: 'pt' | 'mm' | 'in'): number {
	if (unit === 'pt') return value
	if (unit === 'mm') return value * POINTS_PER_MM
	return value * POINTS_PER_INCH
}

export function fromPoints(value: number, unit: 'pt' | 'mm' | 'in'): number {
	if (unit === 'pt') return value
	if (unit === 'mm') return value / POINTS_PER_MM
	return value / POINTS_PER_INCH
}

export function snap(value: number, grid = DEFAULT_GRID_SIZE): number {
	if (grid <= 1) return value
	return Math.round(value / grid) * grid
}

export function pageDimensions(report: ReportDefinition): {
	width: number
	height: number
} {
	const withOrientation = (width: number, height: number) =>
		report.page.orientation === 'landscape'
			? { width: height, height: width }
			: { width, height }

	const size = report.page.size
	if (typeof size === 'string') {
		if (size === 'A4') return withOrientation(595.28, 841.89)
		if (size === 'LETTER') return withOrientation(612, 792)
		return withOrientation(226.77, 1200)
	}
	return withOrientation(size.width, size.height)
}

export function createBand(type: BandType): ReportBand {
	const defaults: Record<BandType, number> = {
		reportHeader: 110,
		pageHeader: 34,
		groupHeader: 28,
		detail: 48,
		groupFooter: 28,
		pageFooter: 24,
		reportFooter: 48,
	}
	return {
		id: `${type}-${Math.random().toString(36).slice(2, 8)}`,
		type,
		height: defaults[type],
		canGrow: true,
		elements: [],
	}
}

export function createElement(kind: ReportElement['kind']): ReportElement {
	const size = ELEMENT_DEFAULT_SIZE[kind]
	const definition = getElementDefinition(kind)
	return {
		id: `el-${Math.random().toString(36).slice(2, 10)}`,
		kind,
		x: 12,
		y: 8,
		width: size.width,
		height: size.height,
		...definition.createDefaults(),
	}
}

export function ensureReport(
	report: ReportDefinition | undefined,
): ReportDefinition {
	if (!report) return createDefaultReportDefinition('Untitled report')
	if (!report.bands.length) {
		const fallback = createDefaultReportDefinition(report.name)
		return {
			...report,
			bands: fallback.bands,
		}
	}
	return report
}

function inferTypeFromSchema(field: Record<string, unknown>): string {
	const typeValue = field.type
	if (typeof typeValue === 'string') return typeValue
	if (Array.isArray(typeValue) && typeof typeValue[0] === 'string') {
		return typeValue[0]
	}
	if (field.properties) return 'object'
	if (field.items) return 'array'
	return 'unknown'
}

function walkSchema(
	properties: Record<string, unknown> | undefined,
	prefix = '',
): DesignerFieldItem[] {
	if (!properties) return []
	const out: DesignerFieldItem[] = []
	for (const [key, value] of Object.entries(properties)) {
		if (typeof value !== 'object' || value === null) continue
		const field = value as Record<string, unknown>
		const path = prefix ? `${prefix}.${key}` : key
		const nested = walkSchema(
			field.properties as Record<string, unknown> | undefined,
			path,
		)
		out.push({
			path,
			label: key,
			type: inferTypeFromSchema(field),
			children: nested.length > 0 ? nested : undefined,
		})
	}
	return out
}

export function extractFieldsFromSchema(
	schema: DatasetSchemaJson,
): DesignerFieldItem[] {
	const root = schema.properties as Record<string, unknown> | undefined
	if (!root) return []
	const fields = (root.Fields ?? root.fields) as
		| Record<string, unknown>
		| undefined
	if (!fields || typeof fields !== 'object') return walkSchema(root)
	const fieldProperties = (fields.properties ?? {}) as Record<string, unknown>
	return walkSchema(fieldProperties)
}

export function findBandLabel(type: BandType): string {
	return BAND_LABELS[type]
}

export function cloneReport(report: ReportDefinition): ReportDefinition {
	return JSON.parse(JSON.stringify(report)) as ReportDefinition
}
