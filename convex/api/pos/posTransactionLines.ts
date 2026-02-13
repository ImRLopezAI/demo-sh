import { posTransactionLines } from '@server/convex/pos'
import { createTenantScoped } from '../../utils'

export const { list, getById, create, update, remove, transitionStatus, kpis } =
	createTenantScoped({
		moduleName: 'pos',
		prefix: 'posTransactionLines',
		primaryTable: 'posTransactionLines',
		createSchema: posTransactionLines.insertSchema,
		updateSchema: posTransactionLines.updateSchema,
	})
