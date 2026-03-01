import {
	getBuiltInLayout,
	migrateLayoutToReportDefinition,
	validateReportDefinition,
} from '@server/reporting'
import { describe, expect, test } from 'vitest'

describe('layout migration', () => {
	test('converts legacy block layouts into band definitions', () => {
		const legacy = getBuiltInLayout('DOC_SALES_ORDER')
		expect(legacy).toBeDefined()
		if (!legacy) return
		const migrated = migrateLayoutToReportDefinition(legacy)
		const validated = validateReportDefinition(migrated)
		expect(validated.version).toBe(1)
		expect(validated.bands.length).toBeGreaterThan(0)
		expect(validated.bands.some((band) => band.type === 'detail')).toBe(true)
	})
})
