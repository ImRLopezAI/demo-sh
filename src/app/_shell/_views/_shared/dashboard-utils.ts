/**
 * Re-export shim — canonical location is @/lib/json-render/dashboard-utils.
 * This file exists only so non-migrated _views modules keep compiling.
 * Delete once all consumers import from the canonical path.
 *
 * Note: formatCompactCurrency and safeDivide moved to @/lib/json-render/functions
 * as ComputedFunction implementations and are no longer needed here.
 */
export {
	average,
	buildCategorySeries,
	buildMonthlySeries,
	type CategorySeriesPoint,
	formatPercent,
	type MonthlySeriesPoint,
} from '@/lib/json-render/dashboard-utils'
