import { z } from 'zod'
import type { AnyTableBuilder, TypedOneHelper, ZodShape } from '../types'
import { getZodMeta } from '../fields/zod-utils'

// ============================================================================
// Schema snapshot & diff engine (Phase 8)
// ============================================================================

/**
 * A snapshot of a table's structure.
 */
export interface TableSnapshot {
	name: string
	fields: FieldSnapshot[]
	indexes: Array<{ name: string; fields: string[] }>
	uniqueConstraints: Array<{ name: string; fields: string[] }>
}

/**
 * A snapshot of a field's structure.
 */
export interface FieldSnapshot {
	name: string
	type: string
	isOptional: boolean
	isFlowField: boolean
	isAutoIncrement: boolean
	related?: string
	onDelete?: string
	defaultValue?: unknown
}

/**
 * Complete schema snapshot.
 */
export interface SchemaSnapshot {
	tables: Record<string, TableSnapshot>
	version?: number
	createdAt: number
}

/**
 * Types of schema changes.
 */
export type SchemaDiffType =
	| 'table_added'
	| 'table_removed'
	| 'field_added'
	| 'field_removed'
	| 'field_type_changed'
	| 'index_added'
	| 'index_removed'
	| 'constraint_added'
	| 'constraint_removed'

/**
 * A single schema diff entry.
 */
export interface SchemaDiff {
	type: SchemaDiffType
	tableName: string
	fieldName?: string
	indexName?: string
	constraintName?: string
	oldValue?: unknown
	newValue?: unknown
}

/**
 * Resolve the Zod type name from a schema.
 */
function resolveTypeName(schema: z.ZodType): string {
	if (schema instanceof z.ZodString) return 'string'
	if (schema instanceof z.ZodNumber) return 'number'
	if (schema instanceof z.ZodBoolean) return 'boolean'
	if (schema instanceof z.ZodDate) return 'date'
	if (schema instanceof z.ZodEnum) return 'enum'
	if (schema instanceof z.ZodArray) return 'array'
	if (schema instanceof z.ZodObject) return 'object'
	if (schema instanceof z.ZodOptional) return `optional<${resolveTypeName((schema as z.ZodOptional<z.ZodType>)._def.innerType)}>`
	if (schema instanceof z.ZodNullable) return `nullable<${resolveTypeName((schema as z.ZodNullable<z.ZodType>)._def.innerType)}>`
	return 'unknown'
}

/**
 * Capture a snapshot of the current schema structure.
 */
export function snapshotSchema(
	tables: Record<string, AnyTableBuilder>,
	typedOneHelper: TypedOneHelper<string>,
): SchemaSnapshot {
	const snapshot: SchemaSnapshot = {
		tables: {},
		createdAt: Date.now(),
	}

	for (const [tableName, builder] of Object.entries(tables)) {
		const definition = builder._definition
		const schemaInput = definition.schemaInput
		const shape =
			typeof schemaInput === 'function'
				? (schemaInput as (one: typeof typedOneHelper) => ZodShape)(typedOneHelper)
				: (schemaInput as ZodShape)

		const fields: FieldSnapshot[] = []
		for (const [fieldName, fieldSchema] of Object.entries(shape)) {
			const zodSchema = fieldSchema as z.ZodType
			const meta = getZodMeta(zodSchema)

			fields.push({
				name: fieldName,
				type: resolveTypeName(zodSchema),
				isOptional: zodSchema instanceof z.ZodOptional,
				isFlowField: !!meta?.flowField,
				isAutoIncrement: meta?.autoIncrement !== undefined,
				related: meta?.related,
				onDelete: meta?.onDelete,
			})
		}

		const indexes = builder._indexes.map((idx: { name: string; fields: string[] }) => ({
			name: idx.name,
			fields: [...idx.fields],
		}))

		const uniqueConstraints = (builder._uniqueConstraints ?? []).map(
			(uc: { name: string; fields: string[] }) => ({
				name: uc.name,
				fields: [...uc.fields],
			}),
		)

		snapshot.tables[tableName] = {
			name: tableName,
			fields,
			indexes,
			uniqueConstraints,
		}
	}

	return snapshot
}

/**
 * Compare two schema snapshots and return the differences.
 */
export function diffSchemas(
	oldSnapshot: SchemaSnapshot,
	newSnapshot: SchemaSnapshot,
): SchemaDiff[] {
	const diffs: SchemaDiff[] = []
	const oldTables = oldSnapshot.tables
	const newTables = newSnapshot.tables

	// Check for added/removed tables
	for (const tableName of Object.keys(newTables)) {
		if (!(tableName in oldTables)) {
			diffs.push({ type: 'table_added', tableName })
		}
	}

	for (const tableName of Object.keys(oldTables)) {
		if (!(tableName in newTables)) {
			diffs.push({ type: 'table_removed', tableName })
			continue
		}

		const oldTable = oldTables[tableName]
		const newTable = newTables[tableName]

		// Compare fields
		const oldFieldMap = new Map(oldTable.fields.map((f) => [f.name, f]))
		const newFieldMap = new Map(newTable.fields.map((f) => [f.name, f]))

		for (const [fieldName, newField] of newFieldMap) {
			const oldField = oldFieldMap.get(fieldName)
			if (!oldField) {
				diffs.push({
					type: 'field_added',
					tableName,
					fieldName,
					newValue: newField,
				})
			} else if (oldField.type !== newField.type) {
				diffs.push({
					type: 'field_type_changed',
					tableName,
					fieldName,
					oldValue: oldField.type,
					newValue: newField.type,
				})
			}
		}

		for (const fieldName of oldFieldMap.keys()) {
			if (!newFieldMap.has(fieldName)) {
				diffs.push({
					type: 'field_removed',
					tableName,
					fieldName,
				})
			}
		}

		// Compare indexes
		const oldIndexes = new Set(oldTable.indexes.map((i) => i.name))
		const newIndexes = new Set(newTable.indexes.map((i) => i.name))

		for (const name of newIndexes) {
			if (!oldIndexes.has(name)) {
				diffs.push({ type: 'index_added', tableName, indexName: name })
			}
		}
		for (const name of oldIndexes) {
			if (!newIndexes.has(name)) {
				diffs.push({ type: 'index_removed', tableName, indexName: name })
			}
		}

		// Compare constraints
		const oldConstraints = new Set(oldTable.uniqueConstraints.map((c) => c.name))
		const newConstraints = new Set(newTable.uniqueConstraints.map((c) => c.name))

		for (const name of newConstraints) {
			if (!oldConstraints.has(name)) {
				diffs.push({ type: 'constraint_added', tableName, constraintName: name })
			}
		}
		for (const name of oldConstraints) {
			if (!newConstraints.has(name)) {
				diffs.push({ type: 'constraint_removed', tableName, constraintName: name })
			}
		}
	}

	return diffs
}
