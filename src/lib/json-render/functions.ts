/**
 * json-render $computed Functions
 *
 * Registered functions that can be called from specs via:
 *   { "$computed": "functionName", "args": { ... } }
 *
 * All functions receive resolved args and return a value.
 */
import type { ComputedFunction } from '@json-render/core'

/* ── Formatting ── */

const formatCurrency: ComputedFunction = (args) => {
	const value = Number(args.value ?? 0)
	const currency = String(args.currency ?? 'USD')
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency,
		maximumFractionDigits: 0,
	}).format(value)
}

const formatCompactCurrency: ComputedFunction = (args) => {
	const value = Number(args.value ?? 0)
	const currency = String(args.currency ?? 'USD')
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency,
		notation: 'compact',
		maximumFractionDigits: 1,
	}).format(value)
}

const formatNumber: ComputedFunction = (args) => {
	const value = Number(args.value ?? 0)
	return new Intl.NumberFormat('en-US').format(value)
}

const formatCompactNumber: ComputedFunction = (args) => {
	const value = Number(args.value ?? 0)
	return new Intl.NumberFormat('en-US', {
		notation: 'compact',
		maximumFractionDigits: 1,
	}).format(value)
}

const formatPercent: ComputedFunction = (args) => {
	const part = Number(args.part ?? 0)
	const total = Number(args.total ?? 0)
	const digits = Number(args.digits ?? 1)
	if (total === 0) return '0%'
	return `${((part / total) * 100).toFixed(digits)}%`
}

const formatDate: ComputedFunction = (args) => {
	const value = args.value as string | null | undefined
	if (!value) return '—'
	const date = new Date(value)
	return date.toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	})
}

const formatRelativeDate: ComputedFunction = (args) => {
	const value = args.value as string | null | undefined
	if (!value) return '—'
	const date = new Date(value)
	const now = new Date()
	const diffMs = now.getTime() - date.getTime()
	const diffMins = Math.floor(diffMs / 60000)
	const diffHours = Math.floor(diffMins / 60)
	const diffDays = Math.floor(diffHours / 24)
	if (diffMins < 1) return 'just now'
	if (diffMins < 60) return `${diffMins}m ago`
	if (diffHours < 24) return `${diffHours}h ago`
	if (diffDays < 7) return `${diffDays}d ago`
	return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/* ── Math ── */

const safeDivide: ComputedFunction = (args) => {
	const numerator = Number(args.numerator ?? 0)
	const denominator = Number(args.denominator ?? 0)
	const fallback = Number(args.fallback ?? 0)
	return denominator === 0 ? fallback : numerator / denominator
}

const average: ComputedFunction = (args) => {
	const values = args.values as number[] | undefined
	if (!values || values.length === 0) return 0
	return values.reduce((a, b) => a + b, 0) / values.length
}

/* ── String ── */

const pluralize: ComputedFunction = (args) => {
	const count = Number(args.count ?? 0)
	const singular = String(args.singular ?? '')
	const plural = String(args.plural ?? `${singular}s`)
	return count === 1 ? singular : plural
}

const concat: ComputedFunction = (args) => {
	const parts = args.parts as string[] | undefined
	const separator = String(args.separator ?? ' ')
	return (parts ?? []).filter(Boolean).join(separator)
}

const statusLabel: ComputedFunction = (args) => {
	const status = String(args.status ?? '')
	return status.replace(/_/g, ' ')
}

/* ── Aggregation ── */

const sum: ComputedFunction = (args) => {
	const values = args.values as number[] | undefined
	if (!values || values.length === 0) return 0
	return values.reduce((a, b) => a + b, 0)
}

const max: ComputedFunction = (args) => {
	const values = args.values as number[] | undefined
	if (!values || values.length === 0) return 0
	return Math.max(...values)
}

const min: ComputedFunction = (args) => {
	const values = args.values as number[] | undefined
	if (!values || values.length === 0) return 0
	return Math.min(...values)
}

/* ── Conditional ── */

const ifEmpty: ComputedFunction = (args) => {
	const value = args.value
	const fallback = args.fallback ?? '—'
	if (value === null || value === undefined || value === '') return fallback
	return value
}

const coalesce: ComputedFunction = (args) => {
	const values = args.values as unknown[] | undefined
	if (!values) return null
	for (const v of values) {
		if (v !== null && v !== undefined && v !== '') return v
	}
	return null
}

/* ── Lookup ── */

const mapValue: ComputedFunction = (args) => {
	const value = String(args.value ?? '')
	const mapping = args.mapping as Record<string, string> | undefined
	const fallback = args.fallback as string | undefined
	if (!mapping) return fallback ?? value
	return mapping[value] ?? fallback ?? value
}

/* ── Registry ── */

export const computedFunctions: Record<string, ComputedFunction> = {
	formatCurrency,
	formatCompactCurrency,
	formatNumber,
	formatCompactNumber,
	formatPercent,
	formatDate,
	formatRelativeDate,
	safeDivide,
	average,
	sum,
	max,
	min,
	pluralize,
	concat,
	statusLabel,
	ifEmpty,
	coalesce,
	mapValue,
}
