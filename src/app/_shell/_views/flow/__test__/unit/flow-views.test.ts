import { describe, expect, test } from 'vitest'
import Dashboard from '../../dashboard'
import PaymentJournal from '../../payment-journal'
import ReconciliationApprovals from '../../reconciliation-approvals'

describe('flow views (unit)', () => {
	test('exports dashboard and payment journal views', () => {
		expect(typeof Dashboard).toBe('function')
		expect(typeof PaymentJournal).toBe('function')
		expect(typeof ReconciliationApprovals).toBe('function')
	})
})
