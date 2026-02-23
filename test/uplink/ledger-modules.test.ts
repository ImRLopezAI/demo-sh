import { db } from '@server/db'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createCaller } from './helpers'

function getSeededCustomerAndItem() {
	const customer = db.schemas.customers.toArray()[0]
	const item = db.schemas.items.toArray()[0]
	if (!customer?._id || !item?._id) {
		throw new Error('Missing seeded customer or item')
	}
	return { customerId: customer._id, itemId: item._id }
}

describe.sequential('ledger module', () => {
	beforeEach(async () => {
		await db._internals.reset()
	})

	test('registers ledger tables on db.schemas', () => {
		expect(Object.keys(db.schemas)).toEqual(
			expect.arrayContaining([
				'salesInvoiceHeaders',
				'salesInvoiceLines',
				'salesCreditMemoHeaders',
				'salesCreditMemoLines',
				'eInvoiceSubmissions',
				'eInvoiceEvents',
				'custLedgerEntries',
				'glEntries',
			]),
		)
	})

	test('loads ledger relations with with option', () => {
		const invoice = db.schemas.salesInvoiceHeaders.toArray()[0]
		expect(invoice).toBeDefined()

		const invoicesWithRelations = db.schemas.salesInvoiceHeaders.findMany({
			where: (row) => row._id === invoice?._id,
			with: { customer: true, lines: true },
		})

		expect(invoicesWithRelations[0]?.customer?._id).toBeDefined()
		expect(Array.isArray(invoicesWithRelations[0]?.lines)).toBe(true)
		expect((invoicesWithRelations[0]?.lines ?? []).length).toBeGreaterThan(0)
	})

	test('exposes callable ledger rpc surface', async () => {
		const caller = createCaller()

		const invoices = await caller.ledger.invoices.list({
			limit: 5,
			offset: 0,
		})
		expect(Array.isArray(invoices.items)).toBe(true)

		const invoiceLines = await caller.ledger.invoiceLines.list({
			limit: 5,
			offset: 0,
		})
		expect(Array.isArray(invoiceLines.items)).toBe(true)

		const customerLedger = await caller.ledger.customerLedger.list({
			limit: 5,
			offset: 0,
		})
		expect(Array.isArray(customerLedger.items)).toBe(true)

		const glEntries = await caller.ledger.glEntries.list({
			limit: 5,
			offset: 0,
		})
		expect(Array.isArray(glEntries.items)).toBe(true)

		const creditMemos = await caller.ledger.creditMemos.list({
			limit: 5,
			offset: 0,
		})
		expect(Array.isArray(creditMemos.items)).toBe(true)
	})

	test('supports invoice line CRUD and parent-scoped filtering', async () => {
		const caller = createCaller()
		const { customerId, itemId } = getSeededCustomerAndItem()

		const invoiceA = await caller.ledger.invoices.create({
			invoiceNo: '',
			customerId,
			postingDate: new Date().toISOString(),
			dueDate: new Date().toISOString(),
			currency: 'USD',
		})
		const invoiceB = await caller.ledger.invoices.create({
			invoiceNo: '',
			customerId,
			postingDate: new Date().toISOString(),
			dueDate: new Date().toISOString(),
			currency: 'USD',
		})

		const lineA = await caller.ledger.invoiceLines.create({
			invoiceNo: invoiceA.invoiceNo,
			itemId,
			quantity: 2,
			unitPrice: 60,
			lineAmount: 120,
		})
		await caller.ledger.invoiceLines.create({
			invoiceNo: invoiceB.invoiceNo,
			itemId,
			quantity: 1,
			unitPrice: 90,
			lineAmount: 90,
		})

		const scopedLines = await caller.ledger.invoiceLines.listViewRecords({
			viewId: 'overview',
			limit: 50,
			offset: 0,
			filters: { invoiceNo: invoiceA.invoiceNo },
		})
		expect(scopedLines.items.length).toBeGreaterThan(0)
		expect(
			scopedLines.items.every((line) => line.invoiceNo === invoiceA.invoiceNo),
		).toBe(true)
		expect(scopedLines.items.some((line) => line._id === lineA._id)).toBe(true)

		const updatedLine = await caller.ledger.invoiceLines.update({
			id: lineA._id,
			data: { quantity: 3, lineAmount: 180 },
		})
		expect(updatedLine?.quantity).toBe(3)
		expect(updatedLine?.lineAmount).toBe(180)

		const removed = await caller.ledger.invoiceLines.delete({ id: lineA._id })
		expect(removed.deleted).toBe(true)

		const scopedAfterDelete = await caller.ledger.invoiceLines.listViewRecords({
			viewId: 'overview',
			limit: 50,
			offset: 0,
			filters: { invoiceNo: invoiceA.invoiceNo },
		})
		expect(scopedAfterDelete.items.some((line) => line._id === lineA._id)).toBe(
			false,
		)
	})

	test('rejects invoice and credit-memo lines when parent references are invalid', async () => {
		const caller = createCaller()
		const { itemId } = getSeededCustomerAndItem()

		await expect(
			caller.ledger.invoiceLines.create({
				invoiceNo: 'SINV-NOT-FOUND',
				itemId,
				quantity: 1,
				unitPrice: 50,
				lineAmount: 50,
			}),
		).rejects.toThrow('parent not found')

		await expect(
			caller.ledger.creditMemoLines.create({
				creditMemoNo: 'SCM-NOT-FOUND',
				itemId,
				quantity: 1,
				unitPrice: 50,
				lineAmount: 50,
			}),
		).rejects.toThrow('parent not found')
	})

	test('posts invoice with accounting side effects and idempotent retry handling', async () => {
		const caller = createCaller()
		const { customerId, itemId } = getSeededCustomerAndItem()

		const invoice = await caller.ledger.invoices.create({
			invoiceNo: '',
			customerId,
			postingDate: new Date().toISOString(),
			dueDate: new Date().toISOString(),
			currency: 'USD',
		})
		await caller.ledger.invoiceLines.create({
			invoiceNo: invoice.invoiceNo,
			itemId,
			quantity: 2,
			unitPrice: 125,
			lineAmount: 250,
		})

		await expect(
			caller.ledger.invoices.transitionStatus({
				id: invoice._id,
				toStatus: 'POSTED',
			}),
		).rejects.toThrow('is not allowed')

		const firstPost = await caller.ledger.invoices.postInvoice({
			id: invoice._id,
		})
		expect(firstPost.status).toBe('POSTED')
		expect(firstPost.idempotent).toBe(false)
		expect(firstPost.totalAmount).toBe(250)

		const secondPost = await caller.ledger.invoices.postInvoice({
			id: invoice._id,
		})
		expect(secondPost.idempotent).toBe(true)
		expect(secondPost.invoiceId).toBe(firstPost.invoiceId)

		const invoiceAfterPost = await caller.ledger.invoices.getById({
			id: invoice._id,
		})
		expect(invoiceAfterPost.status).toBe('POSTED')

		const customerLedgerEntries = db.schemas.custLedgerEntries.findMany({
			where: (row) =>
				row.documentNo === invoice.invoiceNo && row.documentType === 'INVOICE',
		})
		expect(customerLedgerEntries).toHaveLength(1)
		expect(customerLedgerEntries[0]?.amount).toBe(250)
		expect(customerLedgerEntries[0]?.remainingAmount).toBe(250)

		const glEntries = db.schemas.glEntries.findMany({
			where: (row) =>
				row.documentNo === invoice.invoiceNo && row.documentType === 'INVOICE',
		})
		expect(glEntries).toHaveLength(2)
		const debitTotal = glEntries.reduce(
			(sum, row) => sum + Number(row.debitAmount ?? 0),
			0,
		)
		const creditTotal = glEntries.reduce(
			(sum, row) => sum + Number(row.creditAmount ?? 0),
			0,
		)
		expect(debitTotal).toBe(250)
		expect(creditTotal).toBe(250)
	})

	test('rolls back invoice status and accounting entries when posting fails', async () => {
		const caller = createCaller()
		const { customerId, itemId } = getSeededCustomerAndItem()

		const invoice = await caller.ledger.invoices.create({
			invoiceNo: '',
			customerId,
			postingDate: new Date().toISOString(),
			dueDate: new Date().toISOString(),
			currency: 'USD',
		})
		await caller.ledger.invoiceLines.create({
			invoiceNo: invoice.invoiceNo,
			itemId,
			quantity: 1,
			unitPrice: 200,
			lineAmount: 200,
		})

		const insertSpy = vi
			.spyOn(db.schemas.custLedgerEntries, 'insert')
			.mockImplementation(() => {
				throw new Error('forced customer-ledger insert failure')
			})

		try {
			await expect(
				caller.ledger.invoices.postInvoice({ id: invoice._id }),
			).rejects.toThrow('forced customer-ledger insert failure')
		} finally {
			insertSpy.mockRestore()
		}

		const invoiceAfterFailure = await caller.ledger.invoices.getById({
			id: invoice._id,
		})
		expect(invoiceAfterFailure.status).toBe('DRAFT')

		const customerLedgerEntries = db.schemas.custLedgerEntries.findMany({
			where: (row) =>
				row.documentNo === invoice.invoiceNo && row.documentType === 'INVOICE',
		})
		expect(customerLedgerEntries).toHaveLength(0)

		const glEntries = db.schemas.glEntries.findMany({
			where: (row) =>
				row.documentNo === invoice.invoiceNo && row.documentType === 'INVOICE',
		})
		expect(glEntries).toHaveLength(0)
	})

	test('enforces invoice transitions and reason requirements', async () => {
		const caller = createCaller()
		const invoice = db.schemas.salesInvoiceHeaders.toArray()[0]
		expect(invoice?._id).toBeDefined()

		db.schemas.salesInvoiceHeaders.update(invoice?._id, { status: 'DRAFT' })

		await expect(
			caller.ledger.invoices.transitionStatus({
				id: invoice?._id,
				toStatus: 'REVERSED',
			}),
		).rejects.toThrow('is not allowed')

		db.schemas.salesInvoiceHeaders.update(invoice?._id, { status: 'POSTED' })

		await expect(
			caller.ledger.invoices.transitionStatus({
				id: invoice?._id,
				toStatus: 'REVERSED',
			}),
		).rejects.toThrow('A reason is required')
	})

	test('supports valid post and reverse workflow', async () => {
		const caller = createCaller()
		const { customerId, itemId } = getSeededCustomerAndItem()

		const invoice = await caller.ledger.invoices.create({
			invoiceNo: '',
			customerId,
			postingDate: new Date().toISOString(),
			dueDate: new Date().toISOString(),
			currency: 'USD',
		})
		await caller.ledger.invoiceLines.create({
			invoiceNo: invoice.invoiceNo,
			itemId,
			quantity: 1,
			unitPrice: 180,
			lineAmount: 180,
		})

		const posted = await caller.ledger.invoices.postInvoice({ id: invoice._id })
		expect(posted.status).toBe('POSTED')

		const reversed = await caller.ledger.invoices.transitionStatus({
			id: invoice._id,
			toStatus: 'REVERSED',
			reason: 'Customer return approved',
		})
		expect(reversed?.status).toBe('REVERSED')
	})

	test('posts credit memo with balancing customer ledger and GL entries', async () => {
		const caller = createCaller()
		const { customerId, itemId } = getSeededCustomerAndItem()

		const invoice = await caller.ledger.invoices.create({
			invoiceNo: '',
			customerId,
			postingDate: new Date().toISOString(),
			dueDate: new Date().toISOString(),
			currency: 'USD',
		})
		await caller.ledger.invoiceLines.create({
			invoiceNo: invoice.invoiceNo,
			itemId,
			quantity: 1,
			unitPrice: 180,
			lineAmount: 180,
		})
		await caller.ledger.invoices.postInvoice({ id: invoice._id })

		const creditMemo = await caller.ledger.creditMemos.create({
			creditMemoNo: '',
			customerId,
			appliesToInvoiceNo: invoice.invoiceNo,
			postingDate: new Date().toISOString(),
			currency: 'USD',
			taxJurisdiction: 'US-CA',
		})
		await caller.ledger.creditMemoLines.create({
			creditMemoNo: creditMemo.creditMemoNo,
			lineNo: 1,
			itemId,
			quantity: 1,
			unitPrice: 100,
			lineAmount: 100,
			taxCode: 'CA-SALES',
			taxRatePercent: 8.25,
			taxAmount: 8.25,
		})

		const posted = await caller.ledger.creditMemos.postCreditMemo({
			id: creditMemo._id,
		})
		expect(posted.status).toBe('POSTED')
		expect(posted.idempotent).toBe(false)
		expect(posted.taxAmount).toBe(8.25)
		expect(posted.glEntryIds).toHaveLength(2)

		const creditLedger = db.schemas.custLedgerEntries.findMany({
			where: (row) =>
				row.documentNo === creditMemo.creditMemoNo &&
				row.documentType === 'CREDIT_MEMO',
		})
		expect(creditLedger).toHaveLength(1)
		expect(Number(creditLedger[0]?.amount)).toBeLessThan(0)

		const creditGlEntries = db.schemas.glEntries.findMany({
			where: (row) =>
				row.documentNo === creditMemo.creditMemoNo &&
				row.documentType === 'CREDIT_MEMO',
		})
		expect(creditGlEntries).toHaveLength(2)
		const debitTotal = creditGlEntries.reduce(
			(sum, row) => sum + Number(row.debitAmount ?? 0),
			0,
		)
		const creditTotal = creditGlEntries.reduce(
			(sum, row) => sum + Number(row.creditAmount ?? 0),
			0,
		)
		expect(debitTotal).toBeCloseTo(creditTotal, 4)
		expect(debitTotal).toBeCloseTo(108.25, 4)
	})

	test('validates invoice tax details and blocks invalid posting payloads', async () => {
		const caller = createCaller()
		const { customerId, itemId } = getSeededCustomerAndItem()

		const invoice = await caller.ledger.invoices.create({
			invoiceNo: '',
			customerId,
			postingDate: new Date().toISOString(),
			dueDate: new Date().toISOString(),
			currency: 'USD',
			taxJurisdiction: 'US-CA',
			taxRegistrationNo: 'REG-CA-001',
		})
		await caller.ledger.invoiceLines.create({
			invoiceNo: invoice.invoiceNo,
			itemId,
			quantity: 1,
			unitPrice: 200,
			lineAmount: 200,
			taxRatePercent: 10,
			taxAmount: 20,
		})

		await expect(
			caller.ledger.invoices.postInvoice({ id: invoice._id }),
		).rejects.toThrow('Tax code is required')

		const invoiceLine = db.schemas.salesInvoiceLines.findMany({
			where: (row) => row.invoiceNo === invoice.invoiceNo,
			limit: 1,
		})[0]
		expect(invoiceLine?._id).toBeDefined()
		db.schemas.salesInvoiceLines.update(invoiceLine?._id, {
			taxCode: 'VAT-10',
		})

		const posted = await caller.ledger.invoices.postInvoice({ id: invoice._id })
		expect(posted.status).toBe('POSTED')
		expect(posted.taxAmount).toBe(20)
		expect(posted.totalAmount).toBe(220)
	})

	test('runs e-invoice rejection and retry lifecycle for posted documents', async () => {
		const caller = createCaller()
		const { customerId, itemId } = getSeededCustomerAndItem()

		const invoice = await caller.ledger.invoices.create({
			invoiceNo: '',
			customerId,
			postingDate: new Date().toISOString(),
			dueDate: new Date().toISOString(),
			currency: 'USD',
		})
		await caller.ledger.invoiceLines.create({
			invoiceNo: invoice.invoiceNo,
			itemId,
			quantity: 1,
			unitPrice: 150,
			lineAmount: 150,
		})
		await caller.ledger.invoices.postInvoice({ id: invoice._id })

		const submitted = await caller.ledger.eInvoicing.submit({
			documentType: 'INVOICE',
			id: invoice._id,
		})
		expect(submitted.status).toBe('SUBMITTED')
		expect(submitted.attemptNo).toBe(1)
		expect(submitted.idempotent).toBe(false)

		const rejected = await caller.ledger.eInvoicing.resolveSubmission({
			submissionId: submitted.submissionId,
			status: 'REJECTED',
			message: 'Invalid tax id',
		})
		expect(rejected.status).toBe('REJECTED')

		const retried = await caller.ledger.eInvoicing.retryRejected({
			submissionId: submitted.submissionId,
		})
		expect(retried.status).toBe('SUBMITTED')
		expect(retried.attemptNo).toBe(2)

		const accepted = await caller.ledger.eInvoicing.resolveSubmission({
			submissionId: retried.submissionId,
			status: 'ACCEPTED',
			providerRef: 'ACK-1001',
		})
		expect(accepted.status).toBe('ACCEPTED')

		const invoiceAfter = await caller.ledger.invoices.getById({ id: invoice._id })
		expect(invoiceAfter.eInvoiceStatus).toBe('ACCEPTED')

		const submissionRows = db.schemas.eInvoiceSubmissions.findMany({
			where: (row) =>
				row.documentType === 'INVOICE' && row.documentNo === invoice.invoiceNo,
		})
		expect(submissionRows).toHaveLength(2)

		const eventRows = db.schemas.eInvoiceEvents.findMany({
			where: (row) => row.submissionId === retried.submissionId,
		})
		expect(eventRows.some((event) => event.eventType === 'SUBMITTED')).toBe(true)
	})

	test('keeps 25-row ledger pagination within acceptable latency', async () => {
		const caller = createCaller()
		const maxDurationMs = 2000
		const startedAt = Date.now()
		const result = await caller.ledger.invoices.list({ limit: 25, offset: 0 })
		const durationMs = Date.now() - startedAt

		expect(Array.isArray(result.items)).toBe(true)
		expect(result.items.length).toBeLessThanOrEqual(25)
		expect(durationMs).toBeLessThan(maxDurationMs)
	})
})
