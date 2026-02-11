/**
 * Plugin system for extending table functionality.
 * @module plugins
 */

// Hook manager
export {
	createPluginManager,
	PluginHookManager,
} from './hook-manager'
// NoSeries plugin
export {
	buildNoSeriesConfigs,
	createNoSeriesPlugin,
	type NoSeriesFieldConfig,
	type NoSeriesPluginConfig,
} from './no-series.plugin'
// Types
export type {
	PluginContext,
	PluginHookResult,
	SchemaPluginConfig,
	TablePlugin,
	TablePluginConfig,
} from './types'
