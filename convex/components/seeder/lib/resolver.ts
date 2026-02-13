import type { TableRegistrationRef, TableSeedEntry } from './types'

// ---------------------------------------------------------------------------
// Extract FK fields from engine relations config
// Returns Map<fieldName, targetTableName>
// ---------------------------------------------------------------------------

export function extractForeignKeys(
	tableName: string,
	engineTables: Record<string, TableRegistrationRef>,
): Map<string, string> {
	const fks = new Map<string, string>()
	const reg = engineTables[tableName]
	if (reg?.relations) {
		for (const relConfig of Object.values(reg.relations)) {
			if (relConfig.type === 'one') {
				// Index name "by_customerId" → field "customerId"
				const fkField = relConfig.field.replace(/^by_/, '')
				fks.set(fkField, relConfig.table)
			}
		}
	}
	return fks
}

// ---------------------------------------------------------------------------
// Build dependency graph from table configs + engine relations
// Returns adjacency list: tableName → Set<dependsOn>
// ---------------------------------------------------------------------------

export function buildDependencyGraph(
	tables: Record<string, TableSeedEntry>,
	engineTables: Record<string, TableRegistrationRef>,
): Map<string, Set<string>> {
	const graph = new Map<string, Set<string>>()

	for (const [name, entry] of Object.entries(tables)) {
		const deps = new Set<string>()

		// From engine relations (type: "one" → FK dependency)
		const fks = extractForeignKeys(entry.def.tableName, engineTables)
		for (const targetTable of fks.values()) {
			// Only add dependency if the target table is in the seed config
			if (targetTable in tables && targetTable !== name) {
				deps.add(targetTable)
			}
		}

		// From perParent config
		if (typeof entry.seed === 'object' && entry.seed.perParent) {
			if (entry.seed.perParent in tables) {
				deps.add(entry.seed.perParent)
			}
		}

		graph.set(name, deps)
	}

	return graph
}

// ---------------------------------------------------------------------------
// Topological sort — returns tables in dependency order (parents first)
// ---------------------------------------------------------------------------

export function topologicalSort(graph: Map<string, Set<string>>): string[] {
	const sorted: string[] = []
	const visited = new Set<string>()
	const visiting = new Set<string>()

	function visit(node: string) {
		if (visited.has(node)) return
		if (visiting.has(node)) {
			// Circular dependency — just skip
			return
		}

		visiting.add(node)
		const deps = graph.get(node)
		if (deps) {
			for (const dep of deps) {
				if (graph.has(dep)) {
					visit(dep)
				}
			}
		}
		visiting.delete(node)
		visited.add(node)
		sorted.push(node)
	}

	for (const node of graph.keys()) {
		visit(node)
	}

	return sorted
}

// ---------------------------------------------------------------------------
// Get the seed count (resolve number or SeedRange)
// ---------------------------------------------------------------------------

export function getSeedCount(
	seed: number | { min: number; max: number; perParent?: string },
): number {
	if (typeof seed === 'number') return seed
	const { min, max } = seed
	if (min === max) return min
	return Math.floor(Math.random() * (max - min + 1)) + min
}

// ---------------------------------------------------------------------------
// Get NoSeries field for a table (from engine config)
// ---------------------------------------------------------------------------

export function getNoSeriesField(
	tableName: string,
	engineTables: Record<string, TableRegistrationRef>,
): string | undefined {
	const reg = engineTables[tableName]
	if (reg?.noSeries) {
		return reg.noSeries.field
	}
	return undefined
}

// ---------------------------------------------------------------------------
// Get FlowField names for a table (from engine config)
// ---------------------------------------------------------------------------

export function getFlowFieldNames(
	tableName: string,
	engineTables: Record<string, TableRegistrationRef>,
): Set<string> {
	const names = new Set<string>()
	const reg = engineTables[tableName]
	if (reg?.flowFields) {
		for (const fieldName of Object.keys(reg.flowFields)) {
			names.add(fieldName)
		}
	}
	return names
}
