import dynamic from 'next/dynamic'

export const VIEW_COMPONENTS = {
	'/': dynamic(() => import('./_views')),
	'hub/dashboard': dynamic(() => import('./_views/hub/dashboard')),
	'hub/tasks': dynamic(() => import('./_views/hub/tasks-list')),
	'hub/notifications': dynamic(() => import('./_views/hub/notifications-list')),
	'hub/reporting': dynamic(() => import('./_views/hub/reporting-center')),
	'hub/order-fulfillment': dynamic(
		() => import('./_views/hub/order-fulfillment'),
	),
	'market/dashboard': dynamic(() => import('./_views/market/dashboard')),
	'market/sales-orders': dynamic(
		() => import('./_views/market/sales-orders-list'),
	),
	'market/items': dynamic(() => import('./_views/market/items-list')),
	'market/customers': dynamic(() => import('./_views/market/customers-list')),
	'market/carts': dynamic(() => import('./_views/market/carts-list')),
	'market/pricing-returns': dynamic(
		() => import('./_views/market/pricing-returns'),
	),
	'insight/dashboard': dynamic(() => import('./_views/insight/dashboard')),
	'insight/item-ledger': dynamic(
		() => import('./_views/insight/item-ledger-list'),
	),
	'insight/locations': dynamic(() => import('./_views/insight/locations-list')),
	'insight/value-entries': dynamic(
		() => import('./_views/insight/value-entries-list'),
	),
	'insight/forecast-workbench': dynamic(
		() => import('./_views/insight/forecast-workbench'),
	),
	'replenishment/dashboard': dynamic(
		() => import('./_views/replenishment/dashboard'),
	),
	'replenishment/purchase-orders': dynamic(
		() => import('./_views/replenishment/purchase-orders-list'),
	),
	'replenishment/vendors': dynamic(
		() => import('./_views/replenishment/vendors-list'),
	),
	'replenishment/transfers': dynamic(
		() => import('./_views/replenishment/transfers-list'),
	),
	'replenishment/planning-workbench': dynamic(
		() => import('./_views/replenishment/planning-workbench'),
	),
	'ledger/dashboard': dynamic(() => import('./_views/ledger/dashboard')),
	'ledger/invoices': dynamic(() => import('./_views/ledger/invoices-list')),
	'ledger/customer-ledger': dynamic(
		() => import('./_views/ledger/customer-ledger-list'),
	),
	'ledger/gl-entries': dynamic(() => import('./_views/ledger/gl-entries-list')),
	'ledger/collections-compliance': dynamic(
		() => import('./_views/ledger/collections-compliance'),
	),
	'flow/dashboard': dynamic(() => import('./_views/flow/dashboard')),
	'flow/bank-accounts': dynamic(
		() => import('./_views/flow/bank-accounts-list'),
	),
	'flow/bank-ledger': dynamic(() => import('./_views/flow/bank-ledger-list')),
	'flow/payment-journal': dynamic(
		() => import('./_views/flow/payment-journal'),
	),
	'flow/gl-entries': dynamic(() => import('./_views/flow/gl-entries-list')),
	'flow/reconciliation-approvals': dynamic(
		() => import('./_views/flow/reconciliation-approvals'),
	),
	'payroll/dashboard': dynamic(() => import('./_views/payroll/dashboard')),
	'payroll/employees': dynamic(() => import('./_views/payroll/employees-list')),
	'payroll/employee-ledger': dynamic(
		() => import('./_views/payroll/employee-ledger-list'),
	),
	'payroll/payroll-journal': dynamic(
		() => import('./_views/payroll/payroll-journal'),
	),
	'payroll/gl-entries': dynamic(
		() => import('./_views/payroll/gl-entries-list'),
	),
	'payroll/bank-ledger': dynamic(
		() => import('./_views/payroll/bank-ledger-list'),
	),
	'payroll/adjustments-offcycle': dynamic(
		() => import('./_views/payroll/adjustments-offcycle'),
	),
	'pos/dashboard': dynamic(() => import('./_views/pos/dashboard')),
	'pos/transactions': dynamic(() => import('./_views/pos/transactions-list')),
	'pos/terminals': dynamic(() => import('./_views/pos/terminals-list')),
	'pos/sessions': dynamic(() => import('./_views/pos/sessions-list')),
	'pos/terminal': dynamic(() => import('./_views/pos/terminal-view')),
	'pos/shift-controls': dynamic(() => import('./_views/pos/shift-controls')),
	'trace/dashboard': dynamic(() => import('./_views/trace/dashboard')),
	'trace/shipments': dynamic(() => import('./_views/trace/shipments-list')),
	'trace/shipment-methods': dynamic(
		() => import('./_views/trace/shipment-methods-list'),
	),
	'trace/carrier-ops': dynamic(() => import('./_views/trace/carrier-ops')),
} as const

export type ViewRouteKey = keyof typeof VIEW_COMPONENTS

export function isViewRouteKey(key: string): key is ViewRouteKey {
	return key in VIEW_COMPONENTS
}
