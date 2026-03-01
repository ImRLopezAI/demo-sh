import { renderReportFile } from '@server/reporting'
import type { ReportDataSet } from '@server/reporting/contracts'
import type { ReportDefinition } from '@server/reporting/designer-contracts'
import { describe, expect, test } from 'vitest'

const report: ReportDefinition = {
	version: 1,
	name: 'Band renderer test',
	page: {
		size: 'A4',
		orientation: 'portrait',
		margins: { top: 24, right: 24, bottom: 24, left: 24 },
	},
	bands: [
		{
			id: 'header',
			type: 'reportHeader',
			height: 40,
			canGrow: true,
			elements: [
				{
					id: 'title',
					kind: 'textbox',
					x: 0,
					y: 0,
					width: 300,
					height: 20,
					staticText: 'Renderer smoke test',
				},
			],
		},
		{
			id: 'detail',
			type: 'detail',
			height: 20,
			canGrow: true,
			elements: [
				{
					id: 'line',
					kind: 'textbox',
					x: 0,
					y: 0,
					width: 300,
					height: 18,
					expression: '=Fields.name + " - " + Fields.value',
				},
			],
		},
	],
}

const dataSet: ReportDataSet = {
	moduleId: 'hub',
	entityId: 'operationTasks',
	title: 'Renderer Test',
	generatedAt: new Date().toISOString(),
	rows: [
		{ name: 'A', value: 1 },
		{ name: 'B', value: 2 },
		{ name: 'C', value: 3 },
	],
	summary: { total: 3 },
}

describe('band renderer', () => {
	test('renders report definition to a PDF file', async () => {
		const file = await renderReportFile({ layout: report, dataSet })
		expect(file).toBeInstanceOf(File)
		expect(file.type).toBe('application/pdf')
		expect(file.size).toBeGreaterThan(0)
	})
})
