import { genJournalLines } from '@server/convex/flow'
import { createTenantScoped } from 'convex/utils'

export const { list, getById, create, update, remove, transitionStatus, kpis } =
	createTenantScoped({
		moduleName: 'flow',
		prefix: 'journalLines',
		primaryTable: 'genJournalLines',
		statusField: 'status',
		transitions: {
			OPEN: ['APPROVED', 'POSTED', 'VOIDED'],
			APPROVED: ['POSTED', 'VOIDED'],
		},
		reasonRequiredStatuses: ['VOIDED'],
		createSchema: genJournalLines.insertSchema,
		updateSchema: genJournalLines.updateSchema,
	})
