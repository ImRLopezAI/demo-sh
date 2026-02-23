import { describe, expect, test } from 'vitest'
import Dashboard from '../../dashboard'
import NotificationsList from '../../notifications-list'

describe('hub views (unit)', () => {
	test('exports dashboard and notifications views', () => {
		expect(typeof Dashboard).toBe('function')
		expect(typeof NotificationsList).toBe('function')
	})
})
