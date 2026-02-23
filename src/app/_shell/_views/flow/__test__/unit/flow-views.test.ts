import { describe, expect, test } from 'vitest'
import Dashboard from '../../dashboard'
import PaymentJournal from '../../payment-journal'

describe('flow views (unit)', () => {
	test('exports dashboard and payment journal views', () => {
		expect(typeof Dashboard).toBe('function')
		expect(typeof PaymentJournal).toBe('function')
	})
})
