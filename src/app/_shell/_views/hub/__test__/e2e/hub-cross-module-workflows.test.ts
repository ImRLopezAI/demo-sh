import { db } from '@server/db'
import { beforeEach, describe, expect, test } from 'vitest'
import { createCaller } from '../../../../../../../test/uplink/helpers'

describe('cross-module workflows', () => {
	const createApprovedSalesOrder = async () => {
		const caller = createCaller()
		const customer = db.schemas.customers.toArray()[0]
		const item = db.schemas.items.toArray()[0]
		expect(customer?._id).toBeDefined()
		expect(item?._id).toBeDefined()
		if (!customer?._id || !item?._id) {
			throw new Error('Missing customer or item seed data')
		}

		const created = await caller.market.salesOrders.createWithLines({
			header: {
				documentType: 'ORDER',
				customerId: customer._id,
				orderDate: new Date().toISOString(),
				currency: 'USD',
			},
			lines: [
				{
					lineNo: 1,
					itemId: item._id,
					quantity: 2,
					unitPrice: 50,
					discountPercent: 0,
				},
			],
		})
		db.schemas.salesHeaders.update(created.header._id, {
			status: 'APPROVED',
		})

		return {
			caller,
			orderId: created.header._id,
			orderNo: created.header.documentNo,
		}
	}

	beforeEach(async () => {
		await db._internals.reset()
	})

	test('runs market checkout to ledger posting to trace dispatch workflow', async () => {
		const caller = createCaller()
		const customer = db.schemas.customers.toArray()[0]
		const item = db.schemas.items.toArray()[0]
		const shipmentMethod = db.schemas.shipmentMethods.toArray()[0]
		expect(customer?._id).toBeDefined()
		expect(item?._id).toBeDefined()
		expect(shipmentMethod?.code).toBeDefined()
		if (!customer?._id || !item?._id || !shipmentMethod?.code) {
			throw new Error('Missing customer, item, or shipment method seed data')
		}

		const cart = await caller.market.carts.create({
			customerId: customer._id,
			status: 'OPEN',
			currency: 'USD',
		})
		await caller.market.cartLines.create({
			cartId: cart._id,
			itemId: item._id,
			quantity: 2,
			unitPrice: 42,
			lineAmount: 84,
		})

		const checkout = await caller.market.carts.checkout({ cartId: cart._id })
		expect(checkout.cartStatus).toBe('CHECKED_OUT')
		expect(checkout.orderNo).toBeTruthy()

		const orderLines = await caller.market.salesLines.list({
			limit: 25,
			offset: 0,
			filters: { documentNo: checkout.orderNo },
		})
		expect(orderLines.items.length).toBeGreaterThan(0)

		const invoice = await caller.ledger.invoices.create({
			invoiceNo: '',
			customerId: customer._id,
			salesOrderNo: checkout.orderNo,
			currency: 'USD',
		})
		for (const [index, line] of orderLines.items.entries()) {
			await caller.ledger.invoiceLines.create({
				invoiceNo: invoice.invoiceNo,
				lineNo: index + 1,
				itemId: line.itemId,
				quantity: Number(line.quantity ?? 0),
				unitPrice: Number(line.unitPrice ?? 0),
				lineAmount: Number(line.lineAmount ?? 0),
			})
		}

		const postedInvoice = await caller.ledger.invoices.postInvoice({
			id: invoice._id,
		})
		expect(postedInvoice.status).toBe('POSTED')
		expect(postedInvoice.glEntryIds.length).toBeGreaterThanOrEqual(2)
		expect(postedInvoice.customerLedgerEntryId).toBeTruthy()

		const shipment = await caller.trace.shipments.create({
			shipmentNo: '',
			status: 'PLANNED',
			sourceDocumentType: 'SALES_ORDER',
			sourceDocumentNo: checkout.orderNo,
			shipmentMethodCode: shipmentMethod.code,
			trackingNo: `TRACK-${Date.now()}`,
		})
		await caller.trace.shipmentLines.create({
			shipmentNo: shipment.shipmentNo,
			lineNo: 1,
			itemId: item._id,
			quantity: 2,
			quantityShipped: 0,
		})

		const dispatched = await caller.trace.shipments.transitionWithNotification({
			id: shipment._id,
			toStatus: 'DISPATCHED',
		})
		expect(dispatched.status).toBe('DISPATCHED')
		const traceNotification = db.schemas.moduleNotifications.get(
			dispatched.notificationId,
		)
		expect(traceNotification?.moduleId).toBe('trace')
		expect(traceNotification?.status).toBe('UNREAD')
	})

	test('runs payroll posting to flow disbursement visibility workflow', async () => {
		const caller = createCaller()
		const employee = db.schemas.employees.findMany({
			where: (row) => row.status === 'ACTIVE',
			limit: 1,
		})[0]
		const bankAccount =
			db.schemas.bankAccounts.findMany({
				where: (row) => row.status === 'ACTIVE',
				limit: 1,
			})[0] ?? db.schemas.bankAccounts.toArray()[0]
		expect(employee?._id).toBeDefined()
		expect(bankAccount?._id).toBeDefined()
		if (!employee?._id || !bankAccount?._id) {
			throw new Error('Missing active employee or bank account seed data')
		}
		if (bankAccount.status !== 'ACTIVE') {
			db.schemas.bankAccounts.update(bankAccount._id, { status: 'ACTIVE' })
		}

		const payrollRun = await caller.payroll.payrollRuns.create({
			runNo: '',
			status: 'DRAFT',
			periodStart: '2026-01-01',
			periodEnd: '2026-01-31',
			scopeType: 'SELECTED',
			selectedEmployeeIds: employee._id,
			currency: 'USD',
		})

		const calculated = await caller.payroll.payrollRuns.calculateRun({
			runId: payrollRun._id,
		})
		expect(calculated.status).toBe('CALCULATED')
		expect(calculated.employeeCount).toBe(1)

		const posted = await caller.payroll.payrollRuns.postRun({
			runId: payrollRun._id,
		})
		expect(posted.status).toBe('POSTED')
		expect(posted.journalCount).toBeGreaterThan(0)

		const paid = await caller.payroll.payrollRuns.markRunPaid({
			runId: payrollRun._id,
			bankAccountId: bankAccount._id,
		})
		expect(paid.status).toBe('PAID')
		expect(paid.disbursementId).toBeTruthy()

		const flowLedgerEntries = await caller.flow.bankLedgerEntries.list({
			limit: 50,
			offset: 0,
			filters: {
				documentType: 'PAYROLL',
				documentNo: payrollRun.runNo,
			},
		})
		expect(flowLedgerEntries.items.length).toBeGreaterThan(0)
	})

	test('runs replenishment procure-to-pay workflow with payables visibility', async () => {
		const caller = createCaller()
		const vendor = db.schemas.vendors.toArray()[0]
		const item = db.schemas.items.toArray()[0]
		expect(vendor?._id).toBeDefined()
		expect(item?._id).toBeDefined()
		if (!vendor?._id || !item?._id) {
			throw new Error('Missing vendor or item seed data')
		}

		const purchaseOrder =
			await caller.replenishment.purchaseOrders.createWithLines({
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
						lineNo: 1,
						quantity: 3,
						unitCost: 18,
						quantityReceived: 0,
						quantityInvoiced: 0,
					},
				],
			})
		db.schemas.purchaseHeaders.update(purchaseOrder.header._id, {
			status: 'APPROVED',
		})

		const received = await caller.replenishment.purchaseOrders.receive({
			purchaseOrderId: purchaseOrder.header._id,
			lines: [{ purchaseLineId: purchaseOrder.lines[0]._id, quantity: 3 }],
		})
		expect(received.receiptCount).toBe(1)

		const invoice = await caller.replenishment.purchaseInvoices.createFromOrder(
			{
				purchaseOrderId: purchaseOrder.header._id,
			},
		)
		expect(invoice.lines).toHaveLength(1)

		const posted = await caller.replenishment.purchaseInvoices.postInvoice({
			invoiceId: invoice.header._id,
		})
		expect(posted.status).toBe('POSTED')
		expect(posted.vendorLedgerEntryId).toBeTruthy()

		const payables = await caller.replenishment.vendorLedger.list({
			limit: 10,
			offset: 0,
			filters: { documentNo: invoice.header.invoiceNo },
		})
		expect(payables.items).toHaveLength(1)

		const detailed = await caller.replenishment.detailedVendorLedger.list({
			limit: 10,
			offset: 0,
			filters: { documentNo: invoice.header.invoiceNo },
		})
		expect(detailed.items.length).toBeGreaterThan(0)

		const ledgerEntries = await caller.ledger.glEntries.list({
			limit: 10,
			offset: 0,
			filters: { documentNo: invoice.header.invoiceNo },
		})
		expect(ledgerEntries.items).toHaveLength(0)
	})

	test('runs hub order fulfillment workflow with idempotent start behavior', async () => {
		const { caller, orderId, orderNo } = await createApprovedSalesOrder()

		const started = await caller.hub.orderFulfillment.startOrderFulfillment({
			orderId,
		})
		expect(started.status).toBe('COMPLETED')
		expect(started.completed).toBe(true)
		expect(started.failed).toBe(false)
		expect(started.invoiceNo).toBeTruthy()
		expect(started.shipmentNo).toBeTruthy()
		expect(started.steps).toHaveLength(3)
		expect(started.steps.every((step) => step.status === 'COMPLETED')).toBe(
			true,
		)

		const restarted = await caller.hub.orderFulfillment.startOrderFulfillment({
			orderId,
		})
		expect(restarted.idempotent).toBe(true)
		expect(restarted.workflowId).toBe(started.workflowId)
		expect(restarted.invoiceNo).toBe(started.invoiceNo)
		expect(restarted.shipmentNo).toBe(started.shipmentNo)

		const workflows = db.schemas.orderWorkflows.findMany({
			where: (row) => row.salesOrderId === orderId,
		})
		expect(workflows).toHaveLength(1)

		const invoices = db.schemas.salesInvoiceHeaders.findMany({
			where: (row) => row.salesOrderNo === orderNo,
		})
		const shipments = db.schemas.shipments.findMany({
			where: (row) =>
				row.sourceDocumentType === 'SALES_ORDER' &&
				row.sourceDocumentNo === orderNo,
		})
		expect(invoices).toHaveLength(1)
		expect(shipments).toHaveLength(1)

		const status = await caller.hub.orderFulfillment.getOrderFulfillmentStatus({
			workflowId: started.workflowId,
		})
		expect(status.status).toBe('COMPLETED')
		expect(status.summary.completedSteps).toBe(3)
		expect(status.summary.failedSteps).toBe(0)
	})

	test('resumes failed hub order fulfillment workflow without duplicating invoice state', async () => {
		const { caller, orderId, orderNo } = await createApprovedSalesOrder()
		const shipmentMethods = db.schemas.shipmentMethods.toArray()
		expect(shipmentMethods.length).toBeGreaterThan(0)
		for (const method of shipmentMethods) {
			db.schemas.shipmentMethods.update(method._id, { active: false })
		}

		const started = await caller.hub.orderFulfillment.startOrderFulfillment({
			orderId,
		})
		expect(started.status).toBe('FAILED')
		expect(started.failed).toBe(true)
		expect(started.failureStage).toBe('CREATE_SHIPMENT')
		expect(started.invoiceNo).toBeTruthy()
		expect(started.shipmentNo).toBeNull()

		const invoice = db.schemas.salesInvoiceHeaders.findMany({
			where: (row) => row.salesOrderNo === orderNo,
			limit: 1,
		})[0]
		expect(invoice?.status).toBe('POSTED')
		expect(invoice?.invoiceNo).toBeTruthy()
		if (!invoice?.invoiceNo) {
			throw new Error('Expected posted invoice for failed workflow')
		}

		const custLedgerEntries = db.schemas.custLedgerEntries.findMany({
			where: (row) =>
				row.documentNo === invoice.invoiceNo && row.documentType === 'INVOICE',
		})
		const glEntries = db.schemas.glEntries.findMany({
			where: (row) =>
				row.documentNo === invoice.invoiceNo && row.documentType === 'INVOICE',
		})
		expect(custLedgerEntries.length).toBeGreaterThan(0)
		expect(glEntries.length).toBeGreaterThanOrEqual(2)

		const marker = `[workflow:${started.workflowId}]`
		const failureTask = db.schemas.operationTasks.findMany({
			where: (row) =>
				typeof row.description === 'string' && row.description.includes(marker),
			limit: 1,
		})[0]
		const failureNotification = db.schemas.moduleNotifications.findMany({
			where: (row) => typeof row.body === 'string' && row.body.includes(marker),
			limit: 1,
		})[0]
		expect(failureTask?._id).toBeDefined()
		expect(failureNotification?._id).toBeDefined()

		db.schemas.shipmentMethods.update(shipmentMethods[0]._id, { active: true })

		const resumed = await caller.hub.orderFulfillment.resumeOrderFulfillment({
			workflowId: started.workflowId,
		})
		expect(resumed.status).toBe('COMPLETED')
		expect(resumed.completed).toBe(true)
		expect(resumed.failed).toBe(false)
		expect(resumed.resumed).toBe(true)
		expect(resumed.shipmentNo).toBeTruthy()

		const status = await caller.hub.orderFulfillment.getOrderFulfillmentStatus({
			workflowId: started.workflowId,
		})
		expect(status.status).toBe('COMPLETED')
		const shipmentStep = status.steps.find(
			(step) => step.stage === 'CREATE_SHIPMENT',
		)
		expect(Number(shipmentStep?.attemptNo ?? 0)).toBeGreaterThanOrEqual(2)

		const invoiceRows = db.schemas.salesInvoiceHeaders.findMany({
			where: (row) => row.salesOrderNo === orderNo,
		})
		const shipmentRows = db.schemas.shipments.findMany({
			where: (row) =>
				row.sourceDocumentType === 'SALES_ORDER' &&
				row.sourceDocumentNo === orderNo,
		})
		expect(invoiceRows).toHaveLength(1)
		expect(shipmentRows).toHaveLength(1)
	})

	test('runs POS session start API to transaction completion workflow', async () => {
		const caller = createCaller()
		const terminal =
			db.schemas.terminals.findMany({
				where: (row) => row.status === 'ONLINE',
				limit: 1,
			})[0] ?? db.schemas.terminals.toArray()[0]
		const item = db.schemas.items.toArray()[0]
		expect(terminal?._id).toBeDefined()
		expect(item?._id).toBeDefined()
		if (!terminal?._id || !item?._id) {
			throw new Error('Missing terminal or item seed data')
		}
		if (terminal.status !== 'ONLINE') {
			db.schemas.terminals.update(terminal._id, { status: 'ONLINE' })
		}

		const startedSession = await caller.pos.sessions.startSession({
			terminalId: terminal._id,
			cashierId: 'cashier-cross-module',
			openingBalance: 75,
		})
		expect(startedSession.idempotent).toBe(false)
		expect(startedSession.status).toBe('OPEN')

		const transaction = await caller.pos.transactions.create({
			receiptNo: '',
			posSessionId: startedSession.sessionId,
			totalAmount: 75,
			taxAmount: 10,
			discountAmount: 0,
			paidAmount: 75,
			paymentMethod: 'CARD',
		})
		const transactionLine = await caller.pos.transactionLines.create({
			transactionId: transaction._id,
			itemId: item._id,
			quantity: 1,
			unitPrice: 75,
			lineAmount: 75,
			discountPercent: 0,
		})
		expect(transactionLine.transactionId).toBe(transaction._id)

		const completed = await caller.pos.transactions.transitionStatus({
			id: transaction._id,
			toStatus: 'COMPLETED',
		})
		expect(completed?.status).toBe('COMPLETED')

		const scopedLines = await caller.pos.transactionLines.list({
			limit: 25,
			offset: 0,
			filters: { transactionId: transaction._id },
		})
		expect(
			scopedLines.items.some((line) => line._id === transactionLine._id),
		).toBe(true)
	})

	test('prevents ledger posting orphaned state when invoice lines are missing', async () => {
		const caller = createCaller()
		const customer = db.schemas.customers.toArray()[0]
		expect(customer?._id).toBeDefined()
		if (!customer?._id) {
			throw new Error('Missing customer seed data')
		}

		const invoice = await caller.ledger.invoices.create({
			invoiceNo: '',
			customerId: customer._id,
			currency: 'USD',
		})

		await expect(
			caller.ledger.invoices.postInvoice({ id: invoice._id }),
		).rejects.toThrow('Invoice has no lines to post')

		const refreshedInvoice = await caller.ledger.invoices.getById({
			id: invoice._id,
		})
		expect(refreshedInvoice.status).toBe('DRAFT')

		const custLedgerEntries = db.schemas.custLedgerEntries.findMany({
			where: (row) =>
				row.documentNo === invoice.invoiceNo && row.documentType === 'INVOICE',
		})
		const glEntries = db.schemas.glEntries.findMany({
			where: (row) =>
				row.documentNo === invoice.invoiceNo && row.documentType === 'INVOICE',
		})
		expect(custLedgerEntries).toHaveLength(0)
		expect(glEntries).toHaveLength(0)
	})

	test('prevents payroll paid transition from creating partial disbursement state', async () => {
		const caller = createCaller()
		const employee = db.schemas.employees.findMany({
			where: (row) => row.status === 'ACTIVE',
			limit: 1,
		})[0]
		expect(employee?._id).toBeDefined()
		if (!employee?._id) {
			throw new Error('Missing active employee seed data')
		}

		const payrollRun = await caller.payroll.payrollRuns.create({
			runNo: '',
			status: 'DRAFT',
			periodStart: '2026-02-01',
			periodEnd: '2026-02-28',
			scopeType: 'SELECTED',
			selectedEmployeeIds: employee._id,
			currency: 'USD',
		})
		await caller.payroll.payrollRuns.calculateRun({ runId: payrollRun._id })
		await caller.payroll.payrollRuns.postRun({ runId: payrollRun._id })

		await expect(
			caller.payroll.payrollRuns.markRunPaid({
				runId: payrollRun._id,
				bankAccountId: 'missing-bank-account',
			}),
		).rejects.toThrow('An active bank account is required')

		const refreshedRun = await caller.payroll.payrollRuns.getById({
			id: payrollRun._id,
		})
		expect(refreshedRun.status).toBe('POSTED')

		const disbursements = db.schemas.bankAccountLedgerEntries.findMany({
			where: (row) =>
				row.documentNo === payrollRun.runNo && row.documentType === 'PAYROLL',
		})
		expect(disbursements).toHaveLength(0)
	})
})
