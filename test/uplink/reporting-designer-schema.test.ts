import {
	createDefaultReportDefinition,
	parseReportDefinitionDraft,
	validateReportDefinition,
} from '@server/reporting'
import { describe, expect, test } from 'vitest'

describe('designer schema', () => {
	test('validates a default report definition', () => {
		const definition = createDefaultReportDefinition('Unit Test Report')
		const parsed = validateReportDefinition(definition)
		expect(parsed.version).toBe(1)
		expect(parsed.bands.length).toBeGreaterThan(0)
	})

	test('parseReportDefinitionDraft returns null on malformed JSON', () => {
		expect(parseReportDefinitionDraft('{invalid')).toBeNull()
	})

	test('rejects definitions with missing bands', () => {
		expect(() =>
			validateReportDefinition({
				version: 1,
				name: 'Broken',
				page: {
					size: 'A4',
					orientation: 'portrait',
					margins: { top: 12, right: 12, bottom: 12, left: 12 },
				},
				bands: [],
			}),
		).toThrow()
	})
})
