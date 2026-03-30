'use client'

/**
 * Spec-driven workbench view helpers.
 *
 * When a workbench component receives `specProps` from json-render,
 * these helpers provide a consistent interface for consuming spec-driven
 * title, description, and future configuration — making the spec the
 * single source of truth for workbench view metadata.
 */

/* ── Shared types ── */

export interface SpecWorkbenchProps {
	/** Page title (used in PageHeader) */
	title?: string | null
	/** Page description (used in PageHeader) */
	description?: string | null
	/** Allow extension */
	[key: string]: unknown
}
