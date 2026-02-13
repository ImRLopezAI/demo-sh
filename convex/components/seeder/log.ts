import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

export const logSeed = mutation({
	args: {
		tableName: v.string(),
		count: v.number(),
		status: v.string(),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const existing = await ctx.db
			.query('seedLog')
			.withIndex('by_tableName', (q) => q.eq('tableName', args.tableName))
			.unique()

		if (existing) {
			await ctx.db.patch(existing._id, {
				count: existing.count + args.count,
				seededAt: Date.now(),
				status: args.status,
			})
		} else {
			await ctx.db.insert('seedLog', {
				tableName: args.tableName,
				count: args.count,
				seededAt: Date.now(),
				status: args.status,
			})
		}
		return null
	},
})

export const clearLog = mutation({
	args: {},
	returns: v.null(),
	handler: async (ctx) => {
		const entries = await ctx.db.query('seedLog').collect()
		for (const entry of entries) {
			await ctx.db.delete(entry._id)
		}
		return null
	},
})

export const getSeedStatus = query({
	args: {},
	returns: v.any(),
	handler: async (ctx) => {
		return await ctx.db.query('seedLog').collect()
	},
})
