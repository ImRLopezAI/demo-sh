import type { SchemaDiff } from './schema-diff'
import type { Migration, MigrationSchema } from './types'

// ============================================================================
// Migration generator from schema diffs (Phase 8)
// ============================================================================

/**
 * Generate a migration from a list of schema diffs.
 * Produces `up` and `down` functions that apply or revert the changes.
 */
export function generateMigration(
	diffs: SchemaDiff[],
	version: number,
	name?: string,
): Migration {
	const migrationName = name ?? `auto_migration_v${version}`

	return {
		version,
		name: migrationName,
		up: async (db: MigrationSchema) => {
			for (const diff of diffs) {
				applyDiff(db, diff, 'up')
			}
		},
		down: async (db: MigrationSchema) => {
			// Apply diffs in reverse order for rollback
			for (const diff of [...diffs].reverse()) {
				applyDiff(db, diff, 'down')
			}
		},
	}
}

function applyDiff(
	db: MigrationSchema,
	diff: SchemaDiff,
	direction: 'up' | 'down',
): void {
	const schemas = db.schemas as Record<
		string,
		{
			toArray: () => Array<Record<string, unknown>>
			update: (id: string, data: Record<string, unknown>) => void
			delete: (id: string) => boolean
			clear: () => void
		}
	>

	const table = schemas[diff.tableName]

	switch (diff.type) {
		case 'table_added': {
			if (direction === 'down') {
				// Rollback: clear the added table
				table?.clear()
			}
			// Up: table already exists in schema, nothing to do
			break
		}
		case 'table_removed': {
			if (direction === 'up') {
				// Up: clear the removed table's data
				table?.clear()
			}
			// Down: table data would need to be restored from backup (not available)
			break
		}
		case 'field_added': {
			if (direction === 'up' && table) {
				// Set default value for new field on existing records
				const fieldName = diff.fieldName!
				const docs = table.toArray()
				for (const doc of docs) {
					if (doc[fieldName] === undefined) {
						table.update(doc._id as string, { [fieldName]: null })
					}
				}
			} else if (direction === 'down' && table) {
				// Remove the field from all records
				const fieldName = diff.fieldName!
				const docs = table.toArray()
				for (const doc of docs) {
					if (fieldName in doc) {
						const { [fieldName]: _, ...rest } = doc
						table.update(doc._id as string, rest)
					}
				}
			}
			break
		}
		case 'field_removed': {
			if (direction === 'up' && table) {
				// Remove field from existing records
				const fieldName = diff.fieldName!
				const docs = table.toArray()
				for (const doc of docs) {
					if (fieldName in doc) {
						const { [fieldName]: _, ...rest } = doc
						table.update(doc._id as string, rest)
					}
				}
			}
			// Down: field would need default value (set to null)
			if (direction === 'down' && table) {
				const fieldName = diff.fieldName!
				const docs = table.toArray()
				for (const doc of docs) {
					if (doc[fieldName] === undefined) {
						table.update(doc._id as string, { [fieldName]: null })
					}
				}
			}
			break
		}
		case 'field_type_changed': {
			if (table) {
				// Best-effort type coercion
				const fieldName = diff.fieldName!
				const targetType = direction === 'up' ? diff.newValue : diff.oldValue
				const docs = table.toArray()
				for (const doc of docs) {
					const value = doc[fieldName]
					if (value !== undefined && value !== null) {
						const coerced = coerceValue(value, targetType as string)
						if (coerced !== value) {
							table.update(doc._id as string, { [fieldName]: coerced })
						}
					}
				}
			}
			break
		}
		case 'index_added':
		case 'index_removed':
		case 'constraint_added':
		case 'constraint_removed':
			// Index and constraint changes are structural -
			// they're handled by the schema definition itself, not data migration
			break
	}
}

function coerceValue(value: unknown, targetType: string): unknown {
	const baseType = targetType.replace(/^optional<(.+)>$/, '$1').replace(/^nullable<(.+)>$/, '$1')

	switch (baseType) {
		case 'string':
			return String(value)
		case 'number':
			return Number(value)
		case 'boolean':
			return Boolean(value)
		default:
			return value
	}
}
