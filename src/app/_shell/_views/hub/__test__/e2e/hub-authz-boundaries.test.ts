import { db } from '@server/db'
import { beforeEach, describe, expect, test } from 'vitest'
import { createCaller } from '../../../../../../../test/uplink/helpers'

describe('uplink authorization boundaries', () => {
	beforeEach(async () => {
		await db._internals.reset()
	})

	test('requires manager role for market approval transitions', async () => {
		const salesOrder = db.schemas.salesHeaders.toArray()[0]
		expect(salesOrder?._id).toBeDefined()
		if (!salesOrder?._id) {
			throw new Error('Missing sales order seed data')
		}
		db.schemas.salesHeaders.update(salesOrder._id, {
			status: 'PENDING_APPROVAL',
		})

		const agentCaller = createCaller({ role: 'AGENT' })
		await expect(
			agentCaller.market.salesOrders.transitionStatus({
				id: salesOrder._id,
				toStatus: 'APPROVED',
			}),
		).rejects.toThrow('Role "MANAGER"')

		const managerCaller = createCaller({ role: 'MANAGER' })
		const approved = await managerCaller.market.salesOrders.transitionStatus({
			id: salesOrder._id,
			toStatus: 'APPROVED',
		})
		expect(approved?.status).toBe('APPROVED')
	})

	test('requires agent role for market checkout action', async () => {
		const adminCaller = createCaller({ role: 'ADMIN' })
		const customer = db.schemas.customers.toArray()[0]
		const item = db.schemas.items.toArray()[0]
		expect(customer?._id).toBeDefined()
		expect(item?._id).toBeDefined()
		if (!customer?._id || !item?._id) {
			throw new Error('Missing customer or item seed data')
		}

		const cart = await adminCaller.market.carts.create({
			customerId: customer._id,
			status: 'OPEN',
			currency: 'USD',
		})
		await adminCaller.market.cartLines.create({
			cartId: cart._id,
			itemId: item._id,
			quantity: 1,
			unitPrice: 25,
			lineAmount: 25,
		})

		const viewerCaller = createCaller({ role: 'VIEWER' })
		await expect(
			viewerCaller.market.carts.checkout({ cartId: cart._id }),
		).rejects.toThrow('Role "AGENT"')

		const agentCaller = createCaller({ role: 'AGENT' })
		const checkout = await agentCaller.market.carts.checkout({
			cartId: cart._id,
		})
		expect(checkout.cartStatus).toBe('CHECKED_OUT')
	})

	test('requires manager role for invoice posting action', async () => {
		const adminCaller = createCaller({ role: 'ADMIN' })
		const customer = db.schemas.customers.toArray()[0]
		const item = db.schemas.items.toArray()[0]
		expect(customer?._id).toBeDefined()
		expect(item?._id).toBeDefined()
		if (!customer?._id || !item?._id) {
			throw new Error('Missing customer or item seed data')
		}

		const invoice = await adminCaller.ledger.invoices.create({
			invoiceNo: '',
			customerId: customer._id,
			currency: 'USD',
		})
		await adminCaller.ledger.invoiceLines.create({
			invoiceNo: invoice.invoiceNo,
			lineNo: 1,
			itemId: item._id,
			quantity: 1,
			unitPrice: 40,
			lineAmount: 40,
		})

		const agentCaller = createCaller({ role: 'AGENT' })
		await expect(
			agentCaller.ledger.invoices.postInvoice({ id: invoice._id }),
		).rejects.toThrow('Role "MANAGER"')

		const managerCaller = createCaller({ role: 'MANAGER' })
		const posted = await managerCaller.ledger.invoices.postInvoice({
			id: invoice._id,
		})
		expect(posted.status).toBe('POSTED')
	})

	test('allows checkout via persisted permission despite viewer base role', async () => {
		const adminCaller = createCaller({ role: 'ADMIN' })
		const userId = 'viewer-checkout-user'
		const customer = db.schemas.customers.toArray()[0]
		const item = db.schemas.items.toArray()[0]
		expect(customer?._id).toBeDefined()
		expect(item?._id).toBeDefined()
		if (!customer?._id || !item?._id) {
			throw new Error('Missing customer or item seed data')
		}

		const cart = await adminCaller.market.carts.create({
			customerId: customer._id,
			status: 'OPEN',
			currency: 'USD',
		})
		await adminCaller.market.cartLines.create({
			cartId: cart._id,
			itemId: item._id,
			quantity: 1,
			unitPrice: 30,
			lineAmount: 30,
		})

		await adminCaller.hub.users.assignRoleToUser({
			userId,
			roleCode: 'VIEWER',
			active: true,
		})
		await adminCaller.hub.roles.setRolePermissions({
			roleCode: 'VIEWER',
			permissionCodes: ['market.cart.checkout'],
		})

		const viewerCaller = createCaller({ role: 'VIEWER', userId })
		const checkout = await viewerCaller.market.carts.checkout({
			cartId: cart._id,
		})
		expect(checkout.cartStatus).toBe('CHECKED_OUT')

		const successAudit = db.schemas.hubAuditLogs.findMany({
			where: (row) =>
				row.action === 'market.cart.checkout' && row.status === 'SUCCESS',
			limit: 1,
		})[0]
		expect(successAudit?._id).toBeDefined()
	})

	test('allows invoice posting via persisted permission despite agent base role', async () => {
		const adminCaller = createCaller({ role: 'ADMIN' })
		const userId = 'agent-ledger-user'
		const customer = db.schemas.customers.toArray()[0]
		const item = db.schemas.items.toArray()[0]
		expect(customer?._id).toBeDefined()
		expect(item?._id).toBeDefined()
		if (!customer?._id || !item?._id) {
			throw new Error('Missing customer or item seed data')
		}

		const invoice = await adminCaller.ledger.invoices.create({
			invoiceNo: '',
			customerId: customer._id,
			currency: 'USD',
		})
		await adminCaller.ledger.invoiceLines.create({
			invoiceNo: invoice.invoiceNo,
			lineNo: 1,
			itemId: item._id,
			quantity: 1,
			unitPrice: 50,
			lineAmount: 50,
		})

		await adminCaller.hub.users.assignRoleToUser({
			userId,
			roleCode: 'AGENT',
			active: true,
		})
		await adminCaller.hub.roles.setRolePermissions({
			roleCode: 'AGENT',
			permissionCodes: ['ledger.invoice.post'],
		})

		const agentCaller = createCaller({ role: 'AGENT', userId })
		const posted = await agentCaller.ledger.invoices.postInvoice({
			id: invoice._id,
		})
		expect(posted.status).toBe('POSTED')
	})

	test('writes denied audit entry when persisted permissions and fallback role both fail', async () => {
		const adminCaller = createCaller({ role: 'ADMIN' })
		const customer = db.schemas.customers.toArray()[0]
		const item = db.schemas.items.toArray()[0]
		expect(customer?._id).toBeDefined()
		expect(item?._id).toBeDefined()
		if (!customer?._id || !item?._id) {
			throw new Error('Missing customer or item seed data')
		}

		const cart = await adminCaller.market.carts.create({
			customerId: customer._id,
			status: 'OPEN',
			currency: 'USD',
		})
		await adminCaller.market.cartLines.create({
			cartId: cart._id,
			itemId: item._id,
			quantity: 1,
			unitPrice: 20,
			lineAmount: 20,
		})

		const viewerCaller = createCaller({ role: 'VIEWER', userId: 'deny-user' })
		await expect(
			viewerCaller.market.carts.checkout({ cartId: cart._id }),
		).rejects.toThrow('Role "AGENT"')

		const deniedAudit = db.schemas.hubAuditLogs.findMany({
			where: (row) =>
				row.action === 'market.cart.checkout' && row.status === 'DENIED',
			limit: 1,
		})[0]
		expect(deniedAudit?._id).toBeDefined()
	})

	test('requires agent role for POS session start', async () => {
		const terminal =
			db.schemas.terminals.findMany({
				where: (row) => row.status === 'ONLINE',
				limit: 1,
			})[0] ?? db.schemas.terminals.toArray()[0]
		expect(terminal?._id).toBeDefined()
		if (!terminal?._id) {
			throw new Error('Missing terminal seed data')
		}
		if (terminal.status !== 'ONLINE') {
			db.schemas.terminals.update(terminal._id, { status: 'ONLINE' })
		}

		const viewerCaller = createCaller({ role: 'VIEWER' })
		await expect(
			viewerCaller.pos.sessions.startSession({ terminalId: terminal._id }),
		).rejects.toThrow('Role "AGENT"')

		const agentCaller = createCaller({ role: 'AGENT' })
		const started = await agentCaller.pos.sessions.startSession({
			terminalId: terminal._id,
			cashierId: 'cashier-authz',
		})
		expect(started.status).toBe('OPEN')
	})
})
