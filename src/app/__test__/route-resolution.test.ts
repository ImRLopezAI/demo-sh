import { describe, expect, test } from 'vitest'
import { normalizeViewSegments } from '@/lib/router/view-segments'

describe('normalizeViewSegments', () => {
	test('returns an empty list for the root route', () => {
		expect(normalizeViewSegments(undefined)).toEqual([])
	})

	test('keeps catch-all segments intact', () => {
		expect(normalizeViewSegments(['hub', 'dashboard'])).toEqual([
			'hub',
			'dashboard',
		])
	})

	test('wraps single string params', () => {
		expect(normalizeViewSegments('hub')).toEqual(['hub'])
	})
})
