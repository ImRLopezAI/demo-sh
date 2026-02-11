import type { WithSystemFields } from '../table'

/**
 * Plugin hook context with information about the current operation.
 */
export interface PluginContext {
	/** Name of the table being operated on */
	tableName: string
	/** The schema instance for accessing other tables */
	schemas: Record<string, unknown>
}

/**
 * Table plugin interface for extending table functionality.
 * Plugins can hook into the lifecycle of table operations.
 *
 * @example
 * ```ts
 * const auditPlugin: TablePlugin = {
 *   name: 'audit',
 *   beforeInsert: (ctx, item) => ({
 *     ...item,
 *     createdBy: getCurrentUser(),
 *   }),
 *   afterInsert: (ctx, doc) => {
 *     auditLog.log('insert', ctx.tableName, doc._id)
 *   },
 * }
 * ```
 */
export interface TablePlugin {
	/** Unique plugin name */
	name: string

	/**
	 * Called before an item is inserted.
	 * Can modify the item before insertion.
	 *
	 * @param ctx - Plugin context
	 * @param item - The item being inserted
	 * @returns Modified item or original item
	 */
	beforeInsert?: (
		ctx: PluginContext,
		item: Record<string, unknown>,
	) => Record<string, unknown>

	/**
	 * Called after an item is inserted.
	 *
	 * @param ctx - Plugin context
	 * @param doc - The inserted document with system fields
	 */
	afterInsert?: (ctx: PluginContext, doc: WithSystemFields<object>) => void

	/**
	 * Called before an item is updated.
	 * Can modify the updates before application.
	 *
	 * @param ctx - Plugin context
	 * @param id - Document ID being updated
	 * @param updates - The updates being applied
	 * @returns Modified updates or original updates
	 */
	beforeUpdate?: (
		ctx: PluginContext,
		id: string,
		updates: Partial<object>,
	) => Partial<object>

	/**
	 * Called after an item is updated.
	 *
	 * @param ctx - Plugin context
	 * @param doc - The updated document
	 */
	afterUpdate?: (ctx: PluginContext, doc: WithSystemFields<object>) => void

	/**
	 * Called before an item is deleted.
	 * Can throw to prevent deletion.
	 *
	 * @param ctx - Plugin context
	 * @param id - Document ID being deleted
	 */
	beforeDelete?: (ctx: PluginContext, id: string) => void

	/**
	 * Called after an item is deleted.
	 *
	 * @param ctx - Plugin context
	 * @param id - Document ID that was deleted
	 */
	afterDelete?: (ctx: PluginContext, id: string) => void

	/**
	 * Called before a table is cleared.
	 * Can throw to prevent clearing.
	 *
	 * @param ctx - Plugin context
	 */
	beforeClear?: (ctx: PluginContext) => void

	/**
	 * Called after a table is cleared.
	 *
	 * @param ctx - Plugin context
	 */
	afterClear?: (ctx: PluginContext) => void

	/**
	 * Called when the plugin is registered.
	 * Use for initialization.
	 *
	 * @param ctx - Plugin context
	 */
	onRegister?: (ctx: PluginContext) => void

	/**
	 * Called when the plugin is unregistered.
	 * Use for cleanup.
	 *
	 * @param ctx - Plugin context
	 */
	onUnregister?: (ctx: PluginContext) => void
}

/**
 * Plugin configuration for a table.
 */
export interface TablePluginConfig {
	/** Plugins to apply to this table */
	plugins?: TablePlugin[]
	/** Tables to exclude from specific plugins */
	excludePlugins?: string[]
}

/**
 * Global plugin configuration for the schema.
 */
export interface SchemaPluginConfig {
	/** Global plugins applied to all tables */
	globalPlugins?: TablePlugin[]
	/** Per-table plugin configurations */
	tablePlugins?: Record<string, TablePluginConfig>
}

/**
 * Result of running a plugin hook.
 */
export interface PluginHookResult<T> {
	/** The (potentially modified) value */
	value: T
	/** Whether any plugin modified the value */
	modified: boolean
	/** Errors from plugins (non-fatal) */
	errors: Array<{ plugin: string; error: Error }>
}
