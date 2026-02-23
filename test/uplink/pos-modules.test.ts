import { db } from '@server/db'
import { beforeEach, describe, expect, test } from 'vitest'
import { createCaller } from './helpers'

describe('pos module', () => {
	beforeEach(async () => {
		await db._internals.reset()
	})

	test('registers pos tables on db.schemas', () => {
		expect(Object.keys(db.schemas)).toEqual(
			expect.arrayContaining([
				'terminals',
				'posSessions',
				'posTransactions',
				'posTransactionLines',
			]),
		)
	})

	test('loads pos relations with with option', () => {
		const session = db.schemas.posSessions.toArray()[0]
		expect(session).toBeDefined()

		const sessions = db.schemas.posSessions.findMany({
			where: (row) => row._id === session?._id,
			with: { terminal: true, transactions: true },
		})

		expect(sessions[0]?.terminal?._id).toBeDefined()
		expect(Array.isArray(sessions[0]?.transactions)).toBe(true)
		expect((sessions[0]?.transactions ?? []).length).toBeGreaterThan(0)
	})

	test('exposes callable pos rpc surface', async () => {
		const caller = createCaller()

		const transactions = await caller.pos.transactions.list({
			limit: 5,
			offset: 0,
		})
		expect(Array.isArray(transactions.items)).toBe(true)

		const terminals = await caller.pos.terminals.list({
			limit: 5,
			offset: 0,
		})
		expect(Array.isArray(terminals.items)).toBe(true)

		const sessions = await caller.pos.sessions.list({
			limit: 5,
			offset: 0,
		})
		expect(Array.isArray(sessions.items)).toBe(true)
	})

	test('starts a session through API and reuses open session idempotently', async () => {
		const caller = createCaller()
		const terminal =
			db.schemas.terminals.findMany({
				where: (row) => row.status === 'ONLINE',
				limit: 1,
			})[0] ?? db.schemas.terminals.toArray()[0]
		expect(terminal?._id).toBeDefined()
		if (!terminal?._id) {
			throw new Error('Missing POS terminal')
		}
		if (terminal.status !== 'ONLINE') {
			db.schemas.terminals.update(terminal._id, { status: 'ONLINE' })
		}

		const startedSession = await caller.pos.sessions.startSession({
			terminalId: terminal._id,
			cashierId: 'cashier-api',
			openingBalance: 150,
		})
		expect(startedSession.status).toBe('OPEN')
		expect(startedSession.idempotent).toBe(false)
		expect(startedSession.sessionId).toBeTruthy()
		expect(startedSession.sessionNo).toBeTruthy()

		const startedSessionRow = db.schemas.posSessions.get(
			startedSession.sessionId,
		)
		expect(startedSessionRow?.terminalId).toBe(terminal._id)
		expect(startedSessionRow?.openingBalance).toBe(150)

		const reusedSession = await caller.pos.sessions.startSession({
			terminalId: terminal._id,
			cashierId: 'cashier-api',
			openingBalance: 150,
			reuseOpenSession: true,
		})
		expect(reusedSession.idempotent).toBe(true)
		expect(reusedSession.sessionId).toBe(startedSession.sessionId)
	})

	test('closes shifts with enforced variance controls and manager sign-off policy', async () => {
		const managerCaller = createCaller({
			role: 'MANAGER',
			userId: 'store-manager',
		})
		const terminal =
			db.schemas.terminals.findMany({
				where: (row) => row.status === 'ONLINE',
				limit: 1,
			})[0] ?? db.schemas.terminals.toArray()[0]
		expect(terminal?._id).toBeDefined()
		if (!terminal?._id) {
			throw new Error('Missing terminal')
		}
		if (terminal.status !== 'ONLINE') {
			db.schemas.terminals.update(terminal._id, { status: 'ONLINE' })
		}

		const session = await managerCaller.pos.sessions.startSession({
			terminalId: terminal._id,
			cashierId: 'cashier-shift-close',
			openingBalance: 100,
		})
		expect(session.sessionId).toBeTruthy()

		await expect(
			managerCaller.pos.sessions.closeShift({
				sessionId: session.sessionId,
				closingBalance: 60,
				approvalVarianceThreshold: 20,
			}),
		).rejects.toThrow('Variance reason is required')

		const closed = await managerCaller.pos.sessions.closeShift({
			sessionId: session.sessionId,
			closingBalance: 60,
			varianceReason: 'Cash drop timing difference',
			managerSignoffUserId: 'store-manager',
			approvalVarianceThreshold: 20,
		})
		expect(closed.status).toBe('CLOSED')
		expect(closed.managerApprovalRequired).toBe(true)
		expect(closed.idempotent).toBe(false)

		const retry = await managerCaller.pos.sessions.closeShift({
			sessionId: session.sessionId,
			closingBalance: 60,
			varianceReason: 'Duplicate retry',
			managerSignoffUserId: 'store-manager',
			approvalVarianceThreshold: 20,
		})
		expect(retry.idempotent).toBe(true)
	})

	test('governs refund/void commands with idempotency and offline conflict-safe outcomes', async () => {
		const managerCaller = createCaller({
			role: 'MANAGER',
			userId: 'pos-manager',
		})
		const session = db.schemas.posSessions.toArray()[0]
		expect(session?._id).toBeDefined()
		if (!session?._id) {
			throw new Error('Missing seeded POS session')
		}

		const completedTx = await managerCaller.pos.transactions.create({
			receiptNo: '',
			posSessionId: session._id,
			totalAmount: 42,
			taxAmount: 6,
			discountAmount: 0,
			paidAmount: 42,
			paymentMethod: 'CARD',
		})
		await managerCaller.pos.transactions.transitionStatus({
			id: completedTx._id,
			toStatus: 'COMPLETED',
		})

		const firstRefund = await managerCaller.pos.transactions.governTransaction({
			transactionId: completedTx._id,
			action: 'REFUND',
			reason: 'Customer return',
			idempotencyKey: 'offline-refund-1',
			offlineOperationId: 'offline-op-1',
		})
		expect(firstRefund.idempotent).toBe(false)
		expect(firstRefund.conflict).toBeNull()
		expect(firstRefund.status).toBe('REFUNDED')

		const replayRefund = await managerCaller.pos.transactions.governTransaction(
			{
				transactionId: completedTx._id,
				action: 'REFUND',
				reason: 'Retry same offline op',
				idempotencyKey: 'offline-refund-1',
				offlineOperationId: 'offline-op-1',
			},
		)
		expect(replayRefund.idempotent).toBe(true)
		expect(replayRefund.status).toBe('REFUNDED')

		const conflictingVoid =
			await managerCaller.pos.transactions.governTransaction({
				transactionId: completedTx._id,
				action: 'VOID',
				reason: 'Late void replay from offline queue',
				idempotencyKey: 'offline-void-1',
				offlineOperationId: 'offline-op-2',
			})
		expect(conflictingVoid.idempotent).toBe(false)
		expect(conflictingVoid.conflict?.type).toBe('ALREADY_REFUNDED')
		expect(conflictingVoid.conflict?.resolution).toBe('SKIP')
	})

	test('enforces transaction transitions and reason requirements', async () => {
		const caller = createCaller()
		const transaction = db.schemas.posTransactions.toArray()[0]
		expect(transaction?._id).toBeDefined()

		db.schemas.posTransactions.update(transaction?._id, { status: 'OPEN' })

		await expect(
			caller.pos.transactions.transitionStatus({
				id: transaction?._id,
				toStatus: 'REFUNDED',
			}),
		).rejects.toThrow('is not allowed')

		await expect(
			caller.pos.transactions.transitionStatus({
				id: transaction?._id,
				toStatus: 'VOIDED',
			}),
		).rejects.toThrow('A reason is required')
	})

	test('supports checkout flow using created transaction _id for lines and completion', async () => {
		const caller = createCaller()
		const session = db.schemas.posSessions.toArray()[0]
		const item = db.schemas.items.toArray()[0]
		expect(session?._id).toBeDefined()
		expect(item?._id).toBeDefined()
		const sessionId = session?._id
		const itemId = item?._id
		if (!sessionId || !itemId) {
			throw new Error('Missing seeded POS session or item')
		}

		const transaction = await caller.pos.transactions.create({
			receiptNo: '',
			posSessionId: sessionId,
			totalAmount: 120,
			taxAmount: 16,
			discountAmount: 0,
			paidAmount: 120,
			paymentMethod: 'CARD',
		})
		expect(transaction._id).toBeDefined()

		const line = await caller.pos.transactionLines.create({
			transactionId: transaction._id,
			itemId,
			quantity: 2,
			unitPrice: 60,
			lineAmount: 120,
			discountPercent: 0,
		})
		expect(line.transactionId).toBe(transaction._id)

		const completed = await caller.pos.transactions.transitionStatus({
			id: transaction._id,
			toStatus: 'COMPLETED',
		})
		expect(completed?.status).toBe('COMPLETED')

		const scopedLines = await caller.pos.transactionLines.list({
			limit: 50,
			offset: 0,
			filters: { transactionId: transaction._id },
		})
		expect(scopedLines.items.some((row) => row._id === line._id)).toBe(true)
	})

	test('rejects transaction line create when transaction parent is invalid', async () => {
		const caller = createCaller()
		const item = db.schemas.items.toArray()[0]
		expect(item?._id).toBeDefined()
		if (!item?._id) {
			throw new Error('Missing seeded item')
		}

		await expect(
			caller.pos.transactionLines.create({
				transactionId: 'txn-not-found',
				itemId: item._id,
				quantity: 1,
				unitPrice: 10,
				lineAmount: 10,
				discountPercent: 0,
			}),
		).rejects.toThrow('parent not found')
	})

	test('supports valid terminal transition', async () => {
		const caller = createCaller()
		const terminal = db.schemas.terminals.toArray()[0]
		expect(terminal?._id).toBeDefined()

		db.schemas.terminals.update(terminal?._id, { status: 'ONLINE' })

		const updated = await caller.pos.terminals.transitionStatus({
			id: terminal?._id,
			toStatus: 'OFFLINE',
		})

		expect(updated?.status).toBe('OFFLINE')
	})

	test('keeps 25-row pos pagination within acceptable latency', async () => {
		const caller = createCaller()
		const maxDurationMs = 2000
		const startedAt = Date.now()
		const result = await caller.pos.transactions.list({ limit: 25, offset: 0 })
		const durationMs = Date.now() - startedAt

		expect(Array.isArray(result.items)).toBe(true)
		expect(result.items.length).toBeLessThanOrEqual(25)
		expect(durationMs).toBeLessThan(maxDurationMs)
	})
})
