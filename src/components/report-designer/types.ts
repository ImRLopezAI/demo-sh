import type {
	DatasetSchemaJson,
	ExpressionContext,
	ReportBand,
	ReportDefinition,
	ReportElement,
} from '@server/reporting/designer-contracts'

export type {
	DatasetSchemaJson,
	ExpressionContext,
	ReportBand,
	ReportDefinition,
	ReportElement,
}

export interface ReportDesignerProps {
	datasetSchemaJson: DatasetSchemaJson
	datasetSchemaVersion?: string
	sampleData?: Record<string, unknown>[]
	initialReport?: ReportDefinition
	onSave: (report: ReportDefinition) => void | Promise<void>
	onPreview: (report: ReportDefinition) => Promise<string>
	onDirtyChange?: (isDirty: boolean) => void
	mode?: 'full' | 'layout-only'
	theme?: 'light' | 'dark'
	className?: string
}

export interface ReportDesignerRef {
	getReport: () => ReportDefinition
	setReport: (report: ReportDefinition) => void
	isDirty: () => boolean
	undo: () => void
	redo: () => void
}

export type ToolElementKind = ReportElement['kind']

export interface DesignerFieldItem {
	path: string
	label: string
	type: string
	children?: DesignerFieldItem[]
}

export interface CanvasPointerPosition {
	x: number
	y: number
}

export type DesignerTab =
	| 'Home'
	| 'Insert'
	| 'Report'
	| 'Page'
	| 'Layout'
	| 'Preview'

export interface PropertyEditorTarget {
	type: 'element' | 'band' | 'none'
	bandId?: string
	elementId?: string
}
