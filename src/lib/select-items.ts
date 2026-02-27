/**
 * Builds a value→label map for `@base-ui/react` Select `items` prop.
 *
 * When passed to `<Select.Root items={map}>`, `<Select.Value>` renders the
 * human-readable label even when the popup Portal is closed and items are
 * unmounted.
 */
export function toSelectItemsMap<T>(
	items: T[],
	getKey: (item: T) => string,
	getLabel: (item: T) => string,
): Record<string, string> {
	const map: Record<string, string> = {}
	for (const item of items) {
		map[getKey(item)] = getLabel(item)
	}
	return map
}
