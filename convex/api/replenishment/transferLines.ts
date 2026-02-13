import { transferLines } from '@server/convex/replenishment'
import { createTenantScoped } from 'convex/utils'

export const { list, getById, create, update, remove, transitionStatus, kpis } =
	createTenantScoped({
		moduleName: 'replenishment',
		prefix: 'transferLines',
		primaryTable: 'transferLines',
		createSchema: transferLines.insertSchema,
		updateSchema: transferLines.updateSchema,
	})
