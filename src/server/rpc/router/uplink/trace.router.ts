import { createRPCRouter } from '@server/rpc/init'
import { createTenantScopedCrudRouter } from '../helpers'

const shipmentsRouter = createTenantScopedCrudRouter({
	moduleName: 'trace',
	prefix: 'shipments',
	primaryTable: 'shipments',
	viewTables: { overview: 'shipments' },
	statusField: 'status',
	transitions: {
		PLANNED: ['DISPATCHED', 'EXCEPTION'],
		DISPATCHED: ['IN_TRANSIT', 'EXCEPTION'],
		IN_TRANSIT: ['DELIVERED', 'EXCEPTION'],
		DELIVERED: ['EXCEPTION'],
	},
	reasonRequiredStatuses: ['EXCEPTION'],
})

const shipmentLinesRouter = createTenantScopedCrudRouter({
	moduleName: 'trace',
	prefix: 'shipment-lines',
	primaryTable: 'shipmentLines',
	viewTables: { overview: 'shipmentLines' },
})

const shipmentMethodsRouter = createTenantScopedCrudRouter({
	moduleName: 'trace',
	prefix: 'shipment-methods',
	primaryTable: 'shipmentMethods',
	viewTables: { overview: 'shipmentMethods' },
})

export const traceRouter = createRPCRouter({
	shipments: shipmentsRouter,
	shipmentLines: shipmentLinesRouter,
	shipmentMethods: shipmentMethodsRouter,
})
