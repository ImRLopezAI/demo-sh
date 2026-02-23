import { describe, expect, test } from 'vitest'
import Dashboard from '../../dashboard'
import PlanningWorkbench from '../../planning-workbench'
import PurchaseOrdersList from '../../purchase-orders-list'

describe('replenishment views (unit)', () => {
	test('exports dashboard and purchase-order views', () => {
		expect(typeof Dashboard).toBe('function')
		expect(typeof PurchaseOrdersList).toBe('function')
		expect(typeof PlanningWorkbench).toBe('function')
	})
})
