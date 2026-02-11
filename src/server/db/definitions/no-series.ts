/**
 * No Series - Automatic sequential code generation for table fields.
 *
 * Inspired by ERP systems like Microsoft Dynamics NAV/Business Central,
 * this provides automatic number sequences for document numbers, codes, etc.
 *
 * ## V1 API (Pattern-based, in-memory)
 * @example
 * ```ts
 * const db = defineSchema(({ createTable }) => ({
 *   users: createTable('users', {
 *     schema: { name: z.string(), code: z.string() },
 *     noSeries: {
 *       pattern: 'USER0000000001',
 *       field: 'code',
 *     },
 *   }).table(),
 * }))
 *
 * // Auto-generates code on insert
 * const user = db.schemas.users.insert({ name: 'John' })
 * // user.code === 'USER0000000001'
 *
 * // Get next value without inserting
 * const nextCode = db._internals.noSeries.peek('users', 'code')
 * // nextCode === 'USER0000000002'
 * ```
 *
 * ## V2 API (Code reference-based, persisted table)
 * @example
 * ```ts
 * const db = defineSchema(({ createTable }) => ({
 *   users: createTable('users', {
 *     schema: { name: z.string(), code: z.string() },
 *     noSeries: {
 *       code: 'users_code', // references no series by code identifier
 *       field: 'code',
 *     },
 *   }).table(),
 * }))
 *
 * // Access via _internals
 * const nextCode = db._internals.noSeries.getNext('users_code')
 * ```
 */

// ============================================================================
// No Series Record (V2 - Internal Table Storage)
// ============================================================================

/**
 * No Series record stored in internal _noSeries table.
 * This is the persistent representation of a number series.
 */
export interface NoSeriesRecord {
	/** Unique identifier for the series (e.g., 'users_code', 'invoice_no') */
	code: string
	/** Human-readable description */
	description?: string
	/** Pattern defining format (prefix + digits), e.g., 'USER0000000001' */
	pattern: string
	/** Last value that was used/generated */
	lastUsed: number
	/** Next value to be generated */
	next: number
	/** Increment step between values (default: 1) */
	incrementBy: number
	/** Optional end value for controlled series (e.g., max invoice number) */
	endAt?: number
	/** Whether this series is active */
	active: boolean
	/** Timestamp when created */
	createdAt: Date
	/** Timestamp when last updated */
	updatedAt: Date
}

// ============================================================================
// V1 Configuration Types (Pattern-based)
// ============================================================================

/**
 * Configuration for a single No Series (V1 - pattern-based).
 */
export interface NoSeriesConfig {
	/**
	 * Pattern defining the format. The numeric portion at the end defines
	 * the number of digits and starting value.
	 *
	 * @example
	 * - 'USER0000000001' -> prefix 'USER' + 10 digits, starts at 1
	 * - 'INV-00001' -> prefix 'INV-' + 5 digits, starts at 1
	 * - 'CONF_X-000000000' -> prefix 'CONF_X-' + 9 digits, starts at 0
	 */
	pattern: string
	/**
	 * Field name that receives the generated code.
	 * Must match a field in the table schema.
	 */
	field: string
	/**
	 * Initial value for the series (default: extracted from pattern or 1).
	 */
	initialValue?: number
	/**
	 * Increment step (default: 1).
	 */
	incrementBy?: number
}

/**
 * No Series definition - single config or array for multiple series per table.
 */
export type NoSeriesDefinition = NoSeriesConfig | NoSeriesConfig[]

// ============================================================================
// V2 Configuration Types (Code reference-based)
// ============================================================================

/**
 * V2 Configuration - references a No Series by code identifier.
 * The series itself is stored in the internal _noSeries table.
 */
export interface NoSeriesV2Config {
	/**
	 * Code/identifier of the No Series to use.
	 * Must reference an existing series in the _noSeries table.
	 */
	code: string
	/**
	 * Field name that receives the generated code.
	 * Must match a field in the table schema.
	 */
	field: string
}

/**
 * V2 No Series definition - single config or array for multiple series per table.
 */
export type NoSeriesV2Definition = NoSeriesV2Config | NoSeriesV2Config[]

/**
 * Setup definition for creating No Series records in the _noSeries table.
 * Used to initialize series from code (vs UI).
 */
export interface NoSeriesSetup {
	/** Unique code/identifier for the series */
	code: string
	/** Human-readable description */
	description?: string
	/** Pattern defining format (prefix + digits), e.g., 'USER0000000001' */
	pattern: string
	/** Initial value (default: extracted from pattern) */
	initialValue?: number
	/** Increment step (default: 1) */
	incrementBy?: number
	/** Optional end value for controlled series */
	endAt?: number
}

// ============================================================================
// V1 Internal Types (In-memory state)
// ============================================================================

/**
 * Internal state for a single series.
 */
interface SeriesState {
	config: NoSeriesConfig
	prefix: string
	digits: number
	currentValue: number
	incrementBy: number
	/** For placeholder patterns */
	isPlaceholder?: boolean
	template?: string
}

/**
 * Supported date placeholders in patterns.
 */
const DATE_PLACEHOLDERS = {
	'{YYYY}': (d: Date) => String(d.getFullYear()),
	'{YY}': (d: Date) => String(d.getFullYear()).slice(-2),
	'{MM}': (d: Date) => String(d.getMonth() + 1).padStart(2, '0'),
	'{DD}': (d: Date) => String(d.getDate()).padStart(2, '0'),
	'{Q}': (d: Date) => String(Math.ceil((d.getMonth() + 1) / 3)),
	'{WW}': (d: Date) => {
		const start = new Date(d.getFullYear(), 0, 1)
		const diff = d.getTime() - start.getTime()
		const oneWeek = 604800000
		return String(Math.ceil(diff / oneWeek)).padStart(2, '0')
	},
} as const

/**
 * Check if a pattern uses the new placeholder syntax.
 * Returns true if pattern contains date placeholders or hash digits (####).
 */
function isPlaceholderPattern(pattern: string): boolean {
	return (
		Object.keys(DATE_PLACEHOLDERS).some((p) => pattern.includes(p)) ||
		pattern.includes('#')
	)
}

/**
 * Parse a placeholder-style pattern (e.g., 'PUR-{YYYY}-{MM}-####').
 *
 * @example
 * parsePlaceholderPattern('PUR-{YYYY}-{MM}-####')
 * // -> { template: 'PUR-{YYYY}-{MM}-', digits: 4, initialValue: 1, hasDatePlaceholders: true }
 */
function parsePlaceholderPattern(pattern: string): {
	template: string
	digits: number
	initialValue: number
	hasDatePlaceholders: boolean
} {
	// Find the hash sequence (####) at the end or anywhere in pattern
	const hashMatch = pattern.match(/(#+)/)
	if (!hashMatch) {
		throw new Error(
			`Invalid No Series pattern: "${pattern}". Pattern must contain sequential digits (#### or numeric suffix).`,
		)
	}

	const hashSequence = hashMatch[1]
	const digits = hashSequence.length

	// Replace the hash sequence with a placeholder marker
	const template = pattern.replace(hashSequence, '{SEQ}')

	// Check for date placeholders
	const hasDatePlaceholders = Object.keys(DATE_PLACEHOLDERS).some((p) =>
		pattern.includes(p),
	)

	return {
		template,
		digits,
		initialValue: 1, // Placeholder patterns always start at 1
		hasDatePlaceholders,
	}
}

/**
 * Parses a pattern to extract prefix, digit count, and initial value.
 * Supports both legacy patterns (USER0000000001) and placeholder patterns (PUR-{YYYY}-{MM}-####).
 *
 * @example
 * parsePattern('USER0000000001') -> { prefix: 'USER', digits: 10, initialValue: 1 }
 * parsePattern('INV-00001') -> { prefix: 'INV-', digits: 5, initialValue: 1 }
 * parsePattern('PUR-{YYYY}-{MM}-####') -> { prefix: 'PUR-{YYYY}-{MM}-', digits: 4, initialValue: 1, isPlaceholder: true }
 */
function parsePattern(pattern: string): {
	prefix: string
	digits: number
	initialValue: number
	isPlaceholder?: boolean
	template?: string
} {
	// Check if it's a placeholder pattern
	if (isPlaceholderPattern(pattern)) {
		const parsed = parsePlaceholderPattern(pattern)
		return {
			prefix: '', // Not used for placeholder patterns
			digits: parsed.digits,
			initialValue: parsed.initialValue,
			isPlaceholder: true,
			template: parsed.template,
		}
	}

	// Legacy pattern: find the numeric suffix
	const match = pattern.match(/^(.*?)(\d+)$/)
	if (!match) {
		throw new Error(
			`Invalid No Series pattern: "${pattern}". Pattern must end with digits or use placeholder syntax (e.g., PUR-{YYYY}-####).`,
		)
	}

	const [, prefix, numericPart] = match
	return {
		prefix,
		digits: numericPart.length,
		initialValue: parseInt(numericPart, 10),
	}
}

/**
 * Formats a number with the series prefix and padded digits.
 * For placeholder patterns, replaces date placeholders and {SEQ} with actual values.
 */
function formatCode(
	prefix: string,
	digits: number,
	value: number,
	options?: {
		isPlaceholder?: boolean
		template?: string
		date?: Date
	},
): string {
	// Handle placeholder patterns
	if (options?.isPlaceholder && options.template) {
		let result = options.template
		const date = options.date ?? new Date()

		// Replace date placeholders
		for (const [placeholder, formatter] of Object.entries(DATE_PLACEHOLDERS)) {
			result = result.replace(placeholder, formatter(date))
		}

		// Replace sequence placeholder
		result = result.replace('{SEQ}', String(value).padStart(digits, '0'))

		return result
	}

	// Legacy format
	return `${prefix}${String(value).padStart(digits, '0')}`
}

/**
 * NoSeriesManager handles automatic sequential code generation for table fields.
 */
export class NoSeriesManager {
	/**
	 * Map of series by "tableName:fieldName" key.
	 */
	private series = new Map<string, SeriesState>()

	/**
	 * Create a unique key for a series.
	 */
	private getKey(tableName: string, fieldName: string): string {
		return `${tableName}:${fieldName}`
	}

	/**
	 * Register a No Series configuration for a table field.
	 */
	register(tableName: string, config: NoSeriesConfig): void {
		const parsed = parsePattern(config.pattern)
		const key = this.getKey(tableName, config.field)

		if (this.series.has(key)) {
			throw new Error(
				`No Series already registered for ${tableName}.${config.field}`,
			)
		}

		const state: SeriesState = {
			config,
			prefix: parsed.prefix,
			digits: parsed.digits,
			currentValue: config.initialValue ?? parsed.initialValue,
			incrementBy: config.incrementBy ?? 1,
			isPlaceholder: parsed.isPlaceholder,
			template: parsed.template,
		}

		this.series.set(key, state)
	}

	/**
	 * Register multiple No Series configurations for a table.
	 */
	registerMany(tableName: string, configs: NoSeriesDefinition): void {
		const configArray = Array.isArray(configs) ? configs : [configs]
		for (const config of configArray) {
			this.register(tableName, config)
		}
	}

	/**
	 * Check if a table has a No Series for a specific field.
	 */
	has(tableName: string, fieldName: string): boolean {
		return this.series.has(this.getKey(tableName, fieldName))
	}

	/**
	 * Get all field names with No Series for a table.
	 */
	getFieldsForTable(tableName: string): string[] {
		const fields: string[] = []
		for (const [key] of this.series) {
			const [table, field] = key.split(':')
			if (table === tableName) {
				fields.push(field)
			}
		}
		return fields
	}

	/**
	 * Peek at the next value without consuming it.
	 * Useful for displaying "next number will be..." in UI.
	 */
	peek(tableName: string, fieldName: string): string {
		const key = this.getKey(tableName, fieldName)
		const state = this.series.get(key)

		if (!state) {
			throw new Error(`No Series not found for ${tableName}.${fieldName}`)
		}

		return formatCode(state.prefix, state.digits, state.currentValue, {
			isPlaceholder: state.isPlaceholder,
			template: state.template,
		})
	}

	/**
	 * Get the next value and increment the counter.
	 * Called internally during insert operations.
	 */
	getNext(tableName: string, fieldName: string): string {
		const key = this.getKey(tableName, fieldName)
		const state = this.series.get(key)

		if (!state) {
			throw new Error(`No Series not found for ${tableName}.${fieldName}`)
		}

		const code = formatCode(state.prefix, state.digits, state.currentValue, {
			isPlaceholder: state.isPlaceholder,
			template: state.template,
		})
		state.currentValue += state.incrementBy
		return code
	}

	/**
	 * Get current value without incrementing.
	 */
	getCurrent(tableName: string, fieldName: string): number {
		const key = this.getKey(tableName, fieldName)
		const state = this.series.get(key)

		if (!state) {
			throw new Error(`No Series not found for ${tableName}.${fieldName}`)
		}

		return state.currentValue
	}

	/**
	 * Reset a series to a specific value.
	 * Useful for testing or when migrating data.
	 */
	reset(tableName: string, fieldName: string, value?: number): void {
		const key = this.getKey(tableName, fieldName)
		const state = this.series.get(key)

		if (!state) {
			throw new Error(`No Series not found for ${tableName}.${fieldName}`)
		}

		const { initialValue } = parsePattern(state.config.pattern)
		state.currentValue = value ?? state.config.initialValue ?? initialValue
	}

	/**
	 * Set the current value to a specific number.
	 * The next getNext() will return this value.
	 */
	setValue(tableName: string, fieldName: string, value: number): void {
		const key = this.getKey(tableName, fieldName)
		const state = this.series.get(key)

		if (!state) {
			throw new Error(`No Series not found for ${tableName}.${fieldName}`)
		}

		state.currentValue = value
	}

	/**
	 * Process an item before insert, filling in No Series fields if not provided.
	 * Returns a new object with generated codes applied.
	 */
	applyToInsert<T extends Record<string, unknown>>(
		tableName: string,
		item: T,
	): T {
		const fields = this.getFieldsForTable(tableName)
		if (fields.length === 0) {
			return item
		}

		const result = { ...item } as Record<string, unknown>
		for (const field of fields) {
			// Only generate if field is not already provided
			if (
				result[field] === undefined ||
				result[field] === null ||
				result[field] === ''
			) {
				result[field] = this.getNext(tableName, field)
			}
		}
		return result as T
	}

	/**
	 * Get configuration for a specific series.
	 */
	getConfig(tableName: string, fieldName: string): NoSeriesConfig | undefined {
		const key = this.getKey(tableName, fieldName)
		return this.series.get(key)?.config
	}

	/**
	 * Get all registered series as a readonly snapshot.
	 */
	getAll(): ReadonlyMap<string, Readonly<SeriesState>> {
		return this.series
	}

	/**
	 * Export current state for persistence.
	 */
	exportState(): Record<string, number> {
		const state: Record<string, number> = {}
		for (const [key, series] of this.series) {
			state[key] = series.currentValue
		}
		return state
	}

	/**
	 * Import state from persistence.
	 */
	importState(state: Record<string, number>): void {
		for (const [key, value] of Object.entries(state)) {
			const series = this.series.get(key)
			if (series) {
				series.currentValue = value
			}
		}
	}
}

/**
 * Type-safe API exposed at db.noSeries level.
 */
export interface NoSeriesApi<
	Tables extends Record<string, unknown> = Record<string, unknown>,
> {
	/**
	 * Peek at the next value without consuming it.
	 */
	peek<TTable extends keyof Tables>(
		tableName: TTable,
		fieldName: string,
	): string

	/**
	 * Get the next value and increment the counter.
	 */
	getNext<TTable extends keyof Tables>(
		tableName: TTable,
		fieldName: string,
	): string

	/**
	 * Reset a series to its initial value or a specific value.
	 */
	reset<TTable extends keyof Tables>(
		tableName: TTable,
		fieldName: string,
		value?: number,
	): void

	/**
	 * Get current counter value.
	 */
	getCurrent<TTable extends keyof Tables>(
		tableName: TTable,
		fieldName: string,
	): number

	/**
	 * Set the counter to a specific value.
	 */
	setValue<TTable extends keyof Tables>(
		tableName: TTable,
		fieldName: string,
		value: number,
	): void

	/**
	 * Export all series states for persistence.
	 */
	exportState(): Record<string, number>

	/**
	 * Import series states from persistence.
	 */
	importState(state: Record<string, number>): void
}

/**
 * Create a type-safe No Series API wrapper (V1 - table.field based).
 */
export function createNoSeriesApi<Tables extends Record<string, unknown>>(
	manager: NoSeriesManager,
): NoSeriesApi<Tables> {
	return {
		peek: (tableName, fieldName) =>
			manager.peek(String(tableName), String(fieldName)),
		getNext: (tableName, fieldName) =>
			manager.getNext(String(tableName), String(fieldName)),
		reset: (tableName, fieldName, value) =>
			manager.reset(String(tableName), String(fieldName), value),
		getCurrent: (tableName, fieldName) =>
			manager.getCurrent(String(tableName), String(fieldName)),
		setValue: (tableName, fieldName, value) =>
			manager.setValue(String(tableName), String(fieldName), value),
		exportState: () => manager.exportState(),
		importState: (state) => manager.importState(state),
	}
}

// ============================================================================
// V2 API (Code-based, for _internals)
// ============================================================================

/**
 * V2 No Series API exposed at db._internals.noSeries level.
 * Accesses series directly by their code identifier.
 */
export interface NoSeriesV2Api {
	/**
	 * Peek at the next value without consuming it.
	 * @param code - The series code identifier
	 */
	peek(code: string): string

	/**
	 * Get the next value and increment the counter.
	 * @param code - The series code identifier
	 */
	getNext(code: string): string

	/**
	 * Reset a series to its initial value or a specific value.
	 * @param code - The series code identifier
	 * @param value - Optional value to reset to
	 */
	reset(code: string, value?: number): void

	/**
	 * Get current counter value.
	 * @param code - The series code identifier
	 */
	getCurrent(code: string): number

	/**
	 * Set the counter to a specific value.
	 * @param code - The series code identifier
	 * @param value - The value to set
	 */
	setValue(code: string, value: number): void

	/**
	 * Get series record by code.
	 * @param code - The series code identifier
	 */
	get(code: string): NoSeriesRecord | undefined

	/**
	 * Get all registered series.
	 */
	getAll(): NoSeriesRecord[]

	/**
	 * Create or update a series.
	 * @param setup - Series setup configuration
	 */
	upsert(setup: NoSeriesSetup): NoSeriesRecord

	/**
	 * Check if a series exists.
	 * @param code - The series code identifier
	 */
	has(code: string): boolean

	/**
	 * Export all series states for persistence.
	 */
	exportState(): Record<string, number>

	/**
	 * Import series states from persistence.
	 */
	importState(state: Record<string, number>): void
}

/**
 * NoSeriesV2Manager handles V2 No Series with code-based access.
 * This manager stores series in memory but can be backed by a persistent table.
 */
export class NoSeriesV2Manager {
	private series = new Map<string, NoSeriesRecord>()

	/**
	 * Register a series from setup configuration.
	 */
	register(setup: NoSeriesSetup): NoSeriesRecord {
		const { initialValue: patternInitial } = parsePattern(setup.pattern)
		const initialValue = setup.initialValue ?? patternInitial

		const record: NoSeriesRecord = {
			code: setup.code,
			description: setup.description,
			pattern: setup.pattern,
			lastUsed: 0,
			next: initialValue,
			incrementBy: setup.incrementBy ?? 1,
			endAt: setup.endAt,
			active: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		}

		this.series.set(setup.code, record)
		return record
	}

	/**
	 * Upsert a series - create if not exists, update if exists.
	 */
	upsert(setup: NoSeriesSetup): NoSeriesRecord {
		const existing = this.series.get(setup.code)
		if (existing) {
			existing.pattern = setup.pattern
			existing.description = setup.description
			existing.incrementBy = setup.incrementBy ?? existing.incrementBy
			existing.endAt = setup.endAt
			existing.updatedAt = new Date()
			return existing
		}
		return this.register(setup)
	}

	/**
	 * Check if a series exists.
	 */
	has(code: string): boolean {
		return this.series.has(code)
	}

	/**
	 * Get a series record.
	 */
	get(code: string): NoSeriesRecord | undefined {
		return this.series.get(code)
	}

	/**
	 * Get all series records.
	 */
	getAll(): NoSeriesRecord[] {
		return Array.from(this.series.values())
	}

	/**
	 * Peek at the next value without consuming it.
	 */
	peek(code: string): string {
		const record = this.series.get(code)
		if (!record) {
			throw new Error(`No Series not found: ${code}`)
		}

		const parsed = parsePattern(record.pattern)
		return formatCode(parsed.prefix, parsed.digits, record.next, {
			isPlaceholder: parsed.isPlaceholder,
			template: parsed.template,
		})
	}

	/**
	 * Get the next value and increment the counter.
	 */
	getNext(code: string): string {
		const record = this.series.get(code)
		if (!record) {
			throw new Error(`No Series not found: ${code}`)
		}

		if (!record.active) {
			throw new Error(`No Series is inactive: ${code}`)
		}

		if (record.endAt !== undefined && record.next > record.endAt) {
			throw new Error(`No Series has reached its end value: ${code}`)
		}

		const parsed = parsePattern(record.pattern)
		const value = formatCode(parsed.prefix, parsed.digits, record.next, {
			isPlaceholder: parsed.isPlaceholder,
			template: parsed.template,
		})

		record.lastUsed = record.next
		record.next += record.incrementBy
		record.updatedAt = new Date()

		return value
	}

	/**
	 * Get current counter value.
	 */
	getCurrent(code: string): number {
		const record = this.series.get(code)
		if (!record) {
			throw new Error(`No Series not found: ${code}`)
		}
		return record.next
	}

	/**
	 * Reset a series to a specific value.
	 */
	reset(code: string, value?: number): void {
		const record = this.series.get(code)
		if (!record) {
			throw new Error(`No Series not found: ${code}`)
		}

		const parsed = parsePattern(record.pattern)
		record.next = value ?? parsed.initialValue
		record.lastUsed = 0
		record.updatedAt = new Date()
	}

	/**
	 * Set the counter to a specific value.
	 */
	setValue(code: string, value: number): void {
		const record = this.series.get(code)
		if (!record) {
			throw new Error(`No Series not found: ${code}`)
		}
		record.next = value
		record.updatedAt = new Date()
	}

	/**
	 * Apply V2 config to an insert item.
	 * Uses code-based lookup for the series.
	 */
	applyToInsert<T extends Record<string, unknown>>(
		configs: NoSeriesV2Config[],
		item: T,
	): T {
		if (configs.length === 0) {
			return item
		}

		const result = { ...item } as Record<string, unknown>
		for (const config of configs) {
			// Only generate if field is not already provided
			if (
				result[config.field] === undefined ||
				result[config.field] === null ||
				result[config.field] === ''
			) {
				result[config.field] = this.getNext(config.code)
			}
		}
		return result as T
	}

	/**
	 * Export current state for persistence.
	 */
	exportState(): Record<string, number> {
		const state: Record<string, number> = {}
		for (const [code, record] of this.series) {
			state[code] = record.next
		}
		return state
	}

	/**
	 * Import state from persistence.
	 */
	importState(state: Record<string, number>): void {
		for (const [code, value] of Object.entries(state)) {
			const record = this.series.get(code)
			if (record) {
				record.next = value
				record.updatedAt = new Date()
			}
		}
	}
}

/**
 * Create a V2 No Series API wrapper.
 */
export function createNoSeriesV2Api(manager: NoSeriesV2Manager): NoSeriesV2Api {
	return {
		peek: (code) => manager.peek(code),
		getNext: (code) => manager.getNext(code),
		reset: (code, value) => manager.reset(code, value),
		getCurrent: (code) => manager.getCurrent(code),
		setValue: (code, value) => manager.setValue(code, value),
		get: (code) => manager.get(code),
		getAll: () => manager.getAll(),
		upsert: (setup) => manager.upsert(setup),
		has: (code) => manager.has(code),
		exportState: () => manager.exportState(),
		importState: (state) => manager.importState(state),
	}
}

// ============================================================================
// Internals API Type
// ============================================================================

/**
 * The _internals API exposed on the database schema.
 * Contains internal utilities like noSeries and relations.
 */
export interface InternalsApi<
	_Tables extends Record<string, unknown> = Record<string, unknown>,
	Relations = unknown,
> {
	/** No Series V2 API for automatic sequential code generation */
	noSeries: NoSeriesV2Api
	/** Relations schema (moved from db.relations) */
	relations: Relations
	/** Reset the database: clears all data (including adapter storage) and re-seeds */
	reset: () => Promise<void>
}
