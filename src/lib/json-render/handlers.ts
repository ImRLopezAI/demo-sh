/**
 * json-render Action Handlers
 *
 * Custom action handlers beyond the built-ins (setState, pushState, removeState, navigate).
 * `navigate` is already handled internally by the page renderer wrapper.
 *
 * These are dispatched from specs via `on` bindings:
 *   { "action": "refreshDashboard", "params": { "module": "hub" } }
 */

type ActionHandler = (params: Record<string, unknown>) => void

/* ── Toast Notifications ── */

const showToast: ActionHandler = (params) => {
	const event = new CustomEvent('json-render:toast', {
		detail: {
			title: String(params.title ?? 'Notification'),
			variant: params.variant ?? 'default',
		},
	})
	window.dispatchEvent(event)
}

/* ── Clipboard ── */

const copyToClipboard: ActionHandler = (params) => {
	const text = String(params.text ?? '')
	if (text && navigator.clipboard) {
		navigator.clipboard.writeText(text).catch(() => {
			// Fallback: noop if clipboard access is denied
		})
	}
}

/* ── Print ── */

const printPage: ActionHandler = () => {
	window.print()
}

/* ── External Link ── */

const openExternal: ActionHandler = (params) => {
	const url = String(params.url ?? '')
	if (url) {
		window.open(url, '_blank', 'noopener,noreferrer')
	}
}

/* ── Bulk Action Confirmation ── */

const confirmBulkAction: ActionHandler = (params) => {
	const event = new CustomEvent('json-render:bulk-confirm', {
		detail: {
			actionId: params.actionId,
			count: params.count,
			label: params.label,
		},
	})
	window.dispatchEvent(event)
}

/* ── Refresh ── */

const refreshData: ActionHandler = (params) => {
	const event = new CustomEvent('json-render:refresh', {
		detail: { module: params.module, entity: params.entity },
	})
	window.dispatchEvent(event)
}

/* ── Export ── */

const exportData: ActionHandler = (params) => {
	const event = new CustomEvent('json-render:export', {
		detail: {
			module: params.module,
			entity: params.entity,
			format: params.format ?? 'csv',
		},
	})
	window.dispatchEvent(event)
}

/* ── Handler Registry ── */

export const handlers: Record<string, ActionHandler> = {
	showToast,
	copyToClipboard,
	printPage,
	openExternal,
	confirmBulkAction,
	refreshData,
	exportData,
}
