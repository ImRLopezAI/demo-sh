export type BandType =
	| 'reportHeader'
	| 'pageHeader'
	| 'groupHeader'
	| 'detail'
	| 'groupFooter'
	| 'pageFooter'
	| 'reportFooter'

export type ElementKind = 'textbox' | 'image' | 'shape' | 'line' | 'barcode'

export interface ReportBorderSide {
	width: number
	color: string
	style: 'solid' | 'dashed' | 'dotted'
}

export interface ReportElement {
	id: string
	kind: ElementKind
	x: number
	y: number
	width: number
	height: number
	expression?: string
	staticText?: string
	font?: {
		family: 'Helvetica' | 'Courier' | 'Times-Roman'
		size: number
		weight: 'normal' | 'bold'
		style: 'normal' | 'italic'
		color: string
		align: 'left' | 'center' | 'right'
		lineHeight: number
	}
	border?: {
		top?: ReportBorderSide
		right?: ReportBorderSide
		bottom?: ReportBorderSide
		left?: ReportBorderSide
	}
	background?: string
	canGrow?: boolean
	canShrink?: boolean
	visibility?: string
	imageSource?: string
	imageFit?: 'contain' | 'cover' | 'stretch'
	shapeType?: 'rectangle' | 'ellipse' | 'roundedRect'
	cornerRadius?: number
	lineDirection?: 'horizontal' | 'vertical' | 'diagonal'
	lineStyle?: 'solid' | 'dashed' | 'dotted'
	lineColor?: string
	lineWidth?: number
}

export interface ReportBand {
	id: string
	type: BandType
	height: number
	canGrow: boolean
	elements: ReportElement[]
	groupExpression?: string
	repeatOnNewPage?: boolean
	keepTogether?: boolean
	pageBreakBefore?: boolean
	pageBreakAfter?: boolean
	locked?: boolean
}

export interface ReportParameter {
	name: string
	label: string
	type: 'string' | 'number' | 'date' | 'boolean' | 'select'
	defaultValue?: unknown
	options?: Array<{ value: string; label: string }>
	required: boolean
}

export type PageSize =
	| 'A4'
	| 'LETTER'
	| 'THERMAL'
	| {
			width: number
			height: number
	  }

export interface ReportDefinition {
	/**
	 * Band-definition schema version.
	 * We keep this at 1 while persistence `definitionVersion` differentiates
	 * legacy block layouts (1) from designer layouts (2).
	 */
	version: 1
	name: string
	description?: string
	page: {
		size: PageSize
		orientation: 'portrait' | 'landscape'
		margins: { top: number; right: number; bottom: number; left: number }
	}
	bands: ReportBand[]
	parameters?: ReportParameter[]
	calculatedFields?: Array<{ name: string; expression: string }>
}

export interface DesignerPayload {
	definitionVersion: 2
	report: ReportDefinition
	migratedFrom?: {
		legacyLayoutId?: string
		legacyVersion?: number
	}
}

export interface ExpressionContext {
	Fields: Record<string, unknown>
	Summary?: Record<string, unknown>
	Globals?: {
		PageNumber: number
		TotalPages: number
		ReportDate: string
		ReportTitle: string
	}
	rows?: Array<Record<string, unknown>>
}

export type ExpressionResult =
	| { ok: true; value: unknown }
	| { ok: false; error: string }

export type DatasetSchemaJson = {
	$schema?: string
	type?: string | string[]
	properties?: Record<string, unknown>
	required?: string[]
	definitions?: Record<string, unknown>
	$defs?: Record<string, unknown>
}

export interface DatasetFieldDescriptor {
	path: string
	label: string
	type:
		| 'string'
		| 'number'
		| 'boolean'
		| 'date'
		| 'object'
		| 'array'
		| 'unknown'
	children?: DatasetFieldDescriptor[]
}

export const PAGE_SIZE_POINTS = {
	A4: { width: 595.28, height: 841.89 },
	LETTER: { width: 612, height: 792 },
	THERMAL: { width: 226.77, height: 1200 },
} as const

export const BAND_ORDER: readonly BandType[] = [
	'reportHeader',
	'pageHeader',
	'groupHeader',
	'detail',
	'groupFooter',
	'pageFooter',
	'reportFooter',
]

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null
}

export function isReportDefinition(value: unknown): value is ReportDefinition {
	if (!isObject(value)) return false
	if (value.version !== 1) return false
	if (!Array.isArray(value.bands)) return false
	if (!isObject(value.page)) return false
	if (!isObject(value.page.margins)) return false
	return true
}

export function resolvePageSize(size: PageSize): {
	width: number
	height: number
} {
	if (typeof size === 'string') {
		return PAGE_SIZE_POINTS[size]
	}
	return {
		width: Math.max(50, size.width),
		height: Math.max(50, size.height),
	}
}

export function createDefaultReportDefinition(
	name = 'Untitled Report',
): ReportDefinition {
	return {
		version: 1,
		name,
		page: {
			size: 'A4',
			orientation: 'portrait',
			margins: { top: 24, right: 24, bottom: 24, left: 24 },
		},
		bands: [
			{
				id: 'report-header',
				type: 'reportHeader',
				height: 96,
				canGrow: true,
				elements: [],
			},
			{
				id: 'detail',
				type: 'detail',
				height: 48,
				canGrow: true,
				elements: [],
			},
			{
				id: 'page-footer',
				type: 'pageFooter',
				height: 28,
				canGrow: false,
				elements: [],
			},
		],
	}
}
