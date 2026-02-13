import { bankAccounts } from '@server/convex/flow'
import { createTenantScoped } from 'convex/utils'

export const { list, getById, create, update, remove, transitionStatus, kpis } =
	createTenantScoped({
		moduleName: 'flow',
		prefix: 'bankAccounts',
		primaryTable: 'bankAccounts',
		statusField: 'status',
		transitions: {
			ACTIVE: ['INACTIVE', 'BLOCKED'],
			INACTIVE: ['ACTIVE', 'BLOCKED'],
			BLOCKED: ['ACTIVE', 'INACTIVE'],
		},
		reasonRequiredStatuses: ['BLOCKED'],
		createSchema: bankAccounts.insertSchema,
		updateSchema: bankAccounts.updateSchema,
	})
