import type { NoSeriesV2Manager } from '../no-series'
import type { PluginContext, TablePlugin } from './types'

/**
 * Configuration for the NoSeries plugin.
 */
export interface NoSeriesPluginConfig {
	/** The NoSeries manager instance */
	manager: NoSeriesV2Manager
	/** Map of table name to array of field configurations */
	tableConfigs: Map<string, Array<{ code: string; field: string }>>
}

/**
 * Create a NoSeries plugin that auto-generates sequential codes on insert.
 *
 * This plugin wraps the NoSeriesV2Manager to provide automatic code generation
 * via the plugin system, instead of being baked into the table insert logic.
 *
 * @example
 * ```ts
 * const noSeriesManager = new NoSeriesV2Manager()
 * noSeriesManager.register({
 *   code: 'users:code',
 *   pattern: 'USER0000000001',
 * })
 *
 * const noSeriesPlugin = createNoSeriesPlugin({
 *   manager: noSeriesManager,
 *   tableConfigs: new Map([
 *     ['users', [{ code: 'users:code', field: 'code' }]],
 *   ]),
 * })
 *
 * // Register with plugin manager
 * pluginManager.registerGlobal(noSeriesPlugin)
 * ```
 */
export function createNoSeriesPlugin(
	config: NoSeriesPluginConfig,
): TablePlugin {
	const { manager, tableConfigs } = config

	return {
		name: 'no-series',

		beforeInsert: (ctx: PluginContext, item: Record<string, unknown>) => {
			const configs = tableConfigs.get(ctx.tableName)
			if (!configs || configs.length === 0) {
				return item
			}

			// Use the NoSeries manager to apply auto-generated values
			return manager.applyToInsert(configs, item)
		},
	}
}

/**
 * Create NoSeries plugin configurations from table builders.
 *
 * @param tables - Map of table name to table builder
 * @param manager - The NoSeries manager to register with
 * @returns Map of table name to field configurations
 */
export function buildNoSeriesConfigs(
	tables: Record<
		string,
		{ _noSeriesConfig?: unknown; _definition: { name: string } }
	>,
	manager: NoSeriesV2Manager,
): Map<string, Array<{ code: string; field: string }>> {
	const tableConfigs = new Map<string, Array<{ code: string; field: string }>>()

	for (const [tableName, builder] of Object.entries(tables)) {
		const noSeriesConfig = builder._noSeriesConfig as
			| {
					pattern: string
					field: string
					initialValue?: number
					incrementBy?: number
			  }
			| Array<{
					pattern: string
					field: string
					initialValue?: number
					incrementBy?: number
			  }>
			| undefined

		if (noSeriesConfig) {
			const configs = Array.isArray(noSeriesConfig)
				? noSeriesConfig
				: [noSeriesConfig]

			const v2Configs: Array<{ code: string; field: string }> = []

			for (const config of configs) {
				const seriesCode = `${tableName}:${config.field}`

				// Register with the manager
				manager.register({
					code: seriesCode,
					pattern: config.pattern,
					initialValue: config.initialValue,
					incrementBy: config.incrementBy,
				})

				v2Configs.push({ code: seriesCode, field: config.field })
			}

			tableConfigs.set(tableName, v2Configs)
		}
	}

	return tableConfigs
}

/**
 * Type for NoSeries field configuration on a table.
 */
export interface NoSeriesFieldConfig {
	/** Pattern for the series (e.g., 'USER0000000001') */
	pattern: string
	/** Field name to auto-generate */
	field: string
	/** Optional initial value override */
	initialValue?: string
	/** Optional increment amount (default: 1) */
	incrementBy?: number
}
