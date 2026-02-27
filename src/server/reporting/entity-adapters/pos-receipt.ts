import type { RpcContextType } from '@server/rpc/init'
import type { ReportDataSet } from '../contracts'

function readTenantId(row: unknown): string {
	return (row as { tenantId?: string }).tenantId ?? 'demo-tenant'
}

function asNumber(value: unknown): number {
	const num = Number(value)
	return Number.isFinite(num) ? num : 0
}

export function buildPosReceiptDataSet(
	context: RpcContextType,
	transactionId: string,
): ReportDataSet {
	const tenantId = context.auth.tenantId
	const transaction = context.db.schemas.posTransactions.get(transactionId)
	if (!transaction || readTenantId(transaction) !== tenantId) {
		throw new Error('POS transaction not found')
	}

	const session = context.db.schemas.posSessions.get(transaction.posSessionId)
	if (!session || readTenantId(session) !== tenantId) {
		throw new Error('POS session not found for receipt')
	}

	const rows = context.db.schemas.posTransactionLines
		.findMany({
			where: (line) =>
				readTenantId(line) === tenantId &&
				line.transactionId === transaction._id,
			orderBy: { field: '_updatedAt', direction: 'asc' },
			limit: 500,
		})
		.map((line) => ({
			description: line.description,
			quantity: line.quantity,
			unitPrice: line.unitPrice,
			discountPercent: line.discountPercent,
			lineAmount: line.lineAmount,
		}))

	const subtotal = rows.reduce(
		(total, row) => total + asNumber(row.quantity) * asNumber(row.unitPrice),
		0,
	)

	return {
		moduleId: 'pos',
		entityId: 'transactions',
		title: `Receipt ${transaction.receiptNo}`,
		generatedAt: new Date().toISOString(),
		rows,
		summary: {
			receiptNo: transaction.receiptNo,
			sessionNo: session.sessionNo,
			paymentMethod: transaction.paymentMethod,
			subtotal,
			taxAmount: transaction.taxAmount,
			discountAmount: transaction.discountAmount,
			totalAmount: transaction.totalAmount,
			paidAmount: transaction.paidAmount,
			transactionStatus: transaction.status,
		},
	}
}
