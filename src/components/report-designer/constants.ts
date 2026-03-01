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
	display: 'var(--font-heading), var(--font-sans), "Segoe UI", sans-serif',
	body: 'var(--font-sans), "Segoe UI", sans-serif',
	mono: 'ui-monospace, SFMono-Regular, Menlo, monospace',
}

export const DEFAULT_GRID_SIZE = 8

export const DEFAULT_THEME_VARS: Record<string, string> = {
	'--designer-bg': 'hsl(var(--muted) / 0.26)',
	'--designer-panel': 'hsl(var(--background))',
	'--designer-ink': 'hsl(var(--foreground))',
	'--designer-muted': 'hsl(var(--muted-foreground))',
	'--designer-accent': 'hsl(var(--primary))',
	'--designer-grid': 'hsl(var(--border) / 0.7)',
	'--designer-ribbon': 'hsl(var(--background))',
}

export const DESIGNER_KEYBOARD_STEP = 4
