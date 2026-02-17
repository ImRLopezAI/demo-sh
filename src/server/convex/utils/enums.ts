// =====================================================================
// Hub
// =====================================================================
export const TASK_STATUS = ['OPEN', 'IN_PROGRESS', 'BLOCKED', 'DONE'] as const
export const TASK_PRIORITY = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const
export const NOTIFICATION_STATUS = ['UNREAD', 'READ', 'ARCHIVED'] as const
export const NOTIFICATION_SEVERITY = ['INFO', 'WARNING', 'ERROR'] as const

// =====================================================================
// Market
// =====================================================================
export const ITEM_TYPE = ['ITEM', 'SERVICE', 'BUNDLE'] as const
export const DOCUMENT_TYPE = ['ORDER', 'RETURN_ORDER', 'QUOTE'] as const
export const DOCUMENT_STATUS = [
	'DRAFT',
	'PENDING_APPROVAL',
	'APPROVED',
	'REJECTED',
	'COMPLETED',
	'CANCELED',
] as const
export const CART_STATUS = ['OPEN', 'CHECKED_OUT', 'ABANDONED'] as const

// =====================================================================
// Insight
// =====================================================================
export const LOCATION_TYPE = [
	'WAREHOUSE',
	'STORE',
	'DISTRIBUTION_CENTER',
] as const
export const ITEM_LEDGER_ENTRY_TYPE = [
	'SALE',
	'PURCHASE',
	'POSITIVE_ADJUSTMENT',
	'NEGATIVE_ADJUSTMENT',
	'TRANSFER',
] as const
export const VALUE_ENTRY_TYPE = [
	'DIRECT_COST',
	'REVALUATION',
	'ROUNDING',
	'INDIRECT_COST',
	'VARIANCE',
] as const

// =====================================================================
// Ledger
// =====================================================================
export const INVOICE_STATUS = ['DRAFT', 'POSTED', 'REVERSED'] as const
export const CUST_LEDGER_DOCUMENT_TYPE = [
	'INVOICE',
	'CREDIT_MEMO',
	'PAYMENT',
] as const

// =====================================================================
// Flow
// =====================================================================
export const BANK_ACCOUNT_STATUS = ['ACTIVE', 'INACTIVE', 'BLOCKED'] as const
export const BANK_LEDGER_DOCUMENT_TYPE = [
	'PAYMENT',
	'REFUND',
	'TRANSFER',
	'ADJUSTMENT',
	'PAYROLL',
] as const
export const RECONCILIATION_STATUS = [
	'OPEN',
	'MATCHED',
	'RECONCILED',
	'EXCEPTION',
] as const
export const JOURNAL_DOCUMENT_TYPE = [
	'PAYMENT',
	'INVOICE',
	'REFUND',
	'TRANSFER',
	'PAYROLL',
	'ADJUSTMENT',
] as const
export const ACCOUNT_TYPE = [
	'GL_ACCOUNT',
	'BANK_ACCOUNT',
	'CUSTOMER',
	'VENDOR',
	'EMPLOYEE',
] as const
export const JOURNAL_STATUS = ['OPEN', 'APPROVED', 'POSTED', 'VOIDED'] as const

// =====================================================================
// Replenishment
// =====================================================================
export const TRANSFER_STATUS = [
	'DRAFT',
	'RELEASED',
	'IN_TRANSIT',
	'RECEIVED',
	'CANCELED',
] as const

// =====================================================================
// Payroll
// =====================================================================
export const EMPLOYMENT_TYPE = [
	'FULL_TIME',
	'PART_TIME',
	'CONTRACTOR',
	'TEMPORARY',
] as const
export const EMPLOYEE_STATUS = ['ACTIVE', 'ON_LEAVE', 'TERMINATED'] as const
export const PAY_FREQUENCY = [
	'WEEKLY',
	'BIWEEKLY',
	'SEMI_MONTHLY',
	'MONTHLY',
] as const
export const EMPLOYEE_LEDGER_DOCUMENT_TYPE = [
	'PAYROLL',
	'ADJUSTMENT',
	'PAYMENT',
	'BENEFIT',
] as const

// =====================================================================
// POS
// =====================================================================
export const TERMINAL_STATUS = ['ONLINE', 'OFFLINE', 'MAINTENANCE'] as const
export const POS_SESSION_STATUS = ['OPEN', 'PAUSED', 'CLOSED'] as const
export const POS_TRANSACTION_STATUS = [
	'OPEN',
	'COMPLETED',
	'VOIDED',
	'REFUNDED',
] as const
export const PAYMENT_METHOD = ['CASH', 'CARD', 'MOBILE', 'MIXED'] as const

// =====================================================================
// Trace
// =====================================================================
export const SHIPMENT_STATUS = [
	'PLANNED',
	'DISPATCHED',
	'IN_TRANSIT',
	'DELIVERED',
	'EXCEPTION',
] as const
export const SHIPMENT_PRIORITY = ['LOW', 'NORMAL', 'HIGH', 'EXPRESS'] as const
