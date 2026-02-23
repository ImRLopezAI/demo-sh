import { db } from '@server/db'
import { beforeEach, describe, expect, test } from 'vitest'
import { createCaller } from './helpers'

describe('trace module', () => {
	beforeEach(async () => {
		await db._internals.reset()
	})

	test('registers trace tables on db.schemas', () => {
		expect(Object.keys(db.schemas)).toEqual(
			expect.arrayContaining([
				'shipments',
				'shipmentLines',
				'shipmentMethods',
				'carrierAccounts',
				'shipmentCarrierLabels',
				'shipmentTrackingEvents',
			]),
		)
	})

	test('exposes callable trace rpc surface', async () => {
		const caller = createCaller()

		const shipments = await caller.trace.shipments.list({
			limit: 5,
			offset: 0,
		})
		expect(Array.isArray(shipments.items)).toBe(true)

		const methods = await caller.trace.shipmentMethods.list({
			limit: 5,
			offset: 0,
		})
		expect(Array.isArray(methods.items)).toBe(true)

		const carriers = await caller.trace.carrierAccounts.list({
			limit: 5,
			offset: 0,
		})
		expect(Array.isArray(carriers.items)).toBe(true)
	})

	test('persists carrier account configuration and supports updates', async () => {
		const caller = createCaller()
		const created = await caller.trace.carrierAccounts.create({
			accountCode: '',
			carrierCode: 'UPS',
			name: 'UPS Production',
			active: true,
			webhookSecret: 'trace-secret',
			supportsRates: true,
			supportsLabels: true,
		})
		expect(created.accountCode).toBeTruthy()
		expect(created.active).toBe(true)

		const updated = await caller.trace.carrierAccounts.update({
			id: created._id,
			data: {
				name: 'UPS Sandbox',
				active: false,
			},
		})
		expect(updated?.name).toBe('UPS Sandbox')
		expect(updated?.active).toBe(false)
	})

	test('quotes rates and purchases labels through carrier ops API', async () => {
		const caller = createCaller()
		const shipment = db.schemas.shipments.toArray()[0]
		expect(shipment?._id).toBeDefined()
		if (!shipment?._id) {
			throw new Error('Missing shipment')
		}

		const carrier = await caller.trace.carrierAccounts.create({
			accountCode: '',
			carrierCode: 'FEDEX',
			name: 'FedEx Main',
			active: true,
			supportsRates: true,
			supportsLabels: true,
		})

		const quote = await caller.trace.carrierOps.quoteRate({
			shipmentId: shipment._id,
			carrierAccountId: carrier._id,
			serviceLevel: 'EXPRESS',
			packageWeightKg: 2,
		})
		expect(quote.quoteAmount).toBeGreaterThan(0)

		const purchased = await caller.trace.carrierOps.purchaseLabel({
			shipmentId: shipment._id,
			carrierAccountId: carrier._id,
			serviceLevel: 'EXPRESS',
			packageWeightKg: 2,
		})
		expect(purchased.idempotent).toBe(false)
		expect(purchased.trackingNo).toBeTruthy()
		expect(purchased.labelUrl).toContain('labels.uplink.local')

		const retry = await caller.trace.carrierOps.purchaseLabel({
			shipmentId: shipment._id,
			carrierAccountId: carrier._id,
		})
		expect(retry.idempotent).toBe(true)
		expect(retry.labelId).toBe(purchased.labelId)
	})

	test('supports shipment-method create, update, and shutdown workflow', async () => {
		const caller = createCaller()
		const createdMethod = await caller.trace.shipmentMethods.create({
			code: '',
			description: 'Priority Courier',
			active: true,
		})
		expect(createdMethod.code).toBeTruthy()
		expect(createdMethod.active).toBe(true)

		const updatedMethod = await caller.trace.shipmentMethods.update({
			id: createdMethod._id,
			data: {
				description: 'Priority Courier Express',
			},
		})
		expect(updatedMethod?.description).toBe('Priority Courier Express')

		const deactivatedMethod = await caller.trace.shipmentMethods.update({
			id: createdMethod._id,
			data: {
				active: false,
			},
		})
		expect(deactivatedMethod?.active).toBe(false)
	})

	test('rejects shipment line create when shipment parent is invalid', async () => {
		const caller = createCaller()
		const item = db.schemas.items.toArray()[0]
		expect(item?._id).toBeDefined()
		if (!item?._id) {
			throw new Error('Missing seeded item')
		}

		await expect(
			caller.trace.shipmentLines.create({
				shipmentNo: 'SHIP-NOT-FOUND',
				itemId: item._id,
				quantity: 1,
				quantityShipped: 0,
			}),
		).rejects.toThrow('parent not found')
	})

	test('enforces shipment reason requirements for exception transitions', async () => {
		const caller = createCaller()
		const shipment = db.schemas.shipments.toArray()[0]
		expect(shipment?._id).toBeDefined()

		db.schemas.shipments.update(shipment?._id, { status: 'IN_TRANSIT' })

		await expect(
			caller.trace.shipments.transitionStatus({
				id: shipment?._id,
				toStatus: 'EXCEPTION',
			}),
		).rejects.toThrow('A reason is required')
	})

	test('supports valid shipment transition', async () => {
		const caller = createCaller()
		const shipment = db.schemas.shipments.toArray()[0]
		expect(shipment?._id).toBeDefined()

		db.schemas.shipments.update(shipment?._id, { status: 'PLANNED' })

		const updated = await caller.trace.shipments.transitionStatus({
			id: shipment?._id,
			toStatus: 'DISPATCHED',
		})
		expect(updated?.status).toBe('DISPATCHED')
	})

	test('emits customer notification trigger on shipment lifecycle transitions', async () => {
		const caller = createCaller()
		const shipment = db.schemas.shipments.toArray()[0]
		expect(shipment?._id).toBeDefined()

		db.schemas.shipments.update(shipment?._id, {
			status: 'PLANNED',
			actualDispatchDate: '',
		})
		const previousNotifications = db.schemas.moduleNotifications.findMany({
			where: (row) => row.moduleId === 'trace',
		}).length

		const dispatched = await caller.trace.shipments.transitionWithNotification({
			id: shipment?._id,
			toStatus: 'DISPATCHED',
		})
		expect(dispatched.status).toBe('DISPATCHED')

		const notificationAfterDispatch = db.schemas.moduleNotifications.get(
			dispatched.notificationId,
		)
		expect(notificationAfterDispatch?.title).toBe('Shipment dispatched')
		expect(notificationAfterDispatch?.status).toBe('UNREAD')

		const shipmentAfterDispatch = await caller.trace.shipments.getById({
			id: shipment?._id,
		})
		expect(shipmentAfterDispatch.status).toBe('DISPATCHED')
		expect(shipmentAfterDispatch.actualDispatchDate).toBeTruthy()

		await expect(
			caller.trace.shipments.transitionWithNotification({
				id: shipment?._id,
				toStatus: 'EXCEPTION',
			}),
		).rejects.toThrow('A reason is required')

		const exception = await caller.trace.shipments.transitionWithNotification({
			id: shipment?._id,
			toStatus: 'EXCEPTION',
			reason: 'Carrier delay',
		})
		expect(exception.status).toBe('EXCEPTION')
		const exceptionNotification = db.schemas.moduleNotifications.get(
			exception.notificationId,
		)
		expect(exceptionNotification?.severity).toBe('WARNING')

		const notificationCountAfterTransitions =
			db.schemas.moduleNotifications.findMany({
				where: (row) => row.moduleId === 'trace',
			}).length
		expect(notificationCountAfterTransitions).toBe(previousNotifications + 2)
	})

	test('ingests webhook tracking events with signature validation and dedupe', async () => {
		const caller = createCaller()
		const shipment = db.schemas.shipments.toArray()[0]
		expect(shipment?._id).toBeDefined()
		if (!shipment?._id) {
			throw new Error('Missing shipment')
		}

		const carrier = await caller.trace.carrierAccounts.create({
			accountCode: '',
			carrierCode: 'DHL',
			name: 'DHL Live',
			active: true,
			webhookSecret: 'webhook-secret',
			supportsRates: true,
			supportsLabels: true,
		})
		await caller.trace.carrierOps.purchaseLabel({
			shipmentId: shipment._id,
			carrierAccountId: carrier._id,
		})

		await expect(
			caller.trace.carrierOps.ingestTrackingEvent({
				carrierAccountId: carrier._id,
				carrierEventId: 'evt-1',
				shipmentId: shipment._id,
				eventType: 'TRANSIT',
				eventStatus: 'IN_TRANSIT',
				signature: 'invalid-signature',
			}),
		).rejects.toThrow('Invalid webhook signature')

		const ingested = await caller.trace.carrierOps.ingestTrackingEvent({
			carrierAccountId: carrier._id,
			carrierEventId: 'evt-1',
			shipmentId: shipment._id,
			eventType: 'TRANSIT',
			eventStatus: 'IN_TRANSIT',
			signature: 'webhook-secret:evt-1',
			location: 'Los Angeles',
		})
		expect(ingested.idempotent).toBe(false)
		expect(ingested.normalizedStatus).toBe('IN_TRANSIT')

		const duplicate = await caller.trace.carrierOps.ingestTrackingEvent({
			carrierAccountId: carrier._id,
			carrierEventId: 'evt-1',
			shipmentId: shipment._id,
			eventType: 'TRANSIT',
			eventStatus: 'IN_TRANSIT',
			signature: 'webhook-secret:evt-1',
		})
		expect(duplicate.idempotent).toBe(true)
		expect(duplicate.eventId).toBe(ingested.eventId)

		const events = db.schemas.shipmentTrackingEvents.findMany({
			where: (row) =>
				row.shipmentId === shipment._id && row.carrierEventId === 'evt-1',
		})
		expect(events).toHaveLength(1)
	})

	test('returns shipment timelines and carrier KPI analytics', async () => {
		const caller = createCaller()
		const shipment = db.schemas.shipments.toArray()[0]
		expect(shipment?._id).toBeDefined()
		if (!shipment?._id) {
			throw new Error('Missing shipment')
		}

		const carrier = await caller.trace.carrierAccounts.create({
			accountCode: '',
			carrierCode: 'USPS',
			name: 'USPS East',
			active: true,
			supportsRates: true,
			supportsLabels: true,
		})
		await caller.trace.carrierOps.purchaseLabel({
			shipmentId: shipment._id,
			carrierAccountId: carrier._id,
		})
		await caller.trace.carrierOps.ingestTrackingEvent({
			carrierAccountId: carrier._id,
			carrierEventId: 'evt-tl-1',
			shipmentId: shipment._id,
			eventType: 'DELIVERY',
			eventStatus: 'DELIVERED',
		})

		const timeline = await caller.trace.carrierOps.shipmentTimeline({
			shipmentId: shipment._id,
		})
		expect(timeline.events.length).toBeGreaterThan(0)
		expect(
			timeline.events.some((event) => event.normalizedStatus === 'DELIVERED'),
		).toBe(true)

		const kpis = await caller.trace.carrierOps.carrierKpis({})
		expect(kpis.some((kpi) => kpi.carrierAccountId === carrier._id)).toBe(true)
		expect(
			kpis.find((kpi) => kpi.carrierAccountId === carrier._id)?.onTimeRate,
		).toBeGreaterThanOrEqual(0)
	})

	test('keeps 25-row trace pagination within acceptable latency', async () => {
		const caller = createCaller()
		const maxDurationMs = 2000
		const startedAt = Date.now()
		const result = await caller.trace.shipments.list({ limit: 25, offset: 0 })
		const durationMs = Date.now() - startedAt

		expect(Array.isArray(result.items)).toBe(true)
		expect(result.items.length).toBeLessThanOrEqual(25)
		expect(durationMs).toBeLessThan(maxDurationMs)
	})
})
