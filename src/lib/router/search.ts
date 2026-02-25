import qs from 'qs'

const QS_PARSE_OPTIONS: qs.IParseOptions = {
	allowDots: true,
	allowPrototypes: false,
	arrayLimit: 100,
	depth: 10,
	ignoreQueryPrefix: true,
	parameterLimit: 200,
	plainObjects: true,
}

const QS_STRINGIFY_OPTIONS: qs.IStringifyOptions = {
	addQueryPrefix: true,
	allowDots: true,
	arrayFormat: 'indices',
	encodeValuesOnly: true,
	sort: (left, right) => left.localeCompare(right),
}

function normalizeSearchValue(value: unknown): unknown {
	if (value === undefined) {
		return undefined
	}

	if (Array.isArray(value)) {
		const normalizedItems = value
			.map((item) => normalizeSearchValue(item))
			.filter(
				(item): item is Exclude<typeof item, undefined> => item !== undefined,
			)
		return normalizedItems.length > 0 ? normalizedItems : undefined
	}

	if (value && typeof value === 'object') {
		const normalizedEntries = Object.entries(value)
			.map(
				([key, nestedValue]) =>
					[key, normalizeSearchValue(nestedValue)] as const,
			)
			.filter((entry) => entry[1] !== undefined)

		return normalizedEntries.length > 0
			? Object.fromEntries(normalizedEntries)
			: undefined
	}

	return value
}

function normalizeSearchRecord(
	searchObj: Record<string, unknown>,
): Record<string, unknown> {
	const entries = Object.entries(searchObj)
		.map(([key, value]) => [key, normalizeSearchValue(value)] as const)
		.filter((entry) => entry[1] !== undefined)

	return Object.fromEntries(entries)
}

export function parseRouterSearch(searchStr: string): Record<string, unknown> {
	const parsed = qs.parse(searchStr, QS_PARSE_OPTIONS)

	if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
		return {}
	}

	return parsed as Record<string, unknown>
}

export function stringifyRouterSearch(
	searchObj: Record<string, unknown>,
): string {
	const normalizedSearch = normalizeSearchRecord(searchObj)
	return qs.stringify(normalizedSearch, QS_STRINGIFY_OPTIONS)
}
