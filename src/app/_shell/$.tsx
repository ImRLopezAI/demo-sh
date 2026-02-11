import { createFileRoute } from '@tanstack/react-router'
import type { ComponentType, LazyExoticComponent } from 'react'
import { lazy, Suspense } from 'react'

const VIEW_COMPONENTS = {
	'hub/dashboard': lazy(() => import('./_views/hub/dashboard')),
	'hub/tasks': lazy(() => import('./_views/hub/tasks-list')),
	'hub/notifications': lazy(() => import('./_views/hub/notifications-list')),
	'market/dashboard': lazy(() => import('./_views/market/dashboard')),
	'market/sales-orders': lazy(
		() => import('./_views/market/sales-orders-list'),
	),
	'market/items': lazy(() => import('./_views/market/items-list')),
	'market/customers': lazy(() => import('./_views/market/customers-list')),
	'market/carts': lazy(() => import('./_views/market/carts-list')),
	'insight/dashboard': lazy(() => import('./_views/insight/dashboard')),
	'insight/item-ledger': lazy(
		() => import('./_views/insight/item-ledger-list'),
	),
	'insight/locations': lazy(() => import('./_views/insight/locations-list')),
	'insight/value-entries': lazy(
		() => import('./_views/insight/value-entries-list'),
	),
	'replenishment/dashboard': lazy(
		() => import('./_views/replenishment/dashboard'),
	),
	'replenishment/purchase-orders': lazy(
		() => import('./_views/replenishment/purchase-orders-list'),
	),
	'replenishment/vendors': lazy(
		() => import('./_views/replenishment/vendors-list'),
	),
	'replenishment/transfers': lazy(
		() => import('./_views/replenishment/transfers-list'),
	),
	'ledger/dashboard': lazy(() => import('./_views/ledger/dashboard')),
	'ledger/invoices': lazy(() => import('./_views/ledger/invoices-list')),
	'ledger/customer-ledger': lazy(
		() => import('./_views/ledger/customer-ledger-list'),
	),
	'ledger/gl-entries': lazy(() => import('./_views/ledger/gl-entries-list')),
	'flow/dashboard': lazy(() => import('./_views/flow/dashboard')),
	'flow/bank-accounts': lazy(() => import('./_views/flow/bank-accounts-list')),
	'flow/bank-ledger': lazy(() => import('./_views/flow/bank-ledger-list')),
	'flow/payment-journal': lazy(() => import('./_views/flow/payment-journal')),
	'flow/gl-entries': lazy(() => import('./_views/flow/gl-entries-list')),
	'payroll/dashboard': lazy(() => import('./_views/payroll/dashboard')),
	'payroll/employees': lazy(() => import('./_views/payroll/employees-list')),
	'payroll/employee-ledger': lazy(
		() => import('./_views/payroll/employee-ledger-list'),
	),
	'payroll/payroll-journal': lazy(
		() => import('./_views/payroll/payroll-journal'),
	),
	'payroll/gl-entries': lazy(() => import('./_views/payroll/gl-entries-list')),
	'payroll/bank-ledger': lazy(
		() => import('./_views/payroll/bank-ledger-list'),
	),
	'pos/dashboard': lazy(() => import('./_views/pos/dashboard')),
	'pos/transactions': lazy(() => import('./_views/pos/transactions-list')),
	'pos/terminals': lazy(() => import('./_views/pos/terminals-list')),
	'pos/sessions': lazy(() => import('./_views/pos/sessions-list')),
	'pos/terminal': lazy(() => import('./_views/pos/terminal-view')),
	'trace/dashboard': lazy(() => import('./_views/trace/dashboard')),
	'trace/shipments': lazy(() => import('./_views/trace/shipments-list')),
	'trace/shipment-methods': lazy(
		() => import('./_views/trace/shipment-methods-list'),
	),
} as const satisfies Record<string, LazyExoticComponent<ComponentType>>

type ViewRouteKey = keyof typeof VIEW_COMPONENTS

function isViewRouteKey(key: string): key is ViewRouteKey {
	return key in VIEW_COMPONENTS
}

export const Route = createFileRoute('/_shell/$')({
	component: RouteComponent,
})

function RouteComponent() {
	const { _splat } = Route.useParams()
	const routeKey = _splat ?? ''

	if (!isViewRouteKey(routeKey)) {
		return (
			<div className='flex h-64 items-center justify-center text-muted-foreground'>
				Page not found
			</div>
		)
	}
	const ViewComponent = VIEW_COMPONENTS[routeKey]

	return (
		<Suspense fallback={<ViewSkeleton />}>
			<ViewComponent />
		</Suspense>
	)
}

function ViewSkeleton() {
	return (
		<div className='space-y-6'>
			<div className='h-8 w-48 animate-pulse rounded bg-muted' />
			<div className='grid grid-cols-4 gap-3'>
				{Array.from({ length: 4 }).map((_, i) => (
					<div
						key={`skeleton-${i}`}
						className='h-20 animate-pulse rounded-lg bg-muted'
					/>
				))}
			</div>
			<div className='h-96 animate-pulse rounded-lg bg-muted' />
		</div>
	)
}
