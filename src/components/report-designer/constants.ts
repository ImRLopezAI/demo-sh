import type {
	ReportBand,
	ReportElement,
} from '@server/reporting/designer-contracts'
import type { DesignerTab } from './types'

export const DESIGNER_TABS: DesignerTab[] = [
	'Home',
	'Insert',
	'Report',
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
	display: 'var(--font-heading), var(--font-sans), "Segoe UI", sans-serif',
	body: 'var(--font-sans), "Segoe UI", sans-serif',
	mono: 'ui-monospace, SFMono-Regular, Menlo, monospace',
}

export const DEFAULT_GRID_SIZE = 8

export const DEFAULT_THEME_VARS: Record<string, string> = {
	'--designer-bg': '#e9e9ea',
	'--designer-panel': '#ffffff',
	'--designer-ink': '#2f2f2f',
	'--designer-muted': '#767676',
	'--designer-accent': '#1f4f91',
	'--designer-grid': 'rgba(182, 188, 199, 0.7)',
	'--designer-ribbon': '#f6f6f7',
	'--designer-ribbon-border': '#d4d6da',
	'--designer-panel-border': '#cfd2d9',
	'--designer-warning-bg': '#f1ebd7',
	'--designer-status-bg': '#1f4f91',
	'--designer-status-ink': '#ffffff',
	'--designer-file-tab': '#3564a4',
	'--designer-file-tab-ink': '#ffffff',
	'--designer-selection': '#2f67b2',
}

export const DARK_THEME_VARS: Record<string, string> = {
	...DEFAULT_THEME_VARS,
}

export const DESIGNER_KEYBOARD_STEP = 4
