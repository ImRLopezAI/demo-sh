import { describe, expect, test } from 'vitest'
import Dashboard from '../../dashboard'
import ShipmentsList from '../../shipments-list'

describe('trace views (unit)', () => {
	test('exports dashboard and shipments views', () => {
		expect(typeof Dashboard).toBe('function')
		expect(typeof ShipmentsList).toBe('function')
	})
})
