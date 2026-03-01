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
	'--designer-bg': 'hsl(210 20% 95%)',
	'--designer-panel': 'hsl(var(--background))',
	'--designer-ink': 'hsl(var(--foreground))',
	'--designer-muted': 'hsl(var(--muted-foreground))',
	'--designer-accent': 'hsl(var(--primary))',
	'--designer-grid': 'hsl(216 15% 80% / 0.85)',
	'--designer-ribbon': 'hsl(210 20% 97%)',
}

export const DARK_THEME_VARS: Record<string, string> = {
	'--designer-bg': 'hsl(222 10% 14%)',
	'--designer-panel': 'hsl(220 8% 18%)',
	'--designer-ink': 'hsl(210 20% 94%)',
	'--designer-muted': 'hsl(215 12% 72%)',
	'--designer-accent': 'hsl(var(--primary))',
	'--designer-grid': 'hsl(214 12% 30% / 0.8)',
	'--designer-ribbon': 'hsl(220 8% 16%)',
}

export const DESIGNER_KEYBOARD_STEP = 4
