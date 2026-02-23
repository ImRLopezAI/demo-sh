import { describe, expect, test } from 'vitest'
import Dashboard from '../../dashboard'
import ItemLedgerList from '../../item-ledger-list'

describe('insight views (unit)', () => {
	test('exports dashboard and item-ledger views', () => {
		expect(typeof Dashboard).toBe('function')
		expect(typeof ItemLedgerList).toBe('function')
	})
})
