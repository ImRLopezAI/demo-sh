export type MonthlySeriesPoint = {
	month: string
	count: number
	amount: number
}

const MONTH_LABEL = new Intl.DateTimeFormat('en-US', { month: 'short' })

function toDate(value: string | Date | null | undefined) {
	if (!value) return null
	const date = value instanceof Date ? value : new Date(value)
	return Number.isNaN(date.getTime()) ? null : date
}

function monthKey(date: Date) {
	return `${date.getFullYear()}-${date.getMonth()}`
}

function toNumber(value: unknown) {
	return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

export function buildMonthlySeries<T>(
	items: readonly T[],
	getDate: (item: T) => string | Date | null | undefined,
	getAmount?: (item: T) => number,
	months = 6,
): MonthlySeriesPoint[] {
	const safeMonths = Math.max(1, Math.floor(months))
	const anchor = new Date()
	const bucketSeeds = Array.from({ length: safeMonths }, (_, index) => {
		const date = new Date(
			anchor.getFullYear(),
			anchor.getMonth() - (safeMonths - 1 - index),
			1,
		)
		return {
			key: monthKey(date),
			month: MONTH_LABEL.format(date),
		}
	})

	const buckets = new Map(
		bucketSeeds.map((seed) => [
			seed.key,
			{ month: seed.month, count: 0, amount: 0 },
		]),
	)

	for (const item of items) {
		const date = toDate(getDate(item))
		if (!date) continue
		const bucket = buckets.get(monthKey(date))
		if (!bucket) continue
		bucket.count += 1
		if (getAmount) bucket.amount += toNumber(getAmount(item))
	}

	return bucketSeeds.map(
		(seed) =>
			buckets.get(seed.key) ?? { month: seed.month, count: 0, amount: 0 },
	)
}

export type CategorySeriesPoint = {
	name: string
	value: number
}

export function buildCategorySeries(
	values: Array<string | null | undefined>,
	limit = 6,
	fallback = 'Unknown',
): CategorySeriesPoint[] {
	const counts = new Map<string, number>()
	for (const value of values) {
		const key =
			typeof value === 'string' && value.trim().length > 0 ? value : fallback
		counts.set(key, (counts.get(key) ?? 0) + 1)
	}

	return Array.from(counts.entries())
		.map(([name, value]) => ({ name, value }))
		.sort((a, b) => b.value - a.value)
		.slice(0, Math.max(1, limit))
}

export function formatPercent(part: number, total: number, fractionDigits = 1) {
	if (!Number.isFinite(part) || !Number.isFinite(total) || total <= 0) {
		return '0%'
	}
	return `${((part / total) * 100).toFixed(Math.max(0, fractionDigits))}%`
}

export function average(values: number[]) {
	if (values.length === 0) return 0
	return values.reduce((sum, value) => sum + value, 0) / values.length
}
