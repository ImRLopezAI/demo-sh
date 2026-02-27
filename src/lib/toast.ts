import { type SileoOptions, type SileoPosition, sileo } from 'sileo'

type ToastLevel = 'show' | 'success' | 'error' | 'warning' | 'info' | 'action'

type ToastModuleId =
	| 'hub'
	| 'market'
	| 'insight'
	| 'replenishment'
	| 'ledger'
	| 'flow'
	| 'payroll'
	| 'pos'
	| 'trace'
	| 'grid'

type AppToastOptions = SileoOptions & {
	moduleId?: ToastModuleId
}

type ToastInput = string | AppToastOptions

const MODULE_TOAST_PRESETS: Record<ToastModuleId, Partial<SileoOptions>> = {
	hub: { fill: '#5B7CFA', roundness: 28 },
	market: { fill: '#3BA76F', roundness: 26 },
	insight: { fill: '#2A9EC9', roundness: 22 },
	replenishment: { fill: '#6B8E23', roundness: 18 },
	ledger: { fill: '#0F8AA8', roundness: 14 },
	flow: { fill: '#147D6A', roundness: 24 },
	payroll: { fill: '#A25CD6', roundness: 30 },
	pos: { fill: '#F97316', roundness: 999 },
	trace: { fill: '#8B5CF6', roundness: 20 },
	grid: { fill: '#64748B', roundness: 10 },
}

function normalizeToastOptions(
	input: ToastInput,
	extra?: AppToastOptions,
): SileoOptions {
	const base =
		typeof input === 'string'
			? ({ title: input, ...extra } satisfies AppToastOptions)
			: ({ ...input, ...extra } satisfies AppToastOptions)

	const modulePreset = base.moduleId
		? MODULE_TOAST_PRESETS[base.moduleId]
		: undefined
	const { moduleId: _moduleId, ...withoutModule } = base

	return {
		...modulePreset,
		...withoutModule,
	}
}

function runToast(
	level: ToastLevel,
	input: ToastInput,
	extra?: AppToastOptions,
) {
	const options = normalizeToastOptions(input, extra)
	switch (level) {
		case 'success':
			return sileo.success(options)
		case 'error':
			return sileo.error(options)
		case 'warning':
			return sileo.warning(options)
		case 'info':
			return sileo.info(options)
		case 'action':
			return sileo.action(options)
		default:
			return sileo.show(options)
	}
}

export const toast = {
	show(input: ToastInput, extra?: AppToastOptions) {
		return runToast('show', input, extra)
	},
	success(input: ToastInput, extra?: AppToastOptions) {
		return runToast('success', input, extra)
	},
	error(input: ToastInput, extra?: AppToastOptions) {
		return runToast('error', input, extra)
	},
	warning(input: ToastInput, extra?: AppToastOptions) {
		return runToast('warning', input, extra)
	},
	info(input: ToastInput, extra?: AppToastOptions) {
		return runToast('info', input, extra)
	},
	action(input: ToastInput, extra?: AppToastOptions) {
		return runToast('action', input, extra)
	},
	dismiss(id: string) {
		sileo.dismiss(id)
	},
	clear(position?: SileoPosition) {
		sileo.clear(position)
	},
}

export type { AppToastOptions, ToastModuleId }
