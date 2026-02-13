import { posTransactions } from '@server/convex/pos'
import { createTenantScoped } from '../../utils'

export const { list, getById, create, update, remove, transitionStatus, kpis } =
	createTenantScoped({
		moduleName: 'pos',
		prefix: 'posTransactions',
		primaryTable: 'posTransactions',
		statusField: 'status',
		transitions: {
			OPEN: ['COMPLETED', 'VOIDED'],
			COMPLETED: ['REFUNDED'],
		},
		reasonRequiredStatuses: ['VOIDED', 'REFUNDED'],
		createSchema: posTransactions.insertSchema,
		updateSchema: posTransactions.updateSchema,
	})
