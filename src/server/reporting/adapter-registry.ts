import type { RpcContextType } from '@server/rpc/init'
import type { GenerateReportInput, ReportDataSet } from './contracts'

const ENTITY_TABLE_MAP: Record<string, keyof RpcContextType['db']['schemas']> =
	{
		'market.salesOrders': 'salesHeaders',
		'market.items': 'items',
		'market.customers': 'customers',
		'market.carts': 'carts',
		'ledger.invoices': 'salesInvoiceHeaders',
		'ledger.customerLedger': 'custLedgerEntries',
		'ledger.glEntries': 'glEntries',
		'payroll.payrollRuns': 'payrollRuns',
		'payroll.employees': 'employees',
		'payroll.employeeLedger': 'employeeLedgerEntries',
		'pos.transactions': 'posTransactions',
		'pos.transactionLines': 'posTransactionLines',
		'pos.sessions': 'posSessions',
		'pos.terminals': 'terminals',
		'insight.itemLedger': 'itemLedgerEntries',
		'insight.locations': 'locations',
		'insight.valueEntries': 'valueEntries',
		'replenishment.purchaseOrders': 'purchaseHeaders',
		'replenishment.vendors': 'vendors',
		'replenishment.transfers': 'transferHeaders',
		'trace.shipments': 'shipments',
		'trace.shipmentMethods': 'shipmentMethods',
		'flow.bankAccounts': 'bankAccounts',
		'flow.bankLedger': 'bankAccountLedgerEntries',
		'flow.paymentJournal': 'genJournalLines',
		'flow.glEntries': 'glEntries',
		'hub.operationTasks': 'operationTasks',
		'hub.notifications': 'moduleNotifications',
		'payroll.glEntries': 'glEntries',
		'payroll.bankLedgerEntries': 'bankAccountLedgerEntries',
	}

function readTenantId(row: unknown): string {
	const tenantId = (row as { tenantId?: string }).tenantId
	return tenantId ?? 'demo-tenant'
}

function applyFilters(
	row: Record<string, unknown>,
	filters: GenerateReportInput['filters'],
): boolean {
	if (!filters) return true
	for (const [key, value] of Object.entries(filters)) {
		const rowValue = row[key]
		if (value === null) {
			if (rowValue !== null && rowValue !== undefined) return false
			continue
		}
		if (rowValue !== value) return false
	}
	return true
}

function normalizeValue(value: unknown): unknown {
	if (value instanceof Date) return value.toISOString()
	return value
}

function normalizeRow(row: Record<string, unknown>): Record<string, unknown> {
	const next: Record<string, unknown> = {}
	for (const [key, value] of Object.entries(row)) {
		next[key] = normalizeValue(value)
	}
	return next
}

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

function toLabel(key: string): string {
	return key
		.replace(/([a-z])([A-Z])/g, '$1 $2')
		.replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
		.replace(/^./, (c) => c.toUpperCase())
}

function detectColumns(
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
			if (lower.includes('method') || lower.includes('type')) return 5
			return 6
		}
		return score(a) - score(b)
	})
	return prioritized
		.slice(0, maxCols)
		.map((key) => ({ key, label: toLabel(key) }))
}

export function buildGenericDataSet(
	context: RpcContextType,
	input: GenerateReportInput,
): ReportDataSet {
	const mapKey = `${input.moduleId}.${input.entityId}`
	const tableName = ENTITY_TABLE_MAP[mapKey]
	if (!tableName) {
		throw new Error(`Reporting is not configured for ${mapKey}`)
	}

	const tenantId = context.auth.tenantId
	const idsSet = input.ids?.length ? new Set(input.ids) : null
	const table = context.db.schemas[tableName] as unknown as GenericTable
	const rawRows = table.findMany({
		where: (row: Record<string, unknown>) =>
			readTenantId(row) === tenantId &&
			(idsSet === null || idsSet.has(row._id as string)) &&
			applyFilters(row, input.filters),
		orderBy: { field: '_updatedAt', direction: 'desc' },
		limit: Math.max(1, Math.min(input.limit ?? 200, 1000)),
	})

	const rows = rawRows.map((row) => normalizeRow(row))

	return {
		moduleId: input.moduleId,
		entityId: input.entityId,
		title: `${input.moduleId}/${input.entityId} report`,
		generatedAt: new Date().toISOString(),
		rows,
		summary: {
			moduleId: input.moduleId,
			entityId: input.entityId,
			rowCount: rows.length,
			generatedAt: new Date().toISOString(),
		},
		suggestedColumns: detectColumns(rows),
	}
}
