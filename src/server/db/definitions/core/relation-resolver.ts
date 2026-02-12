import type { TableRelations } from '../relations'
import type { WithConfig } from '../types'
import type { RelationMeta } from './schema-helpers'

// ============================================================================
// Relation resolver factory
// ============================================================================

export interface RelationResolverConfig {
	/** Explicit relations schema (user-defined) */
	explicitRelations: Record<string, TableRelations | undefined>
	/** Auto-detected relation metadata (from one() helper) */
	relationMeta: Map<string, RelationMeta[]>
	/** Map of table names to table instances for accessing data */
	getTableData: (tableName: string) => object[]
	/** Get a single document by table name and ID */
	getTableDoc: (tableName: string, id: string) => object | undefined
	/** Whether the table has flow fields that need wrapping */
	hasFlowFields: (tableName: string) => boolean
	/** Wrap a document with flow fields */
	wrapWithFlowFields: <D extends object>(doc: D, tableName: string) => D
}

/**
 * Create a relation resolver function that handles both explicit and
 * auto-detected relations with eager loading support.
 */
export function createRelationResolver(
	config: RelationResolverConfig,
): <T extends object>(doc: T, tableName: string, withConfig: WithConfig | undefined) => T {
	const {
		explicitRelations,
		relationMeta,
		getTableData,
		getTableDoc,
		hasFlowFields,
		wrapWithFlowFields,
	} = config

	function resolveRelations<T extends object>(
		doc: T,
		tableName: string,
		withConfig: WithConfig | undefined,
	): T {
		if (!withConfig) return doc

		const result = { ...doc } as Record<string, unknown>

		// First, check explicit relations (take precedence)
		const tableExplicitRelations = explicitRelations[tableName]
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

				const targetDocs = getTableData(targetTable)
				if (!targetDocs) continue

				if (relationDef.__type === 'one') {
					let match = targetDocs.find(
						(d) => (d as Record<string, unknown>)[toColumn] === fromValue,
					)

					if (match) {
						if (hasFlowFields(targetTable)) {
							match = wrapWithFlowFields(match, targetTable)
						}

						if (typeof configValue === 'object' && configValue.with) {
							match = resolveRelations(match, targetTable, configValue.with)
						}
					}

					result[relationName] = match ?? null
				} else {
					let matches = targetDocs.filter(
						(d) => (d as Record<string, unknown>)[toColumn] === fromValue,
					)

					if (hasFlowFields(targetTable)) {
						matches = matches.map((m) => wrapWithFlowFields(m, targetTable))
					}

					if (typeof configValue === 'object' && configValue.with) {
						matches = matches.map((m) =>
							resolveRelations(m, targetTable, configValue.with),
						)
					}

					result[relationName] = matches
				}
			}
		}

		// Fall back to auto-detected relations (for backward compatibility)
		const autoRelations = relationMeta.get(tableName)
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

				let relatedRecord = getTableDoc(relatedTable, foreignKeyValue)
				if (!relatedRecord) continue

				if (hasFlowFields(relatedTable)) {
					relatedRecord = wrapWithFlowFields(relatedRecord, relatedTable)
				}

				if (typeof configValue === 'object' && configValue.with) {
					relatedRecord = resolveRelations(
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

	return resolveRelations
}
