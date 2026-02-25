import {
	CARRIER_LABEL_REASON_REQUIRED,
	CARRIER_LABEL_TRANSITIONS,
	SHIPMENT_REASON_REQUIRED,
	SHIPMENT_TRANSITIONS,
} from '@server/db/constants'
import { createRPCRouter, publicProcedure } from '@server/rpc/init'
import z from 'zod'
import { assertRole } from '../authz'
import { createTenantScopedCrudRouter } from '../helpers'

const shipmentsCrudRouter = createTenantScopedCrudRouter({
	moduleName: 'trace',
	prefix: 'shipments',
	primaryTable: 'shipments',
	viewTables: { overview: 'shipments' },
	statusField: 'status',
	transitions: SHIPMENT_TRANSITIONS,
	reasonRequiredStatuses: SHIPMENT_REASON_REQUIRED,
	statusRoleRequirements: {
		EXCEPTION: 'MANAGER',
	},
})

const shipmentLinesRouter = createTenantScopedCrudRouter({
	moduleName: 'trace',
	prefix: 'shipment-lines',
	primaryTable: 'shipmentLines',
	viewTables: { overview: 'shipmentLines' },
	parentRelations: [
		{
			childField: 'shipmentNo',
			parentTable: 'shipments',
			parentField: 'shipmentNo',
		},
		{
			childField: 'itemId',
			parentTable: 'items',
		},
	],
})

const shipmentMethodsRouter = createTenantScopedCrudRouter({
	moduleName: 'trace',
	prefix: 'shipment-methods',
	primaryTable: 'shipmentMethods',
	viewTables: { overview: 'shipmentMethods' },
})

const carrierAccountsRouter = createTenantScopedCrudRouter({
	moduleName: 'trace',
	prefix: 'carrier-accounts',
	primaryTable: 'carrierAccounts',
	viewTables: { overview: 'carrierAccounts' },
})

const carrierLabelsRouter = createTenantScopedCrudRouter({
	moduleName: 'trace',
	prefix: 'carrier-labels',
	primaryTable: 'shipmentCarrierLabels',
	viewTables: { overview: 'shipmentCarrierLabels' },
	statusField: 'status',
	transitions: CARRIER_LABEL_TRANSITIONS,
	reasonRequiredStatuses: CARRIER_LABEL_REASON_REQUIRED,
})

const trackingEventsRouter = createTenantScopedCrudRouter({
	moduleName: 'trace',
	prefix: 'tracking-events',
	primaryTable: 'shipmentTrackingEvents',
	viewTables: { overview: 'shipmentTrackingEvents' },
})

const transitionWithNotificationInputSchema = z.object({
	id: z.string(),
	toStatus: z.enum(['DISPATCHED', 'IN_TRANSIT', 'DELIVERED', 'EXCEPTION']),
	reason: z.string().optional(),
})

const quoteRateInputSchema = z.object({
	shipmentId: z.string(),
	carrierAccountId: z.string(),
	serviceLevel: z.string().optional(),
	packageWeightKg: z.number().positive().default(1),
})

const purchaseLabelInputSchema = z.object({
	shipmentId: z.string(),
	carrierAccountId: z.string(),
	serviceLevel: z.string().optional(),
	packageWeightKg: z.number().positive().default(1),
})

const ingestTrackingEventInputSchema = z.object({
	carrierAccountId: z.string(),
	carrierEventId: z.string(),
	shipmentId: z.string().optional(),
	shipmentNo: z.string().optional(),
	trackingNo: z.string().optional(),
	eventType: z.string(),
	eventStatus: z.string(),
	occurredAt: z.string().optional(),
	location: z.string().optional(),
	rawPayload: z.string().optional(),
	signature: z.string().optional(),
	source: z.enum(['WEBHOOK', 'POLL']).default('WEBHOOK'),
})

const shipmentTimelineInputSchema = z.object({
	shipmentId: z.string(),
})

const carrierKpisInputSchema = z.object({
	dateFrom: z.string().optional(),
	dateTo: z.string().optional(),
})

const readTenantId = (row: unknown) =>
	(row as { tenantId?: string }).tenantId ?? 'demo-tenant'

const roundMoney = (value: number) => Math.round(value * 100) / 100

const allowedTraceTransitions: Record<string, string[]> = {
	PLANNED: ['DISPATCHED', 'EXCEPTION'],
	DISPATCHED: ['IN_TRANSIT', 'EXCEPTION'],
	IN_TRANSIT: ['DELIVERED', 'EXCEPTION'],
	DELIVERED: ['EXCEPTION'],
}

const notificationForStatus = (status: string) => {
	switch (status) {
		case 'DISPATCHED':
			return {
				title: 'Shipment dispatched',
				severity: 'INFO' as const,
			}
		case 'IN_TRANSIT':
			return {
				title: 'Shipment in transit',
				severity: 'INFO' as const,
			}
		case 'DELIVERED':
			return {
				title: 'Shipment delivered',
				severity: 'INFO' as const,
			}
		case 'EXCEPTION':
			return {
				title: 'Shipment exception',
				severity: 'WARNING' as const,
			}
		default:
			return {
				title: 'Shipment update',
				severity: 'INFO' as const,
			}
	}
}

const requireShipment = (
	context: any,
	tenantId: string,
	shipmentId: string,
) => {
	const shipment = context.db.schemas.shipments.get(shipmentId)
	if (!shipment || readTenantId(shipment) !== tenantId) {
		throw new Error('Shipment not found')
	}
	return shipment
}

const requireCarrierAccount = (
	context: any,
	tenantId: string,
	carrierAccountId: string,
) => {
	const account = context.db.schemas.carrierAccounts.get(carrierAccountId)
	if (!account || readTenantId(account) !== tenantId) {
		throw new Error('Carrier account not found')
	}
	return account
}

const resolveShipmentFromEventInput = (
	context: any,
	tenantId: string,
	input: z.infer<typeof ingestTrackingEventInputSchema>,
) => {
	if (input.shipmentId) {
		return requireShipment(context, tenantId, input.shipmentId)
	}
	if (input.shipmentNo) {
		const byNo = context.db.schemas.shipments.findMany({
			where: (row: any) =>
				readTenantId(row) === tenantId && row.shipmentNo === input.shipmentNo,
			limit: 1,
		})[0]
		if (byNo) return byNo
	}
	if (input.trackingNo) {
		const byTracking = context.db.schemas.shipments.findMany({
			where: (row: any) =>
				readTenantId(row) === tenantId && row.trackingNo === input.trackingNo,
			limit: 1,
		})[0]
		if (byTracking) return byTracking
	}
	throw new Error('Unable to resolve shipment from tracking event payload')
}

const validateWebhookSignature = (
	carrierAccount: Record<string, any>,
	carrierEventId: string,
	signature?: string,
) => {
	const secret = carrierAccount.webhookSecret
	if (!secret) return
	const expectedSignature = `${secret}:${carrierEventId}`
	if (signature !== expectedSignature) {
		throw new Error('Invalid webhook signature')
	}
}

const normalizeShipmentStatusFromTracking = (eventStatus: string) => {
	const normalized = eventStatus.trim().toUpperCase()
	if (
		['DISPATCHED', 'IN_TRANSIT', 'DELIVERED', 'EXCEPTION'].includes(normalized)
	) {
		return normalized as 'DISPATCHED' | 'IN_TRANSIT' | 'DELIVERED' | 'EXCEPTION'
	}
	if (['FAILED', 'DELAYED', 'RETURNED'].includes(normalized)) return 'EXCEPTION'
	return null
}

const carrierOpsRouter = createRPCRouter({
	quoteRate: publicProcedure
		.input(quoteRateInputSchema)
		.route({
			method: 'POST',
			summary: 'Get a carrier shipment rate quote and persist quote artifact',
		})
		.handler(({ input, context }) => {
			assertRole(context, 'AGENT', 'trace carrier quote rate')
			const tenantId = context.auth.tenantId
			const shipment = requireShipment(context, tenantId, input.shipmentId)
			const carrierAccount = requireCarrierAccount(
				context,
				tenantId,
				input.carrierAccountId,
			)
			if (!carrierAccount.active) {
				throw new Error('Carrier account is inactive')
			}

			const shipmentLines = context.db.schemas.shipmentLines.findMany({
				where: (row: any) =>
					readTenantId(row) === tenantId &&
					row.shipmentNo === shipment.shipmentNo,
			})
			const lineCount = Math.max(1, shipmentLines.length)
			const quoteAmount = roundMoney(
				5 +
					lineCount * 1.75 +
					Number(input.packageWeightKg ?? 1) * 1.1 +
					(shipment.priority === 'EXPRESS' ? 8 : 0),
			)

			const quote = context.db.schemas.shipmentCarrierLabels.insert({
				labelNo: '',
				shipmentId: shipment._id,
				carrierAccountId: carrierAccount._id,
				status: 'QUOTED',
				serviceLevel: input.serviceLevel ?? 'STANDARD',
				rateQuoteAmount: quoteAmount,
				currency: 'USD',
			})

			return {
				shipmentId: shipment._id,
				carrierAccountId: carrierAccount._id,
				quoteId: quote._id,
				quoteAmount,
				currency: 'USD',
				serviceLevel: quote.serviceLevel,
			}
		}),
	purchaseLabel: publicProcedure
		.input(purchaseLabelInputSchema)
		.route({
			method: 'POST',
			summary: 'Purchase shipment label and persist purchased label record',
		})
		.handler(({ input, context }) => {
			assertRole(context, 'AGENT', 'trace carrier purchase label')
			const tenantId = context.auth.tenantId
			const shipment = requireShipment(context, tenantId, input.shipmentId)
			const carrierAccount = requireCarrierAccount(
				context,
				tenantId,
				input.carrierAccountId,
			)
			if (!carrierAccount.active) {
				throw new Error('Carrier account is inactive')
			}

			const existingPurchased =
				context.db.schemas.shipmentCarrierLabels.findMany({
					where: (row: any) =>
						readTenantId(row) === tenantId &&
						row.shipmentId === shipment._id &&
						row.carrierAccountId === carrierAccount._id &&
						row.status === 'PURCHASED',
					limit: 1,
				})[0]
			if (existingPurchased) {
				return {
					labelId: existingPurchased._id,
					labelNo: existingPurchased.labelNo,
					shipmentId: shipment._id,
					trackingNo: existingPurchased.trackingNo,
					labelUrl: existingPurchased.labelUrl,
					idempotent: true,
				}
			}

			const quote = context.db.schemas.shipmentCarrierLabels.insert({
				labelNo: '',
				shipmentId: shipment._id,
				carrierAccountId: carrierAccount._id,
				status: 'QUOTED',
				serviceLevel: input.serviceLevel ?? 'STANDARD',
				rateQuoteAmount: roundMoney(
					7 + Number(input.packageWeightKg ?? 1) * 1.4,
				),
				currency: 'USD',
			})
			const trackingNo =
				shipment.trackingNo ||
				`${carrierAccount.carrierCode}-${Date.now().toString().slice(-8)}`
			const purchased = context.db.schemas.shipmentCarrierLabels.update(
				quote._id,
				{
					status: 'PURCHASED',
					trackingNo,
					labelUrl: `https://labels.uplink.local/${quote.labelNo}.pdf`,
					purchasedAt: new Date().toISOString(),
				},
			)
			if (!purchased) {
				throw new Error('Unable to purchase carrier label')
			}

			context.db.schemas.shipments.update(shipment._id, {
				trackingNo,
				courierName: carrierAccount.name,
			})

			return {
				labelId: purchased._id,
				labelNo: purchased.labelNo,
				shipmentId: shipment._id,
				trackingNo,
				labelUrl: purchased.labelUrl,
				idempotent: false,
			}
		}),
	ingestTrackingEvent: publicProcedure
		.input(ingestTrackingEventInputSchema)
		.route({
			method: 'POST',
			summary:
				'Ingest carrier tracking event with signature validation and idempotent dedupe',
		})
		.handler(({ input, context }) => {
			assertRole(context, 'AGENT', 'trace ingest tracking event')
			const tenantId = context.auth.tenantId
			const carrierAccount = requireCarrierAccount(
				context,
				tenantId,
				input.carrierAccountId,
			)
			validateWebhookSignature(
				carrierAccount,
				input.carrierEventId,
				input.signature,
			)
			const shipment = resolveShipmentFromEventInput(context, tenantId, input)

			const existingEvent = context.db.schemas.shipmentTrackingEvents.findMany({
				where: (row: any) =>
					readTenantId(row) === tenantId &&
					row.shipmentId === shipment._id &&
					row.carrierEventId === input.carrierEventId,
				limit: 1,
			})[0]
			if (existingEvent) {
				return {
					eventId: existingEvent._id,
					shipmentId: shipment._id,
					normalizedStatus: normalizeShipmentStatusFromTracking(
						existingEvent.eventStatus,
					),
					idempotent: true,
				}
			}

			const normalizedStatus = normalizeShipmentStatusFromTracking(
				input.eventStatus,
			)
			const isException =
				normalizedStatus === 'EXCEPTION' ||
				['FAILED', 'DELAYED', 'RETURNED'].includes(
					input.eventStatus.trim().toUpperCase(),
				)
			const createdEvent = context.db.schemas.shipmentTrackingEvents.insert({
				eventNo: '',
				shipmentId: shipment._id,
				carrierAccountId: carrierAccount._id,
				carrierEventId: input.carrierEventId,
				eventType: input.eventType,
				eventStatus: input.eventStatus,
				occurredAt: input.occurredAt ?? new Date().toISOString(),
				location: input.location,
				source: input.source,
				exception: isException,
				rawPayload: input.rawPayload,
			})

			if (normalizedStatus) {
				const updatePayload: Record<string, unknown> = {
					status: normalizedStatus,
					statusUpdatedAt: new Date(),
				}
				if (normalizedStatus === 'DISPATCHED' && !shipment.actualDispatchDate) {
					updatePayload.actualDispatchDate =
						input.occurredAt ?? new Date().toISOString()
				}
				if (normalizedStatus === 'DELIVERED' && !shipment.actualDeliveryDate) {
					updatePayload.actualDeliveryDate =
						input.occurredAt ?? new Date().toISOString()
				}
				if (isException) {
					updatePayload.statusReason = `Carrier event: ${input.eventStatus}`
				}
				context.db.schemas.shipments.update(shipment._id, updatePayload)
			}

			if (isException || normalizedStatus === 'DELIVERED') {
				const notificationMeta = notificationForStatus(
					normalizedStatus ?? 'EXCEPTION',
				)
				context.db.schemas.moduleNotifications.insert({
					moduleId: 'trace',
					title: notificationMeta.title,
					body: `Shipment ${shipment.shipmentNo} event ${input.eventType} (${input.eventStatus}) received from ${carrierAccount.name}.`,
					status: 'UNREAD',
					severity: notificationMeta.severity,
				})
			}

			return {
				eventId: createdEvent._id,
				shipmentId: shipment._id,
				normalizedStatus,
				idempotent: false,
			}
		}),
	shipmentTimeline: publicProcedure
		.input(shipmentTimelineInputSchema)
		.route({
			method: 'GET',
			summary: 'Get normalized timeline for shipment tracking events',
		})
		.handler(({ input, context }) => {
			assertRole(context, 'AGENT', 'trace shipment timeline')
			const tenantId = context.auth.tenantId
			const shipment = requireShipment(context, tenantId, input.shipmentId)

			const events = context.db.schemas.shipmentTrackingEvents.findMany({
				where: (row: any) =>
					readTenantId(row) === tenantId && row.shipmentId === shipment._id,
				orderBy: { field: 'occurredAt', direction: 'asc' },
			})
			return {
				shipmentId: shipment._id,
				shipmentNo: shipment.shipmentNo,
				trackingNo: shipment.trackingNo,
				events: events.map((event: any) => ({
					id: event._id,
					carrierEventId: event.carrierEventId,
					eventType: event.eventType,
					eventStatus: event.eventStatus,
					normalizedStatus: normalizeShipmentStatusFromTracking(
						event.eventStatus,
					),
					occurredAt: event.occurredAt,
					location: event.location,
					exception: Boolean(event.exception),
					source: event.source,
				})),
			}
		}),
	carrierKpis: publicProcedure
		.input(carrierKpisInputSchema)
		.route({
			method: 'GET',
			summary: 'Get carrier-level on-time and exception KPI metrics',
		})
		.handler(({ input, context }) => {
			assertRole(context, 'AGENT', 'trace carrier KPI analytics')
			const tenantId = context.auth.tenantId
			const dateFromMs = input.dateFrom
				? new Date(input.dateFrom).getTime()
				: null
			const dateToMs = input.dateTo ? new Date(input.dateTo).getTime() : null

			const carrierAccounts = context.db.schemas.carrierAccounts.findMany({
				where: (row: any) => readTenantId(row) === tenantId,
			})

			return carrierAccounts.map((carrier: any) => {
				const labels = context.db.schemas.shipmentCarrierLabels.findMany({
					where: (row: any) =>
						readTenantId(row) === tenantId &&
						row.carrierAccountId === carrier._id &&
						row.status === 'PURCHASED',
				})
				const shipmentIds = Array.from(
					new Set(labels.map((label: any) => label.shipmentId)),
				)
				const shipments = shipmentIds
					.map((id) => context.db.schemas.shipments.get(id))
					.filter(
						(shipment: any) => shipment && readTenantId(shipment) === tenantId,
					)
					.filter((shipment: any) => {
						if (!dateFromMs && !dateToMs) return true
						const marker = new Date(
							shipment.actualDeliveryDate || shipment.plannedDeliveryDate || '',
						).getTime()
						if (Number.isNaN(marker)) return true
						if (dateFromMs && marker < dateFromMs) return false
						if (dateToMs && marker > dateToMs) return false
						return true
					})
				const deliveredShipments = shipments.filter(
					(shipment: any) => shipment.status === 'DELIVERED',
				)
				const onTimeDelivered = deliveredShipments.filter((shipment: any) => {
					const planned = new Date(shipment.plannedDeliveryDate).getTime()
					const actual = new Date(shipment.actualDeliveryDate).getTime()
					if (Number.isNaN(planned) || Number.isNaN(actual)) return false
					return actual <= planned
				})
				const exceptionEvents =
					context.db.schemas.shipmentTrackingEvents.findMany({
						where: (row: any) =>
							readTenantId(row) === tenantId &&
							row.carrierAccountId === carrier._id &&
							row.exception === true,
					})

				const shipmentCount = shipments.length
				const deliveredCount = deliveredShipments.length
				const onTimeCount = onTimeDelivered.length
				const exceptionCount = exceptionEvents.length

				return {
					carrierAccountId: carrier._id,
					carrierCode: carrier.carrierCode,
					carrierName: carrier.name,
					shipmentCount,
					deliveredCount,
					onTimeCount,
					onTimeRate:
						deliveredCount > 0 ? roundMoney(onTimeCount / deliveredCount) : 0,
					exceptionCount,
					exceptionRate:
						shipmentCount > 0 ? roundMoney(exceptionCount / shipmentCount) : 0,
				}
			})
		}),
})

const shipmentsRouter = createRPCRouter({
	...shipmentsCrudRouter,
	transitionWithNotification: publicProcedure
		.input(transitionWithNotificationInputSchema)
		.route({
			method: 'POST',
			summary:
				'Transition shipment status and emit customer-facing notification trigger',
		})
		.handler(({ input, context }) => {
			assertRole(
				context,
				'AGENT',
				'trace shipment transition with notification',
			)
			const tenantId = context.auth.tenantId
			const shipment = context.db.schemas.shipments.get(input.id)
			if (!shipment) {
				throw new Error('Shipment not found')
			}
			if (readTenantId(shipment) !== tenantId) {
				throw new Error('Cross-tenant access is not allowed')
			}

			const currentStatus = String(shipment.status ?? '')
			const allowed = allowedTraceTransitions[currentStatus] ?? []
			if (!allowed.includes(input.toStatus)) {
				throw new Error(
					`Transition "${currentStatus}" -> "${input.toStatus}" is not allowed`,
				)
			}
			if (input.toStatus === 'EXCEPTION' && !input.reason) {
				throw new Error('A reason is required for status "EXCEPTION"')
			}

			const nowIso = new Date().toISOString()
			const updatePayload: Record<string, unknown> = {
				status: input.toStatus,
				statusUpdatedAt: new Date(),
				statusReason: input.reason,
			}
			if (input.toStatus === 'DISPATCHED' && !shipment.actualDispatchDate) {
				updatePayload.actualDispatchDate = nowIso
			}
			if (input.toStatus === 'DELIVERED' && !shipment.actualDeliveryDate) {
				updatePayload.actualDeliveryDate = nowIso
			}

			const updatedShipment = context.db.schemas.shipments.update(
				shipment._id,
				updatePayload,
			)
			if (!updatedShipment) {
				throw new Error('Unable to update shipment status')
			}

			const notificationMeta = notificationForStatus(input.toStatus)
			const notificationBodyParts = [
				`Shipment ${updatedShipment.shipmentNo} changed to ${input.toStatus}.`,
				updatedShipment.trackingNo
					? `Tracking: ${updatedShipment.trackingNo}.`
					: null,
				updatedShipment.sourceDocumentNo
					? `Source: ${updatedShipment.sourceDocumentType ?? 'Document'} ${
							updatedShipment.sourceDocumentNo
						}.`
					: null,
				input.reason ? `Reason: ${input.reason}.` : null,
			].filter(Boolean)

			const createdNotification = context.db.schemas.moduleNotifications.insert(
				{
					moduleId: 'trace',
					title: notificationMeta.title,
					body: notificationBodyParts.join(' '),
					status: 'UNREAD',
					severity: notificationMeta.severity,
				},
			)

			return {
				shipmentId: updatedShipment._id,
				shipmentNo: updatedShipment.shipmentNo,
				status: updatedShipment.status,
				notificationId: createdNotification._id,
			}
		}),
})

export const traceRouter = createRPCRouter({
	shipments: shipmentsRouter,
	shipmentLines: shipmentLinesRouter,
	shipmentMethods: shipmentMethodsRouter,
	carrierAccounts: carrierAccountsRouter,
	carrierLabels: carrierLabelsRouter,
	trackingEvents: trackingEventsRouter,
	carrierOps: carrierOpsRouter,
})
