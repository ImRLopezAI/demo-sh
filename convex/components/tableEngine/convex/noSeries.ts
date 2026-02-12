import { mutation, query } from "./_generated/server"
import { v } from "convex/values"

/** Parse a pattern like "ITEM0000001" into { prefix, digits, start } */
function parsePattern(pattern: string): {
	prefix: string
	digits: number
	start: number
} {
	const match = pattern.match(/^([A-Za-z]*)(\d+)$/)
	if (!match) throw new Error(`Invalid pattern: ${pattern}`)
	const prefix = match[1]
	const numStr = match[2]
	return {
		prefix,
		digits: numStr.length,
		start: Number.parseInt(numStr, 10),
	}
}

/** Format a number into a code using pattern info */
function formatCode(
	prefix: string,
	digits: number,
	value: number,
): string {
	return `${prefix}${String(value).padStart(digits, "0")}`
}

export const initSeries = mutation({
	args: {
		code: v.string(),
		pattern: v.string(),
		incrementBy: v.optional(v.number()),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const existing = await ctx.db
			.query("noSeries")
			.withIndex("by_code", (q) => q.eq("code", args.code))
			.unique()

		const { start } = parsePattern(args.pattern)
		const lastUsed = start - (args.incrementBy ?? 1)

		if (existing) {
			await ctx.db.patch(existing._id, {
				pattern: args.pattern,
				lastUsed,
				incrementBy: args.incrementBy ?? 1,
				active: true,
			})
		} else {
			await ctx.db.insert("noSeries", {
				code: args.code,
				pattern: args.pattern,
				lastUsed,
				incrementBy: args.incrementBy ?? 1,
				active: true,
			})
		}
		return null
	},
})

export const getNextCode = mutation({
	args: { code: v.string() },
	returns: v.string(),
	handler: async (ctx, args) => {
		const series = await ctx.db
			.query("noSeries")
			.withIndex("by_code", (q) => q.eq("code", args.code))
			.unique()

		if (!series) throw new Error(`NoSeries not found: ${args.code}`)
		if (!series.active) throw new Error(`NoSeries disabled: ${args.code}`)

		const { prefix, digits } = parsePattern(series.pattern)
		const nextValue = series.lastUsed + series.incrementBy

		await ctx.db.patch(series._id, { lastUsed: nextValue })

		return formatCode(prefix, digits, nextValue)
	},
})

export const peekNextCode = query({
	args: { code: v.string() },
	returns: v.string(),
	handler: async (ctx, args) => {
		const series = await ctx.db
			.query("noSeries")
			.withIndex("by_code", (q) => q.eq("code", args.code))
			.unique()

		if (!series) throw new Error(`NoSeries not found: ${args.code}`)

		const { prefix, digits } = parsePattern(series.pattern)
		const nextValue = series.lastUsed + series.incrementBy

		return formatCode(prefix, digits, nextValue)
	},
})

export const resetSeries = mutation({
	args: {
		code: v.string(),
		startAt: v.optional(v.number()),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const series = await ctx.db
			.query("noSeries")
			.withIndex("by_code", (q) => q.eq("code", args.code))
			.unique()

		if (!series) throw new Error(`NoSeries not found: ${args.code}`)

		const { start } = parsePattern(series.pattern)
		const resetTo = args.startAt ?? start
		const lastUsed = resetTo - series.incrementBy

		await ctx.db.patch(series._id, { lastUsed })
		return null
	},
})
