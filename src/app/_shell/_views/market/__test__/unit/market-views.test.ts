import { describe, expect, test } from 'vitest'
import Dashboard from '../../dashboard'
import PricingReturns from '../../pricing-returns'
import SalesOrdersList from '../../sales-orders-list'

describe('market views (unit)', () => {
	test('exports dashboard and sales orders views', () => {
		expect(typeof Dashboard).toBe('function')
		expect(typeof SalesOrdersList).toBe('function')
		expect(typeof PricingReturns).toBe('function')
	})
})
