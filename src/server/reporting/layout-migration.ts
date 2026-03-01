import type { ReportLayout } from './contracts'
import {
	createDefaultReportDefinition,
	type ReportBand,
	type ReportDefinition,
	type ReportElement,
} from './designer-contracts'

let migrationIdCounter = 0

function nextId(prefix: string): string {
	migrationIdCounter += 1
	return `${prefix}-${migrationIdCounter}`
}

function textElement(params: {
	x: number
	y: number
	width: number
	height?: number
	text?: string
	expression?: string
	bold?: boolean
	align?: 'left' | 'center' | 'right'
	fontSize?: number
}): ReportElement {
	return {
		id: nextId('el'),
		kind: 'textbox',
		x: params.x,
		y: params.y,
		width: params.width,
		height: params.height ?? 18,
		staticText: params.text,
		expression: params.expression,
		canGrow: true,
		font: {
			family: 'Helvetica',
			size: params.fontSize ?? 10,
			weight: params.bold ? 'bold' : 'normal',
			style: 'normal',
			color: '#0f172a',
			align: params.align ?? 'left',
			lineHeight: 1.2,
		},
	}
}

function collectLegacyBlocks(layout: ReportLayout): {
	headerElements: ReportElement[]
	detailElements: ReportElement[]
	footerElements: ReportElement[]
	detailHeight: number
} {
	const headerElements: ReportElement[] = []
	const detailElements: ReportElement[] = []
	const footerElements: ReportElement[] = []
	let yCursor = 6

	for (const block of layout.blocks) {
		if (block.kind === 'heading') {
			headerElements.push(
				textElement({
					x: 12,
					y: yCursor,
					width: 460,
					height: 24,
					text: block.text,
					bold: true,
					fontSize: block.level === 1 ? 18 : block.level === 2 ? 14 : 12,
				}),
			)
			yCursor += 28
			continue
		}

		if (block.kind === 'paragraph') {
			headerElements.push(
				textElement({
					x: 12,
					y: yCursor,
					width: 540,
					height: 20,
					text: block.text,
					align: block.align,
					bold: block.bold,
				}),
			)
			yCursor += 22
			continue
		}

		if (block.kind === 'keyValue') {
			detailElements.push(
				textElement({
					x: 12,
					y: 4 + detailElements.length * 20,
					width: 180,
					text: `${block.key}:`,
					bold: true,
				}),
			)
			detailElements.push(
				textElement({
					x: 194,
					y: 4 + (detailElements.length - 1) * 20,
					width: 320,
					expression: `=Summary.${block.valuePath.replace(/^summary\./, '')}`,
				}),
			)
			continue
		}

		if (block.kind === 'keyValueGroup') {
			for (const pair of block.pairs) {
				detailElements.push(
					textElement({
						x: 12,
						y: 4 + detailElements.length * 18,
						width: 180,
						text: `${pair.key}:`,
						bold: true,
					}),
				)
				detailElements.push(
					textElement({
						x: 194,
						y: 4 + (detailElements.length - 1) * 18,
						width: 320,
						expression: `=Summary.${pair.valuePath.replace(/^summary\./, '')}`,
						align: block.align === 'right' ? 'right' : 'left',
					}),
				)
			}
			continue
		}

		if (block.kind === 'table') {
			let tableX = 12
			const colWidth = Math.max(80, Math.floor(520 / block.columns.length))
			for (const column of block.columns) {
				detailElements.push(
					textElement({
						x: tableX,
						y: 4,
						width: colWidth,
						height: 18,
						text: column.label,
						bold: true,
					}),
				)
				detailElements.push(
					textElement({
						x: tableX,
						y: 24,
						width: colWidth,
						height: 18,
						expression: `=Fields.${column.key}`,
					}),
				)
				tableX += colWidth
			}
			continue
		}

		if (block.kind === 'sectionHeader') {
			headerElements.push({
				id: nextId('el'),
				kind: 'shape',
				x: 12,
				y: yCursor,
				width: 540,
				height: 20,
				shapeType: 'rectangle',
				background: block.color ?? '#1d4ed8',
			})
			headerElements.push(
				textElement({
					x: 20,
					y: yCursor + 4,
					width: 520,
					text: block.text,
					bold: true,
					fontSize: 10,
				}),
			)
			yCursor += 24
			continue
		}

		if (block.kind === 'divider') {
			footerElements.push({
				id: nextId('el'),
				kind: 'line',
				x: 12,
				y: 6,
				width: 540,
				height: 1,
				lineDirection: 'horizontal',
				lineStyle: 'solid',
				lineColor: block.color ?? '#cbd5e1',
				lineWidth: block.thickness ?? 1,
			})
		}
	}

	const detailHeight = Math.max(42, detailElements.length * 20 + 12)
	return { headerElements, detailElements, footerElements, detailHeight }
}

export function migrateLayoutToReportDefinition(
	layout: ReportLayout,
): ReportDefinition {
	const base = createDefaultReportDefinition(layout.name)
	base.page.size = layout.pageSize
	base.page.orientation = layout.orientation

	const converted = collectLegacyBlocks(layout)
	const reportHeader: ReportBand = {
		id: 'report-header',
		type: 'reportHeader',
		height: Math.max(48, converted.headerElements.length * 26),
		canGrow: true,
		elements: converted.headerElements,
	}
	const detail: ReportBand = {
		id: 'detail',
		type: 'detail',
		height: converted.detailHeight,
		canGrow: true,
		elements: converted.detailElements,
	}
	const pageFooter: ReportBand = {
		id: 'page-footer',
		type: 'pageFooter',
		height: 26,
		canGrow: false,
		elements: [
			...converted.footerElements,
			textElement({
				x: 380,
				y: 8,
				width: 170,
				text: '',
				expression: '=Globals.PageNumber + " / " + Globals.TotalPages',
				align: 'right',
				fontSize: 9,
			}),
		],
	}

	base.bands = [reportHeader, detail, pageFooter]
	return base
}
