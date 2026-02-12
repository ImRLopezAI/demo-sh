import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
	noSeries: defineTable({
		code: v.string(),
		pattern: v.string(),
		lastUsed: v.number(),
		incrementBy: v.number(),
		active: v.boolean(),
	}).index("by_code", ["code"]),
})
