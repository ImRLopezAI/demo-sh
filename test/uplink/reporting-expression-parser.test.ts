import {
	evaluateExpression,
	parseExpression,
	validateExpression,
} from '@server/reporting'
import { describe, expect, test } from 'vitest'

describe('reporting expressions', () => {
	test('parses field expression and evaluates against Fields context', () => {
		const parsed = parseExpression('=Fields.totalAmount + 10')
		expect(parsed.ast.type).toBe('Binary')
		const result = evaluateExpression('=Fields.totalAmount + 10', {
			Fields: { totalAmount: 25 },
			Summary: {},
			Globals: {
				PageNumber: 1,
				TotalPages: 1,
				ReportDate: new Date().toISOString(),
				ReportTitle: 'Demo',
			},
		})
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.value).toBe(35)
		}
	})

	test('evaluates aggregate functions using rows', () => {
		const result = evaluateExpression('=Sum(Fields.amount)', {
			Fields: { amount: 0 },
			Summary: {},
			rows: [{ amount: 10 }, { amount: 20 }, { amount: 5 }],
			Globals: {
				PageNumber: 1,
				TotalPages: 1,
				ReportDate: new Date().toISOString(),
				ReportTitle: 'Demo',
			},
		})
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.value).toBe(35)
		}
	})

	test('returns validation errors for malformed expressions', () => {
		const error = validateExpression('=Fields.totalAmount + ')
		expect(error).toBeTruthy()
	})
})
