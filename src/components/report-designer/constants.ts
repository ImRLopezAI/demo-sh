import type {
	ReportBand,
	ReportElement,
} from '@server/reporting/designer-contracts'
import type { DesignerTab } from './types'

export const DESIGNER_TABS: DesignerTab[] = [
	'Home',
	'Insert',
	'Page',
	'Layout',
	'Preview',
]

export const BAND_LABELS: Record<ReportBand['type'], string> = {
	reportHeader: 'Report Header',
	pageHeader: 'Page Header',
	groupHeader: 'Group Header',
	detail: 'Detail',
	groupFooter: 'Group Footer',
	pageFooter: 'Page Footer',
	reportFooter: 'Report Footer',
}

export const ELEMENT_DEFAULT_SIZE: Record<
	ReportElement['kind'],
	{ width: number; height: number }
> = {
	textbox: { width: 180, height: 28 },
	image: { width: 120, height: 70 },
	shape: { width: 120, height: 40 },
	line: { width: 120, height: 2 },
	barcode: { width: 140, height: 38 },
}

export const DESIGNER_FONT_STACK = {
	display: '"Outfit Variable", "DM Sans Variable", ui-sans-serif, sans-serif',
	body: '"DM Sans Variable", "Inter Variable", ui-sans-serif, sans-serif',
	mono: 'ui-monospace, SFMono-Regular, Menlo, monospace',
}

export const DEFAULT_GRID_SIZE = 8

export const DEFAULT_THEME_VARS: Record<string, string> = {
	'--designer-bg':
		'linear-gradient(135deg, #f5f7fa 0%, #eef2ff 45%, #ecfeff 100%)',
	'--designer-panel': 'rgba(255,255,255,0.84)',
	'--designer-ink': '#0f172a',
	'--designer-muted': '#64748b',
	'--designer-accent': '#f59e0b',
	'--designer-grid': 'rgba(15, 23, 42, 0.08)',
}

export const DESIGNER_KEYBOARD_STEP = 4
