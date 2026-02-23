import { createRPCRouter, publicProcedure } from '@server/rpc/init'
import z from 'zod'
import { assertRole } from '../authz'
import { createTenantScopedCrudRouter } from '../helpers'

const purchaseHeadersRouter = createTenantScopedCrudRouter({
	moduleName: 'replenishment',
	prefix: 'purchase-orders',
	primaryTable: 'purchaseHeaders',
	viewTables: { overview: 'purchaseHeaders' },
	statusField: 'status',
	transitions: {
		DRAFT: ['PENDING_APPROVAL'],
		PENDING_APPROVAL: ['APPROVED', 'REJECTED'],
		APPROVED: ['COMPLETED', 'CANCELED'],
		REJECTED: ['DRAFT'],
	},
	reasonRequiredStatuses: ['REJECTED', 'CANCELED'],
	statusRoleRequirements: {
		APPROVED: 'MANAGER',
		REJECTED: 'MANAGER',
		COMPLETED: 'MANAGER',
		CANCELED: 'MANAGER',
	},
})

const purchaseLineCreateInputSchema = z.object({
	lineNo: z.number().int().positive().optional(),
	itemId: z.string(),
	quantity: z.number().positive(),
	unitCost: z.number().nonnegative(),
	lineAmount: z.number().nonnegative().optional(),
	quantityReceived: z.number().min(0).default(0),
	quantityInvoiced: z.number().min(0).default(0),
})

const purchaseLineChangeInputSchema = z.object({
	id: z.string().optional(),
	lineNo: z.number().int().positive().optional(),
	itemId: z.string(),
	quantity: z.number().positive(),
	unitCost: z.number().nonnegative(),
	lineAmount: z.number().nonnegative().optional(),
	quantityReceived: z.number().min(0).default(0),
	quantityInvoiced: z.number().min(0).default(0),
	_delete: z.boolean().optional(),
})

const createPurchaseOrderWithLinesInputSchema = z.object({
	header: z.object({
		documentType: z.enum(['ORDER', 'RETURN_ORDER', 'QUOTE']).default('ORDER'),
		status: z
			.enum([
				'DRAFT',
				'PENDING_APPROVAL',
				'APPROVED',
				'REJECTED',
				'COMPLETED',
				'CANCELED',
			])
			.optional(),
		vendorId: z.string(),
		orderDate: z.string().optional(),
		expectedReceiptDate: z.string().optional(),
		currency: z.string().default('USD'),
	}),
	lines: z.array(purchaseLineCreateInputSchema).min(1),
	idempotencyKey: z.string().trim().min(1).optional(),
})

const updatePurchaseOrderWithLinesInputSchema = z.object({
	id: z.string(),
	header: z
		.object({
			documentType: z.enum(['ORDER', 'RETURN_ORDER', 'QUOTE']).optional(),
			vendorId: z.string().optional(),
			orderDate: z.string().optional(),
			expectedReceiptDate: z.string().optional(),
			currency: z.string().optional(),
		})
		.optional(),
	lineChanges: z.array(purchaseLineChangeInputSchema).default([]),
})

const purchaseLinesRouter = createTenantScopedCrudRouter({
	moduleName: 'replenishment',
	prefix: 'purchase-lines',
	primaryTable: 'purchaseLines',
	viewTables: { overview: 'purchaseLines' },
	parentRelations: [
		{
			childField: 'documentNo',
			parentTable: 'purchaseHeaders',
			parentField: 'documentNo',
		},
		{
			childField: 'itemId',
			parentTable: 'items',
		},
	],
})

const purchaseReceiptsRouter = createTenantScopedCrudRouter({
	moduleName: 'replenishment',
	prefix: 'purchase-receipts',
	primaryTable: 'purchaseReceipts',
	viewTables: { overview: 'purchaseReceipts' },
})

const purchaseInvoicesCrudRouter = createTenantScopedCrudRouter({
	moduleName: 'replenishment',
	prefix: 'purchase-invoices',
	primaryTable: 'purchaseInvoiceHeaders',
	viewTables: { overview: 'purchaseInvoiceHeaders' },
	statusField: 'status',
	transitions: {
		DRAFT: ['POSTED', 'CANCELED'],
		POSTED: ['CANCELED'],
		CANCELED: [],
	},
	reasonRequiredStatuses: ['CANCELED'],
	statusRoleRequirements: {
		POSTED: 'MANAGER',
		CANCELED: 'MANAGER',
	},
})

const purchaseInvoiceLinesRouter = createTenantScopedCrudRouter({
	moduleName: 'replenishment',
	prefix: 'purchase-invoice-lines',
	primaryTable: 'purchaseInvoiceLines',
	viewTables: { overview: 'purchaseInvoiceLines' },
	parentRelations: [
		{
			childField: 'invoiceNo',
			parentTable: 'purchaseInvoiceHeaders',
			parentField: 'invoiceNo',
		},
		{
			childField: 'itemId',
			parentTable: 'items',
		},
		{
			childField: 'purchaseLineId',
			parentTable: 'purchaseLines',
		},
	],
})

const vendorsRouter = createTenantScopedCrudRouter({
	moduleName: 'replenishment',
	prefix: 'vendors',
	primaryTable: 'vendors',
	viewTables: { overview: 'vendors' },
})

const vendorLedgerRouter = createTenantScopedCrudRouter({
	moduleName: 'replenishment',
	prefix: 'vendor-ledger',
	primaryTable: 'vendorLedgerEntries',
	viewTables: { overview: 'vendorLedgerEntries' },
})

const detailedVendorLedgerRouter = createTenantScopedCrudRouter({
	moduleName: 'replenishment',
	prefix: 'detailed-vendor-ledger',
	primaryTable: 'detailedVendorLedgerEntries',
	viewTables: { overview: 'detailedVendorLedgerEntries' },
})

const transferHeadersRouter = createTenantScopedCrudRouter({
	moduleName: 'replenishment',
	prefix: 'transfers',
	primaryTable: 'transferHeaders',
	viewTables: { overview: 'transferHeaders' },
	statusField: 'status',
	transitions: {
		DRAFT: ['RELEASED'],
		RELEASED: ['IN_TRANSIT', 'CANCELED'],
		IN_TRANSIT: ['RECEIVED'],
	},
	reasonRequiredStatuses: ['CANCELED'],
	statusRoleRequirements: {
		RELEASED: 'MANAGER',
		CANCELED: 'MANAGER',
		RECEIVED: 'MANAGER',
	},
})

const transferLinesRouter = createTenantScopedCrudRouter({
	moduleName: 'replenishment',
	prefix: 'transfer-lines',
	primaryTable: 'transferLines',
	viewTables: { overview: 'transferLines' },
	parentRelations: [
		{
			childField: 'transferNo',
			parentTable: 'transferHeaders',
			parentField: 'transferNo',
		},
		{
			childField: 'itemId',
			parentTable: 'items',
		},
	],
})

const readTenantId = (row: unknown) =>
	(row as { tenantId?: string }).tenantId ?? 'demo-tenant'

const calculatePurchaseLineAmount = (line: {
	quantity: number
	unitCost: number
	lineAmount?: number
}) => Number((line.lineAmount ?? line.quantity * line.unitCost).toFixed(2))

const purchaseHeaderUpdatePayload = (header: {
	documentType?: 'ORDER' | 'RETURN_ORDER' | 'QUOTE'
	vendorId?: string
	orderDate?: string
	expectedReceiptDate?: string
	currency?: string
}) => ({
	...(header.documentType ? { documentType: header.documentType } : {}),
	...(header.vendorId ? { vendorId: header.vendorId } : {}),
	...(header.orderDate ? { orderDate: header.orderDate } : {}),
	...(header.expectedReceiptDate
		? { expectedReceiptDate: header.expectedReceiptDate }
		: {}),
	...(header.currency ? { currency: header.currency } : {}),
})

const nextEntryNo = (rows: Array<{ entryNo?: number }>) =>
	rows.reduce((max, row) => Math.max(max, Number(row.entryNo ?? 0)), 0) + 1

const receivePurchaseOrderInputSchema = z.object({
	purchaseOrderId: z.string(),
	receiptDate: z.string().optional(),
	lines: z
		.array(
			z.object({
				purchaseLineId: z.string(),
				quantity: z.number().positive(),
			}),
		)
		.optional(),
})

const createPurchaseInvoiceFromOrderInputSchema = z.object({
	purchaseOrderId: z.string(),
	lineIds: z.array(z.string()).optional(),
})

const postPurchaseInvoiceInputSchema = z.object({
	invoiceId: z.string(),
})

const purchaseOrdersRouter = createRPCRouter({
	...purchaseHeadersRouter,
	createWithLines: publicProcedure
		.input(createPurchaseOrderWithLinesInputSchema)
		.route({
			method: 'POST',
			summary: 'Create purchase order header and lines atomically',
		})
		.handler(({ input, context }) => {
			assertRole(
				context,
				'AGENT',
				'replenishment purchase order create with lines',
			)
			const tenantId = context.auth.tenantId

			const vendor = context.db.schemas.vendors.get(input.header.vendorId)
			if (!vendor || readTenantId(vendor) !== tenantId) {
				throw new Error('Vendor not found')
			}
			const idempotencyKey = input.idempotencyKey?.trim()

			if (idempotencyKey) {
				const existing = context.db.schemas.purchaseHeaders.findMany({
					where: (row) =>
						readTenantId(row) === tenantId &&
						row.idempotencyKey === idempotencyKey,
					limit: 1,
				})[0]
				if (existing) {
					const lines = context.db.schemas.purchaseLines.findMany({
						where: (row) =>
							readTenantId(row) === tenantId &&
							row.documentNo === existing.documentNo,
						orderBy: { field: 'lineNo', direction: 'asc' },
					})
					return {
						header: existing,
						lines,
						idempotent: true,
					}
				}
			}

			let createdOrderId: string | null = null
			const createdLineIds: string[] = []

			try {
				const createdOrder = context.db.schemas.purchaseHeaders.insert({
					documentNo: '',
					documentType: input.header.documentType,
					status: input.header.status ?? 'DRAFT',
					vendorId: input.header.vendorId,
					orderDate: input.header.orderDate ?? new Date().toISOString(),
					expectedReceiptDate:
						input.header.expectedReceiptDate ?? new Date().toISOString(),
					currency: input.header.currency,
					idempotencyKey,
					lineCount: 0,
					totalAmount: 0,
				})
				createdOrderId = createdOrder._id

				for (const [index, line] of input.lines.entries()) {
					const item = context.db.schemas.items.get(line.itemId)
					if (!item || readTenantId(item) !== tenantId) {
						throw new Error(`Item ${line.itemId} not found`)
					}

					const createdLine = context.db.schemas.purchaseLines.insert({
						documentNo: createdOrder.documentNo,
						lineNo: line.lineNo ?? index + 1,
						itemId: line.itemId,
						quantity: line.quantity,
						unitCost: line.unitCost,
						lineAmount: calculatePurchaseLineAmount(line),
						quantityReceived: line.quantityReceived,
						quantityInvoiced: line.quantityInvoiced,
					})
					createdLineIds.push(createdLine._id)
				}

				const lines = context.db.schemas.purchaseLines.findMany({
					where: (row) =>
						readTenantId(row) === tenantId &&
						row.documentNo === createdOrder.documentNo,
					orderBy: { field: 'lineNo', direction: 'asc' },
				})

				return {
					header: createdOrder,
					lines,
					idempotent: false,
				}
			} catch (error) {
				for (const lineId of createdLineIds) {
					context.db.schemas.purchaseLines.delete(lineId)
				}
				if (createdOrderId) {
					context.db.schemas.purchaseHeaders.delete(createdOrderId)
				}
				throw error
			}
		}),
	updateWithLines: publicProcedure
		.input(updatePurchaseOrderWithLinesInputSchema)
		.route({
			method: 'PATCH',
			summary: 'Update purchase order header and line deltas atomically',
		})
		.handler(({ input, context }) => {
			assertRole(
				context,
				'AGENT',
				'replenishment purchase order update with lines',
			)
			const tenantId = context.auth.tenantId

			const header = context.db.schemas.purchaseHeaders.get(input.id)
			if (!header || readTenantId(header) !== tenantId) {
				throw new Error('Purchase order not found')
			}

			const originalHeader = {
				documentType: header.documentType,
				vendorId: header.vendorId,
				orderDate: header.orderDate,
				expectedReceiptDate: header.expectedReceiptDate,
				currency: header.currency,
			}
			const originalLines = context.db.schemas.purchaseLines
				.findMany({
					where: (row) =>
						readTenantId(row) === tenantId &&
						row.documentNo === header.documentNo,
				})
				.map((line) => ({ ...line }))

			try {
				if (input.header) {
					if (input.header.vendorId) {
						const vendor = context.db.schemas.vendors.get(input.header.vendorId)
						if (!vendor || readTenantId(vendor) !== tenantId) {
							throw new Error('Vendor not found')
						}
					}

					const updated = context.db.schemas.purchaseHeaders.update(input.id, {
						...purchaseHeaderUpdatePayload(input.header),
					})
					if (!updated) {
						throw new Error('Unable to update purchase order header')
					}
				}

				let nextLineNo = originalLines.reduce(
					(max, line) => Math.max(max, Number(line.lineNo ?? 0)),
					0,
				)

				for (const lineChange of input.lineChanges) {
					if (lineChange._delete) {
						if (!lineChange.id) {
							throw new Error('Line delete requires an existing line id')
						}
						const line = context.db.schemas.purchaseLines.get(lineChange.id)
						if (
							!line ||
							readTenantId(line) !== tenantId ||
							line.documentNo !== header.documentNo
						) {
							throw new Error('Purchase line not found for this purchase order')
						}
						context.db.schemas.purchaseLines.delete(lineChange.id)
						continue
					}

					const item = context.db.schemas.items.get(lineChange.itemId)
					if (!item || readTenantId(item) !== tenantId) {
						throw new Error(`Item ${lineChange.itemId} not found`)
					}

					if (lineChange.id) {
						const line = context.db.schemas.purchaseLines.get(lineChange.id)
						if (
							!line ||
							readTenantId(line) !== tenantId ||
							line.documentNo !== header.documentNo
						) {
							throw new Error('Purchase line not found for this purchase order')
						}

						const updated = context.db.schemas.purchaseLines.update(line._id, {
							lineNo: lineChange.lineNo ?? line.lineNo,
							itemId: lineChange.itemId,
							quantity: lineChange.quantity,
							unitCost: lineChange.unitCost,
							lineAmount: calculatePurchaseLineAmount(lineChange),
							quantityReceived: lineChange.quantityReceived,
							quantityInvoiced: lineChange.quantityInvoiced,
						})
						if (!updated) {
							throw new Error('Unable to update purchase line')
						}
						nextLineNo = Math.max(nextLineNo, Number(updated.lineNo ?? 0))
						continue
					}

					const created = context.db.schemas.purchaseLines.insert({
						documentNo: header.documentNo,
						lineNo: lineChange.lineNo ?? nextLineNo + 1,
						itemId: lineChange.itemId,
						quantity: lineChange.quantity,
						unitCost: lineChange.unitCost,
						lineAmount: calculatePurchaseLineAmount(lineChange),
						quantityReceived: lineChange.quantityReceived,
						quantityInvoiced: lineChange.quantityInvoiced,
					})
					nextLineNo = Math.max(nextLineNo, Number(created.lineNo ?? 0))
				}

				const refreshedHeader = context.db.schemas.purchaseHeaders.get(input.id)
				if (!refreshedHeader) {
					throw new Error('Purchase order not found after update')
				}
				const lines = context.db.schemas.purchaseLines.findMany({
					where: (row) =>
						readTenantId(row) === tenantId &&
						row.documentNo === refreshedHeader.documentNo,
					orderBy: { field: 'lineNo', direction: 'asc' },
				})

				return {
					header: refreshedHeader,
					lines,
				}
			} catch (error) {
				context.db.schemas.purchaseHeaders.update(input.id, {
					...purchaseHeaderUpdatePayload(originalHeader),
				})
				const currentLines = context.db.schemas.purchaseLines.findMany({
					where: (row) =>
						readTenantId(row) === tenantId &&
						row.documentNo === header.documentNo,
				})
				for (const line of currentLines) {
					context.db.schemas.purchaseLines.delete(line._id)
				}
				for (const line of originalLines) {
					context.db.schemas.purchaseLines.insert({
						documentNo: line.documentNo,
						lineNo: Number(line.lineNo ?? 0),
						itemId: line.itemId,
						quantity: Number(line.quantity ?? 0),
						unitCost: Number(line.unitCost ?? 0),
						lineAmount: Number(line.lineAmount ?? 0),
						quantityReceived: Number(line.quantityReceived ?? 0),
						quantityInvoiced: Number(line.quantityInvoiced ?? 0),
					})
				}
				throw error
			}
		}),
	receive: publicProcedure
		.input(receivePurchaseOrderInputSchema)
		.route({
			method: 'POST',
			summary: 'Receive purchase order quantities with over-receipt protection',
		})
		.handler(({ input, context }) => {
			assertRole(context, 'MANAGER', 'replenishment purchase receipt')
			const tenantId = context.auth.tenantId
			const order = context.db.schemas.purchaseHeaders.get(
				input.purchaseOrderId,
			)
			if (!order || readTenantId(order) !== tenantId) {
				throw new Error('Purchase order not found')
			}
			if (order.status !== 'APPROVED' && order.status !== 'COMPLETED') {
				throw new Error('Only APPROVED purchase orders can be received')
			}

			const lines = context.db.schemas.purchaseLines.findMany({
				where: (row) =>
					readTenantId(row) === tenantId && row.documentNo === order.documentNo,
				orderBy: { field: 'lineNo', direction: 'asc' },
			})
			if (lines.length === 0) {
				throw new Error('Purchase order has no lines')
			}

			const lineById = new Map(lines.map((line) => [line._id, line]))
			const lineReceipts =
				input.lines && input.lines.length > 0
					? input.lines
					: lines
							.filter(
								(line) =>
									Number(line.quantityReceived ?? 0) <
									Number(line.quantity ?? 0),
							)
							.map((line) => ({
								purchaseLineId: line._id,
								quantity:
									Number(line.quantity ?? 0) -
									Number(line.quantityReceived ?? 0),
							}))

			if (lineReceipts.length === 0) {
				throw new Error('There are no outstanding quantities to receive')
			}

			const previousStates = new Map<
				string,
				{
					quantityReceived: number
				}
			>()
			const createdReceiptIds: string[] = []
			const receiptDate = input.receiptDate ?? new Date().toISOString()
			let totalReceivedQty = 0

			try {
				for (const receiptLine of lineReceipts) {
					const line = lineById.get(receiptLine.purchaseLineId)
					if (!line) {
						throw new Error('Purchase line not found for this order')
					}

					const quantity = Number(receiptLine.quantity ?? 0)
					const currentReceived = Number(line.quantityReceived ?? 0)
					const orderedQty = Number(line.quantity ?? 0)
					const outstandingQty = orderedQty - currentReceived
					if (quantity <= 0) {
						throw new Error('Received quantity must be greater than zero')
					}
					if (quantity > outstandingQty) {
						throw new Error(
							`Over-receipt detected for line ${line.lineNo}: outstanding ${outstandingQty}, attempted ${quantity}`,
						)
					}

					previousStates.set(line._id, { quantityReceived: currentReceived })

					const updated = context.db.schemas.purchaseLines.update(line._id, {
						quantityReceived: currentReceived + quantity,
					})
					if (!updated) {
						throw new Error('Unable to update purchase line receipt quantity')
					}

					const receipt = context.db.schemas.purchaseReceipts.insert({
						receiptNo: '',
						purchaseOrderNo: order.documentNo,
						purchaseLineId: line._id,
						itemId: line.itemId,
						receiptDate,
						quantityReceived: quantity,
						receivedByUserId: context.auth.userId,
					})
					createdReceiptIds.push(receipt._id)
					totalReceivedQty += quantity
				}

				const refreshedLines = context.db.schemas.purchaseLines.findMany({
					where: (row) =>
						readTenantId(row) === tenantId &&
						row.documentNo === order.documentNo,
					orderBy: { field: 'lineNo', direction: 'asc' },
				})

				return {
					purchaseOrderId: order._id,
					purchaseOrderNo: order.documentNo,
					receiptCount: createdReceiptIds.length,
					receivedQty: totalReceivedQty,
					lines: refreshedLines,
					receivedAt: receiptDate,
				}
			} catch (error) {
				for (const receiptId of createdReceiptIds) {
					context.db.schemas.purchaseReceipts.delete(receiptId)
				}
				for (const [lineId, previous] of previousStates.entries()) {
					context.db.schemas.purchaseLines.update(lineId, {
						quantityReceived: previous.quantityReceived,
					})
				}
				throw error
			}
		}),
})

const purchaseInvoicesRouter = createRPCRouter({
	...purchaseInvoicesCrudRouter,
	createFromOrder: publicProcedure
		.input(createPurchaseInvoiceFromOrderInputSchema)
		.route({
			method: 'POST',
			summary:
				'Create a draft purchase invoice from received-not-invoiced PO quantities',
		})
		.handler(({ input, context }) => {
			assertRole(context, 'MANAGER', 'replenishment purchase invoice creation')
			const tenantId = context.auth.tenantId

			const order = context.db.schemas.purchaseHeaders.get(
				input.purchaseOrderId,
			)
			if (!order || readTenantId(order) !== tenantId) {
				throw new Error('Purchase order not found')
			}
			if (order.status !== 'APPROVED' && order.status !== 'COMPLETED') {
				throw new Error(
					'Only APPROVED or COMPLETED purchase orders can be invoiced',
				)
			}

			const lines = context.db.schemas.purchaseLines.findMany({
				where: (row) =>
					readTenantId(row) === tenantId && row.documentNo === order.documentNo,
				orderBy: { field: 'lineNo', direction: 'asc' },
			})
			if (lines.length === 0) {
				throw new Error('Purchase order has no lines')
			}

			const selectedLineIdSet = new Set(input.lineIds ?? [])
			const candidateLines = lines.filter((line) => {
				const outstandingQty =
					Number(line.quantityReceived ?? 0) -
					Number(line.quantityInvoiced ?? 0)
				if (outstandingQty <= 0) return false
				if (selectedLineIdSet.size === 0) return true
				return selectedLineIdSet.has(line._id)
			})

			if (selectedLineIdSet.size > 0) {
				for (const lineId of selectedLineIdSet) {
					const line = lines.find((row) => row._id === lineId)
					if (!line) {
						throw new Error('Selected line not found for this purchase order')
					}
					const outstandingQty =
						Number(line.quantityReceived ?? 0) -
						Number(line.quantityInvoiced ?? 0)
					if (outstandingQty <= 0) {
						throw new Error(
							`Line ${line.lineNo} has no received quantity available to invoice`,
						)
					}
				}
			}

			if (candidateLines.length === 0) {
				throw new Error('No received quantities are available to invoice')
			}

			let createdInvoiceId: string | null = null
			const createdLineIds: string[] = []

			try {
				const createdInvoice = context.db.schemas.purchaseInvoiceHeaders.insert(
					{
						invoiceNo: '',
						status: 'DRAFT',
						vendorId: order.vendorId,
						purchaseOrderNo: order.documentNo,
						postingDate: new Date().toISOString(),
						currency: order.currency ?? 'USD',
						lineCount: 0,
						totalAmount: 0,
					},
				)
				createdInvoiceId = createdInvoice._id

				for (const [index, line] of candidateLines.entries()) {
					const quantity =
						Number(line.quantityReceived ?? 0) -
						Number(line.quantityInvoiced ?? 0)
					const unitCost = Number(line.unitCost ?? 0)
					const lineAmount = Number((quantity * unitCost).toFixed(2))

					const createdLine = context.db.schemas.purchaseInvoiceLines.insert({
						invoiceNo: createdInvoice.invoiceNo,
						lineNo: index + 1,
						itemId: line.itemId,
						purchaseLineId: line._id,
						quantity,
						unitCost,
						lineAmount,
					})
					createdLineIds.push(createdLine._id)
				}

				const createdLines = context.db.schemas.purchaseInvoiceLines.findMany({
					where: (row) =>
						readTenantId(row) === tenantId &&
						row.invoiceNo === createdInvoice.invoiceNo,
					orderBy: { field: 'lineNo', direction: 'asc' },
				})

				return {
					header: createdInvoice,
					lines: createdLines,
					idempotent: false,
				}
			} catch (error) {
				for (const lineId of createdLineIds) {
					context.db.schemas.purchaseInvoiceLines.delete(lineId)
				}
				if (createdInvoiceId) {
					context.db.schemas.purchaseInvoiceHeaders.delete(createdInvoiceId)
				}
				throw error
			}
		}),
	postInvoice: publicProcedure
		.input(postPurchaseInvoiceInputSchema)
		.route({
			method: 'POST',
			summary:
				'Post purchase invoice and generate vendor ledger side effects safely',
		})
		.handler(({ input, context }) => {
			assertRole(context, 'MANAGER', 'replenishment purchase invoice posting')
			const tenantId = context.auth.tenantId
			const invoice = context.db.schemas.purchaseInvoiceHeaders.get(
				input.invoiceId,
			)
			if (!invoice || readTenantId(invoice) !== tenantId) {
				throw new Error('Purchase invoice not found')
			}
			if (!invoice.invoiceNo) {
				throw new Error('Invoice number is required before posting')
			}

			const lines = context.db.schemas.purchaseInvoiceLines.findMany({
				where: (row) =>
					readTenantId(row) === tenantId && row.invoiceNo === invoice.invoiceNo,
				orderBy: { field: 'lineNo', direction: 'asc' },
			})
			if (lines.length === 0) {
				throw new Error('Purchase invoice has no lines to post')
			}

			const totalAmount = lines.reduce((sum, line) => {
				const lineAmount = Number(
					line.lineAmount ??
						Number(line.quantity ?? 0) * Number(line.unitCost ?? 0),
				)
				return sum + lineAmount
			}, 0)
			if (totalAmount <= 0) {
				throw new Error(
					'Purchase invoice total must be greater than zero to post',
				)
			}

			const existingVendorLedgerEntries =
				context.db.schemas.vendorLedgerEntries.findMany({
					where: (row) =>
						readTenantId(row) === tenantId &&
						row.documentNo === invoice.invoiceNo &&
						row.documentType === 'INVOICE',
				})
			const existingDetailedEntries =
				context.db.schemas.detailedVendorLedgerEntries.findMany({
					where: (row) =>
						readTenantId(row) === tenantId &&
						row.documentNo === invoice.invoiceNo &&
						row.documentType === 'INVOICE',
				})

			if (invoice.status === 'POSTED') {
				if (
					existingVendorLedgerEntries.length === 0 ||
					existingDetailedEntries.length === 0
				) {
					throw new Error(
						'Purchase invoice is POSTED but payable side effects are incomplete',
					)
				}
				return {
					invoiceId: invoice._id,
					invoiceNo: invoice.invoiceNo,
					status: invoice.status,
					postingDate: invoice.postingDate ?? new Date().toISOString(),
					lineCount: lines.length,
					totalAmount,
					vendorLedgerEntryId: existingVendorLedgerEntries[0]?._id ?? null,
					detailedEntryIds: existingDetailedEntries.map((entry) => entry._id),
					idempotent: true,
				}
			}

			if (invoice.status !== 'DRAFT') {
				throw new Error('Only DRAFT purchase invoices can be posted')
			}
			if (
				existingVendorLedgerEntries.length > 0 ||
				existingDetailedEntries.length > 0
			) {
				throw new Error('Purchase invoice already has payable entries')
			}

			const invoiceQtyByPurchaseLine = new Map<string, number>()
			for (const line of lines) {
				if (!line.purchaseLineId) {
					throw new Error('Invoice line is missing purchase line linkage')
				}
				const qty = Number(line.quantity ?? 0)
				if (qty <= 0) {
					throw new Error('Invoice line quantity must be greater than zero')
				}
				invoiceQtyByPurchaseLine.set(
					line.purchaseLineId,
					(invoiceQtyByPurchaseLine.get(line.purchaseLineId) ?? 0) + qty,
				)
			}

			const purchaseLineSnapshots = new Map<
				string,
				{ quantityReceived: number; quantityInvoiced: number }
			>()
			for (const [
				purchaseLineId,
				invoiceQty,
			] of invoiceQtyByPurchaseLine.entries()) {
				const purchaseLine =
					context.db.schemas.purchaseLines.get(purchaseLineId)
				if (!purchaseLine || readTenantId(purchaseLine) !== tenantId) {
					throw new Error('Linked purchase line not found')
				}
				if (purchaseLine.documentNo !== invoice.purchaseOrderNo) {
					throw new Error(
						'Invoice line does not belong to invoice purchase order',
					)
				}

				const quantityReceived = Number(purchaseLine.quantityReceived ?? 0)
				const quantityInvoiced = Number(purchaseLine.quantityInvoiced ?? 0)
				const outstanding = quantityReceived - quantityInvoiced
				if (invoiceQty > outstanding) {
					throw new Error(
						`Over-invoice detected for line ${purchaseLine.lineNo}: outstanding ${outstanding}, attempted ${invoiceQty}`,
					)
				}

				purchaseLineSnapshots.set(purchaseLine._id, {
					quantityReceived,
					quantityInvoiced,
				})
			}

			const postingDate = invoice.postingDate ?? new Date().toISOString()
			const description = `Purchase Invoice ${invoice.invoiceNo}`
			const previousStatus = invoice.status
			const previousStatusReason = invoice.statusReason
			const previousStatusUpdatedAt = invoice.statusUpdatedAt
			const previousPostingDate = invoice.postingDate
			const createdDetailedEntryIds: string[] = []
			let createdVendorLedgerEntryId: string | null = null

			try {
				const postedInvoice = context.db.schemas.purchaseInvoiceHeaders.update(
					invoice._id,
					{
						status: 'POSTED',
						postingDate,
						statusReason: undefined,
						statusUpdatedAt: new Date(),
					},
				)
				if (!postedInvoice) {
					throw new Error('Unable to update purchase invoice status')
				}

				const nextVendorEntry = nextEntryNo(
					context.db.schemas.vendorLedgerEntries.findMany({
						where: (row) => readTenantId(row) === tenantId,
					}),
				)
				const vendorLedgerEntry = context.db.schemas.vendorLedgerEntries.insert(
					{
						entryNo: nextVendorEntry,
						vendorId: invoice.vendorId,
						postingDate,
						documentType: 'INVOICE',
						documentNo: invoice.invoiceNo,
						description,
						amount: totalAmount,
						remainingAmount: totalAmount,
						open: true,
						currency: invoice.currency ?? 'USD',
					},
				)
				createdVendorLedgerEntryId = vendorLedgerEntry._id

				const nextDetailedEntry = nextEntryNo(
					context.db.schemas.detailedVendorLedgerEntries.findMany({
						where: (row) => readTenantId(row) === tenantId,
					}),
				)
				for (const [index, line] of lines.entries()) {
					const lineAmount = Number(
						line.lineAmount ??
							Number(line.quantity ?? 0) * Number(line.unitCost ?? 0),
					)
					const detail = context.db.schemas.detailedVendorLedgerEntries.insert({
						entryNo: nextDetailedEntry + index,
						vendorLedgerEntryId: vendorLedgerEntry._id,
						postingDate,
						documentType: 'INVOICE',
						documentNo: invoice.invoiceNo,
						description: line.itemDescription ?? `Purchase line ${line.lineNo}`,
						amount: lineAmount,
						unapplied: true,
					})
					createdDetailedEntryIds.push(detail._id)
				}

				for (const [
					purchaseLineId,
					qty,
				] of invoiceQtyByPurchaseLine.entries()) {
					const snapshot = purchaseLineSnapshots.get(purchaseLineId)
					if (!snapshot) continue
					const updated = context.db.schemas.purchaseLines.update(
						purchaseLineId,
						{
							quantityInvoiced: snapshot.quantityInvoiced + qty,
						},
					)
					if (!updated) {
						throw new Error('Unable to update purchase line invoiced quantity')
					}
				}

				return {
					invoiceId: postedInvoice._id,
					invoiceNo: postedInvoice.invoiceNo,
					status: postedInvoice.status,
					postingDate,
					lineCount: lines.length,
					totalAmount,
					vendorLedgerEntryId: vendorLedgerEntry._id,
					detailedEntryIds: createdDetailedEntryIds,
					idempotent: false,
				}
			} catch (error) {
				for (const detailEntryId of createdDetailedEntryIds) {
					context.db.schemas.detailedVendorLedgerEntries.delete(detailEntryId)
				}
				if (createdVendorLedgerEntryId) {
					context.db.schemas.vendorLedgerEntries.delete(
						createdVendorLedgerEntryId,
					)
				}
				for (const [
					purchaseLineId,
					snapshot,
				] of purchaseLineSnapshots.entries()) {
					context.db.schemas.purchaseLines.update(purchaseLineId, {
						quantityReceived: snapshot.quantityReceived,
						quantityInvoiced: snapshot.quantityInvoiced,
					})
				}
				context.db.schemas.purchaseInvoiceHeaders.update(invoice._id, {
					status: previousStatus,
					statusReason: previousStatusReason,
					statusUpdatedAt: previousStatusUpdatedAt,
					postingDate: previousPostingDate,
				})
				throw error
			}
		}),
})

const planningInputSchema = z.object({
	limit: z.number().min(1).max(100).default(25),
})

const allocateShortageInputSchema = z.object({
	itemId: z.string(),
	shortageQty: z.number().positive(),
	locationDemands: z
		.array(
			z.object({
				locationCode: z.string(),
				demandQty: z.number().positive(),
				priority: z.number().int().min(1).max(10).default(5),
			}),
		)
		.min(1),
})

export const replenishmentRouter = createRPCRouter({
	purchaseOrders: purchaseOrdersRouter,
	purchaseLines: purchaseLinesRouter,
	purchaseReceipts: purchaseReceiptsRouter,
	purchaseInvoices: purchaseInvoicesRouter,
	purchaseInvoiceLines: purchaseInvoiceLinesRouter,
	vendors: vendorsRouter,
	vendorLedger: vendorLedgerRouter,
	detailedVendorLedger: detailedVendorLedgerRouter,
	transfers: transferHeadersRouter,
	transferLines: transferLinesRouter,
	generatePurchaseProposals: publicProcedure
		.input(planningInputSchema)
		.route({
			method: 'POST',
			summary: 'Generate replenishment purchase proposals',
		})
		.handler(({ input, context }) => {
			assertRole(
				context,
				'MANAGER',
				'replenishment purchase proposal generation',
			)
			const tenantId = context.auth.tenantId
			const activeVendors = context.db.schemas.vendors.findMany({
				where: (row) => readTenantId(row) === tenantId && !row.blocked,
			})
			const items = context.db.schemas.items.findMany({
				where: (row) => readTenantId(row) === tenantId && !row.blocked,
			})
			const salesLines = context.db.schemas.salesLines.findMany({
				where: (row) => readTenantId(row) === tenantId,
			})

			const demandByItem = new Map<string, number>()
			for (const line of salesLines) {
				const qty = Number(line.quantity ?? 0)
				demandByItem.set(
					line.itemId,
					(demandByItem.get(line.itemId) ?? 0) + qty,
				)
			}

			const proposals = items
				.map((item, index) => {
					const demandSignal = Math.max(1, demandByItem.get(item._id) ?? 0)
					const targetStock = Math.max(10, Math.ceil(demandSignal * 1.2))
					const currentInventory = Number(item.inventory ?? 0)
					const suggestedOrderQty = Math.max(0, targetStock - currentInventory)
					if (suggestedOrderQty <= 0) return null

					const preferredVendor =
						activeVendors.length > 0
							? activeVendors[index % activeVendors.length]
							: undefined
					const unitCost = Number(item.unitCost ?? 0)
					const estimatedCost = suggestedOrderQty * unitCost
					const rankScore = suggestedOrderQty * 100 + demandSignal

					return {
						itemId: item._id,
						itemNo: item.itemNo,
						description: item.description,
						currentInventory,
						demandSignal,
						targetStock,
						suggestedOrderQty,
						preferredVendorId: preferredVendor?._id,
						preferredVendorNo: preferredVendor?.vendorNo,
						preferredVendorName: preferredVendor?.name,
						unitCost,
						estimatedCost,
						rankScore,
					}
				})
				.filter((proposal): proposal is NonNullable<typeof proposal> =>
					Boolean(proposal),
				)
				.sort((a, b) => b.rankScore - a.rankScore)
				.slice(0, input.limit)

			return {
				generatedAt: new Date().toISOString(),
				proposalCount: proposals.length,
				proposals,
			}
		}),
	generateTransferProposals: publicProcedure
		.input(planningInputSchema)
		.route({
			method: 'POST',
			summary: 'Generate replenishment transfer proposals',
		})
		.handler(({ input, context }) => {
			assertRole(
				context,
				'MANAGER',
				'replenishment transfer proposal generation',
			)
			const tenantId = context.auth.tenantId
			const items = context.db.schemas.items.findMany({
				where: (row) => readTenantId(row) === tenantId && !row.blocked,
			})
			const itemLookup = new Map(items.map((item) => [item._id, item]))

			const ledgerRows = context.db.schemas.itemLedgerEntries.findMany({
				where: (row) =>
					readTenantId(row) === tenantId && !!row.locationCode && !!row.itemId,
			})

			const stockByItemLocation = new Map<string, Map<string, number>>()
			for (const row of ledgerRows) {
				const locationCode = row.locationCode
				if (!locationCode) continue
				const perItem = stockByItemLocation.get(row.itemId) ?? new Map()
				perItem.set(
					locationCode,
					(perItem.get(locationCode) ?? 0) + Number(row.remainingQty ?? 0),
				)
				stockByItemLocation.set(row.itemId, perItem)
			}

			const proposals: Array<{
				itemId: string
				itemNo?: string
				description?: string
				fromLocationCode: string
				toLocationCode: string
				availableQty: number
				shortageQty: number
				suggestedTransferQty: number
				rankScore: number
			}> = []

			for (const [itemId, locationBalances] of stockByItemLocation.entries()) {
				const balances = [...locationBalances.entries()].map(
					([locationCode, qty]) => ({ locationCode, qty }),
				)
				const donors = balances
					.filter((entry) => entry.qty > 8)
					.sort((a, b) => b.qty - a.qty)
				const recipients = balances
					.filter((entry) => entry.qty < 3)
					.sort((a, b) => a.qty - b.qty)

				const donor = donors[0]
				const recipient = recipients[0]
				if (!donor || !recipient) continue
				if (donor.locationCode === recipient.locationCode) continue

				const availableQty = Math.max(0, donor.qty - 5)
				const shortageQty = Math.max(0, 8 - recipient.qty)
				const suggestedTransferQty = Math.min(availableQty, shortageQty)
				if (suggestedTransferQty <= 0) continue

				const item = itemLookup.get(itemId)
				proposals.push({
					itemId,
					itemNo: item?.itemNo,
					description: item?.description,
					fromLocationCode: donor.locationCode,
					toLocationCode: recipient.locationCode,
					availableQty,
					shortageQty,
					suggestedTransferQty,
					rankScore: suggestedTransferQty * 100 + shortageQty,
				})
			}

			proposals.sort((a, b) => b.rankScore - a.rankScore)

			return {
				generatedAt: new Date().toISOString(),
				proposalCount: Math.min(proposals.length, input.limit),
				proposals: proposals.slice(0, input.limit),
			}
		}),
	allocateShortage: publicProcedure
		.input(allocateShortageInputSchema)
		.route({
			method: 'POST',
			summary: 'Allocate constrained inventory shortage by priority',
		})
		.handler(({ input, context }) => {
			assertRole(context, 'MANAGER', 'replenishment shortage allocation')
			let remainingQty = input.shortageQty
			const orderedDemand = [...input.locationDemands].sort((a, b) => {
				if (b.priority !== a.priority) return b.priority - a.priority
				return b.demandQty - a.demandQty
			})

			const allocations = orderedDemand.map((demand) => {
				const allocatedQty = Math.min(demand.demandQty, remainingQty)
				remainingQty -= allocatedQty
				return {
					locationCode: demand.locationCode,
					priority: demand.priority,
					requestedQty: demand.demandQty,
					allocatedQty,
					unmetQty: demand.demandQty - allocatedQty,
				}
			})

			return {
				itemId: input.itemId,
				shortageQty: input.shortageQty,
				allocatedQty: input.shortageQty - remainingQty,
				unallocatedQty: remainingQty,
				allocations,
			}
		}),
})
