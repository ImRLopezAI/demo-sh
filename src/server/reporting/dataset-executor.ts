import type { RpcContextType } from '@server/rpc/init'
import type {
	DataSetDefinition,
	DataSetField,
	DirectField,
	NestedRelatedField,
	ReportDataSet,
	ReportModuleId,
	TopLevelRelatedField,
} from './contracts'

// ---- Security: Table Access Allowlist ----

const REPORTING_ALLOWED_TABLES = new Set([
	'salesHeaders',
	'salesLines',
	'customers',
	'items',
	'carts',
	'salesInvoiceHeaders',
	'salesInvoiceLines',
	'custLedgerEntries',
	'glEntries',
	'purchaseHeaders',
	'purchaseLines',
	'vendors',
	'transferHeaders',
	'transferLines',
	'posTransactions',
	'posTransactionLines',
	'posSessions',
	'terminals',
	'employees',
	'employeeLedgerEntries',
	'bankAccounts',
	'bankAccountLedgerEntries',
	'genJournalLines',
	'shipments',
	'shipmentMethods',
	'locations',
	'itemLedgerEntries',
	'valueEntries',
	'operationTasks',
	'moduleNotifications',
	'payrollRuns',
])

// ---- Security: Prototype Pollution Prevention ----

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

// ---- Hard Limits ----

const HARD_LIMITS = {
	MAX_PRIMARY_ROWS: 5000,
	MAX_CHILD_LINES: 2000,
	MAX_DEPTH: 3,
	MAX_OPERATIONS: 50_000,
} as const

// ---- Internal Types ----

type GenericTable = {
	findMany: (options: {
		where?: (row: Record<string, unknown>) => boolean
		orderBy?: { field: string; direction: 'asc' | 'desc' }
		limit?: number
	}) => Array<Record<string, unknown>>
}

const INTERNAL_FIELDS = new Set([
	'_id',
	'_createdAt',
	'_updatedAt',
	'tenantId',
	'createdByUserId',
	'updatedByUserId',
])

// ---- Helpers ----

function readTenantId(row: unknown): string {
	const tenantId = (row as { tenantId?: string }).tenantId
	return tenantId ?? 'demo-tenant'
}

function getTable(context: RpcContextType, tableName: string): GenericTable {
	if (!REPORTING_ALLOWED_TABLES.has(tableName)) {
		throw new Error(`Table "${tableName}" is not available for reporting`)
	}
	const table = context.db.schemas[tableName as keyof typeof context.db.schemas]
	if (!table) throw new Error(`Unknown table: ${tableName}`)
	return table as unknown as GenericTable
}

function normalizeValue(value: unknown): unknown {
	if (value instanceof Date) return value.toISOString()
	return value
}

function normalizeRow(row: Record<string, unknown>): Record<string, unknown> {
	const result: Record<string, unknown> = {}
	for (const [key, value] of Object.entries(row)) {
		result[key] = normalizeValue(value)
	}
	return result
}

function toLabel(key: string): string {
	return key
		.replace(/([a-z])([A-Z])/g, '$1 $2')
		.replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
		.replace(/^./, (c) => c.toUpperCase())
}

function isRelatedField(field: DataSetField): field is TopLevelRelatedField {
	return 'type' in field && field.type === 'related'
}

function isNestedRelated(
	field: DirectField | NestedRelatedField,
): field is NestedRelatedField {
	return 'type' in field && field.type === 'related'
}

// ---- Core Executor ----

export interface ExecuteDataSetParams {
	moduleId: ReportModuleId
	entityId: string
	ids?: string[]
	filters?: Record<string, string | number | boolean | null>
	limit?: number
}

export function executeDataSet(
	context: RpcContextType,
	definition: DataSetDefinition,
	params: ExecuteDataSetParams,
): ReportDataSet {
	const tenantId = context.auth.tenantId
	let operationCount = 0

	function checkBudget(increment: number) {
		operationCount += increment
		if (operationCount > HARD_LIMITS.MAX_OPERATIONS) {
			throw new Error(
				'Report data budget exceeded — narrow filters or reduce fields',
			)
		}
	}

	// Step 1: Fetch primary rows
	const primaryTable = getTable(context, definition.primaryTable)
	const idsSet = params.ids?.length ? new Set(params.ids) : null

	const isSingleMode = definition.type === 'single'
	const rowLimit = isSingleMode
		? 1
		: Math.max(1, Math.min(params.limit ?? 200, HARD_LIMITS.MAX_PRIMARY_ROWS))

	const primaryRows = primaryTable.findMany({
		where: (row: Record<string, unknown>) => {
			if (readTenantId(row) !== tenantId) return false
			if (idsSet && !idsSet.has(row._id as string)) return false
			if (params.filters) {
				for (const [key, value] of Object.entries(params.filters)) {
					const rowValue = row[key]
					if (value === null) {
						if (rowValue !== null && rowValue !== undefined) return false
						continue
					}
					if (rowValue !== value) return false
				}
			}
			return true
		},
		orderBy: { field: '_updatedAt', direction: 'desc' },
		limit: rowLimit,
	})

	checkBudget(primaryRows.length)
	const normalized = primaryRows.map((r) => normalizeRow(r))

	// Step 2: Build summary from direct fields (for single mode)
	const summary: Record<string, unknown> = {
		moduleId: params.moduleId,
		entityId: params.entityId,
		rowCount: normalized.length,
		generatedAt: new Date().toISOString(),
	}

	// Step 3: Resolve relations (breadth-first, batch)
	let dataRows: Array<Record<string, unknown>> = []
	const suggestedColumns: Array<{ key: string; label: string }> = []

	for (const field of definition.fields) {
		if (!isRelatedField(field)) {
			// Direct field — add to summary from first primary row
			if (isSingleMode && normalized.length > 0) {
				summary[field.name] = normalized[0][field.name]
			}
			continue
		}

		// Related field — batch resolve
		const relatedTable = getTable(context, field.relatedModel)
		const parentJoinField = field.joinField ?? `${field.name}Id`
		const childJoinField = field.relatedJoinField ?? '_id'

		// Collect all foreign keys from primary rows
		const foreignKeys = new Set<string>()
		for (const row of normalized) {
			const fk = row[parentJoinField]
			if (fk != null) foreignKeys.add(String(fk))
		}

		if (foreignKeys.size === 0) continue
		checkBudget(foreignKeys.size)

		const isLookup = childJoinField === '_id'

		if (isLookup) {
			// One-to-one lookup: batch fetch related records
			const relatedRows = relatedTable.findMany({
				where: (row: Record<string, unknown>) =>
					readTenantId(row) === tenantId && foreignKeys.has(row._id as string),
				limit: foreignKeys.size,
			})

			const relatedIndex = new Map(
				relatedRows.map((r) => [r._id as string, normalizeRow(r)]),
			)

			// Flatten lookup fields into summary/rows
			for (const primaryRow of normalized) {
				const fk = primaryRow[parentJoinField]
				const related = fk ? relatedIndex.get(String(fk)) : undefined
				if (related) {
					for (const subField of field.fields) {
						if (isNestedRelated(subField)) continue
						const flatKey = `${field.name}_${subField.name}`
						primaryRow[flatKey] = related[subField.name]
					}
					// Also populate summary for single mode
					if (isSingleMode) {
						const nested: Record<string, unknown> = {}
						for (const subField of field.fields) {
							if (isNestedRelated(subField)) continue
							nested[subField.name] = related[subField.name]
						}
						summary[field.name] = nested
					}
				}
			}
		} else {
			// One-to-many child lines: batch fetch
			const childRows = relatedTable.findMany({
				where: (row: Record<string, unknown>) =>
					readTenantId(row) === tenantId &&
					foreignKeys.has(String(row[childJoinField] ?? '')),
				orderBy: { field: '_updatedAt', direction: 'desc' },
				limit: HARD_LIMITS.MAX_CHILD_LINES,
			})

			checkBudget(childRows.length)
			const normalizedChildren = childRows.map((r) => normalizeRow(r))

			// Resolve nested lookups within child lines
			for (const subField of field.fields) {
				if (!isNestedRelated(subField)) continue

				const nestedTable = getTable(context, subField.relatedModel)
				const nestedJoinField = subField.joinField ?? `${subField.name}Id`
				const nestedFks = new Set<string>()
				for (const child of normalizedChildren) {
					const fk = child[nestedJoinField]
					if (fk != null) nestedFks.add(String(fk))
				}

				if (nestedFks.size === 0) continue
				checkBudget(nestedFks.size)

				const nestedRows = nestedTable.findMany({
					where: (row: Record<string, unknown>) =>
						readTenantId(row) === tenantId && nestedFks.has(row._id as string),
					limit: nestedFks.size,
				})

				const nestedIndex = new Map(
					nestedRows.map((r) => [r._id as string, normalizeRow(r)]),
				)

				// Flatten nested lookup into child rows
				for (const child of normalizedChildren) {
					const fk = child[nestedJoinField]
					const nested = fk ? nestedIndex.get(String(fk)) : undefined
					if (nested) {
						for (const leafField of subField.fields) {
							child[`${subField.name}_${leafField.name}`] =
								nested[leafField.name]
						}
					}
				}
			}

			// Build suggested columns from child line fields
			for (const subField of field.fields) {
				if (isNestedRelated(subField)) {
					for (const leafField of subField.fields) {
						suggestedColumns.push({
							key: `${subField.name}_${leafField.name}`,
							label: leafField.label,
						})
					}
				} else {
					suggestedColumns.push({
						key: subField.name,
						label: subField.label,
					})
				}
			}

			dataRows = normalizedChildren
		}
	}

	// For list mode without child lines, use primary rows as data rows
	if (!isSingleMode && dataRows.length === 0) {
		dataRows = normalized
		// Build suggested columns from direct + lookup fields
		for (const field of definition.fields) {
			if (isRelatedField(field)) {
				for (const sub of field.fields) {
					if (isNestedRelated(sub)) continue
					suggestedColumns.push({
						key: `${field.name}_${sub.name}`,
						label: sub.label,
					})
				}
			} else {
				suggestedColumns.push({ key: field.name, label: field.label })
			}
		}
	}

	// For single mode, use primary row summary fields
	if (isSingleMode && normalized.length > 0) {
		for (const field of definition.fields) {
			if (!isRelatedField(field)) {
				summary[field.name] = normalized[0][field.name]
			}
		}
	}

	// Auto-detect columns if none defined
	const finalColumns =
		suggestedColumns.length > 0 ? suggestedColumns : autoDetectColumns(dataRows)

	const title = definition.name
		? definition.name
		: `${params.moduleId}/${params.entityId} report`

	return {
		moduleId: params.moduleId,
		entityId: params.entityId,
		title,
		generatedAt: new Date().toISOString(),
		rows: dataRows,
		summary,
		suggestedColumns: finalColumns,
	}
}

function autoDetectColumns(
	rows: Array<Record<string, unknown>>,
	maxCols = 5,
): Array<{ key: string; label: string }> {
	if (rows.length === 0) return []
	const sample = rows[0]
	const keys = Object.keys(sample).filter((k) => !INTERNAL_FIELDS.has(k))
	const prioritized = keys.sort((a, b) => {
		const score = (k: string) => {
			const lower = k.toLowerCase()
			if (lower.includes('no') || lower.includes('number') || lower === 'code')
				return 0
			if (
				lower.includes('name') ||
				lower === 'description' ||
				lower === 'title'
			)
				return 1
			if (lower === 'status') return 2
			if (
				lower.includes('amount') ||
				lower.includes('total') ||
				lower.includes('price') ||
				lower.includes('balance')
			)
				return 3
			if (lower.includes('date') || lower.includes('at')) return 4
			return 5
		}
		return score(a) - score(b)
	})
	return prioritized
		.slice(0, maxCols)
		.map((key) => ({ key, label: toLabel(key) }))
}

// ---- Exported Utilities ----

export { FORBIDDEN_KEYS, getTable, REPORTING_ALLOWED_TABLES }
