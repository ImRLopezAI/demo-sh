import { query, mutation } from "./functions"
import { v } from "convex/values"
import { z } from "zod/v4"
import { engine } from "./engine"

/** List items with FlowFields + optional relation eager-loading */
export const listItems = query({
	args: {},
	handler: async (ctx) => {
		return ctx.findMany("items", {
			where: (item) => !item.blocked,
			limit: 50,
			with: { salesLines: true },
		})
	},
})

/** Get a single item by itemNo */
export const getItemByNo = query({
	args: { itemNo: v.string() },
	handler: async (ctx, args) => {
		return await ctx.findFirst("items", {
			index: "by_itemNo",
			indexRange: (q) => q.eq("itemNo", args.itemNo),
			with: { salesLines: true },
		})
	},
})

/** Create item — itemNo auto-assigned by NoSeries trigger */
export const createItem = mutation({
	args: {
		description: v.string(),
		unitPrice: v.number(),
	},
	handler: async (ctx, args) => {
		return await ctx.db.insert("items", {
			itemNo: "",
			description: args.description,
			unitPrice: args.unitPrice,
			blocked: false,
			createdAt: new Date().toISOString(),
		})
	},
})

/** Create item using Zod schema validation */
export const createItemZod = mutation({
	args: {
		description: z.string().min(1),
		unitPrice: z.number().nonnegative(),
	},
	handler: async (ctx, args) => {
		return await ctx.db.insert("items", {
			itemNo: "",
			description: args.description,
			unitPrice: args.unitPrice,
			blocked: false,
			createdAt: new Date().toISOString(),
		})
	},
})

/** Get item by itemNo using Zod schema validation */
export const getItemByNoZod = query({
	args: { itemNo: z.string() },
	handler: async (ctx, args) => {
		return await ctx.findFirst("items", {
			index: "by_itemNo",
			indexRange: (q) => q.eq("itemNo", args.itemNo),
			with: { salesLines: true },
		})
	},
})

/** List all items with all FlowFields resolved (no filter) */
export const listItemsWithFlowFields = query({
	args: {},
	handler: async (ctx) => {
		return ctx.findMany("items", {
			limit: 50,
		})
	},
})

/** List sales lines with lookup FlowField */
export const listSalesLines = query({
	args: {},
	handler: async (ctx) => {
		return ctx.findMany("salesLines", {
			limit: 50,
		})
	},
})

/** Create a sales line (triggers FlowField aggregate updates) */
export const createSalesLine = mutation({
	args: {
		documentNo: v.id("salesHeaders"),
		itemId: v.id("items"),
		quantity: v.number(),
		unitPrice: v.number(),
		lineAmount: v.number(),
	},
	handler: async (ctx, args) => {
		return await ctx.db.insert("salesLines", {
			...args,
			createdAt: new Date().toISOString(),
		})
	},
})

/** Initialize all NoSeries (run once at setup) */
export const initSeries = mutation({
	args: {},
	handler: async (ctx) => {
		await engine.initSeries(ctx)
	},
})
