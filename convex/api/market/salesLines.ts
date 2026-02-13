import { salesLines } from '@server/convex/market'
import { query } from 'convex/functions'
import { createTenantScoped, pagination } from 'convex/utils'
import { zid } from 'convex-helpers/server/zod4'
export const { list, getById, create, update, remove, transitionStatus, kpis } =
	createTenantScoped({
		moduleName: 'market',
		prefix: 'salesLines',
		primaryTable: 'salesLines',
		createSchema: salesLines.insertSchema,
		updateSchema: salesLines.updateSchema,
	})

export const getByDocumentNo = query({
	args: {
		documentNo: zid('salesHeaders'),
		pagination: pagination,
	},
	handler: async (ctx, args) => {
		return ctx.paginate('salesLines', {
			index: 'by_documentNo',
			indexRange: (q) => q.eq('documentNo', args.documentNo),
			paginationOpts: args.pagination,
		})
	},
})
