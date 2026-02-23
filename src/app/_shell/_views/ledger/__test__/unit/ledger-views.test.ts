import { describe, expect, test } from 'vitest'
import Dashboard from '../../dashboard'
import InvoicesList from '../../invoices-list'

describe('ledger views (unit)', () => {
	test('exports dashboard and invoices views', () => {
		expect(typeof Dashboard).toBe('function')
		expect(typeof InvoicesList).toBe('function')
	})
})
