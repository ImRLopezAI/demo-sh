import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
	seedLog: defineTable({
		tableName: v.string(),
		count: v.number(),
		seededAt: v.number(),
		status: v.string(),
	}).index('by_tableName', ['tableName']),
})
