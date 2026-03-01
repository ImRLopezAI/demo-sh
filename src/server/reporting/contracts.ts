import type { DATASET_OPERATORS } from './dataset-schema'

export type DataSetOperator = (typeof DATASET_OPERATORS)[number]

export const REPORT_MODULE_IDS = [
	'hub',
	'market',
	'insight',
	'replenishment',
	'ledger',
	'flow',
	'payroll',
	'pos',
	'trace',
] as const

export type ReportModuleId = (typeof REPORT_MODULE_IDS)[number]

export const BUILT_IN_LAYOUT_KEYS = [
	'BLANK_EMPTY',
	'A4_SUMMARY',
	'THERMAL_RECEIPT',
	'DOC_SALES_ORDER',
	'DOC_SALES_INVOICE',
	'DOC_POS_RECEIPT',
] as const

export type BuiltInLayoutKey = (typeof BUILT_IN_LAYOUT_KEYS)[number]

export const BUILT_IN_DATASET_KEYS = [
	'DOC_SALES_ORDER',
	'DOC_SALES_INVOICE',
	'DOC_POS_RECEIPT',
] as const

export type BuiltInDataSetKey = (typeof BUILT_IN_DATASET_KEYS)[number]

// ---- Dataset Definition Types ----

export interface DataSetFilter {
	name: string
	operator: DataSetOperator
	value?: string | number | boolean | string[]
	endValue?: string | number
}

export interface DirectField {
	name: string
	label: string
}

export interface NestedRelatedField {
	type: 'related'
	name: string
	label: string
	relatedModel: string
	joinField?: string
	relatedJoinField?: string
	filters?: DataSetFilter[]
	fields: DirectField[]
}

export interface TopLevelRelatedField {
	type: 'related'
	name: string
	label: string
	relatedModel: string
	joinField?: string
	relatedJoinField?: string
	filters?: DataSetFilter[]
	fields: Array<DirectField | NestedRelatedField>
}

export type DataSetField = DirectField | TopLevelRelatedField

export interface DataSetDefinition {
	name?: string
	type: 'single' | 'list'
	primaryTable: string
	fields: DataSetField[]
	filters?: DataSetFilter[]
}

/** Blocks that can appear inside a row column (non-recursive). */
export type LeafBlock =
	| { kind: 'heading'; text: string; level: 1 | 2 | 3 }
	| { kind: 'keyValue'; key: string; valuePath: string }
	| {
			kind: 'table'
			columns: Array<{ key: string; label: string }>
			maxRows?: number
	  }
	| { kind: 'spacer'; size: 'sm' | 'md' | 'lg' }
	| {
			kind: 'paragraph'
			text: string
			align?: 'left' | 'center' | 'right'
			bold?: boolean
	  }
	| { kind: 'sectionHeader'; text: string; color?: string }
	| {
			kind: 'keyValueGroup'
			pairs: Array<{ key: string; valuePath: string }>
			align?: 'left' | 'right'
	  }
	| { kind: 'divider'; color?: string; thickness?: number }

export type ReportBlock =
	| LeafBlock
	| {
			kind: 'row'
			columns: Array<{ width: number; blocks: LeafBlock[] }>
	  }

export interface ReportLayout {
	key: string
	name: string
	pageSize: 'A4' | 'LETTER' | 'THERMAL'
	orientation: 'portrait' | 'landscape'
	blocks: ReportBlock[]
}

export interface ReportDataSet {
	moduleId: ReportModuleId
	entityId: string
	title: string
	generatedAt: string
	rows: Array<Record<string, unknown>>
	summary?: Record<string, unknown>
	suggestedColumns?: Array<{ key: string; label: string }>
}

export interface GenerateReportInput {
	moduleId: ReportModuleId
	entityId: string
	layoutId?: string
	builtInLayout?: BuiltInLayoutKey
	filters?: Record<string, string | number | boolean | null>
	limit?: number
	ids?: string[]
}

export interface PreviewReportInput extends GenerateReportInput {
	layoutDraft?: string
	previewOptions?: {
		rowLimit?: number
		page?: number
		sampleMode?: 'HEAD' | 'RANDOM'
	}
}

export interface ReportRequestFingerprint {
	tenantId: string
	moduleId: ReportModuleId
	entityId: string
	layoutKey: BuiltInLayoutKey
	filtersHash: string
}
