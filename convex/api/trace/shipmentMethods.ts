import { shipmentMethods } from '@server/convex/trace'
import { createTenantScoped } from '../../utils'

export const { list, getById, create, update, remove, transitionStatus, kpis } =
	createTenantScoped({
		moduleName: 'trace',
		prefix: 'shipmentMethods',
		primaryTable: 'shipmentMethods',
		createSchema: shipmentMethods.insertSchema,
		updateSchema: shipmentMethods.updateSchema,
	})
