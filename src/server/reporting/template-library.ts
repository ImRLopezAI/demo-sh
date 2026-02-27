import type { BuiltInLayoutKey, ReportLayout } from './contracts'

const BUILT_INS: Record<BuiltInLayoutKey, ReportLayout> = {
	BLANK_EMPTY: {
		key: 'BLANK_EMPTY',
		name: 'Blank / Empty',
		pageSize: 'A4',
		orientation: 'portrait',
		blocks: [{ kind: 'heading', text: 'Report', level: 1 }],
	},
	A4_SUMMARY: {
		key: 'A4_SUMMARY',
		name: 'A4 Summary',
		pageSize: 'A4',
		orientation: 'portrait',
		blocks: [
			{ kind: 'heading', text: 'Summary Report', level: 1 },
			{ kind: 'spacer', size: 'sm' },
			{ kind: 'keyValue', key: 'Module', valuePath: 'moduleId' },
			{ kind: 'keyValue', key: 'Entity', valuePath: 'entityId' },
			{ kind: 'keyValue', key: 'Generated', valuePath: 'generatedAt' },
			{ kind: 'spacer', size: 'md' },
			{
				kind: 'table',
				columns: [
					{ key: '_id', label: 'ID' },
					{ key: 'status', label: 'Status' },
					{ key: '_updatedAt', label: 'Updated' },
				],
				maxRows: 60,
			},
		],
	},
	THERMAL_RECEIPT: {
		key: 'THERMAL_RECEIPT',
		name: 'Thermal Receipt',
		pageSize: 'THERMAL',
		orientation: 'portrait',
		blocks: [
			{ kind: 'heading', text: 'Receipt', level: 2 },
			{ kind: 'keyValue', key: 'Receipt No', valuePath: 'summary.receiptNo' },
			{ kind: 'keyValue', key: 'Session', valuePath: 'summary.sessionNo' },
			{ kind: 'keyValue', key: 'Payment', valuePath: 'summary.paymentMethod' },
			{ kind: 'spacer', size: 'sm' },
			{
				kind: 'table',
				columns: [
					{ key: 'description', label: 'Item' },
					{ key: 'quantity', label: 'Qty' },
					{ key: 'lineAmount', label: 'Total' },
				],
				maxRows: 120,
			},
			{ kind: 'spacer', size: 'sm' },
			{ kind: 'keyValue', key: 'Subtotal', valuePath: 'summary.subtotal' },
			{ kind: 'keyValue', key: 'Tax', valuePath: 'summary.taxAmount' },
			{
				kind: 'keyValue',
				key: 'Discount',
				valuePath: 'summary.discountAmount',
			},
			{ kind: 'keyValue', key: 'Total', valuePath: 'summary.totalAmount' },
		],
	},
}

export function listBuiltInLayouts(): ReportLayout[] {
	return Object.values(BUILT_INS)
}

export function getBuiltInLayout(key: BuiltInLayoutKey): ReportLayout {
	return BUILT_INS[key]
}
