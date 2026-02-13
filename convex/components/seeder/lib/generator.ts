import { faker } from '@faker-js/faker'
import type { z } from 'zod'
import { getEnumValues, getFieldBaseType, isOptionalField } from './introspect'
import type { FieldOverride } from './types'

// ---------------------------------------------------------------------------
// Faker path resolver
// ---------------------------------------------------------------------------

export function resolveFakerPath(path: string): unknown {
	const parts = path.split('.')
	let current: unknown = faker
	for (const part of parts) {
		if (current && typeof current === 'object' && part in current) {
			current = (current as Record<string, unknown>)[part]
		} else {
			return undefined
		}
	}
	if (typeof current === 'function') {
		return current()
	}
	return current
}

// ---------------------------------------------------------------------------
// Field name heuristics — auto-seed by naming convention
// ---------------------------------------------------------------------------

function generateByFieldName(fieldName: string): unknown | undefined {
	const lower = fieldName.toLowerCase()

	// Email
	if (lower.includes('email')) return faker.internet.email()

	// Names
	if (lower === 'firstname' || lower === 'first_name')
		return faker.person.firstName()
	if (lower === 'lastname' || lower === 'last_name')
		return faker.person.lastName()
	if (lower === 'contactname' || lower === 'contact_name')
		return faker.person.fullName()
	if (lower === 'name' || lower.endsWith('name')) {
		// Avoid matching fieldName patterns that are computed (e.g. customerName flowField)
		if (
			lower === 'name' ||
			lower === 'bankname' ||
			lower === 'couriername' ||
			lower === 'accountname'
		)
			return faker.company.name()
		return faker.person.fullName()
	}

	// Phone
	if (lower.includes('phone')) return faker.phone.number()

	// Address
	if (lower === 'address' || lower.endsWith('address'))
		return faker.location.streetAddress()
	if (lower === 'city') return faker.location.city()
	if (lower === 'country') return faker.location.country()

	// Pricing/amounts
	if (
		lower.includes('price') ||
		lower.includes('amount') ||
		lower.includes('cost') ||
		lower === 'basesalary' ||
		lower === 'base_salary'
	)
		return faker.number.float({ min: 1, max: 500, fractionDigits: 2 })

	// Quantities
	if (
		lower.includes('quantity') ||
		lower.includes('inventory') ||
		lower === 'remainingqty'
	)
		return faker.number.int({ min: 0, max: 100 })

	// Percentages
	if (lower.includes('percent'))
		return faker.number.float({ min: 0, max: 30, fractionDigits: 2 })

	// Dates (string ISO)
	if (
		lower.includes('date') ||
		lower.endsWith('at') ||
		lower === 'createdat' ||
		lower === 'updatedat'
	) {
		if (lower === 'createdat' || lower === 'updatedat')
			return new Date().toISOString()
		return faker.date.recent({ days: 90 }).toISOString()
	}

	// URL
	if (lower.includes('url')) return faker.internet.url()

	// Barcode
	if (lower.includes('barcode')) return faker.string.numeric(13)

	// Currency
	if (lower === 'currency')
		return faker.helpers.arrayElement(['USD', 'EUR', 'GBP', 'MXN'])

	// Department
	if (lower === 'department') return faker.commerce.department()

	// Job title
	if (lower === 'jobtitle' || lower === 'job_title')
		return faker.person.jobTitle()

	// Description
	if (lower === 'description' || lower === 'body')
		return faker.commerce.productDescription()

	// Title
	if (lower === 'title') return faker.lorem.words(4)

	// Module ID
	if (lower === 'moduleid' || lower === 'module_id')
		return faker.helpers.arrayElement([
			'market',
			'insight',
			'ledger',
			'replenishment',
			'flow',
			'payroll',
			'pos',
			'trace',
			'hub',
		])

	// IBAN
	if (lower === 'iban') return faker.finance.iban()

	// Swift code
	if (lower === 'swiftcode' || lower === 'swift_code')
		return faker.finance.bic()

	// Tax ID
	if (lower === 'taxid' || lower === 'tax_id')
		return faker.string.alphanumeric(10).toUpperCase()

	// Tracking number
	if (lower === 'trackingno' || lower === 'tracking_no')
		return faker.string.alphanumeric(12).toUpperCase()

	// UOM
	if (lower === 'uom')
		return faker.helpers.arrayElement(['EA', 'KG', 'LB', 'BOX', 'PCS'])

	// External reference
	if (lower === 'externalref' || lower === 'external_ref')
		return `EXT-${faker.string.alphanumeric(8).toUpperCase()}`

	// Journal template/batch
	if (lower === 'journaltemplate') return 'GENERAL'
	if (lower === 'journalbatch') return 'DEFAULT'

	// Source module
	if (lower === 'sourcemodule')
		return faker.helpers.arrayElement(['FLOW', 'MARKET', 'LEDGER', 'PAYROLL'])

	// Cashier ID
	if (
		lower === 'cashierid' ||
		lower === 'assigneeuserid' ||
		lower === 'targetuserid'
	)
		return faker.string.uuid()

	// Location code (non-FK string)
	if (lower === 'locationcode')
		return faker.helpers.arrayElement([
			'WH-01',
			'WH-02',
			'STORE-01',
			'STORE-02',
			'DC-01',
		])

	// Shipment method code
	if (lower === 'shipmentmethodcode')
		return faker.helpers.arrayElement(['STD', 'EXP', 'OVN', 'ECO'])

	// Status reason
	if (lower === 'statusreason') return faker.lorem.sentence()

	// Payroll period
	if (lower === 'payrollperiod')
		return `${faker.date.recent({ days: 60 }).toISOString().slice(0, 7)}`

	return undefined
}

// ---------------------------------------------------------------------------
// Apply a field override
// ---------------------------------------------------------------------------

function applyOverride(override: FieldOverride): unknown {
	if (typeof override === 'string') {
		return resolveFakerPath(override)
	}
	if (Array.isArray(override)) {
		return faker.helpers.arrayElement(override as string[])
	}
	if ('faker' in override) {
		return resolveFakerPath(override.faker)
	}
	if ('min' in override && 'max' in override) {
		return faker.number.float({
			min: override.min,
			max: override.max,
			fractionDigits: 2,
		})
	}
	if ('fn' in override) {
		return override.fn()
	}
	return undefined
}

// ---------------------------------------------------------------------------
// Generate value for a single field
// ---------------------------------------------------------------------------

export function generateFieldValue(
	fieldName: string,
	schema: z.ZodType,
	options?: {
		override?: FieldOverride
	},
): unknown {
	// 1. Explicit override
	if (options?.override) {
		return applyOverride(options.override)
	}

	// 2. Optional fields — 30% chance undefined
	if (isOptionalField(schema)) {
		if (Math.random() < 0.3) return undefined
	}

	const baseType = getFieldBaseType(schema)

	// 4. Enum field
	if (baseType === 'enum') {
		const values = getEnumValues(schema)
		if (values && values.length > 0) {
			return faker.helpers.arrayElement(values)
		}
	}

	// 5. Field name heuristic — validate result matches expected type
	const heuristicValue = generateByFieldName(fieldName)
	if (heuristicValue !== undefined) {
		// Guard: if schema expects number but heuristic returns string (e.g. ISO date for a timestamp field), coerce
		if (baseType === 'number' && typeof heuristicValue === 'string') {
			const asDate = Date.parse(heuristicValue)
			if (!Number.isNaN(asDate)) return asDate
			const asNum = Number(heuristicValue)
			if (!Number.isNaN(asNum)) return asNum
			// Heuristic returned incompatible string — fall through to type fallback
		} else {
			return heuristicValue
		}
	}

	// 6. Type fallback
	switch (baseType) {
		case 'string':
			return faker.lorem.words(3)
		case 'number':
			return faker.number.int({ min: 0, max: 1000 })
		case 'boolean':
			return faker.datatype.boolean()
		default:
			return faker.lorem.word()
	}
}

// ---------------------------------------------------------------------------
// Generate a full table record
// ---------------------------------------------------------------------------

export function generateTableRecord(
	_tableName: string,
	shape: Record<string, z.ZodType>,
	options: {
		noSeriesField?: string
		flowFieldNames: Set<string>
		fkMap: Map<string, string[]>
		fieldOverrides?: Record<string, FieldOverride>
		parentOverrides?: Record<string, unknown>
	},
): Record<string, unknown> {
	const record: Record<string, unknown> = {}

	for (const [fieldName, fieldSchema] of Object.entries(shape)) {
		// Skip system fields
		if (fieldName === '_id' || fieldName === '_creationTime') continue

		// Apply parent overrides (for perParent seeding)
		if (options.parentOverrides && fieldName in options.parentOverrides) {
			record[fieldName] = options.parentOverrides[fieldName]
			continue
		}

		// NoSeries fields — provide empty placeholder so schema validation passes;
		// the engine trigger sees "" as falsy and auto-assigns the code
		if (options.noSeriesField && fieldName === options.noSeriesField) {
			record[fieldName] = ''
			continue
		}

		// Skip FlowField computed fields
		if (options.flowFieldNames.has(fieldName)) continue

		// Check if this is an FK field (from engine relations, keyed by field name)
		const fkIds = options.fkMap.get(fieldName)
		if (fkIds && fkIds.length > 0) {
			record[fieldName] = faker.helpers.arrayElement(fkIds)
			continue
		}

		// Generate value — omit undefined to avoid Convex schema rejection
		const value = generateFieldValue(fieldName, fieldSchema, {
			override: options.fieldOverrides?.[fieldName],
		})
		if (value !== undefined) {
			record[fieldName] = value
		}
	}

	// Ensure createdAt
	if (!record.createdAt) {
		record.createdAt = new Date().toISOString()
	}

	return record
}

// ---------------------------------------------------------------------------
// Faker seed
// ---------------------------------------------------------------------------

export function setFakerSeed(seed: number): void {
	faker.seed(seed)
}
