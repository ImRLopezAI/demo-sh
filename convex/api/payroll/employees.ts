import { employees } from '@server/convex/payroll'
import { createTenantScoped } from 'convex/utils'

export const { list, getById, create, update, remove, transitionStatus, kpis } =
	createTenantScoped({
		moduleName: 'payroll',
		prefix: 'employees',
		primaryTable: 'employees',
		statusField: 'status',
		transitions: {
			ACTIVE: ['ON_LEAVE', 'TERMINATED'],
			ON_LEAVE: ['ACTIVE', 'TERMINATED'],
		},
		reasonRequiredStatuses: ['TERMINATED'],
		createSchema: employees.insertSchema,
		updateSchema: employees.updateSchema,
	})
