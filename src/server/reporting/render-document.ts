import PDFDocument from 'pdfkit'
import type { ReportBlock, ReportDataSet, ReportLayout } from './contracts'

const DEFAULT_GENERIC_KEYS = new Set(['_id', 'status', '_updatedAt'])

function resolvePageSize(layout: ReportLayout): PDFKit.PDFDocumentOptions {
	if (layout.pageSize === 'THERMAL') {
		return { size: [226.77, 1200], layout: 'portrait' }
	}
	return {
		size: layout.pageSize === 'LETTER' ? 'LETTER' : 'A4',
		layout: layout.orientation === 'landscape' ? 'landscape' : 'portrait',
	}
}

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

function resolvePath(root: Record<string, unknown>, path: string): unknown {
	const keys = path.split('.').filter(Boolean)
	let cursor: unknown = root
	for (const key of keys) {
		if (FORBIDDEN_KEYS.has(key)) return undefined
		if (typeof cursor !== 'object' || cursor === null) return undefined
		cursor = (cursor as Record<string, unknown>)[key]
	}
	return cursor
}

function formatValue(value: unknown): string {
	if (value === null || value === undefined) return ''
	if (typeof value === 'number') return value.toFixed(2)
	if (value instanceof Date) return value.toISOString()
	return String(value)
}

function truncate(text: string, maxChars: number): string {
	if (text.length <= maxChars) return text
	return `${text.slice(0, maxChars - 1)}…`
}

function isGenericDefaultColumns(
	columns: Array<{ key: string; label: string }>,
): boolean {
	if (columns.length !== 3) return false
	return columns.every((col) => DEFAULT_GENERIC_KEYS.has(col.key))
}

interface BlockRenderContext {
	root: Record<string, unknown>
	dataSet: ReportDataSet
	pageWidth: number
	isThermal: boolean
	baseFontSize: number
	headingScale: number[]
	tableFontSize: number
	cellPadding: number
	rowHeight: number
	margin: number
	regionX: number
	regionWidth: number
	depth: number
}

export function renderDocumentStream(
	layout: ReportLayout,
	dataSet: ReportDataSet,
): PDFKit.PDFDocument {
	const pageOpts = resolvePageSize(layout)
	const margin = layout.pageSize === 'THERMAL' ? 12 : 24
	const doc = new PDFDocument({
		...pageOpts,
		margin,
		bufferPages: true,
		info: {
			Title: dataSet.title,
			Author: 'Uplink',
		},
	})

	const root: Record<string, unknown> = {
		moduleId: dataSet.moduleId,
		entityId: dataSet.entityId,
		title: dataSet.title,
		generatedAt: dataSet.generatedAt,
		summary: dataSet.summary ?? {},
	}

	const pageWidth = (doc.page?.width ?? 595.28) - margin * 2
	const isThermal = layout.pageSize === 'THERMAL'

	// Font sizes adapt to page format
	const baseFontSize = isThermal ? 7 : 10
	const headingScale = isThermal ? [11, 9, 8] : [18, 14, 12]
	const tableFontSize = isThermal ? 6.5 : 9
	const cellPadding = isThermal ? 2 : 4
	const rowHeight = isThermal ? 12 : 16

	const ctx: BlockRenderContext = {
		root,
		dataSet,
		pageWidth,
		isThermal,
		baseFontSize,
		headingScale,
		tableFontSize,
		cellPadding,
		rowHeight,
		margin,
		regionX: margin,
		regionWidth: pageWidth,
		depth: 0,
	}

	for (const block of layout.blocks) {
		renderBlock(doc, block, ctx)
	}

	doc.end()
	return doc
}

function interpolateTemplate(
	text: string,
	root: Record<string, unknown>,
): string {
	return text.replace(/\{\{([^}]+)\}\}/g, (_, path: string) => {
		return formatValue(resolvePath(root, path.trim()))
	})
}

function renderBlock(
	doc: PDFKit.PDFDocument,
	block: ReportBlock,
	ctx: BlockRenderContext,
) {
	const { root, isThermal, baseFontSize, headingScale, regionX, regionWidth } =
		ctx

	if (block.kind === 'heading') {
		const fontSize =
			headingScale[block.level - 1] ?? headingScale[headingScale.length - 1]
		doc
			.font('Helvetica-Bold')
			.fontSize(fontSize)
			.text(block.text, regionX, doc.y, {
				width: regionWidth,
				align: isThermal ? 'center' : 'left',
			})
			.moveDown(isThermal ? 0.2 : 0.4)
	} else if (block.kind === 'paragraph') {
		const resolvedText = interpolateTemplate(block.text, root)
		const font = block.bold ? 'Helvetica-Bold' : 'Helvetica'
		const align = block.align ?? 'left'
		doc
			.font(font)
			.fontSize(baseFontSize)
			.text(resolvedText, regionX, doc.y, {
				width: regionWidth,
				lineGap: 2,
				align,
			})
			.moveDown(0.3)
	} else if (block.kind === 'spacer') {
		const gap = block.size === 'sm' ? 4 : block.size === 'md' ? 8 : 14
		doc.moveDown(gap / 10)
	} else if (block.kind === 'keyValue') {
		renderKeyValue(doc, block.key, block.valuePath, root, ctx)
	} else if (block.kind === 'keyValueGroup') {
		for (const pair of block.pairs) {
			renderKeyValue(
				doc,
				pair.key,
				pair.valuePath,
				root,
				ctx,
				block.align ?? 'left',
			)
		}
	} else if (block.kind === 'sectionHeader') {
		const bgColor = block.color ?? '#2c5282'
		const bannerHeight = isThermal ? 14 : 20
		const y = doc.y
		doc.save()
		doc.rect(regionX, y, regionWidth, bannerHeight).fill(bgColor)
		doc.restore()
		doc
			.font('Helvetica-Bold')
			.fontSize(isThermal ? 7 : 10)
			.fillColor('#ffffff')
			.text(block.text.toUpperCase(), regionX + 6, y + (isThermal ? 3 : 5), {
				width: regionWidth - 12,
			})
		doc.fillColor('#000000')
		doc.y = y + bannerHeight + 4
	} else if (block.kind === 'divider') {
		const color = block.color ?? '#d6d6d6'
		const thickness = block.thickness ?? 1
		doc
			.moveTo(regionX, doc.y)
			.lineTo(regionX + regionWidth, doc.y)
			.strokeColor(color)
			.lineWidth(thickness)
			.stroke()
		doc.y += thickness + 4
	} else if (block.kind === 'row') {
		if (ctx.depth >= 2) return // Prevent excessive nesting
		const startY = doc.y
		let maxBottomY = startY
		let colX = regionX
		for (const col of block.columns) {
			const colWidth = (col.width / 100) * regionWidth
			doc.y = startY
			const childCtx: typeof ctx = {
				...ctx,
				regionX: colX,
				regionWidth: colWidth,
				depth: ctx.depth + 1,
			}
			for (const childBlock of col.blocks) {
				renderBlock(doc, childBlock, childCtx)
			}
			if (doc.y > maxBottomY) maxBottomY = doc.y
			colX += colWidth
		}
		doc.y = maxBottomY
	} else if (block.kind === 'table') {
		renderTable(doc, block, ctx)
	}
}

function renderKeyValue(
	doc: PDFKit.PDFDocument,
	keyLabel: string,
	valuePath: string,
	root: Record<string, unknown>,
	ctx: BlockRenderContext,
	valAlign: 'left' | 'right' = 'left',
) {
	const { isThermal, baseFontSize, regionX, regionWidth } = ctx
	const value = formatValue(resolvePath(root, valuePath))
	const x = regionX
	const y = doc.y
	const keyWidth = regionWidth * 0.35
	const valWidth = regionWidth * 0.65

	if (isThermal) {
		const keyText = truncate(keyLabel, 14)
		const valText = truncate(value, 22)

		doc.font('Helvetica-Bold').fontSize(baseFontSize)
		const keyH = doc.heightOfString(keyText, { width: keyWidth })
		doc.font('Helvetica').fontSize(baseFontSize)
		const valH = doc.heightOfString(valText, { width: valWidth })

		doc
			.font('Helvetica-Bold')
			.fontSize(baseFontSize)
			.text(keyText, x, y, { width: keyWidth })

		doc
			.font('Helvetica')
			.fontSize(baseFontSize)
			.text(valText, x + keyWidth, y, {
				width: valWidth,
				align: 'right',
			})

		doc.y = y + Math.max(keyH, valH) + 2
	} else {
		doc.font('Helvetica-Bold').fontSize(baseFontSize)
		const keyH = doc.heightOfString(keyLabel, { width: keyWidth })
		doc.font('Helvetica').fontSize(baseFontSize)
		const valH = doc.heightOfString(value, { width: valWidth })

		doc
			.font('Helvetica-Bold')
			.fontSize(baseFontSize)
			.text(keyLabel, x, y, { width: keyWidth })

		doc
			.font('Helvetica')
			.fontSize(baseFontSize)
			.text(value, x + keyWidth, y, {
				width: valWidth,
				align: valAlign,
			})

		doc.y = y + Math.max(keyH, valH) + 4
	}
}

function renderTable(
	doc: PDFKit.PDFDocument,
	block: Extract<ReportBlock, { kind: 'table' }>,
	ctx: BlockRenderContext,
) {
	const {
		dataSet,
		isThermal,
		tableFontSize,
		cellPadding,
		rowHeight,
		regionX,
		regionWidth,
	} = ctx

	// Resolve columns: use suggestedColumns when template has generic defaults
	let columns = block.columns
	if (isGenericDefaultColumns(columns) && dataSet.suggestedColumns?.length) {
		columns = dataSet.suggestedColumns
	}

	const rows = dataSet.rows.slice(0, block.maxRows ?? dataSet.rows.length)

	// Calculate proportional column widths based on content
	const colWidths = computeColumnWidths(columns, rows, regionWidth, cellPadding)

	// Header row
	const headerY = doc.y
	doc.save()
	doc
		.rect(regionX, headerY, regionWidth, rowHeight)
		.fill(isThermal ? '#eeeeee' : '#f8f8f8')
	doc.restore()

	doc.font('Helvetica-Bold').fontSize(tableFontSize)
	let colX = regionX
	for (let c = 0; c < columns.length; c++) {
		doc.text(
			truncate(columns[c].label, isThermal ? 10 : 30),
			colX + cellPadding,
			headerY + (isThermal ? 2 : 3),
			{ width: colWidths[c] - cellPadding * 2, height: rowHeight - 2 },
		)
		colX += colWidths[c]
	}

	doc.y = headerY + rowHeight

	// Header bottom border
	doc
		.moveTo(regionX, doc.y)
		.lineTo(regionX + regionWidth, doc.y)
		.strokeColor('#d6d6d6')
		.lineWidth(isThermal ? 0.5 : 1)
		.stroke()

	// Data rows
	doc.font('Helvetica').fontSize(tableFontSize)
	const maxCharsPerCol = colWidths.map((w) =>
		Math.max(3, Math.floor((w - cellPadding * 2) / (tableFontSize * 0.5))),
	)

	for (const row of rows) {
		// Check if we need a page break (repeat header on new page)
		const bottomMargin = isThermal ? 20 : 40
		if (doc.y + rowHeight > (doc.page?.height ?? 842) - bottomMargin) {
			doc.addPage()
			// Repeat table header on new page
			const repeatHeaderY = doc.y
			doc.save()
			doc
				.rect(regionX, repeatHeaderY, regionWidth, rowHeight)
				.fill(isThermal ? '#eeeeee' : '#f8f8f8')
			doc.restore()
			doc.font('Helvetica-Bold').fontSize(tableFontSize)
			let repeatColX = regionX
			for (let c = 0; c < columns.length; c++) {
				doc.text(
					truncate(columns[c].label, isThermal ? 10 : 30),
					repeatColX + cellPadding,
					repeatHeaderY + (isThermal ? 2 : 3),
					{ width: colWidths[c] - cellPadding * 2, height: rowHeight - 2 },
				)
				repeatColX += colWidths[c]
			}
			doc.y = repeatHeaderY + rowHeight
			doc
				.moveTo(regionX, doc.y)
				.lineTo(regionX + regionWidth, doc.y)
				.strokeColor('#d6d6d6')
				.lineWidth(isThermal ? 0.5 : 1)
				.stroke()
			doc.font('Helvetica').fontSize(tableFontSize)
		}

		const rowY = doc.y
		colX = regionX
		for (let c = 0; c < columns.length; c++) {
			const val = formatValue(row[columns[c].key])
			doc.text(
				truncate(val, maxCharsPerCol[c]),
				colX + cellPadding,
				rowY + (isThermal ? 2 : 3),
				{ width: colWidths[c] - cellPadding * 2, height: rowHeight - 2 },
			)
			colX += colWidths[c]
		}
		doc.y = rowY + rowHeight

		// Row separator
		doc
			.moveTo(regionX, doc.y)
			.lineTo(regionX + regionWidth, doc.y)
			.strokeColor('#ededed')
			.lineWidth(0.5)
			.stroke()
	}

	doc.moveDown(0.5)
}

function computeColumnWidths(
	columns: Array<{ key: string; label: string }>,
	rows: Array<Record<string, unknown>>,
	pageWidth: number,
	cellPadding: number,
): number[] {
	if (columns.length === 0) return []

	// Estimate average content width per column using sample rows
	const sample = rows.slice(0, 20)
	const weights = columns.map((col) => {
		const headerLen = col.label.length
		const avgContentLen =
			sample.length > 0
				? sample.reduce(
						(sum, row) => sum + formatValue(row[col.key]).length,
						0,
					) / sample.length
				: 5
		const effectiveLen = Math.max(headerLen, avgContentLen)
		// Numeric/short columns (qty, total, status) get less space
		const isShort = effectiveLen < 8
		return isShort ? effectiveLen + 2 : effectiveLen
	})

	const totalWeight = weights.reduce((a, b) => a + b, 0)
	const minColWidth = cellPadding * 2 + 20

	return weights.map((w) =>
		Math.max(minColWidth, (w / totalWeight) * pageWidth),
	)
}
