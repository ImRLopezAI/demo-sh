import { purchaseLines } from '@server/convex/replenishment'
import { createTenantScoped } from 'convex/utils'

export const { list, getById, create, update, remove, transitionStatus, kpis } =
	createTenantScoped({
		moduleName: 'replenishment',
		prefix: 'purchaseLines',
		primaryTable: 'purchaseLines',
		createSchema: purchaseLines.insertSchema,
		updateSchema: purchaseLines.updateSchema,
	})
