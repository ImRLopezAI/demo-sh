import PDFDocument from 'pdfkit'
import type { ReportDataSet, ReportLayout } from './contracts'

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

function resolvePath(root: Record<string, unknown>, path: string): unknown {
	const keys = path.split('.').filter(Boolean)
	let cursor: unknown = root
	for (const key of keys) {
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

	for (const block of layout.blocks) {
		if (block.kind === 'heading') {
			const fontSize =
				headingScale[block.level - 1] ?? headingScale[headingScale.length - 1]
			doc
				.font('Helvetica-Bold')
				.fontSize(fontSize)
				.text(block.text, { align: isThermal ? 'center' : 'left' })
				.moveDown(isThermal ? 0.2 : 0.4)
		} else if (block.kind === 'paragraph') {
			doc
				.font('Helvetica')
				.fontSize(baseFontSize)
				.text(block.text, { lineGap: 2 })
				.moveDown(0.3)
		} else if (block.kind === 'spacer') {
			const gap = block.size === 'sm' ? 4 : block.size === 'md' ? 8 : 14
			doc.moveDown(gap / 10)
		} else if (block.kind === 'keyValue') {
			const value = formatValue(resolvePath(root, block.valuePath))
			const x = doc.x
			const y = doc.y

			if (isThermal) {
				// Thermal: tight side-by-side with 35/65 split and small font
				const keyWidth = pageWidth * 0.35
				const valWidth = pageWidth * 0.65

				doc
					.font('Helvetica-Bold')
					.fontSize(baseFontSize)
					.text(truncate(block.key, 14), x, y, {
						continued: false,
						width: keyWidth,
					})

				doc
					.font('Helvetica')
					.fontSize(baseFontSize)
					.text(truncate(value, 22), x + keyWidth, y, {
						width: valWidth,
						align: 'right',
					})

				doc.moveDown(0.15)
			} else {
				// A4/Letter: 35/65 split with proper spacing
				const keyWidth = pageWidth * 0.35
				const valWidth = pageWidth * 0.65

				doc
					.font('Helvetica-Bold')
					.fontSize(baseFontSize)
					.text(block.key, x, y, {
						continued: false,
						width: keyWidth,
					})

				doc.font('Helvetica').fontSize(baseFontSize).text(value, x + keyWidth, y, {
					width: valWidth,
					align: 'left',
				})

				doc.moveDown(0.2)
			}
		} else if (block.kind === 'table') {
			// Resolve columns: use suggestedColumns when template has generic defaults
			let columns = block.columns
			if (
				isGenericDefaultColumns(columns) &&
				dataSet.suggestedColumns?.length
			) {
				columns = dataSet.suggestedColumns
			}

			const rows = dataSet.rows.slice(
				0,
				block.maxRows ?? dataSet.rows.length,
			)

			// Calculate proportional column widths based on content
			const colWidths = computeColumnWidths(
				columns,
				rows,
				pageWidth,
				cellPadding,
			)

			// Header row
			const headerY = doc.y
			doc.save()
			doc
				.rect(doc.page.margins.left, headerY, pageWidth, rowHeight)
				.fill(isThermal ? '#eeeeee' : '#f8f8f8')
			doc.restore()

			doc.font('Helvetica-Bold').fontSize(tableFontSize)
			let colX = doc.page.margins.left
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
				.moveTo(doc.page.margins.left, doc.y)
				.lineTo(doc.page.margins.left + pageWidth, doc.y)
				.strokeColor('#d6d6d6')
				.lineWidth(isThermal ? 0.5 : 1)
				.stroke()

			// Data rows
			doc.font('Helvetica').fontSize(tableFontSize)
			const maxCharsPerCol = colWidths.map((w) =>
				Math.max(3, Math.floor((w - cellPadding * 2) / (tableFontSize * 0.5))),
			)

			for (const row of rows) {
				const rowY = doc.y
				colX = doc.page.margins.left
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
					.moveTo(doc.page.margins.left, doc.y)
					.lineTo(doc.page.margins.left + pageWidth, doc.y)
					.strokeColor('#ededed')
					.lineWidth(0.5)
					.stroke()
			}

			doc.moveDown(0.5)
		}
	}

	doc.end()
	return doc
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
