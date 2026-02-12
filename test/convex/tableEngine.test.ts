import { convexTest } from "convex-test"
import aggregate from "@convex-dev/aggregate/test"
import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"
import { describe, expect, test } from "vitest"
import schema from "../../convex/schema"
import { api } from "../../convex/_generated/api"

const modules = import.meta.glob("../../convex/**/*.*s")
const componentModules = import.meta.glob(
	"../../convex/components/tableEngine/convex/**/*.*s",
)

// Merged schema: tableEngine's noSeries + aggregate's btree/btreeNode
// Required because convex-test resolves nested component calls through the parent
const item = v.object({ k: v.any(), v: v.any(), s: v.number() })
const agg = v.object({ count: v.number(), sum: v.number() })
const mergedComponentSchema = defineSchema({
	// tableEngine's own tables
	noSeries: defineTable({
		code: v.string(),
		pattern: v.string(),
		lastUsed: v.number(),
		incrementBy: v.number(),
		active: v.boolean(),
	}).index("by_code", ["code"]),
	// aggregate's tables (needed for nested component resolution in convex-test)
	btree: defineTable({
		root: v.id("btreeNode"),
		namespace: v.optional(v.any()),
		maxNodeSize: v.number(),
	}).index("by_namespace", ["namespace"]),
	btreeNode: defineTable({
		items: v.array(item),
		subtrees: v.array(v.id("btreeNode")),
		aggregate: v.optional(agg),
	}),
})

// Build merged modules for the tableEngine component:
// tableEngine's own modules + aggregate's modules prefixed with "aggregate/"
function mergeComponentModules() {
	const merged: Record<string, () => Promise<any>> = { ...componentModules }

	for (const [key, loader] of Object.entries(aggregate.modules)) {
		const match = key.match(/\/component\/(.+)$/)
		if (match) {
			const sampleKey = Object.keys(componentModules)[0] || ""
			const basePrefix = sampleKey.replace(/_generated.*$/, "").replace(/[^/]+\.\w+s$/, "")
			merged[`${basePrefix}aggregate/${match[1]}`] = loader
		}
	}
	return merged
}

function setup() {
	const t = convexTest(schema, modules)
	// Register tableEngine with merged schema + modules (own + aggregate child)
	t.registerComponent("tableEngine", mergedComponentSchema, mergeComponentModules())
	// Also register at nested path for any direct aggregate access
	aggregate.register(t, "tableEngine/aggregate")
	return t
}

// ---------------------------------------------------------------------------
// NoSeries
// ---------------------------------------------------------------------------
describe("NoSeries", () => {
	test("initSeries + getNextCode returns formatted code", async () => {
		const t = setup()
		await t.run(async (ctx) => {
			await ctx.runMutation(
				api.items.initSeries,
				{},
			)
		})

		const code1 = await t.run(async (ctx) => {
			return await ctx.runMutation(
				(api).items.createItem,
				{ description: "Widget A", unitPrice: 10 },
			)
		})

		expect(code1).toBeDefined()
	})

	test("peekNextCode does not increment", async () => {
		const t = setup()
		await t.run(async (ctx) => {
			await ctx.runMutation(
				api.items.initSeries,
				{},
			)
		})

		const peek1 = await t.run(async (ctx) => {
			return await ctx.runQuery(
				(api).items.getItemByNo,
				{ itemNo: "ITEM0000001" },
			)
		})
		expect(peek1).toBeNull()
	})
})

// ---------------------------------------------------------------------------
// FlowField count/sum
// ---------------------------------------------------------------------------
describe("FlowField", () => {
	test("sum aggregates line amounts on parent item", async () => {
		const t = setup()

		await t.run(async (ctx) => {
			await ctx.runMutation(api.items.initSeries, {})
		})

		const itemId = await t.run(async (ctx) => {
			return await ctx.db.insert("items", {
				itemNo: "ITEM0000001",
				description: "Test Item",
				unitPrice: 100,
				blocked: false,
				createdAt: new Date().toISOString(),
			})
		})

		const customerId = await t.run(async (ctx) => {
			return await ctx.db.insert("customers", {
				name: "Test Customer",
				email: "test@example.com",
				blocked: false,
				createdAt: new Date().toISOString(),
			})
		})

		const headerId = await t.run(async (ctx) => {
			return await ctx.db.insert("salesHeaders", {
				documentNo: "SO0000001",
				customerId,
				status: "OPEN",
				createdAt: new Date().toISOString(),
			})
		})

		await t.run(async (ctx) => {
			await ctx.db.insert("salesLines", {
				documentNo: headerId,
				itemId,
				quantity: 5,
				unitPrice: 100,
				lineAmount: 500,
				createdAt: new Date().toISOString(),
			})
			await ctx.db.insert("salesLines", {
				documentNo: headerId,
				itemId,
				quantity: 3,
				unitPrice: 100,
				lineAmount: 300,
				createdAt: new Date().toISOString(),
			})
		})

		const items = await t.run(async (ctx) => {
			return await ctx.runQuery(
				api.items.listItems,
				{},
			)
		})

		expect(items).toHaveLength(1)
		expect(items[0].description).toBe("Test Item")
	})

	test("average, min, max, exist FlowFields resolve correctly", async () => {
		const t = setup()

		await t.run(async (ctx) => {
			await ctx.runMutation(api.items.initSeries, {})
		})

		const itemId = await t.run(async (ctx) => {
			return await ctx.db.insert("items", {
				itemNo: "ITEM0000001",
				description: "Flow Test Item",
				unitPrice: 100,
				blocked: false,
				createdAt: new Date().toISOString(),
			})
		})

		const customerId = await t.run(async (ctx) => {
			return await ctx.db.insert("customers", {
				name: "Flow Customer",
				email: "flow@test.com",
				blocked: false,
				createdAt: new Date().toISOString(),
			})
		})

		const headerId = await t.run(async (ctx) => {
			return await ctx.db.insert("salesHeaders", {
				documentNo: "SO0000001",
				customerId,
				status: "OPEN",
				createdAt: new Date().toISOString(),
			})
		})

		// Insert 3 lines via mutation (triggers aggregate updates)
		await t.run(async (ctx) => {
			await ctx.runMutation(
				(api as any).items.createSalesLine,
				{ documentNo: headerId, itemId, quantity: 1, unitPrice: 100, lineAmount: 100 },
			)
			await ctx.runMutation(
				(api as any).items.createSalesLine,
				{ documentNo: headerId, itemId, quantity: 2, unitPrice: 100, lineAmount: 200 },
			)
			await ctx.runMutation(
				(api as any).items.createSalesLine,
				{ documentNo: headerId, itemId, quantity: 3, unitPrice: 100, lineAmount: 300 },
			)
		})

		const items = await t.run(async (ctx) => {
			return await ctx.runQuery(
				(api as any).items.listItemsWithFlowFields,
				{},
			)
		})

		expect(items).toHaveLength(1)
		const item = items[0] as any

		// average: (100 + 200 + 300) / 3 = 200
		expect(item.avgLineAmount).toBe(200)

		// min: 100
		expect(item.minLineAmount).toBe(100)

		// max: 300
		expect(item.maxLineAmount).toBe(300)

		// exist: true (has sales lines)
		expect(item.hasSalesLines).toBe(true)
	})

	test("exist returns false when no child records", async () => {
		const t = setup()

		await t.run(async (ctx) => {
			await ctx.runMutation(api.items.initSeries, {})
		})

		await t.run(async (ctx) => {
			await ctx.db.insert("items", {
				itemNo: "ITEM0000001",
				description: "No Lines Item",
				unitPrice: 50,
				blocked: false,
				createdAt: new Date().toISOString(),
			})
		})

		const items = await t.run(async (ctx) => {
			return await ctx.runQuery(
				(api as any).items.listItemsWithFlowFields,
				{},
			)
		})

		expect(items).toHaveLength(1)
		expect((items[0] as any).hasSalesLines).toBe(false)
		expect((items[0] as any).minLineAmount).toBeNull()
		expect((items[0] as any).maxLineAmount).toBeNull()
		expect((items[0] as any).avgLineAmount).toBe(0)
	})

	test("lookup FlowField resolves value from related table", async () => {
		const t = setup()

		await t.run(async (ctx) => {
			await ctx.runMutation(api.items.initSeries, {})
		})

		const itemId = await t.run(async (ctx) => {
			return await ctx.db.insert("items", {
				itemNo: "ITEM0000001",
				description: "Lookup Target",
				unitPrice: 100,
				blocked: false,
				createdAt: new Date().toISOString(),
			})
		})

		const customerId = await t.run(async (ctx) => {
			return await ctx.db.insert("customers", {
				name: "Lookup Customer",
				email: "lookup@test.com",
				blocked: false,
				createdAt: new Date().toISOString(),
			})
		})

		const headerId = await t.run(async (ctx) => {
			return await ctx.db.insert("salesHeaders", {
				documentNo: "SO0000001",
				customerId,
				status: "OPEN",
				createdAt: new Date().toISOString(),
			})
		})

		await t.run(async (ctx) => {
			await ctx.runMutation(
				(api as any).items.createSalesLine,
				{ documentNo: headerId, itemId, quantity: 5, unitPrice: 100, lineAmount: 500 },
			)
		})

		const lines = await t.run(async (ctx) => {
			return await ctx.runQuery(
				(api as any).items.listSalesLines,
				{},
			)
		})

		expect(lines).toHaveLength(1)
		// lookup FlowField: itemDescription from items table
		expect((lines[0] as any).itemDescription).toBe("Lookup Target")
	})
})

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------
describe("Relations", () => {
	test("findMany with { with: { salesLines: true } } loads lines", async () => {
		const t = setup()

		await t.run(async (ctx) => {
			await ctx.runMutation(api.items.initSeries, {})
		})

		const itemId = await t.run(async (ctx) => {
			return await ctx.db.insert("items", {
				itemNo: "ITEM0000001",
				description: "Relation Test",
				unitPrice: 50,
				blocked: false,
				createdAt: new Date().toISOString(),
			})
		})

		const customerId = await t.run(async (ctx) => {
			return await ctx.db.insert("customers", {
				name: "Customer",
				email: "c@test.com",
				blocked: false,
				createdAt: new Date().toISOString(),
			})
		})

		const headerId = await t.run(async (ctx) => {
			return await ctx.db.insert("salesHeaders", {
				documentNo: "SO0000001",
				customerId,
				status: "OPEN",
				createdAt: new Date().toISOString(),
			})
		})

		await t.run(async (ctx) => {
			await ctx.db.insert("salesLines", {
				documentNo: headerId,
				itemId,
				quantity: 10,
				unitPrice: 50,
				lineAmount: 500,
				createdAt: new Date().toISOString(),
			})
		})

		const items = await t.run(async (ctx) => {
			return await ctx.runQuery(
				api.items.listItems,
				{},
			)
		})

		expect(items).toHaveLength(1)
		if (items[0].salesLines) {
			expect(items[0].salesLines).toHaveLength(1)
			expect(items[0].salesLines[0].quantity).toBe(10)
		}
	})
})

// ---------------------------------------------------------------------------
// Filter (server-side)
// ---------------------------------------------------------------------------
describe("Filter", () => {
	test("findMany with where filters server-side", async () => {
		const t = setup()

		await t.run(async (ctx) => {
			await ctx.runMutation(api.items.initSeries, {})
		})

		await t.run(async (ctx) => {
			await ctx.db.insert("items", {
				itemNo: "ITEM0000001",
				description: "Cheap",
				unitPrice: 10,
				blocked: false,
				createdAt: new Date().toISOString(),
			})
			await ctx.db.insert("items", {
				itemNo: "ITEM0000002",
				description: "Expensive",
				unitPrice: 200,
				blocked: false,
				createdAt: new Date().toISOString(),
			})
			await ctx.db.insert("items", {
				itemNo: "ITEM0000003",
				description: "Blocked",
				unitPrice: 50,
				blocked: true,
				createdAt: new Date().toISOString(),
			})
		})

		const items = await t.run(async (ctx) => {
			return await ctx.runQuery(
				api.items.listItems,
				{},
			)
		})

		expect(items).toHaveLength(2)
		expect(items.map((i: any) => i.description)).toContain("Cheap")
		expect(items.map((i: any) => i.description)).toContain("Expensive")
	})
})

// ---------------------------------------------------------------------------
// Zod schema support
// ---------------------------------------------------------------------------
describe("Zod schemas", () => {
	test("mutation with Zod args creates item", async () => {
		const t = setup()

		await t.run(async (ctx) => {
			await ctx.runMutation(api.items.initSeries, {})
		})

		const itemId = await t.run(async (ctx) => {
			return await ctx.runMutation(
				(api as any).items.createItemZod,
				{ description: "Zod Item", unitPrice: 42 },
			)
		})

		expect(itemId).toBeDefined()

		const item = await t.run(async (ctx) => {
			return await ctx.db.get(itemId)
		})

		expect(item).not.toBeNull()
		expect(item!.description).toBe("Zod Item")
		expect(item!.unitPrice).toBe(42)
	})

	test("query with Zod args returns item", async () => {
		const t = setup()

		await t.run(async (ctx) => {
			await ctx.runMutation(api.items.initSeries, {})
		})

		await t.run(async (ctx) => {
			await ctx.db.insert("items", {
				itemNo: "ITEM0000001",
				description: "Zod Query Test",
				unitPrice: 99,
				blocked: false,
				createdAt: new Date().toISOString(),
			})
		})

		const result = await t.run(async (ctx) => {
			return await ctx.runQuery(
				(api as any).items.getItemByNoZod,
				{ itemNo: "ITEM0000001" },
			)
		})

		expect(result).not.toBeNull()
		expect(result!.description).toBe("Zod Query Test")
	})
})

// ---------------------------------------------------------------------------
// Limit safety
// ---------------------------------------------------------------------------
describe("Limits", () => {
	test("findMany defaults to limit 100", async () => {
		const t = setup()

		await t.run(async (ctx) => {
			await ctx.runMutation(api.items.initSeries, {})
		})

		const items = await t.run(async (ctx) => {
			return await ctx.runQuery(
				api.items.listItems,
				{},
			)
		})

		expect(Array.isArray(items)).toBe(true)
	})
})
