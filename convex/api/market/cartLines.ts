import { cartLines } from '@server/convex/market'
import { createTenantScoped } from 'convex/utils'

export const { list, getById, create, update, remove, transitionStatus, kpis } =
	createTenantScoped({
		moduleName: 'market',
		prefix: 'cartLines',
		primaryTable: 'cartLines',
		createSchema: cartLines.insertSchema,
		updateSchema: cartLines.updateSchema,
	})
