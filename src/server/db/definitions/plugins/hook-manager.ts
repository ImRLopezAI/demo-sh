import type { WithSystemFields } from '../table'
import type {
	PluginContext,
	PluginHookResult,
	SchemaPluginConfig,
	TablePlugin,
} from './types'

/**
 * Plugin hook manager for registering and executing plugins.
 * Handles the plugin lifecycle and hook execution.
 */
export class PluginHookManager {
	private globalPlugins: TablePlugin[] = []
	private tablePlugins: Map<string, TablePlugin[]> = new Map()
	private excludedPlugins: Map<string, Set<string>> = new Map()
	private schemas: Record<string, unknown> = {}

	/**
	 * Create a new plugin hook manager.
	 *
	 * @param config - Initial plugin configuration
	 */
	constructor(config?: SchemaPluginConfig) {
		if (config?.globalPlugins) {
			this.globalPlugins = [...config.globalPlugins]
		}
		if (config?.tablePlugins) {
			for (const [tableName, tableConfig] of Object.entries(
				config.tablePlugins,
			)) {
				if (tableConfig.plugins) {
					this.tablePlugins.set(tableName, [...tableConfig.plugins])
				}
				if (tableConfig.excludePlugins) {
					this.excludedPlugins.set(
						tableName,
						new Set(tableConfig.excludePlugins),
					)
				}
			}
		}
	}

	/**
	 * Set the schemas reference for plugin context.
	 *
	 * @param schemas - The schemas object
	 */
	setSchemas(schemas: Record<string, unknown>): void {
		this.schemas = schemas
	}

	/**
	 * Register a global plugin.
	 *
	 * @param plugin - The plugin to register
	 */
	registerGlobal(plugin: TablePlugin): void {
		if (this.globalPlugins.some((p) => p.name === plugin.name)) {
			throw new Error(`Plugin "${plugin.name}" is already registered globally`)
		}
		this.globalPlugins.push(plugin)
	}

	/**
	 * Register a plugin for a specific table.
	 *
	 * @param tableName - The table name
	 * @param plugin - The plugin to register
	 */
	registerForTable(tableName: string, plugin: TablePlugin): void {
		const existing = this.tablePlugins.get(tableName) ?? []
		if (existing.some((p) => p.name === plugin.name)) {
			throw new Error(
				`Plugin "${plugin.name}" is already registered for table "${tableName}"`,
			)
		}
		this.tablePlugins.set(tableName, [...existing, plugin])

		// Call onRegister hook
		const ctx = this.createContext(tableName)
		plugin.onRegister?.(ctx)
	}

	/**
	 * Unregister a plugin.
	 *
	 * @param pluginName - The plugin name to unregister
	 * @param tableName - Optional table name (if table-specific)
	 */
	unregister(pluginName: string, tableName?: string): void {
		if (tableName) {
			const plugins = this.tablePlugins.get(tableName) ?? []
			const plugin = plugins.find((p) => p.name === pluginName)
			if (plugin) {
				const ctx = this.createContext(tableName)
				plugin.onUnregister?.(ctx)
				this.tablePlugins.set(
					tableName,
					plugins.filter((p) => p.name !== pluginName),
				)
			}
		} else {
			const plugin = this.globalPlugins.find((p) => p.name === pluginName)
			if (plugin) {
				// Call onUnregister for all tables
				for (const tn of this.tablePlugins.keys()) {
					const ctx = this.createContext(tn)
					plugin.onUnregister?.(ctx)
				}
				this.globalPlugins = this.globalPlugins.filter(
					(p) => p.name !== pluginName,
				)
			}
		}
	}

	/**
	 * Get all plugins for a table (global + table-specific, excluding excluded).
	 *
	 * @param tableName - The table name
	 * @returns Array of applicable plugins
	 */
	getPluginsForTable(tableName: string): TablePlugin[] {
		const excluded = this.excludedPlugins.get(tableName) ?? new Set()
		const tableSpecific = this.tablePlugins.get(tableName) ?? []

		return [
			...this.globalPlugins.filter((p) => !excluded.has(p.name)),
			...tableSpecific,
		]
	}

	/**
	 * Create a plugin context for a table.
	 *
	 * @param tableName - The table name
	 * @returns Plugin context
	 */
	private createContext(tableName: string): PluginContext {
		return {
			tableName,
			schemas: this.schemas,
		}
	}

	/**
	 * Execute beforeInsert hooks.
	 *
	 * @param tableName - The table name
	 * @param item - The item being inserted
	 * @returns Hook result with potentially modified item
	 */
	executeBeforeInsert(
		tableName: string,
		item: Record<string, unknown>,
	): PluginHookResult<Record<string, unknown>> {
		const plugins = this.getPluginsForTable(tableName)
		const ctx = this.createContext(tableName)
		let value = item
		let modified = false
		const errors: Array<{ plugin: string; error: Error }> = []

		for (const plugin of plugins) {
			if (plugin.beforeInsert) {
				try {
					const result = plugin.beforeInsert(ctx, value)
					if (result !== value) {
						value = result
						modified = true
					}
				} catch (error) {
					errors.push({ plugin: plugin.name, error: error as Error })
				}
			}
		}

		return { value, modified, errors }
	}

	/**
	 * Execute afterInsert hooks.
	 *
	 * @param tableName - The table name
	 * @param doc - The inserted document
	 */
	executeAfterInsert(tableName: string, doc: WithSystemFields<object>): void {
		const plugins = this.getPluginsForTable(tableName)
		const ctx = this.createContext(tableName)

		for (const plugin of plugins) {
			if (plugin.afterInsert) {
				try {
					plugin.afterInsert(ctx, doc)
				} catch (error) {
					console.error(`Plugin "${plugin.name}" afterInsert error:`, error)
				}
			}
		}
	}

	/**
	 * Execute beforeUpdate hooks.
	 *
	 * @param tableName - The table name
	 * @param id - Document ID
	 * @param updates - The updates being applied
	 * @returns Hook result with potentially modified updates
	 */
	executeBeforeUpdate(
		tableName: string,
		id: string,
		updates: Partial<object>,
	): PluginHookResult<Partial<object>> {
		const plugins = this.getPluginsForTable(tableName)
		const ctx = this.createContext(tableName)
		let value = updates
		let modified = false
		const errors: Array<{ plugin: string; error: Error }> = []

		for (const plugin of plugins) {
			if (plugin.beforeUpdate) {
				try {
					const result = plugin.beforeUpdate(ctx, id, value)
					if (result !== value) {
						value = result
						modified = true
					}
				} catch (error) {
					errors.push({ plugin: plugin.name, error: error as Error })
				}
			}
		}

		return { value, modified, errors }
	}

	/**
	 * Execute afterUpdate hooks.
	 *
	 * @param tableName - The table name
	 * @param doc - The updated document
	 */
	executeAfterUpdate(tableName: string, doc: WithSystemFields<object>): void {
		const plugins = this.getPluginsForTable(tableName)
		const ctx = this.createContext(tableName)

		for (const plugin of plugins) {
			if (plugin.afterUpdate) {
				try {
					plugin.afterUpdate(ctx, doc)
				} catch (error) {
					console.error(`Plugin "${plugin.name}" afterUpdate error:`, error)
				}
			}
		}
	}

	/**
	 * Execute beforeDelete hooks.
	 * Throws if any plugin throws.
	 *
	 * @param tableName - The table name
	 * @param id - Document ID
	 */
	executeBeforeDelete(tableName: string, id: string): void {
		const plugins = this.getPluginsForTable(tableName)
		const ctx = this.createContext(tableName)

		for (const plugin of plugins) {
			if (plugin.beforeDelete) {
				plugin.beforeDelete(ctx, id)
			}
		}
	}

	/**
	 * Execute afterDelete hooks.
	 *
	 * @param tableName - The table name
	 * @param id - Document ID that was deleted
	 */
	executeAfterDelete(tableName: string, id: string): void {
		const plugins = this.getPluginsForTable(tableName)
		const ctx = this.createContext(tableName)

		for (const plugin of plugins) {
			if (plugin.afterDelete) {
				try {
					plugin.afterDelete(ctx, id)
				} catch (error) {
					console.error(`Plugin "${plugin.name}" afterDelete error:`, error)
				}
			}
		}
	}

	/**
	 * Execute beforeClear hooks.
	 * Throws if any plugin throws.
	 *
	 * @param tableName - The table name
	 */
	executeBeforeClear(tableName: string): void {
		const plugins = this.getPluginsForTable(tableName)
		const ctx = this.createContext(tableName)

		for (const plugin of plugins) {
			if (plugin.beforeClear) {
				plugin.beforeClear(ctx)
			}
		}
	}

	/**
	 * Execute afterClear hooks.
	 *
	 * @param tableName - The table name
	 */
	executeAfterClear(tableName: string): void {
		const plugins = this.getPluginsForTable(tableName)
		const ctx = this.createContext(tableName)

		for (const plugin of plugins) {
			if (plugin.afterClear) {
				try {
					plugin.afterClear(ctx)
				} catch (error) {
					console.error(`Plugin "${plugin.name}" afterClear error:`, error)
				}
			}
		}
	}
}

/**
 * Create a plugin hook manager with the given configuration.
 *
 * @param config - Plugin configuration
 * @returns PluginHookManager instance
 */
export function createPluginManager(
	config?: SchemaPluginConfig,
): PluginHookManager {
	return new PluginHookManager(config)
}
