import { describe, expect, test } from 'vitest'
import Dashboard from '../../dashboard'
import EmployeesList from '../../employees-list'

describe('payroll views (unit)', () => {
	test('exports dashboard and employees views', () => {
		expect(typeof Dashboard).toBe('function')
		expect(typeof EmployeesList).toBe('function')
	})
})
