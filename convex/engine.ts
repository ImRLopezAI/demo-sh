import { createEngine } from "./components/tableEngine/lib"
import { components } from "./_generated/api"
import type { DataModel } from "./_generated/dataModel"

export const engine = createEngine<DataModel>({
	component: components.tableEngine,
	tables: {
		items: {
			tableName: "items",
			noSeries: {
				code: "ITEM",
				field: "itemNo",
				pattern: "ITEM0000001",
			},
			flowFields: {
				totalSalesQty: {
					type: "sum",
					source: "salesLines",
					key: "itemId",
					field: "quantity",
				},
				totalSalesAmount: {
					type: "sum",
					source: "salesLines",
					key: "itemId",
					field: "lineAmount",
				},
				avgLineAmount: {
					type: "average",
					source: "salesLines",
					key: "itemId",
					field: "lineAmount",
				},
				minLineAmount: {
					type: "min",
					source: "salesLines",
					key: "itemId",
					field: "lineAmount",
				},
				maxLineAmount: {
					type: "max",
					source: "salesLines",
					key: "itemId",
					field: "lineAmount",
				},
				hasSalesLines: {
					type: "exist",
					source: "salesLines",
					key: "itemId",
				},
			},
			relations: {
				salesLines: {
					table: "salesLines",
					field: "by_itemId",
					type: "many",
				},
			},
		},
		salesHeaders: {
			tableName: "salesHeaders",
			noSeries: {
				code: "SO",
				field: "documentNo",
				pattern: "SO0000001",
			},
			flowFields: {
				lineCount: {
					type: "count",
					source: "salesLines",
					key: "documentNo",
				},
				totalAmount: {
					type: "sum",
					source: "salesLines",
					key: "documentNo",
					field: "lineAmount",
				},
			},
			relations: {
				lines: {
					table: "salesLines",
					field: "by_documentNo",
					type: "many",
				},
				customer: {
					table: "customers",
					field: "by_customerId",
					type: "one",
				},
			},
		},
		salesLines: {
			tableName: "salesLines",
			flowFields: {
				itemDescription: {
					type: "lookup",
					source: "items",
					key: "itemId",
					field: "description",
				},
			},
			relations: {
				item: {
					table: "items",
					field: "by_itemId",
					type: "one",
				},
				header: {
					table: "salesHeaders",
					field: "by_documentNo",
					type: "one",
				},
			},
		},
		customers: {
			tableName: "customers",
			relations: {
				salesHeaders: {
					table: "salesHeaders",
					field: "by_customerId",
					type: "many",
				},
			},
		},
	},
})
