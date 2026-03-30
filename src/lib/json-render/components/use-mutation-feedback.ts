import type { AppToastOptions, ToastModuleId } from '@/lib/toast'
import { toast } from '@/lib/toast'

export type MutationOperation =
	| 'create'
	| 'update'
	| 'delete'
	| 'transitionStatus'

export type MutationToastLevel = 'silent' | 'error-only' | 'success-and-error'

export type MutationToastPolicy = {
	defaultLevel?: MutationToastLevel
	byOperation?: Partial<Record<MutationOperation, MutationToastLevel>>
	successTitleByOperation?: Partial<Record<MutationOperation, string>>
}

const BASE_MUTATION_POLICY: Required<MutationToastPolicy> = {
	defaultLevel: 'success-and-error',
	byOperation: {
		update: 'error-only',
	},
	successTitleByOperation: {
		create: 'Created successfully',
		update: 'Updated successfully',
		delete: 'Deleted successfully',
		transitionStatus: 'Status updated',
	},
}

const MODULE_MUTATION_POLICY: Partial<
	Record<ToastModuleId, MutationToastPolicy>
> = {
	insight: {
		defaultLevel: 'error-only',
		byOperation: {
			create: 'success-and-error',
			delete: 'success-and-error',
			transitionStatus: 'success-and-error',
			update: 'error-only',
		},
	},
	pos: {
		defaultLevel: 'success-and-error',
		byOperation: {
			update: 'error-only',
		},
	},
}

export function operationLabel(op: MutationOperation): string {
	switch (op) {
		case 'create':
			return 'Create'
		case 'update':
			return 'Update'
		case 'delete':
			return 'Delete'
		case 'transitionStatus':
			return 'Status transition'
	}
}

function extractErrorMessage(error: unknown): string {
	if (error instanceof Error) return error.message
	if (typeof error === 'object' && error && 'message' in error)
		return String((error as { message: unknown }).message)
	return 'An unexpected error occurred'
}

function mergePolicy(
	modulePolicy?: MutationToastPolicy,
	override?: MutationToastPolicy,
): Required<MutationToastPolicy> {
	return {
		defaultLevel:
			override?.defaultLevel ??
			modulePolicy?.defaultLevel ??
			BASE_MUTATION_POLICY.defaultLevel,
		byOperation: {
			...BASE_MUTATION_POLICY.byOperation,
			...(modulePolicy?.byOperation ?? {}),
			...(override?.byOperation ?? {}),
		},
		successTitleByOperation: {
			...BASE_MUTATION_POLICY.successTitleByOperation,
			...(modulePolicy?.successTitleByOperation ?? {}),
			...(override?.successTitleByOperation ?? {}),
		},
	}
}

export function mutationToastLevelForOperation(
	policy: Required<MutationToastPolicy>,
	operation: MutationOperation,
): MutationToastLevel {
	return policy.byOperation[operation] ?? policy.defaultLevel
}

export function resolveMutationToastPolicy(
	moduleId: ToastModuleId,
	override?: MutationToastPolicy,
) {
	return mergePolicy(MODULE_MUTATION_POLICY[moduleId], override)
}

export function notifyMutationError(args: {
	moduleId: ToastModuleId
	operation: MutationOperation
	error: unknown
	options?: AppToastOptions
}) {
	toast.error(`${operationLabel(args.operation)} failed`, {
		moduleId: args.moduleId,
		description: extractErrorMessage(args.error),
		...args.options,
	})
}

export function notifyMutationSuccess(args: {
	moduleId: ToastModuleId
	operation: MutationOperation
	policy: Required<MutationToastPolicy>
	options?: AppToastOptions
}) {
	const level = mutationToastLevelForOperation(args.policy, args.operation)
	if (level !== 'success-and-error') return

	toast.success(
		args.policy.successTitleByOperation[args.operation] ??
			`${operationLabel(args.operation)} completed`,
		{
			moduleId: args.moduleId,
			...args.options,
		},
	)
}
