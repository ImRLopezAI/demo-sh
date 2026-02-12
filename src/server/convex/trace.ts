import * as z from 'zod'
import { SHIPMENT_PRIORITY, SHIPMENT_STATUS } from './utils/enums'
import { zodTable } from './utils/helper'

export const shipments = zodTable('shipments', (zid) => ({
	shipmentNo: z.string(),
	status: z.enum(SHIPMENT_STATUS).default('PLANNED'),
	sourceDocumentType: z.string().optional(),
	sourceDocumentNo: z.string().optional(),
	shipmentMethodCode: z.string().optional(),
	priority: z.enum(SHIPMENT_PRIORITY).default('NORMAL'),
	plannedDispatchDate: z.string().optional(),
	plannedDeliveryDate: z.string().optional(),
	actualDispatchDate: z.string().optional(),
	actualDeliveryDate: z.string().optional(),
	courierName: z.string().optional(),
	trackingNo: z.string().optional(),
	statusReason: z.string().optional(),
	statusUpdatedAt: z.number().optional(),
}))

export const shipmentLines = zodTable('shipmentLines', (zid) => ({
	shipmentNo: zid('shipments'),
	lineNo: z.number().default(0),
	itemId: zid('items'),
	description: z.string().optional(),
	quantity: z.number().default(0),
	quantityShipped: z.number().default(0),
}))

export const shipmentMethods = zodTable('shipmentMethods', (zid) => ({
	code: z.string(),
	description: z.string(),
	active: z.boolean().default(true),
}))
