import { defineSchema } from "convex/server"
import { zodTable } from "../src/server/convex/helpers"
import * as z from "zod"

// ---------------------------------------------------------------------------
// Table definitions using zodTable (Zod → Convex)
// ---------------------------------------------------------------------------

export const customers = zodTable("customers", (zid) => ({
	name: z.string(),
	email: z.string(),
	phone: z.string().optional(),
	blocked: z.boolean().default(false),
}))

export const items = zodTable("items", (zid) => ({
	itemNo: z.string(),
	description: z.string(),
	unitPrice: z.number().default(0),
	blocked: z.boolean().default(false),
}))

export const salesHeaders = zodTable("salesHeaders", (zid) => ({
	documentNo: z.string(),
	customerId: zid("customers"),
	status: z.enum(["OPEN", "RELEASED", "POSTED"]).default("OPEN"),
}))

export const salesLines = zodTable("salesLines", (zid) => ({
	documentNo: zid("salesHeaders"),
	itemId: zid("items"),
	quantity: z.number(),
	unitPrice: z.number(),
	lineAmount: z.number(),
}))

// ---------------------------------------------------------------------------
// Convex schema with indexes for relation lookups
// ---------------------------------------------------------------------------

export default defineSchema({
	customers: customers
		.table()
		.index("by_email", ["email"]),

	items: items
		.table()
		.index("by_itemNo", ["itemNo"]),

	salesHeaders: salesHeaders
		.table()
		.index("by_documentNo", ["documentNo"])
		.index("by_customerId", ["customerId"]),

	salesLines: salesLines
		.table()
		.index("by_documentNo", ["documentNo"])
		.index("by_itemId", ["itemId"]),
})
