import { createRPCRouter } from '@server/rpc/init'
import { createTenantScopedCrudRouter } from '../helpers'

const salesHeadersRouter = createTenantScopedCrudRouter({
	moduleName: 'market/sales-orders',
	primaryTable: 'salesHeaders',
	viewTables: { overview: 'salesHeaders' },
	statusField: 'status',
	transitions: {
		DRAFT: ['PENDING_APPROVAL'],
		PENDING_APPROVAL: ['APPROVED', 'REJECTED'],
		APPROVED: ['COMPLETED', 'CANCELED'],
		REJECTED: ['DRAFT'],
	},
	reasonRequiredStatuses: ['REJECTED', 'CANCELED'],
})

const salesLinesRouter = createTenantScopedCrudRouter({
	moduleName: 'market/sales-lines',
	primaryTable: 'salesLines',
	viewTables: { overview: 'salesLines' },
})

const itemsRouter = createTenantScopedCrudRouter({
	moduleName: 'market/items',
	primaryTable: 'items',
	viewTables: { overview: 'items' },
})

const customersRouter = createTenantScopedCrudRouter({
	moduleName: 'market/customers',
	primaryTable: 'customers',
	viewTables: { overview: 'customers' },
})

const cartsRouter = createTenantScopedCrudRouter({
	moduleName: 'market/carts',
	primaryTable: 'carts',
	viewTables: { overview: 'carts' },
	statusField: 'status',
	transitions: {
		OPEN: ['CHECKED_OUT', 'ABANDONED'],
	},
})

const cartLinesRouter = createTenantScopedCrudRouter({
	moduleName: 'market/cart-lines',
	primaryTable: 'cartLines',
	viewTables: { overview: 'cartLines' },
})

export const marketRouter = createRPCRouter({
	salesOrders: salesHeadersRouter,
	salesLines: salesLinesRouter,
	items: itemsRouter,
	customers: customersRouter,
	carts: cartsRouter,
	cartLines: cartLinesRouter,
})
