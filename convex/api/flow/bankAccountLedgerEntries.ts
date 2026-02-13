import { bankAccountLedgerEntries } from '@server/convex/flow'
import { createTenantScoped } from 'convex/utils'

export const { list, getById, create, update, remove, transitionStatus, kpis } =
	createTenantScoped({
		moduleName: 'flow',
		prefix: 'bankLedgerEntries',
		primaryTable: 'bankAccountLedgerEntries',
		statusField: 'reconciliationStatus',
		transitions: {
			OPEN: ['MATCHED', 'EXCEPTION'],
			MATCHED: ['RECONCILED', 'EXCEPTION'],
			EXCEPTION: ['MATCHED'],
		},
		reasonRequiredStatuses: ['EXCEPTION'],
		createSchema: bankAccountLedgerEntries.insertSchema,
		updateSchema: bankAccountLedgerEntries.updateSchema,
	})
