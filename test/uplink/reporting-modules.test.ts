import { db } from '@server/db'
import { beforeEach, describe, expect, test } from 'vitest'
import { createCaller } from './helpers'

describe('hub.reporting module', () => {
	beforeEach(async () => {
		await db._internals.reset()
	})

	test('lists built-in layouts including document templates', async () => {
		const caller = createCaller()
		const layouts = await caller.hub.reporting.listLayouts({})

		expect(layouts.length).toBeGreaterThanOrEqual(6)
		expect(layouts.map((layout) => layout.key)).toEqual(
			expect.arrayContaining([
				'BLANK_EMPTY',
				'A4_SUMMARY',
				'THERMAL_RECEIPT',
				'DOC_SALES_ORDER',
				'DOC_SALES_INVOICE',
				'DOC_POS_RECEIPT',
			]),
		)
	})

	test('generates report file for configured module/entity', async () => {
		const caller = createCaller()

		const file = await caller.hub.reporting.generateReport({
			moduleId: 'pos',
			entityId: 'transactions',
			builtInLayout: 'A4_SUMMARY',
			limit: 25,
		})

		expect(file).toBeInstanceOf(File)
		expect(file.type).toBe('application/pdf')
		expect(file.size).toBeGreaterThan(0)
	})

	test('keeps 500-row report generation under 2 seconds', async () => {
		const caller = createCaller()
		const startedAt = Date.now()
		const file = await caller.hub.reporting.generateReport({
			moduleId: 'pos',
			entityId: 'transactions',
			builtInLayout: 'A4_SUMMARY',
			limit: 500,
		})
		const durationMs = Date.now() - startedAt

		expect(file).toBeInstanceOf(File)
		expect(file.size).toBeGreaterThan(0)
		expect(durationMs).toBeLessThan(2000)
	})

	test('rejects unsupported module/entity combinations', async () => {
		const caller = createCaller()

		await expect(
			caller.hub.reporting.generateReport({
				moduleId: 'pos',
				entityId: 'nonConfiguredEntity',
				builtInLayout: 'A4_SUMMARY',
				limit: 10,
			}),
		).rejects.toThrow('Reporting is not configured')
	})

	test('rejects invalid layout draft in preview endpoint', async () => {
		const caller = createCaller()

		await expect(
			caller.hub.reporting.previewReport({
				moduleId: 'pos',
				entityId: 'transactions',
				builtInLayout: 'A4_SUMMARY',
				layoutDraft: '{not-json',
				limit: 25,
			}),
		).rejects.toThrow('Layout draft is not valid JSON schema')
	})

	test('creates custom layouts, saves versions, and resolves defaults', async () => {
		const caller = createCaller({ role: 'MANAGER' })

		const created = await caller.hub.reporting.createLayout({
			moduleId: 'pos',
			entityId: 'transactions',
			name: 'POS Ops',
			baseTemplate: 'A4_SUMMARY',
		})
		expect(created.layoutId).toBeTruthy()
		expect(created.versionNo).toBe(1)

		const loaded = await caller.hub.reporting.getLayout({
			layoutId: created.layoutId,
		})
		expect(loaded.source).toBe('CUSTOM')
		expect(loaded.layout.key).toBe('A4_SUMMARY')

		const updatedLayout = {
			...loaded.layout,
			name: 'POS Ops v2',
			blocks: [
				...loaded.layout.blocks,
				{
					kind: 'paragraph' as const,
					text: 'Updated layout from integration test.',
				},
			],
		}

		const saved = await caller.hub.reporting.saveLayoutVersion({
			layoutId: created.layoutId,
			layoutDraft: JSON.stringify(updatedLayout),
		})
		expect(saved.versionNo).toBe(2)

		const setDefault = await caller.hub.reporting.setDefaultLayout({
			moduleId: 'pos',
			entityId: 'transactions',
			layoutId: created.layoutId,
		})
		expect(setDefault.defaultLayoutRef).toBe(created.layoutId)

		const layouts = await caller.hub.reporting.listLayouts({
			moduleId: 'pos',
			entityId: 'transactions',
		})
		const customLayout = layouts.find(
			(layout) => layout.id === created.layoutId,
		)
		expect(customLayout?.isDefault).toBe(true)

		const file = await caller.hub.reporting.generateReport({
			moduleId: 'pos',
			entityId: 'transactions',
			limit: 10,
		})
		expect(file).toBeInstanceOf(File)
		expect(file.size).toBeGreaterThan(0)

		const latestRun = db.schemas.reportRuns.findMany({
			where: (row) => row.moduleId === 'pos' && row.entityId === 'transactions',
			orderBy: { field: '_updatedAt', direction: 'desc' },
			limit: 1,
		})[0]
		expect(latestRun?.layoutRef).toBe(created.layoutId)
		expect(latestRun?.status).toBe('GENERATED')
	})

	// ---- Dataset-aware endpoints ----

	test('getAvailableTables returns tables with field names', async () => {
		const caller = createCaller({ role: 'MANAGER' })
		const tables = await caller.hub.reporting.getAvailableTables()

		expect(tables.length).toBeGreaterThan(0)
		const txTable = tables.find((t) => t.table === 'posTransactions')
		expect(txTable).toBeDefined()
		expect(txTable?.fields.length).toBeGreaterThan(0)
		expect(txTable?.fields).toContain('status')
	})

	test('getAvailableTables rejects non-MANAGER role', async () => {
		const caller = createCaller({ role: 'VIEWER' })
		await expect(caller.hub.reporting.getAvailableTables()).rejects.toThrow()
	})

	test('generates report with document template DOC_SALES_ORDER', async () => {
		const caller = createCaller()
		const file = await caller.hub.reporting.generateReport({
			moduleId: 'market',
			entityId: 'salesOrders',
			builtInLayout: 'DOC_SALES_ORDER',
			limit: 5,
		})

		expect(file).toBeInstanceOf(File)
		expect(file.type).toBe('application/pdf')
		expect(file.size).toBeGreaterThan(0)
	})

	test('generates report with document template DOC_POS_RECEIPT', async () => {
		const caller = createCaller()
		const file = await caller.hub.reporting.generateReport({
			moduleId: 'pos',
			entityId: 'transactions',
			builtInLayout: 'DOC_POS_RECEIPT',
			limit: 5,
		})

		expect(file).toBeInstanceOf(File)
		expect(file.type).toBe('application/pdf')
		expect(file.size).toBeGreaterThan(0)
	})

	test('generates report with document template DOC_SALES_INVOICE', async () => {
		const caller = createCaller()
		const file = await caller.hub.reporting.generateReport({
			moduleId: 'ledger',
			entityId: 'invoices',
			builtInLayout: 'DOC_SALES_INVOICE',
			limit: 5,
		})

		expect(file).toBeInstanceOf(File)
		expect(file.type).toBe('application/pdf')
		expect(file.size).toBeGreaterThan(0)
	})

	test('preview with custom datasetDraft renders PDF using dataset executor', async () => {
		const caller = createCaller()
		const datasetDraft = {
			type: 'list' as const,
			primaryTable: 'posTransactions',
			fields: [
				{ name: 'receiptNo', label: 'Receipt No' },
				{ name: 'status', label: 'Status' },
				{ name: 'totalAmount', label: 'Total' },
			],
		}

		const file = await caller.hub.reporting.previewReport({
			moduleId: 'pos',
			entityId: 'transactions',
			builtInLayout: 'A4_SUMMARY',
			datasetDraft,
			limit: 10,
		})

		expect(file).toBeInstanceOf(File)
		expect(file.type).toBe('application/pdf')
		expect(file.size).toBeGreaterThan(0)
	})

	test('createLayout with dataSetDraft persists dataset object', async () => {
		const caller = createCaller({ role: 'MANAGER' })
		const dataSetDraft = {
			type: 'list' as const,
			primaryTable: 'items',
			fields: [
				{ name: 'itemNo', label: 'Item No' },
				{ name: 'description', label: 'Description' },
			],
		}

		const created = await caller.hub.reporting.createLayout({
			moduleId: 'market',
			entityId: 'items',
			name: 'Items with Dataset',
			baseTemplate: 'A4_SUMMARY',
			dataSetDraft,
		})
		expect(created.layoutId).toBeTruthy()

		// Verify dataset is persisted in the layout version
		const stored = db.schemas.reportLayoutVersions.findMany({
			where: (row) => row.layoutId === created.layoutId,
			limit: 1,
		})
		expect(stored.length).toBe(1)
		expect(stored[0].datasetDefinition).toEqual(dataSetDraft)
	})

	test('saveLayoutVersion with dataSetDraft persists updated dataset', async () => {
		const caller = createCaller({ role: 'MANAGER' })

		// First create a layout
		const created = await caller.hub.reporting.createLayout({
			moduleId: 'pos',
			entityId: 'transactions',
			name: 'POS with Dataset',
			baseTemplate: 'A4_SUMMARY',
		})

		// Now save a new version with a dataset
		const dataSetDraft = {
			type: 'list' as const,
			primaryTable: 'posTransactions',
			fields: [
				{ name: 'status', label: 'Status' },
				{ name: 'totalAmount', label: 'Total' },
			],
		}

		const loaded = await caller.hub.reporting.getLayout({
			layoutId: created.layoutId,
		})
		const layoutDraft = JSON.stringify(loaded.layout)

		const saved = await caller.hub.reporting.saveLayoutVersion({
			layoutId: created.layoutId,
			layoutDraft,
			dataSetDraft,
		})
		expect(saved.versionNo).toBe(2)

		// Verify the new version has the dataset
		const versions = db.schemas.reportLayoutVersions.findMany({
			where: (row) => row.layoutId === created.layoutId && row.versionNo === 2,
			limit: 1,
		})
		expect(versions.length).toBe(1)
		expect(versions[0].datasetDefinition).toEqual(dataSetDraft)
	})

	test('preview without datasetDraft falls back to generic dataset', async () => {
		const caller = createCaller()
		// Without a datasetDraft, the system falls back to generic dataset
		const file = await caller.hub.reporting.previewReport({
			moduleId: 'pos',
			entityId: 'transactions',
			builtInLayout: 'A4_SUMMARY',
			limit: 10,
		})
		// Falls through to generic dataset and still produces a PDF
		expect(file).toBeInstanceOf(File)
		expect(file.type).toBe('application/pdf')
	})
})
