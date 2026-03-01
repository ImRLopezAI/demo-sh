import type { ExpressionContext, ReportElement } from './designer-contracts'
import { evaluateExpression, expressionToString } from './expression-evaluator'

interface ElementRenderParams {
	doc: PDFKit.PDFDocument
	element: ReportElement
	originX: number
	originY: number
	context: ExpressionContext
}

function normalizeColor(color: string | undefined, fallback: string): string {
	if (!color) return fallback
	if (/^#[0-9a-fA-F]{6,8}$/.test(color)) return color
	return fallback
}

function resolveText(
	element: ReportElement,
	context: ExpressionContext,
): string {
	if (element.expression) {
		const resolved = evaluateExpression(element.expression, context)
		if (resolved.ok) return expressionToString(resolved)
		return ''
	}
	if (element.staticText) return element.staticText
	return ''
}

function applyStroke(
	doc: PDFKit.PDFDocument,
	element: ReportElement,
	x: number,
	y: number,
	width: number,
	height: number,
) {
	const border = element.border
	if (!border) return

	const drawSide = (
		side: 'top' | 'right' | 'bottom' | 'left',
		sx1: number,
		sy1: number,
		sx2: number,
		sy2: number,
	) => {
		const conf = border[side]
		if (!conf || conf.width <= 0) return
		doc
			.save()
			.lineWidth(conf.width)
			.strokeColor(normalizeColor(conf.color, '#111827'))
		if (conf.style === 'dashed') {
			doc.dash(4, { space: 2 })
		} else if (conf.style === 'dotted') {
			doc.dash(1, { space: 2 })
		}
		doc.moveTo(sx1, sy1).lineTo(sx2, sy2).stroke()
		doc.restore()
	}

	drawSide('top', x, y, x + width, y)
	drawSide('right', x + width, y, x + width, y + height)
	drawSide('bottom', x, y + height, x + width, y + height)
	drawSide('left', x, y, x, y + height)
}

function applyBackground(
	doc: PDFKit.PDFDocument,
	element: ReportElement,
	x: number,
	y: number,
	width: number,
	height: number,
) {
	if (!element.background) return
	doc
		.save()
		.fillColor(normalizeColor(element.background, '#ffffff'))
		.rect(x, y, width, height)
		.fill()
		.restore()
}

function resolveTextHeight(
	doc: PDFKit.PDFDocument,
	element: ReportElement,
	text: string,
): number {
	if (element.kind !== 'textbox') return element.height
	const lineHeight = element.font?.lineHeight ?? 1.2
	doc.save()
	doc
		.font(
			element.font?.weight === 'bold'
				? 'Helvetica-Bold'
				: (element.font?.family ?? 'Helvetica'),
		)
		.fontSize(element.font?.size ?? 10)
	const measured = doc.heightOfString(text || ' ', {
		width: Math.max(1, element.width - 8),
		align: element.font?.align ?? 'left',
		lineGap: (element.font?.size ?? 10) * (lineHeight - 1),
	})
	doc.restore()
	return Math.max(element.height, measured + 8)
}

export function measureBandElement(
	doc: PDFKit.PDFDocument,
	element: ReportElement,
	context: ExpressionContext,
): number {
	if (element.kind === 'textbox' && element.canGrow) {
		const text = resolveText(element, context)
		return element.y + resolveTextHeight(doc, element, text)
	}
	return element.y + element.height
}

export function renderBandElement(params: ElementRenderParams): number {
	const { doc, element, originX, originY, context } = params
	if (element.visibility) {
		const visibility = evaluateExpression(element.visibility, context)
		if (visibility.ok && !visibility.value) {
			return 0
		}
	}

	const x = originX + element.x
	const y = originY + element.y
	const width = Math.max(1, element.width)
	let height = Math.max(1, element.height)

	if (element.kind === 'textbox') {
		const text = resolveText(element, context)
		if (element.canGrow) {
			height = resolveTextHeight(doc, element, text)
		}
		if (element.canShrink && !text.trim()) {
			height = 0
		}
		if (height <= 0) return 0
		applyBackground(doc, element, x, y, width, height)
		doc
			.save()
			.fillColor(normalizeColor(element.font?.color, '#111827'))
			.font(
				element.font?.weight === 'bold'
					? 'Helvetica-Bold'
					: (element.font?.family ?? 'Helvetica'),
			)
			.fontSize(element.font?.size ?? 10)
			.text(text, x + 4, y + 4, {
				width: Math.max(1, width - 8),
				height: Math.max(1, height - 8),
				align: element.font?.align ?? 'left',
				lineGap:
					(element.font?.size ?? 10) * ((element.font?.lineHeight ?? 1.2) - 1),
			})
			.restore()
		applyStroke(doc, element, x, y, width, height)
		return height
	}

	if (element.kind === 'image') {
		applyBackground(doc, element, x, y, width, height)
		const src = element.imageSource ?? ''
		if (src.startsWith('data:image/')) {
			const [, encoded] = src.split(',', 2)
			if (encoded) {
				try {
					const buffer = Buffer.from(encoded, 'base64')
					doc.image(buffer, x, y, { fit: [width, height] })
				} catch {
					doc
						.save()
						.rect(x, y, width, height)
						.strokeColor('#ef4444')
						.stroke()
						.restore()
				}
			}
		} else {
			doc
				.save()
				.rect(x, y, width, height)
				.strokeColor('#94a3b8')
				.dash(3, { space: 2 })
				.stroke()
				.undash()
				.font('Helvetica')
				.fontSize(9)
				.fillColor('#64748b')
				.text('Image', x + 6, y + 6, { width: width - 12, align: 'center' })
				.restore()
		}
		applyStroke(doc, element, x, y, width, height)
		return height
	}

	if (element.kind === 'shape') {
		const shape = element.shapeType ?? 'rectangle'
		doc.save()
		if (element.background) {
			doc.fillColor(normalizeColor(element.background, '#f8fafc'))
		}
		if (shape === 'ellipse') {
			doc.ellipse(x + width / 2, y + height / 2, width / 2, height / 2)
			if (element.background) doc.fill()
		}
		if (shape === 'roundedRect') {
			doc.roundedRect(x, y, width, height, element.cornerRadius ?? 6)
			if (element.background) doc.fill()
		}
		if (shape === 'rectangle') {
			doc.rect(x, y, width, height)
			if (element.background) doc.fill()
		}
		doc.restore()
		applyStroke(doc, element, x, y, width, height)
		return height
	}

	if (element.kind === 'line') {
		doc
			.save()
			.lineWidth(element.lineWidth ?? 1)
			.strokeColor(normalizeColor(element.lineColor, '#334155'))
		if (element.lineStyle === 'dashed') {
			doc.dash(4, { space: 2 })
		} else if (element.lineStyle === 'dotted') {
			doc.dash(1, { space: 2 })
		}
		const direction = element.lineDirection ?? 'horizontal'
		if (direction === 'horizontal') {
			doc
				.moveTo(x, y + height / 2)
				.lineTo(x + width, y + height / 2)
				.stroke()
		} else if (direction === 'vertical') {
			doc
				.moveTo(x + width / 2, y)
				.lineTo(x + width / 2, y + height)
				.stroke()
		} else {
			doc
				.moveTo(x, y)
				.lineTo(x + width, y + height)
				.stroke()
		}
		doc.restore()
		return height
	}

	// Barcode placeholder
	applyBackground(doc, element, x, y, width, height)
	doc
		.save()
		.rect(x, y, width, height)
		.strokeColor('#1f2937')
		.stroke()
		.font('Courier')
		.fontSize(8)
		.text(resolveText(element, context) || '[BARCODE]', x + 4, y + 4, {
			width: width - 8,
			align: 'center',
		})
		.restore()
	return height
}
