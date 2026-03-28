'use client'

/**
 * useHydrateState — Bridge between client-side data fetching and json-render state.
 *
 * Smart components call this hook to push their computed values into the
 * json-render state model. This makes $state, $computed, $template, and
 * visibility expressions in specs resolve against real data.
 *
 * Usage:
 *   useHydrateState('/hub/dashboard', {
 *     openTasks: tasks.filter(t => t.status === 'OPEN').length,
 *     slaOnTime: onTimeCount,
 *     slaTotal: totalCount,
 *   })
 *
 * The component MUST be rendered inside a JSONUIProvider (which is always
 * the case for json-render routes via page-renderer-wrapper.tsx).
 */
import { useStateStore } from '@json-render/react'
import { useEffect, useRef } from 'react'

/**
 * Hydrate a subtree of the json-render state model with external data.
 *
 * @param basePath  JSON Pointer prefix, e.g. '/hub/dashboard'
 * @param values    Flat record of key→value to set under basePath.
 *                  Nested keys like 'tasksByStatus/open' are supported.
 *                  Pass null/undefined to skip hydration (e.g. while loading).
 */
export function useHydrateState(
	basePath: string,
	values: Record<string, unknown> | null | undefined,
): void {
	const store = useStateStore()
	const prevRef = useRef<string | null>(null)

	const serialized = values ? stableStringify(values) : null

	useEffect(() => {
		if (!serialized || serialized === prevRef.current) return
		prevRef.current = serialized

		const parsed = JSON.parse(serialized) as Record<string, unknown>
		const prefix = basePath.endsWith('/') ? basePath : `${basePath}/`

		const updates: Record<string, unknown> = {}
		for (const [key, value] of Object.entries(parsed)) {
			updates[`${prefix}${key}`] = value
		}

		store.update(updates)
	}, [basePath, serialized, store])
}

/**
 * Deterministic JSON serialization (sorted keys) for stable comparison.
 * Prevents spurious re-hydrations when object identity changes but values don't.
 */
function stableStringify(obj: Record<string, unknown>): string {
	return JSON.stringify(obj, Object.keys(obj).sort())
}
