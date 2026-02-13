import { shipmentLines } from '@server/convex/trace'
import { createTenantScoped } from '../../utils'

export const { list, getById, create, update, remove, transitionStatus, kpis } =
	createTenantScoped({
		moduleName: 'trace',
		prefix: 'shipmentLines',
		primaryTable: 'shipmentLines',
		createSchema: shipmentLines.insertSchema,
		updateSchema: shipmentLines.updateSchema,
	})
