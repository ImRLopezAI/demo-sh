import { salesInvoiceHeaders } from '@server/convex/ledger'
import { createTenantScoped } from 'convex/utils'

export const { list, getById, create, update, remove, transitionStatus, kpis } =
	createTenantScoped({
		moduleName: 'ledger',
		prefix: 'salesInvoices',
		primaryTable: 'salesInvoiceHeaders',
		statusField: 'status',
		transitions: {
			DRAFT: ['POSTED'],
			POSTED: ['REVERSED'],
		},
		reasonRequiredStatuses: ['REVERSED'],
		createSchema: salesInvoiceHeaders.insertSchema,
		updateSchema: salesInvoiceHeaders.updateSchema,
	})
