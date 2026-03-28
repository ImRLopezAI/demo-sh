'use client'

/**
 * Spec-driven list view helpers.
 *
 * When a list component receives `specProps` from json-render's ModuleListView,
 * these helpers generate DataGrid columns, page headers, and new-record buttons
 * directly from the spec definition — making the spec the single source of truth
 * for list view configuration.
 *
 * Also includes `useSpecFilters` — a bridge hook that reads json-render `$bindState`
 * filter values and converts them into the flat filter records expected by
 * `useModuleData`, so that spec-driven Select controls actually filter the list.
 */
import { useStateStore } from '@json-render/react'
import * as React from 'react'
import { StatusBadge } from './status-badge'

/* ── Shared types ── */

export interface SpecColumnDef {
	accessorKey: string
	title: string
	cellVariant?: string | null
	width?: number | null
}

/**
 * Spec filter definitions: maps a server-side filter key (e.g. 'status')
 * to the json-render state path that holds the current filter value
 * (e.g. '/filters/hub/taskStatusFilter').
 */
export type SpecFilterDefs = Record<string, string>

export interface SpecListProps {
	moduleId?: string
	entityId?: string
	viewSlug?: string | null
	title?: string
	description?: string | null
	columns?: SpecColumnDef[]
	bulkActions?: Array<{
		id: string
		label: string
		toStatus: string
		requireAllStatus?: string | null
		variant?: 'default' | 'destructive' | null
	}>
	enableNew?: boolean | null
	newLabel?: string | null
	/** Maps server filter keys → json-render state paths for the filter bridge */
	_filters?: SpecFilterDefs
	/** Title template for the record detail card (supports {fieldName} interpolation) */
	_cardTitle?: string | null
	/** Title for the new-record card */
	_cardNewTitle?: string | null
	/** Description for the record detail card */
	_cardDescription?: string | null
	/** Form field sections for the record detail card */
	_cardSections?: Array<{
		title: string
		description?: string | null
		fields: Array<{
			name: string
			label: string
			type?:
				| 'text'
				| 'number'
				| 'email'
				| 'tel'
				| 'select'
				| 'switch'
				| 'date'
				| 'textarea'
				| null
			placeholder?: string | null
			options?: Array<{ label: string; value: string }> | null
			readOnly?: boolean | null
			required?: boolean | null
			autoComplete?: string | null
			colSpan?: number | null
		}>
		columns?: number | null
	}>
	[key: string]: unknown
}

/* ── Column rendering ── */

/**
 * Resolves extra props (cell renderer, formatter) for a spec column
 * based on its accessorKey and cellVariant.
 */
function resolveColumnExtras(col: SpecColumnDef): Record<string, unknown> {
	const extras: Record<string, unknown> = {}
	const lowerKey = col.accessorKey.toLowerCase()
	const lowerTitle = col.title.toLowerCase()

	// Date columns → date formatter
	if (col.cellVariant === 'date') {
		extras.formatter = (v: Record<string, unknown>, f: any) =>
			f.date(v[col.accessorKey], { format: 'P' })
	}

	// Number columns → currency formatter for financial values
	if (col.cellVariant === 'number') {
		const isCurrency =
			lowerTitle.includes('amount') ||
			lowerTitle.includes('price') ||
			lowerTitle.includes('cost') ||
			lowerTitle.includes('salary') ||
			lowerTitle.includes('balance') ||
			lowerTitle.includes('total') ||
			lowerTitle.includes('debit') ||
			lowerTitle.includes('credit') ||
			lowerTitle.includes('remaining')
		if (isCurrency) {
			extras.formatter = (v: Record<string, unknown>, f: any) =>
				f.currency(v[col.accessorKey])
		}
	}

	// Select variant on status-like columns → StatusBadge cell renderer
	if (col.cellVariant === 'select') {
		const isStatusLike =
			lowerKey === 'status' ||
			lowerKey === 'priority' ||
			lowerKey === 'severity' ||
			lowerKey === 'slastatus' ||
			lowerKey === 'sla' ||
			lowerKey === 'escalationlevel' ||
			lowerKey.endsWith('status')
		if (isStatusLike) {
			extras.cell = ({
				row,
			}: {
				row: { original: Record<string, unknown> }
			}) => <StatusBadge status={row.original[col.accessorKey] as string} />
		}
	}

	return extras
}

/**
 * Renders DataGrid.Column elements from spec column definitions.
 *
 * The first column receives `handleEdit` for row navigation.
 * Smart defaults: StatusBadge for status columns, date formatters,
 * currency formatters for financial columns.
 *
 * @param Column — The DataGrid.Column compound component from the grid instance
 * @param columns — Spec column definitions from specProps.columns
 * @param handleEdit — Row click handler for the link column
 */
export function renderSpecColumns<TData extends object>(
	Column: React.ComponentType<any>,
	columns: SpecColumnDef[],
	handleEdit?: (row: TData) => void,
): React.ReactNode {
	return columns.map((col, index) => {
		const extras = resolveColumnExtras(col)
		return (
			<Column
				key={col.accessorKey}
				accessorKey={col.accessorKey}
				title={col.title}
				cellVariant={col.cellVariant ?? undefined}
				handleEdit={index === 0 ? handleEdit : undefined}
				{...extras}
			/>
		)
	})
}

/* ── Spec filter bridge ── */

/**
 * Reads filter values from the json-render state store based on
 * `specProps._filters` definitions and returns a flat record suitable
 * for `useModuleData`'s `options.filters` parameter.
 *
 * Values of 'ALL' or empty string are treated as "no filter" and excluded,
 * so selecting 'ALL' in a spec Select effectively removes the server filter.
 *
 * @example
 *   // spec: _filters: { status: '/filters/hub/taskStatusFilter' }
 *   const specFilters = useSpecFilters(specProps)
 *   // When state at that path is 'OPEN' → { status: 'OPEN' }
 *   // When state at that path is 'ALL'  → undefined
 *
 *   const { DataGrid } = useModuleData('hub', 'operationTasks', 'all', {
 *     filters: specFilters,
 *   })
 */
export function useSpecFilters(
	specProps: SpecListProps | undefined,
): Record<string, string | number | boolean | null> | undefined {
	const { state, get } = useStateStore()
	const filterDefs = specProps?._filters

	// Referential stability: only return a new object when filter values
	// actually change, preventing unnecessary query refetches from
	// unrelated state store mutations.
	const prevSerializedRef = React.useRef<string | null>(null)
	const prevResultRef = React.useRef<
		Record<string, string | number | boolean | null> | undefined
	>(undefined)

	return React.useMemo(() => {
		if (!filterDefs) {
			prevSerializedRef.current = null
			prevResultRef.current = undefined
			return undefined
		}
		const result: Record<string, string | number | boolean | null> = {}
		let count = 0
		for (const [filterKey, statePath] of Object.entries(filterDefs)) {
			const val = get(statePath)
			if (val != null && val !== 'ALL' && val !== '') {
				result[filterKey] = val as string | number | boolean
				count++
			}
		}
		const next = count > 0 ? result : undefined
		const serialized = next ? JSON.stringify(next) : null
		if (serialized === prevSerializedRef.current) {
			return prevResultRef.current
		}
		prevSerializedRef.current = serialized
		prevResultRef.current = next
		return next
		// state is included as a dep to trigger recomputation on store changes
	}, [filterDefs, get, state])
}
