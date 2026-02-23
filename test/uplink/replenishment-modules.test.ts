import { db } from '@server/db'
import { beforeEach, describe, expect, test } from 'vitest'
import { createCaller } from './helpers'

describe.sequential('replenishment module', () => {
	const createApprovedPurchaseOrder = async (quantity = 5, unitCost = 20) => {
		const caller = createCaller()
		const vendor = db.schemas.vendors.toArray()[0]
		const item = db.schemas.items.toArray()[0]
		expect(vendor?._id).toBeDefined()
		expect(item?._id).toBeDefined()
		if (!vendor?._id || !item?._id) {
			throw new Error('Missing seeded vendor or item')
		}

		const created = await caller.replenishment.purchaseOrders.createWithLines({
			header: {
				documentType: 'ORDER',
				vendorId: vendor._id,
				orderDate: new Date().toISOString(),
				expectedReceiptDate: new Date().toISOString(),
				currency: 'USD',
			},
			lines: [
				{
					lineNo: 1,
					itemId: item._id,
					quantity,
					unitCost,
					quantityReceived: 0,
					quantityInvoiced: 0,
				},
			],
		})

		db.schemas.purchaseHeaders.update(created.header._id, {
			status: 'APPROVED',
		})

		return {
			caller,
			itemId: item._id,
			vendorId: vendor._id,
			orderId: created.header._id,
			orderNo: created.header.documentNo,
			lineId: created.lines[0]._id,
		}
	}

	beforeEach(async () => {
		await db._internals.reset()
	})

	test('registers replenishment tables on db.schemas', () => {
		expect(Object.keys(db.schemas)).toEqual(
			expect.arrayContaining([
				'vendors',
				'purchaseHeaders',
				'purchaseLines',
				'transferHeaders',
				'transferLines',
			]),
		)
	})

	test('loads replenishment relations with with option', () => {
		const purchaseHeader = db.schemas.purchaseHeaders.toArray()[0]
		expect(purchaseHeader).toBeDefined()

		const purchaseHeaders = db.schemas.purchaseHeaders.findMany({
			where: (row) => row._id === purchaseHeader?._id,
			with: { vendor: true, lines: true },
		})

		expect(purchaseHeaders[0]?.vendor?._id).toBeDefined()
		expect(Array.isArray(purchaseHeaders[0]?.lines)).toBe(true)
		expect((purchaseHeaders[0]?.lines ?? []).length).toBeGreaterThan(0)
	})

	test('exposes callable replenishment rpc surface', async () => {
		const caller = createCaller()

		const purchaseOrders = await caller.replenishment.purchaseOrders.list({
			limit: 5,
			offset: 0,
		})
		expect(Array.isArray(purchaseOrders.items)).toBe(true)

		const vendors = await caller.replenishment.vendors.list({
			limit: 5,
			offset: 0,
		})
		expect(Array.isArray(vendors.items)).toBe(true)

		const transfers = await caller.replenishment.transfers.list({
			limit: 5,
			offset: 0,
		})
		expect(Array.isArray(transfers.items)).toBe(true)
	})

	test('scopes purchase lines by document number filter', async () => {
		const caller = createCaller()
		const vendor = db.schemas.vendors.toArray()[0]
		const item = db.schemas.items.toArray()[0]
		expect(vendor?._id).toBeDefined()
		expect(item?._id).toBeDefined()
		const vendorId = vendor?._id
		const itemId = item?._id
		if (!vendorId || !itemId) {
			throw new Error('Missing seeded vendor or item')
		}

		const orderA = await caller.replenishment.purchaseOrders.create({
			documentNo: '',
			vendorId,
			documentType: 'ORDER',
			orderDate: new Date().toISOString(),
			expectedReceiptDate: new Date().toISOString(),
			currency: 'USD',
		})
		const orderB = await caller.replenishment.purchaseOrders.create({
			documentNo: '',
			vendorId,
			documentType: 'ORDER',
			orderDate: new Date().toISOString(),
			expectedReceiptDate: new Date().toISOString(),
			currency: 'USD',
		})

		const lineA = await caller.replenishment.purchaseLines.create({
			documentNo: orderA.documentNo,
			itemId,
			quantity: 3,
			unitCost: 25,
			lineAmount: 75,
			quantityReceived: 0,
			quantityInvoiced: 0,
		})
		await caller.replenishment.purchaseLines.create({
			documentNo: orderB.documentNo,
			itemId,
			quantity: 2,
			unitCost: 40,
			lineAmount: 80,
			quantityReceived: 0,
			quantityInvoiced: 0,
		})

		const scopedLines =
			await caller.replenishment.purchaseLines.listViewRecords({
				viewId: 'overview',
				limit: 50,
				offset: 0,
				filters: { documentNo: orderA.documentNo },
			})

		expect(scopedLines.items.length).toBeGreaterThan(0)
		expect(
			scopedLines.items.every((line) => line.documentNo === orderA.documentNo),
		).toBe(true)
		expect(scopedLines.items.some((line) => line._id === lineA._id)).toBe(true)
	})

	test('rejects purchase/transfer line create when parent references are invalid', async () => {
		const caller = createCaller()
		const item = db.schemas.items.toArray()[0]
		expect(item?._id).toBeDefined()
		if (!item?._id) {
			throw new Error('Missing seeded item')
		}

		await expect(
			caller.replenishment.purchaseLines.create({
				documentNo: 'PO-NOT-FOUND',
				itemId: item._id,
				quantity: 1,
				unitCost: 10,
				lineAmount: 10,
				quantityReceived: 0,
				quantityInvoiced: 0,
			}),
		).rejects.toThrow('parent not found')

		await expect(
			caller.replenishment.transferLines.create({
				transferNo: 'TR-NOT-FOUND',
				itemId: item._id,
				quantity: 1,
				quantityShipped: 0,
				quantityReceived: 0,
			}),
		).rejects.toThrow('parent not found')
	})

	test('creates purchase orders with lines atomically via createWithLines', async () => {
		const caller = createCaller()
		const vendor = db.schemas.vendors.toArray()[0]
		const item = db.schemas.items.toArray()[0]
		expect(vendor?._id).toBeDefined()
		expect(item?._id).toBeDefined()
		if (!vendor?._id || !item?._id) {
			throw new Error('Missing seeded vendor or item')
		}

		const created = await caller.replenishment.purchaseOrders.createWithLines({
			header: {
				documentType: 'ORDER',
				vendorId: vendor._id,
				orderDate: new Date().toISOString(),
				expectedReceiptDate: new Date().toISOString(),
				currency: 'USD',
			},
			lines: [
				{
					lineNo: 1,
					itemId: item._id,
					quantity: 4,
					unitCost: 30,
					quantityReceived: 0,
					quantityInvoiced: 0,
				},
				{
					lineNo: 2,
					itemId: item._id,
					quantity: 2,
					unitCost: 45,
					quantityReceived: 0,
					quantityInvoiced: 0,
				},
			],
		})

		expect(created.header._id).toBeDefined()
		expect(created.header.documentNo).toBeTruthy()
		expect(created.lines).toHaveLength(2)
		expect(
			created.lines.every((line) => line.documentNo === created.header.documentNo),
		).toBe(true)
	})

	test('supports idempotent purchase createWithLines retries using idempotencyKey', async () => {
		const caller = createCaller()
		const vendor = db.schemas.vendors.toArray()[0]
		const item = db.schemas.items.toArray()[0]
		expect(vendor?._id).toBeDefined()
		expect(item?._id).toBeDefined()
		if (!vendor?._id || !item?._id) {
			throw new Error('Missing seeded vendor or item')
		}

		const idempotencyKey = `rp-po-${Date.now()}`
		const first = await caller.replenishment.purchaseOrders.createWithLines({
			header: {
				documentType: 'ORDER',
				vendorId: vendor._id,
				orderDate: new Date().toISOString(),
				expectedReceiptDate: new Date().toISOString(),
				currency: 'USD',
			},
			lines: [
				{
					lineNo: 1,
					itemId: item._id,
					quantity: 3,
					unitCost: 20,
					quantityReceived: 0,
					quantityInvoiced: 0,
				},
			],
			idempotencyKey,
		})
		expect(first.idempotent).toBe(false)

		const second = await caller.replenishment.purchaseOrders.createWithLines({
			header: {
				documentType: 'ORDER',
				vendorId: vendor._id,
				orderDate: new Date().toISOString(),
				expectedReceiptDate: new Date().toISOString(),
				currency: 'USD',
			},
			lines: [
				{
					lineNo: 1,
					itemId: item._id,
					quantity: 3,
					unitCost: 20,
					quantityReceived: 0,
					quantityInvoiced: 0,
				},
			],
			idempotencyKey,
		})
		expect(second.idempotent).toBe(true)
		expect(second.header._id).toBe(first.header._id)
		expect(
			db.schemas.purchaseHeaders.findMany({
				where: (row) => row.idempotencyKey === idempotencyKey,
			}),
		).toHaveLength(1)
	})

	test('rolls back purchase createWithLines when any line insert fails', async () => {
		const caller = createCaller()
		const vendor = db.schemas.vendors.toArray()[0]
		expect(vendor?._id).toBeDefined()
		if (!vendor?._id) {
			throw new Error('Missing seeded vendor')
		}

		const headerCountBefore = db.schemas.purchaseHeaders.toArray().length
		const lineCountBefore = db.schemas.purchaseLines.toArray().length

		await expect(
			caller.replenishment.purchaseOrders.createWithLines({
				header: {
					documentType: 'ORDER',
					vendorId: vendor._id,
					orderDate: new Date().toISOString(),
					expectedReceiptDate: new Date().toISOString(),
					currency: 'USD',
				},
				lines: [
					{
						itemId: 'missing-item',
						quantity: 1,
						unitCost: 5,
						quantityReceived: 0,
						quantityInvoiced: 0,
					},
				],
			}),
		).rejects.toThrow()

		expect(db.schemas.purchaseHeaders.toArray()).toHaveLength(headerCountBefore)
		expect(db.schemas.purchaseLines.toArray()).toHaveLength(lineCountBefore)
	})

	test('updates purchase order header and line deltas atomically via updateWithLines', async () => {
		const caller = createCaller()
		const vendor = db.schemas.vendors.toArray()[0]
		const item = db.schemas.items.toArray()[0]
		expect(vendor?._id).toBeDefined()
		expect(item?._id).toBeDefined()
		if (!vendor?._id || !item?._id) {
			throw new Error('Missing seeded vendor or item')
		}

		const created = await caller.replenishment.purchaseOrders.createWithLines({
			header: {
				documentType: 'ORDER',
				vendorId: vendor._id,
				orderDate: new Date().toISOString(),
				expectedReceiptDate: new Date().toISOString(),
				currency: 'USD',
			},
			lines: [
				{
					lineNo: 1,
					itemId: item._id,
					quantity: 3,
					unitCost: 30,
					quantityReceived: 0,
					quantityInvoiced: 0,
				},
				{
					lineNo: 2,
					itemId: item._id,
					quantity: 2,
					unitCost: 40,
					quantityReceived: 0,
					quantityInvoiced: 0,
				},
			],
		})

		const firstLine = created.lines[0]
		const secondLine = created.lines[1]
		const updated = await caller.replenishment.purchaseOrders.updateWithLines({
			id: created.header._id,
			header: { currency: 'EUR' },
			lineChanges: [
				{
					id: firstLine._id,
					itemId: firstLine.itemId,
					quantity: 6,
					unitCost: 30,
					quantityReceived: 1,
					quantityInvoiced: 0,
				},
				{
					id: secondLine._id,
					itemId: secondLine.itemId,
					quantity: secondLine.quantity,
					unitCost: secondLine.unitCost,
					quantityReceived: secondLine.quantityReceived,
					quantityInvoiced: secondLine.quantityInvoiced,
					_delete: true,
				},
				{
					itemId: item._id,
					quantity: 1,
					unitCost: 70,
					quantityReceived: 0,
					quantityInvoiced: 0,
				},
			],
		})

		expect(updated.header.currency).toBe('EUR')
		expect(updated.lines).toHaveLength(2)
		expect(updated.lines.some((line) => line._id === secondLine._id)).toBe(false)
		expect(
			updated.lines.some(
				(line) =>
					line._id === firstLine._id &&
					line.quantity === 6 &&
					line.quantityReceived === 1,
			),
		).toBe(true)
	})

	test('rejects purchase updateWithLines when line id does not belong to order', async () => {
		const caller = createCaller()
		const vendor = db.schemas.vendors.toArray()[0]
		const item = db.schemas.items.toArray()[0]
		expect(vendor?._id).toBeDefined()
		expect(item?._id).toBeDefined()
		if (!vendor?._id || !item?._id) {
			throw new Error('Missing seeded vendor or item')
		}

		const orderA = await caller.replenishment.purchaseOrders.createWithLines({
			header: {
				documentType: 'ORDER',
				vendorId: vendor._id,
				orderDate: new Date().toISOString(),
				expectedReceiptDate: new Date().toISOString(),
				currency: 'USD',
			},
			lines: [
				{
					itemId: item._id,
					quantity: 1,
					unitCost: 15,
					quantityReceived: 0,
					quantityInvoiced: 0,
				},
			],
		})
		const orderB = await caller.replenishment.purchaseOrders.createWithLines({
			header: {
				documentType: 'ORDER',
				vendorId: vendor._id,
				orderDate: new Date().toISOString(),
				expectedReceiptDate: new Date().toISOString(),
				currency: 'USD',
			},
			lines: [
				{
					itemId: item._id,
					quantity: 1,
					unitCost: 15,
					quantityReceived: 0,
					quantityInvoiced: 0,
				},
			],
		})

		await expect(
			caller.replenishment.purchaseOrders.updateWithLines({
				id: orderA.header._id,
				lineChanges: [
					{
						id: orderB.lines[0]._id,
						itemId: item._id,
						quantity: 2,
						unitCost: 15,
						quantityReceived: 0,
						quantityInvoiced: 0,
					},
				],
			}),
		).rejects.toThrow('Purchase line not found for this purchase order')
	})

	test('receives purchase order quantities and blocks over-receipt attempts', async () => {
		const { caller, orderId, lineId } = await createApprovedPurchaseOrder(5, 30)

		const received = await caller.replenishment.purchaseOrders.receive({
			purchaseOrderId: orderId,
			lines: [{ purchaseLineId: lineId, quantity: 2 }],
		})
		expect(received.receiptCount).toBe(1)
		expect(received.receivedQty).toBe(2)
		expect(
			received.lines.some(
				(line) => line._id === lineId && Number(line.quantityReceived) === 2,
			),
		).toBe(true)

		await expect(
			caller.replenishment.purchaseOrders.receive({
				purchaseOrderId: orderId,
				lines: [{ purchaseLineId: lineId, quantity: 4 }],
			}),
		).rejects.toThrow('Over-receipt detected')

		const receipts = db.schemas.purchaseReceipts.findMany({
			where: (row) => row.purchaseLineId === lineId,
		})
		expect(receipts).toHaveLength(1)
	})

	test('creates purchase invoice from received purchase quantities', async () => {
		const { caller, orderId, lineId } = await createApprovedPurchaseOrder(5, 40)

		await caller.replenishment.purchaseOrders.receive({
			purchaseOrderId: orderId,
			lines: [{ purchaseLineId: lineId, quantity: 3 }],
		})

		const createdInvoice =
			await caller.replenishment.purchaseInvoices.createFromOrder({
				purchaseOrderId: orderId,
			})

		expect(createdInvoice.header._id).toBeDefined()
		expect(createdInvoice.header.status).toBe('DRAFT')
		expect(createdInvoice.lines).toHaveLength(1)
		expect(createdInvoice.lines[0].purchaseLineId).toBe(lineId)
		expect(Number(createdInvoice.lines[0].quantity)).toBe(3)
		expect(Number(createdInvoice.lines[0].lineAmount)).toBe(120)
	})

	test('posts purchase invoice and keeps posting idempotent on retries', async () => {
		const { caller, orderId, lineId } = await createApprovedPurchaseOrder(5, 25)

		await caller.replenishment.purchaseOrders.receive({
			purchaseOrderId: orderId,
			lines: [{ purchaseLineId: lineId, quantity: 4 }],
		})

		const createdInvoice =
			await caller.replenishment.purchaseInvoices.createFromOrder({
				purchaseOrderId: orderId,
			})

		const posted = await caller.replenishment.purchaseInvoices.postInvoice({
			invoiceId: createdInvoice.header._id,
		})
		expect(posted.status).toBe('POSTED')
		expect(posted.idempotent).toBe(false)
		expect(posted.vendorLedgerEntryId).toBeTruthy()
		expect(posted.detailedEntryIds.length).toBeGreaterThan(0)

		const purchaseLine = db.schemas.purchaseLines.get(lineId)
		expect(Number(purchaseLine?.quantityInvoiced ?? 0)).toBe(4)

		const vendorEntries = db.schemas.vendorLedgerEntries.findMany({
			where: (row) =>
				row.documentNo === createdInvoice.header.invoiceNo &&
				row.documentType === 'INVOICE',
		})
		const detailEntries = db.schemas.detailedVendorLedgerEntries.findMany({
			where: (row) =>
				row.documentNo === createdInvoice.header.invoiceNo &&
				row.documentType === 'INVOICE',
		})
		expect(vendorEntries).toHaveLength(1)
		expect(detailEntries.length).toBeGreaterThan(0)

		const reposted = await caller.replenishment.purchaseInvoices.postInvoice({
			invoiceId: createdInvoice.header._id,
		})
		expect(reposted.idempotent).toBe(true)
		expect(reposted.vendorLedgerEntryId).toBe(vendorEntries[0]._id)
		expect(reposted.detailedEntryIds).toHaveLength(detailEntries.length)

		const vendorEntriesAfterRetry = db.schemas.vendorLedgerEntries.findMany({
			where: (row) =>
				row.documentNo === createdInvoice.header.invoiceNo &&
				row.documentType === 'INVOICE',
		})
		const detailEntriesAfterRetry =
			db.schemas.detailedVendorLedgerEntries.findMany({
				where: (row) =>
					row.documentNo === createdInvoice.header.invoiceNo &&
					row.documentType === 'INVOICE',
			})
		expect(vendorEntriesAfterRetry).toHaveLength(1)
		expect(detailEntriesAfterRetry).toHaveLength(detailEntries.length)
	})

	test('rolls back payable side effects when purchase invoice posting fails', async () => {
		const { caller, orderId, lineId } = await createApprovedPurchaseOrder(5, 10)

		await caller.replenishment.purchaseOrders.receive({
			purchaseOrderId: orderId,
			lines: [{ purchaseLineId: lineId, quantity: 2 }],
		})

		const createdInvoice =
			await caller.replenishment.purchaseInvoices.createFromOrder({
				purchaseOrderId: orderId,
			})
		const invoiceLine = createdInvoice.lines[0]
		db.schemas.purchaseInvoiceLines.update(invoiceLine._id, {
			quantity: 5,
			lineAmount: 50,
		})

		await expect(
			caller.replenishment.purchaseInvoices.postInvoice({
				invoiceId: createdInvoice.header._id,
			}),
		).rejects.toThrow('Over-invoice detected')

		const refreshedInvoice = db.schemas.purchaseInvoiceHeaders.get(
			createdInvoice.header._id,
		)
		expect(refreshedInvoice?.status).toBe('DRAFT')

		const purchaseLine = db.schemas.purchaseLines.get(lineId)
		expect(Number(purchaseLine?.quantityInvoiced ?? 0)).toBe(0)

		const vendorEntries = db.schemas.vendorLedgerEntries.findMany({
			where: (row) => row.documentNo === createdInvoice.header.invoiceNo,
		})
		const detailEntries = db.schemas.detailedVendorLedgerEntries.findMany({
			where: (row) => row.documentNo === createdInvoice.header.invoiceNo,
		})
		expect(vendorEntries).toHaveLength(0)
		expect(detailEntries).toHaveLength(0)
	})

	test('supports vendor creation workflow', async () => {
		const caller = createCaller()

		const createdVendor = await caller.replenishment.vendors.create({
			vendorNo: '',
			name: 'Northwind Supply',
			contactName: 'Alex Buyer',
			email: 'buyer@northwind.test',
			phone: '+1-555-0101',
			address: '100 Main St',
			city: 'Austin',
			country: 'US',
			currency: 'USD',
			blocked: false,
		})

		expect(createdVendor._id).toBeDefined()
		expect(createdVendor.vendorNo).toBeTruthy()
		expect(createdVendor.name).toBe('Northwind Supply')
	})

	test('supports transfer create flow with line management', async () => {
		const caller = createCaller()
		const [fromLocation, toLocation] = db.schemas.locations.toArray()
		const item = db.schemas.items.toArray()[0]
		expect(fromLocation?.code).toBeDefined()
		expect(toLocation?.code).toBeDefined()
		expect(item?._id).toBeDefined()
		const fromCode = fromLocation?.code
		const toCode = toLocation?.code
		const itemId = item?._id
		if (!fromCode || !toCode || !itemId) {
			throw new Error('Missing seeded locations or items')
		}

		const transfer = await caller.replenishment.transfers.create({
			transferNo: '',
			fromLocationCode: fromCode,
			toLocationCode: toCode,
			shipmentDate: new Date().toISOString(),
			receiptDate: '',
			lineCount: 0,
		})

		const line = await caller.replenishment.transferLines.create({
			transferNo: transfer.transferNo,
			itemId,
			quantity: 4,
			quantityShipped: 0,
			quantityReceived: 0,
		})
		expect(line.transferNo).toBe(transfer.transferNo)

		const transferLines =
			await caller.replenishment.transferLines.listViewRecords({
				viewId: 'overview',
				limit: 50,
				offset: 0,
				filters: { transferNo: transfer.transferNo },
			})
		expect(transferLines.items.some((row) => row._id === line._id)).toBe(true)
		expect(
			transferLines.items.every(
				(row) => row.transferNo === transfer.transferNo,
			),
		).toBe(true)
	})

	test('returns ranked planning proposals and shortage allocation output', async () => {
		const caller = createCaller()
		const item = db.schemas.items.toArray()[0]
		expect(item?._id).toBeDefined()
		const itemId = item?._id
		if (!itemId) throw new Error('Missing seeded item')

		const purchasePlanning =
			await caller.replenishment.generatePurchaseProposals({
				limit: 10,
			})
		expect(Array.isArray(purchasePlanning.proposals)).toBe(true)
		expect(purchasePlanning.proposalCount).toBeLessThanOrEqual(10)
		if (purchasePlanning.proposals.length > 1) {
			expect(purchasePlanning.proposals[0].rankScore).toBeGreaterThanOrEqual(
				purchasePlanning.proposals[1].rankScore,
			)
		}

		const transferPlanning =
			await caller.replenishment.generateTransferProposals({
				limit: 10,
			})
		expect(Array.isArray(transferPlanning.proposals)).toBe(true)
		expect(transferPlanning.proposalCount).toBeLessThanOrEqual(10)

		const allocation = await caller.replenishment.allocateShortage({
			itemId,
			shortageQty: 12,
			locationDemands: [
				{ locationCode: 'LOC-A', demandQty: 7, priority: 10 },
				{ locationCode: 'LOC-B', demandQty: 5, priority: 5 },
				{ locationCode: 'LOC-C', demandQty: 4, priority: 1 },
			],
		})

		const allocatedTotal = allocation.allocations.reduce(
			(sum, row) => sum + row.allocatedQty,
			0,
		)
		const unmetTotal = allocation.allocations.reduce(
			(sum, row) => sum + row.unmetQty,
			0,
		)
		expect(allocatedTotal).toBe(allocation.allocatedQty)
		expect(allocation.unallocatedQty).toBe(0)
		expect(unmetTotal).toBe(4)
	})

	test('enforces purchase-order transitions and reason requirements', async () => {
		const caller = createCaller()
		const purchaseHeader = db.schemas.purchaseHeaders.toArray()[0]
		expect(purchaseHeader?._id).toBeDefined()

		db.schemas.purchaseHeaders.update(purchaseHeader?._id, {
			status: 'PENDING_APPROVAL',
		})

		await expect(
			caller.replenishment.purchaseOrders.transitionStatus({
				id: purchaseHeader?._id,
				toStatus: 'CANCELED',
			}),
		).rejects.toThrow('is not allowed')

		await expect(
			caller.replenishment.purchaseOrders.transitionStatus({
				id: purchaseHeader?._id,
				toStatus: 'REJECTED',
			}),
		).rejects.toThrow('A reason is required')
	})

	test('enforces transfer reason requirement for canceled', async () => {
		const caller = createCaller()
		const transferHeader = db.schemas.transferHeaders.toArray()[0]
		expect(transferHeader?._id).toBeDefined()

		db.schemas.transferHeaders.update(transferHeader?._id, {
			status: 'RELEASED',
		})

		await expect(
			caller.replenishment.transfers.transitionStatus({
				id: transferHeader?._id,
				toStatus: 'CANCELED',
			}),
		).rejects.toThrow('A reason is required')
	})

	test('keeps 25-row replenishment pagination within acceptable latency', async () => {
		const caller = createCaller()
		const maxDurationMs = 2000
		const startedAt = Date.now()
		const result = await caller.replenishment.purchaseOrders.list({
			limit: 25,
			offset: 0,
		})
		const durationMs = Date.now() - startedAt

		expect(Array.isArray(result.items)).toBe(true)
		expect(result.items.length).toBeLessThanOrEqual(25)
		expect(durationMs).toBeLessThan(maxDurationMs)
	})
})
