import {
	type ComputedFieldConfig,
	wrapWithComputedFields,
} from '../fields/computed'
import type { TableRelations } from '../relations'
import type { ReactiveTable } from '../table'
import type {
	ComputedFn,
	FlowFieldContext,
	FlowFieldDef,
} from '../types/field.types'
import type { WithConfig } from '../types/query.types'

/**
 * Configuration for relation loading.
 */
export interface RelationLoaderConfig {
	/** Map of table name to table instance */
	tableInstances: Map<string, ReactiveTable<object>>
	/** Explicit relations schema */
	explicitRelations: Record<string, TableRelations | undefined>
	/** Auto-detected relation metadata */
	relationMeta: Map<
		string,
		Array<{
			fieldName: string
			relatedTable: string
			relationName: string
			onDelete?: 'cascade' | 'setNull' | 'restrict'
		}>
	>
	/** Flow field definitions per table */
	flowFieldDefs: Map<string, Map<string, FlowFieldDef>>
	/** Computed functions per table */
	computedFns: Map<string, ComputedFn<object, Record<string, unknown>>>
	/** Flow field context */
	flowFieldContext: FlowFieldContext
}

/**
 * Relation loader for eager loading related documents.
 */
export class RelationLoader {
	private config: RelationLoaderConfig

	constructor(config: RelationLoaderConfig) {
		this.config = config
	}

	/**
	 * Check if a table has flow fields or computed fields.
	 */
	private hasFlowFields(tableName: string): boolean {
		return (
			Boolean(this.config.flowFieldDefs.get(tableName)?.size) ||
			this.config.computedFns.has(tableName)
		)
	}

	/**
	 * Wrap a document with flow fields if applicable.
	 */
	private wrapDocument<T extends object>(doc: T, tableName: string): T {
		if (!this.hasFlowFields(tableName)) return doc

		const flowFieldDefs = this.config.flowFieldDefs.get(tableName)
		const computedFn = this.config.computedFns.get(tableName)

		return wrapWithComputedFields(
			doc,
			tableName,
			{ computedFn, flowFieldDefs } as ComputedFieldConfig<T>,
			this.config.flowFieldContext,
		)
	}

	/**
	 * Resolve relations for a document based on `with` configuration.
	 * Supports both explicit relations and auto-detected relations.
	 *
	 * @param doc - The document to resolve relations for
	 * @param tableName - The table name
	 * @param withConfig - The with configuration
	 * @returns Document with loaded relations
	 */
	resolveRelations<T extends object>(
		doc: T,
		tableName: string,
		withConfig: WithConfig | undefined,
	): T {
		if (!withConfig) return doc

		const result = { ...doc } as Record<string, unknown>

		// First, check explicit relations (take precedence)
		const tableExplicitRelations = this.config.explicitRelations[tableName]
		if (tableExplicitRelations) {
			for (const [relationName, relationDef] of Object.entries(
				tableExplicitRelations,
			)) {
				const configValue = withConfig[relationName]
				if (!configValue) continue

				const targetTable = relationDef.__target
				const fromColumn = relationDef.config.from.__column
				const toColumn = relationDef.config.to.__column
				const fromValue = (doc as Record<string, unknown>)[fromColumn]

				const targetTableInstance = this.config.tableInstances.get(targetTable)
				if (!targetTableInstance) continue

				if (relationDef.__type === 'one') {
					// One-to-one/many-to-one: find single matching record
					const targetDocs = targetTableInstance.toArray()
					let match = targetDocs.find(
						(d) => (d as Record<string, unknown>)[toColumn] === fromValue,
					)

					if (match) {
						if (this.hasFlowFields(targetTable)) {
							match = this.wrapDocument(match, targetTable)
						}

						if (typeof configValue === 'object' && configValue.with) {
							match = this.resolveRelations(
								match,
								targetTable,
								configValue.with,
							)
						}
					}

					result[relationName] = match ?? null
				} else {
					// One-to-many: find all matching records
					const targetDocs = targetTableInstance.toArray()
					let matches = targetDocs.filter(
						(d) => (d as Record<string, unknown>)[toColumn] === fromValue,
					)

					if (this.hasFlowFields(targetTable)) {
						matches = matches.map((m) => this.wrapDocument(m, targetTable))
					}

					if (typeof configValue === 'object' && configValue.with) {
						matches = matches.map((m) =>
							this.resolveRelations(m, targetTable, configValue.with),
						)
					}

					result[relationName] = matches
				}
			}
		}

		// Fall back to auto-detected relations (for backward compatibility)
		const autoRelations = this.config.relationMeta.get(tableName)
		if (autoRelations && autoRelations.length > 0) {
			for (const { fieldName, relatedTable, relationName } of autoRelations) {
				// Skip if already resolved by explicit relations
				if (result[relationName] !== undefined) continue

				const configValue = withConfig[relationName]
				if (!configValue) continue

				const foreignKeyValue = (doc as Record<string, unknown>)[fieldName] as
					| string
					| undefined
				if (!foreignKeyValue) continue

				const relatedTableInstance =
					this.config.tableInstances.get(relatedTable)
				if (!relatedTableInstance) continue

				let relatedRecord = relatedTableInstance.get(foreignKeyValue)
				if (!relatedRecord) continue

				if (this.hasFlowFields(relatedTable)) {
					relatedRecord = this.wrapDocument(relatedRecord, relatedTable)
				}

				if (typeof configValue === 'object' && configValue.with) {
					relatedRecord = this.resolveRelations(
						relatedRecord,
						relatedTable,
						configValue.with,
					)
				}

				result[relationName] = relatedRecord
			}
		}

		return result as T
	}

	/**
	 * Resolve relations for multiple documents.
	 *
	 * @param docs - Documents to resolve relations for
	 * @param tableName - The table name
	 * @param withConfig - The with configuration
	 * @returns Documents with loaded relations
	 */
	resolveRelationsMany<T extends object>(
		docs: T[],
		tableName: string,
		withConfig: WithConfig | undefined,
	): T[] {
		if (!withConfig) return docs
		return docs.map((doc) => this.resolveRelations(doc, tableName, withConfig))
	}
}

/**
 * Create a relation loader with the given configuration.
 *
 * @param config - Relation loader configuration
 * @returns RelationLoader instance
 */
export function createRelationLoader(
	config: RelationLoaderConfig,
): RelationLoader {
	return new RelationLoader(config)
}

/**
 * Create a resolve relations function bound to a specific configuration.
 * This is useful for passing to the wrapped table.
 *
 * @param config - Relation loader configuration
 * @returns A function that resolves relations for a document
 */
export function createResolveRelationsFn(
	config: RelationLoaderConfig,
): <T extends object>(
	doc: T,
	tableName: string,
	withConfig: WithConfig | undefined,
) => T {
	const loader = new RelationLoader(config)
	return (doc, tableName, withConfig) =>
		loader.resolveRelations(doc, tableName, withConfig)
}
