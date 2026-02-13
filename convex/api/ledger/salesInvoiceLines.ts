import { salesInvoiceLines } from '@server/convex/ledger'
import { createTenantScoped } from 'convex/utils'

export const { list, getById, create, update, remove, transitionStatus, kpis } =
	createTenantScoped({
		moduleName: 'ledger',
		prefix: 'salesInvoiceLines',
		primaryTable: 'salesInvoiceLines',
		createSchema: salesInvoiceLines.insertSchema,
		updateSchema: salesInvoiceLines.updateSchema,
	})
