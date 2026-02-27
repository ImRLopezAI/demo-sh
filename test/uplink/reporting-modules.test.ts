import { db } from '@server/db'
import { beforeEach, describe, expect, test } from 'vitest'
import { createCaller } from './helpers'

describe('hub.reporting module', () => {
	beforeEach(async () => {
		await db._internals.reset()
	})

	test('lists built-in layouts', async () => {
		const caller = createCaller()
		const layouts = await caller.hub.reporting.listLayouts({})

		expect(layouts.length).toBeGreaterThanOrEqual(3)
		expect(layouts.map((layout) => layout.key)).toEqual(
			expect.arrayContaining(['BLANK_EMPTY', 'A4_SUMMARY', 'THERMAL_RECEIPT']),
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
})
