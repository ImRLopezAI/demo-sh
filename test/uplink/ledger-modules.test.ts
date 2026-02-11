import { db } from '@server/db'
import { beforeEach, describe, expect, test } from 'vitest'
import { createCaller } from './helpers'

describe.sequential('ledger module', () => {
	beforeEach(async () => {
		await db._internals.reset()
	})

	test('registers ledger tables on db.schemas', () => {
		expect(Object.keys(db.schemas)).toEqual(
			expect.arrayContaining([
				'salesInvoiceHeaders',
				'salesInvoiceLines',
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

	test('supports valid invoice transition sequence', async () => {
		const caller = createCaller()
		const invoice = db.schemas.salesInvoiceHeaders.toArray()[0]
		expect(invoice?._id).toBeDefined()

		db.schemas.salesInvoiceHeaders.update(invoice?._id, { status: 'DRAFT' })

		const posted = await caller.ledger.invoices.transitionStatus({
			id: invoice?._id,
			toStatus: 'POSTED',
		})
		expect(posted?.status).toBe('POSTED')
	})
})
