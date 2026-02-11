import { db } from '@server/db'
import { beforeEach, describe, expect, test } from 'vitest'
import { createCaller } from './helpers'

describe.sequential('pos module', () => {
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
})
