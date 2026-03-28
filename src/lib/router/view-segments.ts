/**
 * Normalize catch-all view segments from Next.js route params.
 */
export function normalizeViewSegments(
	view: string | string[] | undefined,
): string[] {
	if (Array.isArray(view)) return view
	return typeof view === 'string' ? [view] : []
}
