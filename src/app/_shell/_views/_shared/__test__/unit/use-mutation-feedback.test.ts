import { describe, expect, test } from 'vitest'
import {
	mutationToastLevelForOperation,
	resolveMutationToastPolicy,
} from '@/app/_shell/_views/_shared/use-mutation-feedback'

describe('resolveMutationToastPolicy', () => {
	test('defaults to success+error for create and error-only for update', () => {
		const policy = resolveMutationToastPolicy('market')

		expect(mutationToastLevelForOperation(policy, 'create')).toBe(
			'success-and-error',
		)
		expect(mutationToastLevelForOperation(policy, 'update')).toBe('error-only')
	})

	test('keeps module-specific override for insight', () => {
		const policy = resolveMutationToastPolicy('insight')

		expect(mutationToastLevelForOperation(policy, 'update')).toBe('error-only')
		expect(mutationToastLevelForOperation(policy, 'transitionStatus')).toBe(
			'success-and-error',
		)
	})

	test('allows per-view overrides to silence selected operations', () => {
		const policy = resolveMutationToastPolicy('pos', {
			byOperation: {
				create: 'silent',
				transitionStatus: 'silent',
			},
		})

		expect(mutationToastLevelForOperation(policy, 'create')).toBe('silent')
		expect(mutationToastLevelForOperation(policy, 'transitionStatus')).toBe(
			'silent',
		)
		expect(mutationToastLevelForOperation(policy, 'delete')).toBe(
			'success-and-error',
		)
	})
})
