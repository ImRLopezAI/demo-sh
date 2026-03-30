'use client'

import { useStateStore } from '@json-render/react'
import * as React from 'react'
import { StatusBadge } from '@/components/ui/json-render/status-badge'

type FormatterApi = {
	date: (value: unknown, options: { format: string }) => string
	currency: (value: unknown) => string
}

export interface SpecColumnDef {
	accessorKey: string
	title: string
	cellVariant?: string | null
	width?: number | null
}

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
	_filters?: SpecFilterDefs
	_cardTitle?: string | null
	_cardNewTitle?: string | null
	_cardDescription?: string | null
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

function resolveColumnExtras(col: SpecColumnDef): Record<string, unknown> {
	const extras: Record<string, unknown> = {}
	const lowerKey = col.accessorKey.toLowerCase()
	const lowerTitle = col.title.toLowerCase()

	if (col.cellVariant === 'date') {
		extras.formatter = (v: Record<string, unknown>, f: FormatterApi) =>
			f.date(v[col.accessorKey], { format: 'P' })
	}

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
			extras.formatter = (v: Record<string, unknown>, f: FormatterApi) =>
				f.currency(v[col.accessorKey])
		}
	}

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

export function renderSpecColumns<TData extends object>(
	Column: React.ComponentType<{
		accessorKey: string
		title: string
		cellVariant?: string
		handleEdit?: ((row: TData) => void) | undefined
		[key: string]: unknown
	}>,
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

export function useSpecFilters(
	specProps: SpecListProps | undefined,
): Record<string, string | number | boolean | null> | undefined {
	const { state, get } = useStateStore()
	const filterDefs = specProps?._filters
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
	}, [filterDefs, get, state])
}
