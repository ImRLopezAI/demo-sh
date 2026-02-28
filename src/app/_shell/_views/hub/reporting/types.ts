import type { ReportBlock } from '@server/reporting/contracts'

export type BlockWithId = ReportBlock & { _id: string }

export interface FilterRow {
	id: string
	field: string
	value: string | number | boolean | null
}

export type FilterFieldType = 'enum' | 'string' | 'number' | 'boolean'

export interface FilterFieldDef {
	key: string
	label: string
	type: FilterFieldType
	options?: readonly string[]
}
