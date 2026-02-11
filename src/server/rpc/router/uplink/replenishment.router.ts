import { createRPCRouter } from '@server/rpc/init'
import { createTenantScopedCrudRouter } from '../helpers'

const purchaseHeadersRouter = createTenantScopedCrudRouter({
	moduleName: 'replenishment/purchase-orders',
	primaryTable: 'purchaseHeaders',
	viewTables: { overview: 'purchaseHeaders' },
	statusField: 'status',
	transitions: {
		DRAFT: ['PENDING_APPROVAL'],
		PENDING_APPROVAL: ['APPROVED', 'REJECTED'],
		APPROVED: ['COMPLETED', 'CANCELED'],
		REJECTED: ['DRAFT'],
	},
	reasonRequiredStatuses: ['REJECTED', 'CANCELED'],
})

const purchaseLinesRouter = createTenantScopedCrudRouter({
	moduleName: 'replenishment/purchase-lines',
	primaryTable: 'purchaseLines',
	viewTables: { overview: 'purchaseLines' },
})

const vendorsRouter = createTenantScopedCrudRouter({
	moduleName: 'replenishment/vendors',
	primaryTable: 'vendors',
	viewTables: { overview: 'vendors' },
})

const transferHeadersRouter = createTenantScopedCrudRouter({
	moduleName: 'replenishment/transfers',
	primaryTable: 'transferHeaders',
	viewTables: { overview: 'transferHeaders' },
	statusField: 'status',
	transitions: {
		DRAFT: ['RELEASED'],
		RELEASED: ['IN_TRANSIT', 'CANCELED'],
		IN_TRANSIT: ['RECEIVED'],
	},
	reasonRequiredStatuses: ['CANCELED'],
})

const transferLinesRouter = createTenantScopedCrudRouter({
	moduleName: 'replenishment/transfer-lines',
	primaryTable: 'transferLines',
	viewTables: { overview: 'transferLines' },
})

export const replenishmentRouter = createRPCRouter({
	purchaseOrders: purchaseHeadersRouter,
	purchaseLines: purchaseLinesRouter,
	vendors: vendorsRouter,
	transfers: transferHeadersRouter,
	transferLines: transferLinesRouter,
})
