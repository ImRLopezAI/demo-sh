import PDFDocument from 'pdfkit'
import type { ReportDataSet } from './contracts'
import {
	BAND_ORDER,
	type BandType,
	type ExpressionContext,
	type ReportBand,
	type ReportDefinition,
	resolvePageSize,
} from './designer-contracts'
import { measureBandElement, renderBandElement } from './element-pdf-renderer'
import { evaluateExpression } from './expression-evaluator'

interface RuntimeState {
	cursorY: number
	pageNumber: number
	pageCount: number
	lastGroups: Record<string, unknown>
}

function pageHeight(doc: PDFKit.PDFDocument): number {
	return doc.page?.height ?? 841.89
}

function bandsOfType(bands: ReportBand[], type: BandType): ReportBand[] {
	return bands.filter((band) => band.type === type)
}

function evaluateGroupValue(
	band: ReportBand,
	row: Record<string, unknown>,
	definition: ReportDefinition,
): unknown {
	if (!band.groupExpression) return undefined
	const result = evaluateExpression(band.groupExpression, {
		Fields: row,
		Summary: {},
		Globals: {
			PageNumber: 1,
			TotalPages: 1,
			ReportDate: new Date().toISOString(),
			ReportTitle: definition.name,
		},
	})
	return result.ok ? result.value : undefined
}

function maxPageFooterHeight(pageFooters: ReportBand[]): number {
	if (pageFooters.length === 0) return 0
	return Math.max(...pageFooters.map((band) => band.height))
}

function buildContext(params: {
	definition: ReportDefinition
	dataSet: ReportDataSet
	row?: Record<string, unknown>
	rows: Array<Record<string, unknown>>
	pageNumber: number
	totalPages: number
}): ExpressionContext {
	const { definition, dataSet, row, rows, pageNumber, totalPages } = params
	return {
		Fields: row ?? {},
		Summary: dataSet.summary ?? {},
		Globals: {
			PageNumber: pageNumber,
			TotalPages: totalPages,
			ReportDate: dataSet.generatedAt,
			ReportTitle: definition.name,
		},
		rows,
	}
}

function measureBandHeight(params: {
	doc: PDFKit.PDFDocument
	band: ReportBand
	context: ExpressionContext
}): number {
	const { doc, band, context } = params
	let height = band.height
	for (const element of band.elements) {
		const measuredBottom = measureBandElement(doc, element, context)
		height = Math.max(height, measuredBottom)
	}
	return height
}

function renderBandAt(params: {
	doc: PDFKit.PDFDocument
	band: ReportBand
	y: number
	marginLeft: number
	context: ExpressionContext
}): number {
	const { doc, band, y, marginLeft, context } = params
	let maxHeight = band.height
	for (const element of band.elements) {
		const renderedHeight = renderBandElement({
			doc,
			element,
			originX: marginLeft,
			originY: y,
			context,
		})
		maxHeight = Math.max(maxHeight, element.y + renderedHeight)
	}
	return maxHeight
}

function ensurePageSpace(params: {
	doc: PDFKit.PDFDocument
	state: RuntimeState
	requiredHeight: number
	headers: ReportBand[]
	margins: ReportDefinition['page']['margins']
	pageFooters: ReportBand[]
	contextFactory: (page: number, totalPages: number) => ExpressionContext
}): void {
	const {
		doc,
		state,
		requiredHeight,
		headers,
		margins,
		pageFooters,
		contextFactory,
	} = params
	const footerReserve = maxPageFooterHeight(pageFooters)
	const availableBottom = pageHeight(doc) - margins.bottom - footerReserve
	if (state.cursorY + requiredHeight <= availableBottom) return

	doc.addPage()
	state.pageNumber += 1
	state.pageCount += 1
	state.cursorY = margins.top

	for (const header of headers) {
		const context = contextFactory(state.pageNumber, 0)
		const rendered = renderBandAt({
			doc,
			band: header,
			y: state.cursorY,
			marginLeft: margins.left,
			context,
		})
		state.cursorY += rendered
	}
}

function orderedBands(definition: ReportDefinition): ReportBand[] {
	const grouped = new Map<BandType, ReportBand[]>()
	for (const type of BAND_ORDER) grouped.set(type, [])
	for (const band of definition.bands) {
		const bucket = grouped.get(band.type)
		if (bucket) bucket.push(band)
	}
	const result: ReportBand[] = []
	for (const type of BAND_ORDER) {
		const bucket = grouped.get(type)
		if (bucket) result.push(...bucket)
	}
	return result
}

export function renderBandReportDocument(
	definition: ReportDefinition,
	dataSet: ReportDataSet,
): PDFKit.PDFDocument {
	const resolved = resolvePageSize(definition.page.size)
	const doc = new PDFDocument({
		size: [resolved.width, resolved.height],
		layout: definition.page.orientation,
		margin: 0,
		bufferPages: true,
		info: {
			Title: definition.name,
			Author: 'Uplink',
		},
	})

	renderBandReport(doc, definition, dataSet)
	doc.end()
	return doc
}

export function renderBandReport(
	doc: PDFKit.PDFDocument,
	definition: ReportDefinition,
	dataSet: ReportDataSet,
): void {
	const bands = orderedBands(definition)
	const reportHeaders = bandsOfType(bands, 'reportHeader')
	const pageHeaders = bandsOfType(bands, 'pageHeader')
	const detailBands = bandsOfType(bands, 'detail')
	const groupHeaders = bandsOfType(bands, 'groupHeader')
	const groupFooters = bandsOfType(bands, 'groupFooter')
	const reportFooters = bandsOfType(bands, 'reportFooter')
	const pageFooters = bandsOfType(bands, 'pageFooter')
	const rows = dataSet.rows.length > 0 ? dataSet.rows : [{}]

	const state: RuntimeState = {
		cursorY: definition.page.margins.top,
		pageNumber: 1,
		pageCount: 1,
		lastGroups: {},
	}

	const contextFactory = (
		pageNumber: number,
		totalPages: number,
		row?: Record<string, unknown>,
	) =>
		buildContext({
			definition,
			dataSet,
			row,
			rows,
			pageNumber,
			totalPages,
		})

	for (const band of reportHeaders) {
		const context = contextFactory(state.pageNumber, 0)
		const measured = measureBandHeight({ doc, band, context })
		ensurePageSpace({
			doc,
			state,
			requiredHeight: measured,
			headers: pageHeaders,
			margins: definition.page.margins,
			pageFooters,
			contextFactory,
		})
		const rendered = renderBandAt({
			doc,
			band,
			y: state.cursorY,
			marginLeft: definition.page.margins.left,
			context,
		})
		state.cursorY += rendered
	}

	for (const header of pageHeaders) {
		const context = contextFactory(state.pageNumber, 0)
		const rendered = renderBandAt({
			doc,
			band: header,
			y: state.cursorY,
			marginLeft: definition.page.margins.left,
			context,
		})
		state.cursorY += rendered
	}

	for (const row of rows) {
		for (const groupHeader of groupHeaders) {
			const currentGroup = evaluateGroupValue(groupHeader, row, definition)
			const previousGroup = state.lastGroups[groupHeader.id]
			const isBreak = currentGroup !== previousGroup

			if (isBreak && previousGroup !== undefined) {
				for (const groupFooter of groupFooters) {
					const footerContext = contextFactory(state.pageNumber, 0, row)
					const footerHeight = measureBandHeight({
						doc,
						band: groupFooter,
						context: footerContext,
					})
					ensurePageSpace({
						doc,
						state,
						requiredHeight: footerHeight,
						headers: pageHeaders,
						margins: definition.page.margins,
						pageFooters,
						contextFactory,
					})
					state.cursorY += renderBandAt({
						doc,
						band: groupFooter,
						y: state.cursorY,
						marginLeft: definition.page.margins.left,
						context: footerContext,
					})
				}
			}

			if (isBreak) {
				const groupContext = contextFactory(state.pageNumber, 0, row)
				const groupHeight = measureBandHeight({
					doc,
					band: groupHeader,
					context: groupContext,
				})
				ensurePageSpace({
					doc,
					state,
					requiredHeight: groupHeight,
					headers: pageHeaders,
					margins: definition.page.margins,
					pageFooters,
					contextFactory,
				})
				state.cursorY += renderBandAt({
					doc,
					band: groupHeader,
					y: state.cursorY,
					marginLeft: definition.page.margins.left,
					context: groupContext,
				})
				state.lastGroups[groupHeader.id] = currentGroup
			}
		}

		for (const detail of detailBands) {
			const detailContext = contextFactory(state.pageNumber, 0, row)
			const detailHeight = measureBandHeight({
				doc,
				band: detail,
				context: detailContext,
			})
			ensurePageSpace({
				doc,
				state,
				requiredHeight: detailHeight,
				headers: pageHeaders,
				margins: definition.page.margins,
				pageFooters,
				contextFactory,
			})
			state.cursorY += renderBandAt({
				doc,
				band: detail,
				y: state.cursorY,
				marginLeft: definition.page.margins.left,
				context: detailContext,
			})
		}
	}

	if (rows.length > 0) {
		const lastRow = rows[rows.length - 1] ?? {}
		for (const groupFooter of groupFooters) {
			const footerContext = contextFactory(state.pageNumber, 0, lastRow)
			const footerHeight = measureBandHeight({
				doc,
				band: groupFooter,
				context: footerContext,
			})
			ensurePageSpace({
				doc,
				state,
				requiredHeight: footerHeight,
				headers: pageHeaders,
				margins: definition.page.margins,
				pageFooters,
				contextFactory,
			})
			state.cursorY += renderBandAt({
				doc,
				band: groupFooter,
				y: state.cursorY,
				marginLeft: definition.page.margins.left,
				context: footerContext,
			})
		}
	}

	for (const reportFooter of reportFooters) {
		const context = contextFactory(state.pageNumber, 0)
		const footerHeight = measureBandHeight({ doc, band: reportFooter, context })
		ensurePageSpace({
			doc,
			state,
			requiredHeight: footerHeight,
			headers: pageHeaders,
			margins: definition.page.margins,
			pageFooters,
			contextFactory,
		})
		state.cursorY += renderBandAt({
			doc,
			band: reportFooter,
			y: state.cursorY,
			marginLeft: definition.page.margins.left,
			context,
		})
	}

	const range = doc.bufferedPageRange()
	const totalPages = range.count
	for (
		let pageIndex = range.start;
		pageIndex < range.start + range.count;
		pageIndex += 1
	) {
		doc.switchToPage(pageIndex)
		const footerY =
			pageHeight(doc) -
			definition.page.margins.bottom -
			maxPageFooterHeight(pageFooters)
		for (const footer of pageFooters) {
			const context = contextFactory(pageIndex + 1, totalPages)
			renderBandAt({
				doc,
				band: footer,
				y: footerY,
				marginLeft: definition.page.margins.left,
				context,
			})
		}
	}

	// Ensure final cursor remains inside page bounds for subsequent drawing.
	doc.switchToPage(range.start + range.count - 1)
	state.cursorY = Math.min(
		state.cursorY,
		pageHeight(doc) - definition.page.margins.bottom,
	)
}
