import * as z from 'zod'
import { ITEM_LEDGER_ENTRY_TYPE, LOCATION_TYPE, VALUE_ENTRY_TYPE } from './utils/enums'
import { zodTable } from './utils/helper'

export const locations = zodTable('locations', (zid) => ({
	code: z.string(),
	name: z.string(),
	type: z.enum(LOCATION_TYPE).default('WAREHOUSE'),
	address: z.string().optional(),
	city: z.string().optional(),
	country: z.string().optional(),
	latitude: z.number().optional(),
	longitude: z.number().optional(),
	active: z.boolean().default(true),
}))

export const itemLedgerEntries = zodTable('itemLedgerEntries', (zid) => ({
	entryNo: z.number().default(0),
	entryType: z.enum(ITEM_LEDGER_ENTRY_TYPE).default('PURCHASE'),
	itemId: zid('items'),
	locationCode: z.string().optional(),
	postingDate: z.string().optional(),
	quantity: z.number().default(0),
	remainingQty: z.number().default(0),
	open: z.boolean().default(true),
	sourceDocumentType: z.string().optional(),
	sourceDocumentNo: z.string().optional(),
}))

export const valueEntries = zodTable('valueEntries', (zid) => ({
	entryNo: z.number().default(0),
	itemLedgerEntryId: zid('itemLedgerEntries'),
	itemId: zid('items'),
	postingDate: z.string().optional(),
	entryType: z.enum(VALUE_ENTRY_TYPE).default('DIRECT_COST'),
	costAmountActual: z.number().default(0),
	salesAmountActual: z.number().default(0),
	costPerUnit: z.number().default(0),
}))
