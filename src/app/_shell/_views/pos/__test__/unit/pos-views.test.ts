import { describe, expect, test } from 'vitest'
import Dashboard from '../../dashboard'
import ShiftControls from '../../shift-controls'
import TerminalView from '../../terminal-view'

describe('pos views (unit)', () => {
	test('exports dashboard and terminal views', () => {
		expect(typeof Dashboard).toBe('function')
		expect(typeof TerminalView).toBe('function')
		expect(typeof ShiftControls).toBe('function')
	})
})
