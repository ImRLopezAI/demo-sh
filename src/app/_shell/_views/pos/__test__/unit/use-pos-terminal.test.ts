import { describe, expect, test } from 'vitest'
import {
	enqueueOfflineSale,
	type OfflineQueuedSale,
	processOfflineQueueBatch,
	removeOfflineSaleByKey,
	resolveEntityId,
} from '@/app/_shell/_views/pos/hooks/use-pos-terminal'

function buildQueuedSale(idempotencyKey: string): OfflineQueuedSale {
	return {
		idempotencyKey,
		sessionId: 'session-1',
		paymentMethod: 'CARD',
		totalAmount: 116,
		taxAmount: 16,
		discountAmount: 0,
		paidAmount: 116,
		cart: [
			{
				id: 'line-1',
				itemId: 'item-1',
				itemNo: '1000',
				description: 'Item',
				quantity: 1,
				unitPrice: 100,
				discountPercent: 0,
				lineAmount: 100,
			},
		],
		queuedAt: new Date('2026-02-23T00:00:00.000Z').toISOString(),
	}
}

describe('resolveEntityId', () => {
	test('prefers _id when both _id and id are present', () => {
		expect(
			resolveEntityId({ _id: 'txn-1', id: 'legacy-id' }, 'POS transaction'),
		).toBe('txn-1')
	})

	test('falls back to id when _id is not available', () => {
		expect(resolveEntityId({ id: 'txn-2' }, 'POS transaction')).toBe('txn-2')
	})

	test('throws when no id field is returned', () => {
		expect(() => resolveEntityId({}, 'POS transaction')).toThrow(
			'POS transaction creation did not return an id',
		)
	})
})

describe('POS offline queue helpers', () => {
	test('enqueueOfflineSale prevents duplicate idempotency keys', () => {
		const existing = [buildQueuedSale('offline-1')]
		const duplicate = buildQueuedSale('offline-1')
		const unique = buildQueuedSale('offline-2')

		const withDuplicate = enqueueOfflineSale(existing, duplicate)
		expect(withDuplicate).toHaveLength(1)

		const withUnique = enqueueOfflineSale(existing, unique)
		expect(withUnique).toHaveLength(2)
		expect(withUnique.map((row) => row.idempotencyKey)).toEqual([
			'offline-1',
			'offline-2',
		])
	})

	test('removeOfflineSaleByKey removes only targeted sale', () => {
		const queue = [buildQueuedSale('offline-1'), buildQueuedSale('offline-2')]
		const trimmed = removeOfflineSaleByKey(queue, 'offline-1')
		expect(trimmed.map((row) => row.idempotencyKey)).toEqual(['offline-2'])
	})

	test('processOfflineQueueBatch retries failed entries and tracks processed keys', async () => {
		const queue = [
			buildQueuedSale('offline-1'),
			buildQueuedSale('offline-2'),
			buildQueuedSale('offline-2'),
		]

		const synced: string[] = []
		const result = await processOfflineQueueBatch({
			queuedSales: queue,
			initialProcessedKeys: ['already-processed'],
			syncSale: async (sale) => {
				synced.push(sale.idempotencyKey)
				if (sale.idempotencyKey === 'offline-2') {
					throw new Error('temporary backend outage')
				}
			},
		})

		expect(synced).toEqual(['offline-1', 'offline-2', 'offline-2'])
		expect(result.remainingQueue.map((row) => row.idempotencyKey)).toEqual([
			'offline-2',
			'offline-2',
		])
		expect(result.processedKeys).toEqual(['already-processed', 'offline-1'])
		expect(result.lastError).toContain('temporary backend outage')
	})

	test('processOfflineQueueBatch skips duplicate queued entries after first success', async () => {
		const queue = [buildQueuedSale('offline-1'), buildQueuedSale('offline-1')]
		const synced: string[] = []

		const result = await processOfflineQueueBatch({
			queuedSales: queue,
			initialProcessedKeys: [],
			syncSale: async (sale) => {
				synced.push(sale.idempotencyKey)
			},
		})

		expect(synced).toEqual(['offline-1'])
		expect(result.remainingQueue).toHaveLength(0)
		expect(result.processedKeys).toEqual(['offline-1'])
		expect(result.lastError).toBeNull()
	})
})
