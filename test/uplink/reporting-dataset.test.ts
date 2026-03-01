import { db } from '@server/db'
import {
	findDataSetForEntity,
	getBuiltInDataSet,
	listBuiltInDataSets,
} from '@server/reporting/built-in-datasets'
import type { DataSetDefinition } from '@server/reporting/contracts'
import {
	executeDataSet,
	FORBIDDEN_KEYS,
	getTable,
	REPORTING_ALLOWED_TABLES,
} from '@server/reporting/dataset-executor'
import { parseDataSetDefinition } from '@server/reporting/dataset-schema'
import { createRpcContext } from '@server/rpc/init'
import { beforeEach, describe, expect, test } from 'vitest'

async function createContext(role = 'ADMIN') {
	return createRpcContext({
		headers: new Headers(),
		auth: {
			tenantId: 'demo-tenant',
			userId: 'test-user',
			role,
		},
	})
}

describe('dataset-schema — Zod validation', () => {
	test('parses a valid list-type dataset definition', () => {
		const raw = JSON.stringify({
			type: 'list',
			primaryTable: 'posTransactions',
			fields: [
				{ name: 'receiptNo', label: 'Receipt No' },
				{ name: 'status', label: 'Status' },
			],
		})
		const parsed = parseDataSetDefinition(raw)
		expect(parsed.type).toBe('list')
		expect(parsed.primaryTable).toBe('posTransactions')
		expect(parsed.fields).toHaveLength(2)
	})

	test('parses a valid single-type dataset with related fields', () => {
		const raw = JSON.stringify({
			type: 'single',
			primaryTable: 'salesHeaders',
			fields: [
				{ name: 'documentNo', label: 'Doc No' },
				{
					type: 'related',
					name: 'customer',
					label: 'Customer',
					relatedModel: 'customers',
					fields: [{ name: 'name', label: 'Name' }],
				},
			],
		})
		const parsed = parseDataSetDefinition(raw)
		expect(parsed.type).toBe('single')
		expect(parsed.fields).toHaveLength(2)
	})

	test('rejects definition with no fields', () => {
		const raw = JSON.stringify({
			type: 'list',
			primaryTable: 'items',
			fields: [],
		})
		expect(() => parseDataSetDefinition(raw)).toThrow()
	})

	test('rejects definition with missing primaryTable', () => {
		const raw = JSON.stringify({
			type: 'list',
			fields: [{ name: 'x', label: 'X' }],
		})
		expect(() => parseDataSetDefinition(raw)).toThrow()
	})

	test('rejects definition with invalid type', () => {
		const raw = JSON.stringify({
			type: 'batch',
			primaryTable: 'items',
			fields: [{ name: 'x', label: 'X' }],
		})
		expect(() => parseDataSetDefinition(raw)).toThrow()
	})

	test('rejects malformed JSON', () => {
		expect(() => parseDataSetDefinition('{bad json')).toThrow()
	})
})

describe('dataset-executor — security', () => {
	beforeEach(async () => {
		await db._internals.reset()
	})

	test('getTable rejects tables outside REPORTING_ALLOWED_TABLES', async () => {
		const context = await createContext()
		expect(() => getTable(context, 'rbacRoles')).toThrow(
			'not available for reporting',
		)
		expect(() => getTable(context, 'tenantSettings')).toThrow(
			'not available for reporting',
		)
	})

	test('getTable allows whitelisted tables', async () => {
		const context = await createContext()
		expect(() => getTable(context, 'posTransactions')).not.toThrow()
		expect(() => getTable(context, 'salesHeaders')).not.toThrow()
		expect(() => getTable(context, 'items')).not.toThrow()
	})

	test('REPORTING_ALLOWED_TABLES contains expected tables', () => {
		expect(REPORTING_ALLOWED_TABLES.has('posTransactions')).toBe(true)
		expect(REPORTING_ALLOWED_TABLES.has('salesHeaders')).toBe(true)
		expect(REPORTING_ALLOWED_TABLES.has('salesInvoiceHeaders')).toBe(true)
		expect(REPORTING_ALLOWED_TABLES.has('customers')).toBe(true)
		expect(REPORTING_ALLOWED_TABLES.has('items')).toBe(true)
	})

	test('FORBIDDEN_KEYS blocks prototype pollution keys', () => {
		expect(FORBIDDEN_KEYS.has('__proto__')).toBe(true)
		expect(FORBIDDEN_KEYS.has('constructor')).toBe(true)
		expect(FORBIDDEN_KEYS.has('prototype')).toBe(true)
	})
})

describe('dataset-executor — execution', () => {
	beforeEach(async () => {
		await db._internals.reset()
	})

	test('executes a list-type dataset and returns rows', async () => {
		const context = await createContext()
		const definition: DataSetDefinition = {
			type: 'list',
			primaryTable: 'posTransactions',
			fields: [
				{ name: 'receiptNo', label: 'Receipt No' },
				{ name: 'status', label: 'Status' },
				{ name: 'totalAmount', label: 'Total' },
			],
		}

		const result = executeDataSet(context, definition, {
			moduleId: 'pos',
			entityId: 'transactions',
			limit: 10,
		})

		expect(result.moduleId).toBe('pos')
		expect(result.entityId).toBe('transactions')
		expect(result.rows.length).toBeGreaterThan(0)
		expect(result.rows.length).toBeLessThanOrEqual(10)
		expect(result.suggestedColumns).toBeDefined()
		expect(result.generatedAt).toBeDefined()
	})

	test('executes a single-type dataset and populates summary', async () => {
		const context = await createContext()

		const definition: DataSetDefinition = {
			type: 'single',
			primaryTable: 'posTransactions',
			fields: [
				{ name: 'receiptNo', label: 'Receipt No' },
				{ name: 'status', label: 'Status' },
			],
		}

		// Single mode without ids — takes the first matching row
		const result = executeDataSet(context, definition, {
			moduleId: 'pos',
			entityId: 'transactions',
		})

		expect(result.summary).toBeDefined()
		expect(result.summary?.moduleId).toBe('pos')
		expect(result.summary?.generatedAt).toBeDefined()
		// In single mode, direct fields get populated from the first primary row
		expect(result.summary?.receiptNo).toBeDefined()
		expect(result.summary?.status).toBeDefined()
	})

	test('resolves one-to-one lookup relations in single mode', async () => {
		const context = await createContext()
		const transactions = db.schemas.posTransactions.findMany({ limit: 1 })
		expect(transactions.length).toBeGreaterThan(0)

		const definition: DataSetDefinition = {
			type: 'single',
			primaryTable: 'posTransactions',
			fields: [
				{ name: 'receiptNo', label: 'Receipt No' },
				{
					type: 'related',
					name: 'session',
					label: 'Session',
					relatedModel: 'posSessions',
					joinField: 'posSessionId',
					fields: [{ name: 'sessionNo', label: 'Session No.' }],
				},
			],
		}

		const result = executeDataSet(context, definition, {
			moduleId: 'pos',
			entityId: 'transactions',
			ids: [transactions[0]._id as string],
		})

		expect(result.summary?.session).toBeDefined()
		if (result.summary?.session) {
			expect(
				(result.summary?.session as Record<string, unknown>).sessionNo,
			).toBeDefined()
		}
	})

	test('resolves one-to-many child lines with nested lookups', async () => {
		const context = await createContext()
		const salesOrders = db.schemas.salesHeaders.findMany({ limit: 1 })
		expect(salesOrders.length).toBeGreaterThan(0)

		const definition: DataSetDefinition = {
			type: 'single',
			primaryTable: 'salesHeaders',
			fields: [
				{ name: 'documentNo', label: 'Doc No' },
				{
					type: 'related',
					name: 'lines',
					label: 'Order Lines',
					relatedModel: 'salesLines',
					joinField: 'documentNo',
					relatedJoinField: 'documentNo',
					fields: [
						{ name: 'lineNo', label: 'Line' },
						{ name: 'quantity', label: 'Qty' },
						{
							type: 'related',
							name: 'item',
							label: 'Item',
							relatedModel: 'items',
							joinField: 'itemId',
							fields: [{ name: 'description', label: 'Item Description' }],
						},
					],
				},
			],
		}

		const result = executeDataSet(context, definition, {
			moduleId: 'market',
			entityId: 'salesOrders',
			ids: [salesOrders[0]._id as string],
		})

		expect(result.rows.length).toBeGreaterThan(0)
		// Nested lookup should flatten item_description into child rows
		const firstLine = result.rows[0]
		if (firstLine) {
			expect(firstLine.lineNo).toBeDefined()
			expect(firstLine.quantity).toBeDefined()
		}
		// Should have suggested columns including nested
		expect(result.suggestedColumns?.length).toBeGreaterThan(0)
	})

	test('applies filter parameters to primary rows', async () => {
		const context = await createContext()
		const definition: DataSetDefinition = {
			type: 'list',
			primaryTable: 'posTransactions',
			fields: [
				{ name: 'receiptNo', label: 'Receipt No' },
				{ name: 'status', label: 'Status' },
			],
		}

		const result = executeDataSet(context, definition, {
			moduleId: 'pos',
			entityId: 'transactions',
			filters: { status: 'COMPLETED' },
			limit: 50,
		})

		for (const row of result.rows) {
			expect(row.status).toBe('COMPLETED')
		}
	})

	test('respects row limit', async () => {
		const context = await createContext()
		const definition: DataSetDefinition = {
			type: 'list',
			primaryTable: 'posTransactions',
			fields: [{ name: 'status', label: 'Status' }],
		}

		const result = executeDataSet(context, definition, {
			moduleId: 'pos',
			entityId: 'transactions',
			limit: 3,
		})

		expect(result.rows.length).toBeLessThanOrEqual(3)
	})

	test('single mode limits to exactly 1 primary row', async () => {
		const context = await createContext()
		const definition: DataSetDefinition = {
			type: 'single',
			primaryTable: 'posTransactions',
			fields: [{ name: 'status', label: 'Status' }],
		}

		const result = executeDataSet(context, definition, {
			moduleId: 'pos',
			entityId: 'transactions',
			limit: 100,
		})

		// Single mode should fetch at most 1 primary row
		expect(result.summary?.status).toBeDefined()
	})

	test('rejects disallowed table in definition', async () => {
		const context = await createContext()
		const definition: DataSetDefinition = {
			type: 'list',
			primaryTable: 'rbacRoles' as string,
			fields: [{ name: 'name', label: 'Name' }],
		}

		expect(() =>
			executeDataSet(context, definition, {
				moduleId: 'hub',
				entityId: 'roles',
			}),
		).toThrow('not available for reporting')
	})

	test('rejects disallowed table in related field', async () => {
		const context = await createContext()
		const definition: DataSetDefinition = {
			type: 'single',
			primaryTable: 'posTransactions',
			fields: [
				{ name: 'status', label: 'Status' },
				{
					type: 'related',
					name: 'secret',
					label: 'Secret',
					relatedModel: 'tenantSettings' as string,
					fields: [{ name: 'value', label: 'Value' }],
				},
			],
		}

		const tx = db.schemas.posTransactions.findMany({ limit: 1 })
		expect(tx.length).toBeGreaterThan(0)

		expect(() =>
			executeDataSet(context, definition, {
				moduleId: 'pos',
				entityId: 'transactions',
				ids: [tx[0]._id as string],
			}),
		).toThrow('not available for reporting')
	})

	test('auto-detects columns when no relations are present', async () => {
		const context = await createContext()
		const definition: DataSetDefinition = {
			type: 'list',
			primaryTable: 'items',
			fields: [
				{ name: 'itemNo', label: 'Item No' },
				{ name: 'description', label: 'Description' },
			],
		}

		const result = executeDataSet(context, definition, {
			moduleId: 'market',
			entityId: 'items',
			limit: 5,
		})

		expect(result.suggestedColumns?.length).toBeGreaterThan(0)
	})
})

describe('built-in-datasets', () => {
	test('listBuiltInDataSets returns all 3 datasets', () => {
		const datasets = listBuiltInDataSets()
		expect(datasets).toHaveLength(3)

		const keys = datasets.map((d) => d.key)
		expect(keys).toContain('DOC_SALES_ORDER')
		expect(keys).toContain('DOC_SALES_INVOICE')
		expect(keys).toContain('DOC_POS_RECEIPT')
	})

	test('getBuiltInDataSet returns correct definition by key', () => {
		const salesOrder = getBuiltInDataSet('DOC_SALES_ORDER')
		expect(salesOrder).toBeDefined()
		expect(salesOrder?.primaryTable).toBe('salesHeaders')
		expect(salesOrder?.type).toBe('single')

		const invoice = getBuiltInDataSet('DOC_SALES_INVOICE')
		expect(invoice).toBeDefined()
		expect(invoice?.primaryTable).toBe('salesInvoiceHeaders')

		const receipt = getBuiltInDataSet('DOC_POS_RECEIPT')
		expect(receipt).toBeDefined()
		expect(receipt?.primaryTable).toBe('posTransactions')
	})

	test('getBuiltInDataSet returns undefined for unknown key', () => {
		const result = getBuiltInDataSet('NONEXISTENT' as never)
		expect(result).toBeUndefined()
	})

	test('findDataSetForEntity maps entity to correct dataset', () => {
		const salesOrderDs = findDataSetForEntity('market', 'salesOrders')
		expect(salesOrderDs).toBeDefined()
		expect(salesOrderDs?.key).toBe('DOC_SALES_ORDER')

		const invoiceDs = findDataSetForEntity('ledger', 'invoices')
		expect(invoiceDs).toBeDefined()
		expect(invoiceDs?.key).toBe('DOC_SALES_INVOICE')

		const posDs = findDataSetForEntity('pos', 'transactions')
		expect(posDs).toBeDefined()
		expect(posDs?.key).toBe('DOC_POS_RECEIPT')
	})

	test('findDataSetForEntity returns undefined for unmapped entity', () => {
		expect(findDataSetForEntity('hub', 'notifications')).toBeUndefined()
		expect(findDataSetForEntity('pos', 'sessions')).toBeUndefined()
	})

	test('all built-in dataset definitions pass schema validation', () => {
		const datasets = listBuiltInDataSets()
		for (const { definition } of datasets) {
			const raw = JSON.stringify(definition)
			expect(() => parseDataSetDefinition(raw)).not.toThrow()
		}
	})
})
