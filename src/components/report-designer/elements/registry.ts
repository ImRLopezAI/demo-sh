import type {
	ElementKind,
	ReportElement,
} from '@server/reporting/designer-contracts'

export interface DesignerElementDefinition {
	kind: ElementKind
	label: string
	description: string
	createDefaults: () => Partial<ReportElement>
	getDisplayLabel: (element: ReportElement) => string
}

const TEXTBOX_FONT: NonNullable<ReportElement['font']> = {
	family: 'Helvetica',
	size: 11,
	weight: 'normal',
	style: 'normal',
	color: '#111827',
	align: 'left',
	lineHeight: 1.2,
}

const ELEMENT_REGISTRY: Record<ElementKind, DesignerElementDefinition> = {
	textbox: {
		kind: 'textbox',
		label: 'Text Box',
		description: 'Static text or bound expression',
		createDefaults: () => ({
			staticText: 'Text',
			font: { ...TEXTBOX_FONT },
		}),
		getDisplayLabel: (element) =>
			element.expression || element.staticText || 'Text',
	},
	image: {
		kind: 'image',
		label: 'Image',
		description: 'Image from URL or bound data',
		createDefaults: () => ({
			imageFit: 'contain',
		}),
		getDisplayLabel: (element) =>
			element.imageSource ? 'Image source' : 'Image placeholder',
	},
	shape: {
		kind: 'shape',
		label: 'Shape',
		description: 'Decorative block with configurable style',
		createDefaults: () => ({
			shapeType: 'rectangle',
			background: 'rgba(51,65,85,0.08)',
		}),
		getDisplayLabel: (element) =>
			element.shapeType ? `Shape: ${element.shapeType}` : 'Shape',
	},
	line: {
		kind: 'line',
		label: 'Line',
		description: 'Divider or directional line',
		createDefaults: () => ({
			lineDirection: 'horizontal',
			lineStyle: 'solid',
			lineColor: '#334155',
			lineWidth: 1,
		}),
		getDisplayLabel: (element) =>
			element.lineDirection ? `Line: ${element.lineDirection}` : 'Line',
	},
	barcode: {
		kind: 'barcode',
		label: 'Barcode',
		description: 'Machine-readable value from data expression',
		createDefaults: () => ({
			expression: '=Fields.no',
		}),
		getDisplayLabel: (element) =>
			element.expression ? `Barcode ${element.expression}` : 'Barcode',
	},
}

export const DESIGNER_ELEMENT_DEFINITIONS = Object.values(ELEMENT_REGISTRY)

export function getElementDefinition(
	kind: ElementKind,
): DesignerElementDefinition {
	return ELEMENT_REGISTRY[kind]
}
