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
] as const

export type BuiltInLayoutKey = (typeof BUILT_IN_LAYOUT_KEYS)[number]

export type ReportBlock =
	| { kind: 'heading'; text: string; level: 1 | 2 | 3 }
	| { kind: 'keyValue'; key: string; valuePath: string }
	| {
			kind: 'table'
			columns: Array<{ key: string; label: string }>
			maxRows?: number
	  }
	| { kind: 'spacer'; size: 'sm' | 'md' | 'lg' }
	| { kind: 'paragraph'; text: string }

export interface ReportLayout {
	key: BuiltInLayoutKey
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
