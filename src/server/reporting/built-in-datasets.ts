import type { BuiltInDataSetKey, DataSetDefinition } from './contracts'

const BUILT_IN_DATASETS: Record<BuiltInDataSetKey, DataSetDefinition> = {
	DOC_SALES_ORDER: {
		name: 'Sales Order Document',
		type: 'single',
		primaryTable: 'salesHeaders',
		fields: [
			{ name: 'documentNo', label: 'Order No.' },
			{ name: 'status', label: 'Status' },
			{ name: 'orderDate', label: 'Order Date' },
			{ name: 'totalAmount', label: 'Total Amount' },
			{
				type: 'related',
				name: 'customer',
				label: 'Customer',
				relatedModel: 'customers',
				joinField: 'customerId',
				fields: [
					{ name: 'name', label: 'Customer Name' },
					{ name: 'email', label: 'Email' },
					{ name: 'phone', label: 'Phone' },
				],
			},
			{
				type: 'related',
				name: 'lines',
				label: 'Order Lines',
				relatedModel: 'salesLines',
				joinField: 'documentNo',
				relatedJoinField: 'documentNo',
				fields: [
					{ name: 'lineNo', label: 'Line' },
					{ name: 'description', label: 'Description' },
					{ name: 'quantity', label: 'Qty' },
					{ name: 'unitPrice', label: 'Unit Price' },
					{ name: 'lineAmount', label: 'Amount' },
					{
						type: 'related',
						name: 'item',
						label: 'Item',
						relatedModel: 'items',
						joinField: 'itemId',
						fields: [
							{ name: 'description', label: 'Item Description' },
							{ name: 'itemNo', label: 'Item No.' },
						],
					},
				],
			},
		],
	},

	DOC_SALES_INVOICE: {
		name: 'Sales Invoice Document',
		type: 'single',
		primaryTable: 'salesInvoiceHeaders',
		fields: [
			{ name: 'invoiceNo', label: 'Invoice No.' },
			{ name: 'status', label: 'Status' },
			{ name: 'postingDate', label: 'Posting Date' },
			{ name: 'dueDate', label: 'Due Date' },
			{ name: 'totalAmount', label: 'Total Amount' },
			{
				type: 'related',
				name: 'customer',
				label: 'Customer',
				relatedModel: 'customers',
				joinField: 'customerId',
				fields: [
					{ name: 'name', label: 'Customer Name' },
					{ name: 'email', label: 'Email' },
					{ name: 'address', label: 'Address' },
				],
			},
			{
				type: 'related',
				name: 'lines',
				label: 'Invoice Lines',
				relatedModel: 'salesInvoiceLines',
				joinField: 'invoiceNo',
				relatedJoinField: 'invoiceNo',
				fields: [
					{ name: 'lineNo', label: 'Line' },
					{ name: 'description', label: 'Description' },
					{ name: 'quantity', label: 'Qty' },
					{ name: 'unitPrice', label: 'Unit Price' },
					{ name: 'lineAmount', label: 'Amount' },
					{
						type: 'related',
						name: 'item',
						label: 'Item',
						relatedModel: 'items',
						joinField: 'itemId',
						fields: [
							{ name: 'description', label: 'Item Description' },
							{ name: 'itemNo', label: 'Item No.' },
						],
					},
				],
			},
		],
	},

	DOC_POS_RECEIPT: {
		name: 'POS Receipt',
		type: 'single',
		primaryTable: 'posTransactions',
		fields: [
			{ name: 'receiptNo', label: 'Receipt No.' },
			{ name: 'status', label: 'Status' },
			{ name: 'paymentMethod', label: 'Payment Method' },
			{ name: 'subtotal', label: 'Subtotal' },
			{ name: 'taxAmount', label: 'Tax' },
			{ name: 'discountAmount', label: 'Discount' },
			{ name: 'totalAmount', label: 'Total' },
			{
				type: 'related',
				name: 'session',
				label: 'Session',
				relatedModel: 'posSessions',
				joinField: 'posSessionId',
				fields: [
					{ name: 'sessionNo', label: 'Session No.' },
					{ name: 'terminalId', label: 'Terminal' },
				],
			},
			{
				type: 'related',
				name: 'lines',
				label: 'Items',
				relatedModel: 'posTransactionLines',
				joinField: 'transactionId',
				relatedJoinField: 'transactionId',
				fields: [
					{ name: 'description', label: 'Item' },
					{ name: 'quantity', label: 'Qty' },
					{ name: 'unitPrice', label: 'Price' },
					{ name: 'lineAmount', label: 'Total' },
					{
						type: 'related',
						name: 'item',
						label: 'Item',
						relatedModel: 'items',
						joinField: 'itemId',
						fields: [{ name: 'description', label: 'Description' }],
					},
				],
			},
		],
	},
}

export function listBuiltInDataSets(): Array<{
	key: BuiltInDataSetKey
	definition: DataSetDefinition
}> {
	return (
		Object.entries(BUILT_IN_DATASETS) as Array<
			[BuiltInDataSetKey, DataSetDefinition]
		>
	).map(([key, definition]) => ({ key, definition }))
}

export function getBuiltInDataSet(
	key: BuiltInDataSetKey,
): DataSetDefinition | undefined {
	return BUILT_IN_DATASETS[key]
}

export function findDataSetForEntity(
	moduleId: string,
	entityId: string,
): { key: BuiltInDataSetKey; definition: DataSetDefinition } | undefined {
	const entityMap: Record<string, BuiltInDataSetKey> = {
		'market.salesOrders': 'DOC_SALES_ORDER',
		'ledger.invoices': 'DOC_SALES_INVOICE',
		'pos.transactions': 'DOC_POS_RECEIPT',
	}
	const mapKey = `${moduleId}.${entityId}`
	const dsKey = entityMap[mapKey]
	if (!dsKey) return undefined
	return { key: dsKey, definition: BUILT_IN_DATASETS[dsKey] }
}
