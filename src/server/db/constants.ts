// ─────────────────────────────────────────────────────────────────────────────
// Centralized status constants for the Uplink platform.
// All z.enum() calls in db/index.ts and all router transition maps derive from
// these single-source-of-truth arrays.
// ─────────────────────────────────────────────────────────────────────────────

// ── Shared: Document Approval Workflow (sales orders + purchase orders) ──────

export const DOCUMENT_APPROVAL_STATUSES = [
	'DRAFT',
	'PENDING_APPROVAL',
	'APPROVED',
	'REJECTED',
	'COMPLETED',
	'CANCELED',
] as const
export type DocumentApprovalStatus = (typeof DOCUMENT_APPROVAL_STATUSES)[number]

export const DOCUMENT_APPROVAL_STATUS_LABELS: Record<
	DocumentApprovalStatus,
	string
> = {
	DRAFT: 'Draft',
	PENDING_APPROVAL: 'Pending Approval',
	APPROVED: 'Approved',
	REJECTED: 'Rejected',
	COMPLETED: 'Completed',
	CANCELED: 'Canceled',
}

export const DOCUMENT_APPROVAL_TRANSITIONS: Record<
	DocumentApprovalStatus,
	readonly DocumentApprovalStatus[]
> = {
	DRAFT: ['PENDING_APPROVAL'],
	PENDING_APPROVAL: ['APPROVED', 'REJECTED'],
	APPROVED: ['COMPLETED', 'CANCELED'],
	REJECTED: ['DRAFT'],
	COMPLETED: [],
	CANCELED: [],
}

export const DOCUMENT_APPROVAL_REASON_REQUIRED: readonly DocumentApprovalStatus[] =
	['REJECTED', 'CANCELED']

// ── Shared: Posting Workflow (sales credit memos + purchase invoices) ────────

export const POSTING_STATUSES = ['DRAFT', 'POSTED', 'CANCELED'] as const
export type PostingStatus = (typeof POSTING_STATUSES)[number]

export const POSTING_STATUS_LABELS: Record<PostingStatus, string> = {
	DRAFT: 'Draft',
	POSTED: 'Posted',
	CANCELED: 'Canceled',
}

export const POSTING_TRANSITIONS: Record<
	PostingStatus,
	readonly PostingStatus[]
> = {
	DRAFT: ['POSTED', 'CANCELED'],
	POSTED: ['CANCELED'],
	CANCELED: [],
}

export const POSTING_REASON_REQUIRED: readonly PostingStatus[] = ['CANCELED']

// ── Shared: Reconciliation Workflow (bank ledger + payroll bank ledger) ──────

export const RECONCILIATION_STATUSES = [
	'OPEN',
	'MATCHED',
	'RECONCILED',
	'EXCEPTION',
] as const
export type ReconciliationStatus = (typeof RECONCILIATION_STATUSES)[number]

export const RECONCILIATION_STATUS_LABELS: Record<
	ReconciliationStatus,
	string
> = {
	OPEN: 'Open',
	MATCHED: 'Matched',
	RECONCILED: 'Reconciled',
	EXCEPTION: 'Exception',
}

export const RECONCILIATION_TRANSITIONS: Record<
	ReconciliationStatus,
	readonly ReconciliationStatus[]
> = {
	OPEN: ['MATCHED', 'EXCEPTION'],
	MATCHED: ['RECONCILED', 'EXCEPTION'],
	RECONCILED: [],
	EXCEPTION: ['MATCHED'],
}

export const RECONCILIATION_REASON_REQUIRED: readonly ReconciliationStatus[] = [
	'EXCEPTION',
]

// ── Shared: Journal Line Workflow (flow + payroll journal lines) ─────────────

export const JOURNAL_LINE_STATUSES = [
	'OPEN',
	'APPROVED',
	'POSTED',
	'VOIDED',
] as const
export type JournalLineStatus = (typeof JOURNAL_LINE_STATUSES)[number]

export const JOURNAL_LINE_STATUS_LABELS: Record<JournalLineStatus, string> = {
	OPEN: 'Open',
	APPROVED: 'Approved',
	POSTED: 'Posted',
	VOIDED: 'Voided',
}

export const JOURNAL_LINE_TRANSITIONS: Record<
	JournalLineStatus,
	readonly JournalLineStatus[]
> = {
	OPEN: ['APPROVED', 'POSTED', 'VOIDED'],
	APPROVED: ['POSTED', 'VOIDED'],
	POSTED: [],
	VOIDED: [],
}

export const JOURNAL_LINE_REASON_REQUIRED: readonly JournalLineStatus[] = [
	'VOIDED',
]

// ── Market ──────────────────────────────────────────────────────────────────

export const CART_STATUSES = ['OPEN', 'CHECKED_OUT', 'ABANDONED'] as const
export type CartStatus = (typeof CART_STATUSES)[number]

export const CART_STATUS_LABELS: Record<CartStatus, string> = {
	OPEN: 'Open',
	CHECKED_OUT: 'Checked Out',
	ABANDONED: 'Abandoned',
}

export const CART_TRANSITIONS: Record<CartStatus, readonly CartStatus[]> = {
	OPEN: ['CHECKED_OUT', 'ABANDONED'],
	CHECKED_OUT: [],
	ABANDONED: [],
}

export const INVENTORY_RESERVATION_STATUSES = [
	'ACTIVE',
	'RELEASED',
	'EXPIRED',
	'CONSUMED',
] as const
export type InventoryReservationStatus =
	(typeof INVENTORY_RESERVATION_STATUSES)[number]

export const INVENTORY_RESERVATION_STATUS_LABELS: Record<
	InventoryReservationStatus,
	string
> = {
	ACTIVE: 'Active',
	RELEASED: 'Released',
	EXPIRED: 'Expired',
	CONSUMED: 'Consumed',
}

export const INVENTORY_RESERVATION_TRANSITIONS: Record<
	InventoryReservationStatus,
	readonly InventoryReservationStatus[]
> = {
	ACTIVE: ['RELEASED', 'EXPIRED', 'CONSUMED'],
	RELEASED: [],
	EXPIRED: [],
	CONSUMED: [],
}

export const INVENTORY_RESERVATION_REASON_REQUIRED: readonly InventoryReservationStatus[] =
	['RELEASED', 'EXPIRED']

// ── Replenishment ───────────────────────────────────────────────────────────

export const TRANSFER_STATUSES = [
	'DRAFT',
	'RELEASED',
	'IN_TRANSIT',
	'RECEIVED',
	'CANCELED',
] as const
export type TransferStatus = (typeof TRANSFER_STATUSES)[number]

export const TRANSFER_STATUS_LABELS: Record<TransferStatus, string> = {
	DRAFT: 'Draft',
	RELEASED: 'Released',
	IN_TRANSIT: 'In Transit',
	RECEIVED: 'Received',
	CANCELED: 'Canceled',
}

export const TRANSFER_TRANSITIONS: Record<
	TransferStatus,
	readonly TransferStatus[]
> = {
	DRAFT: ['RELEASED'],
	RELEASED: ['IN_TRANSIT', 'CANCELED'],
	IN_TRANSIT: ['RECEIVED'],
	RECEIVED: [],
	CANCELED: [],
}

export const TRANSFER_REASON_REQUIRED: readonly TransferStatus[] = ['CANCELED']

// ── Ledger ──────────────────────────────────────────────────────────────────

export const SALES_INVOICE_STATUSES = ['DRAFT', 'POSTED', 'REVERSED'] as const
export type SalesInvoiceStatus = (typeof SALES_INVOICE_STATUSES)[number]

export const SALES_INVOICE_STATUS_LABELS: Record<SalesInvoiceStatus, string> = {
	DRAFT: 'Draft',
	POSTED: 'Posted',
	REVERSED: 'Reversed',
}

export const SALES_INVOICE_TRANSITIONS: Record<
	SalesInvoiceStatus,
	readonly SalesInvoiceStatus[]
> = {
	DRAFT: [],
	POSTED: ['REVERSED'],
	REVERSED: [],
}

export const SALES_INVOICE_REASON_REQUIRED: readonly SalesInvoiceStatus[] = [
	'REVERSED',
]

export const E_INVOICE_STATUSES = [
	'DRAFT',
	'POSTED',
	'SUBMITTED',
	'ACCEPTED',
	'REJECTED',
	'CANCELED',
] as const
export type EInvoiceStatus = (typeof E_INVOICE_STATUSES)[number]

export const E_INVOICE_STATUS_LABELS: Record<EInvoiceStatus, string> = {
	DRAFT: 'Draft',
	POSTED: 'Posted',
	SUBMITTED: 'Submitted',
	ACCEPTED: 'Accepted',
	REJECTED: 'Rejected',
	CANCELED: 'Canceled',
}

// ── Hub ─────────────────────────────────────────────────────────────────────

export const OPERATION_TASK_STATUSES = [
	'OPEN',
	'IN_PROGRESS',
	'BLOCKED',
	'DONE',
] as const
export type OperationTaskStatus = (typeof OPERATION_TASK_STATUSES)[number]

export const OPERATION_TASK_STATUS_LABELS: Record<OperationTaskStatus, string> =
	{
		OPEN: 'Open',
		IN_PROGRESS: 'In Progress',
		BLOCKED: 'Blocked',
		DONE: 'Done',
	}

export const OPERATION_TASK_TRANSITIONS: Record<
	OperationTaskStatus,
	readonly OperationTaskStatus[]
> = {
	OPEN: ['IN_PROGRESS', 'BLOCKED'],
	IN_PROGRESS: ['BLOCKED', 'DONE'],
	BLOCKED: ['IN_PROGRESS', 'DONE'],
	DONE: [],
}

export const OPERATION_TASK_REASON_REQUIRED: readonly OperationTaskStatus[] = [
	'BLOCKED',
]

export const SLA_STATUSES = ['ON_TRACK', 'AT_RISK', 'BREACHED'] as const
export type SlaStatus = (typeof SLA_STATUSES)[number]

export const SLA_STATUS_LABELS: Record<SlaStatus, string> = {
	ON_TRACK: 'On Track',
	AT_RISK: 'At Risk',
	BREACHED: 'Breached',
}

export const NOTIFICATION_STATUSES = ['UNREAD', 'READ', 'ARCHIVED'] as const
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number]

export const NOTIFICATION_STATUS_LABELS: Record<NotificationStatus, string> = {
	UNREAD: 'Unread',
	READ: 'Read',
	ARCHIVED: 'Archived',
}

export const NOTIFICATION_TRANSITIONS: Record<
	NotificationStatus,
	readonly NotificationStatus[]
> = {
	UNREAD: ['READ', 'ARCHIVED'],
	READ: ['ARCHIVED'],
	ARCHIVED: [],
}

export const AUDIT_LOG_STATUSES = ['SUCCESS', 'DENIED', 'FAILED'] as const
export type AuditLogStatus = (typeof AUDIT_LOG_STATUSES)[number]

export const AUDIT_LOG_STATUS_LABELS: Record<AuditLogStatus, string> = {
	SUCCESS: 'Success',
	DENIED: 'Denied',
	FAILED: 'Failed',
}

export const SCHEDULED_JOB_STATUSES = ['IDLE', 'SUCCESS', 'FAILED'] as const
export type ScheduledJobStatus = (typeof SCHEDULED_JOB_STATUSES)[number]

export const SCHEDULED_JOB_STATUS_LABELS: Record<ScheduledJobStatus, string> = {
	IDLE: 'Idle',
	SUCCESS: 'Success',
	FAILED: 'Failed',
}

export const ORDER_WORKFLOW_STATUSES = [
	'RUNNING',
	'FAILED',
	'COMPLETED',
] as const
export type OrderWorkflowStatus = (typeof ORDER_WORKFLOW_STATUSES)[number]

export const ORDER_WORKFLOW_STATUS_LABELS: Record<OrderWorkflowStatus, string> =
	{
		RUNNING: 'Running',
		FAILED: 'Failed',
		COMPLETED: 'Completed',
	}

// ── Flow ────────────────────────────────────────────────────────────────────

export const BANK_ACCOUNT_STATUSES = ['ACTIVE', 'INACTIVE', 'BLOCKED'] as const
export type BankAccountStatus = (typeof BANK_ACCOUNT_STATUSES)[number]

export const BANK_ACCOUNT_STATUS_LABELS: Record<BankAccountStatus, string> = {
	ACTIVE: 'Active',
	INACTIVE: 'Inactive',
	BLOCKED: 'Blocked',
}

export const BANK_ACCOUNT_TRANSITIONS: Record<
	BankAccountStatus,
	readonly BankAccountStatus[]
> = {
	ACTIVE: ['INACTIVE', 'BLOCKED'],
	INACTIVE: ['ACTIVE', 'BLOCKED'],
	BLOCKED: ['ACTIVE', 'INACTIVE'],
}

export const BANK_ACCOUNT_REASON_REQUIRED: readonly BankAccountStatus[] = [
	'BLOCKED',
]

// ── Payroll ─────────────────────────────────────────────────────────────────

export const EMPLOYEE_STATUSES = ['ACTIVE', 'ON_LEAVE', 'TERMINATED'] as const
export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number]

export const EMPLOYEE_STATUS_LABELS: Record<EmployeeStatus, string> = {
	ACTIVE: 'Active',
	ON_LEAVE: 'On Leave',
	TERMINATED: 'Terminated',
}

export const EMPLOYEE_TRANSITIONS: Record<
	EmployeeStatus,
	readonly EmployeeStatus[]
> = {
	ACTIVE: ['ON_LEAVE', 'TERMINATED'],
	ON_LEAVE: ['ACTIVE', 'TERMINATED'],
	TERMINATED: [],
}

export const EMPLOYEE_REASON_REQUIRED: readonly EmployeeStatus[] = [
	'TERMINATED',
]

export const PAYROLL_RUN_STATUSES = [
	'DRAFT',
	'CALCULATED',
	'POSTED',
	'PAID',
	'CANCELED',
] as const
export type PayrollRunStatus = (typeof PAYROLL_RUN_STATUSES)[number]

export const PAYROLL_RUN_STATUS_LABELS: Record<PayrollRunStatus, string> = {
	DRAFT: 'Draft',
	CALCULATED: 'Calculated',
	POSTED: 'Posted',
	PAID: 'Paid',
	CANCELED: 'Canceled',
}

export const PAYROLL_RUN_TRANSITIONS: Record<
	PayrollRunStatus,
	readonly PayrollRunStatus[]
> = {
	DRAFT: ['CANCELED'],
	CALCULATED: ['CANCELED'],
	POSTED: [],
	PAID: [],
	CANCELED: [],
}

export const PAYROLL_RUN_REASON_REQUIRED: readonly PayrollRunStatus[] = [
	'CANCELED',
]

export const STATUTORY_REPORT_STATUSES = ['GENERATED', 'VOIDED'] as const
export type StatutoryReportStatus = (typeof STATUTORY_REPORT_STATUSES)[number]

export const STATUTORY_REPORT_STATUS_LABELS: Record<
	StatutoryReportStatus,
	string
> = {
	GENERATED: 'Generated',
	VOIDED: 'Voided',
}

export const STATUTORY_REPORT_TRANSITIONS: Record<
	StatutoryReportStatus,
	readonly StatutoryReportStatus[]
> = {
	GENERATED: ['VOIDED'],
	VOIDED: [],
}

export const STATUTORY_REPORT_REASON_REQUIRED: readonly StatutoryReportStatus[] =
	['VOIDED']

// ── POS ─────────────────────────────────────────────────────────────────────

export const TERMINAL_STATUSES = ['ONLINE', 'OFFLINE', 'MAINTENANCE'] as const
export type TerminalStatus = (typeof TERMINAL_STATUSES)[number]

export const TERMINAL_STATUS_LABELS: Record<TerminalStatus, string> = {
	ONLINE: 'Online',
	OFFLINE: 'Offline',
	MAINTENANCE: 'Maintenance',
}

export const TERMINAL_TRANSITIONS: Record<
	TerminalStatus,
	readonly TerminalStatus[]
> = {
	ONLINE: ['OFFLINE', 'MAINTENANCE'],
	OFFLINE: ['ONLINE', 'MAINTENANCE'],
	MAINTENANCE: ['ONLINE', 'OFFLINE'],
}

export const POS_SESSION_STATUSES = ['OPEN', 'PAUSED', 'CLOSED'] as const
export type PosSessionStatus = (typeof POS_SESSION_STATUSES)[number]

export const POS_SESSION_STATUS_LABELS: Record<PosSessionStatus, string> = {
	OPEN: 'Open',
	PAUSED: 'Paused',
	CLOSED: 'Closed',
}

export const POS_SESSION_TRANSITIONS: Record<
	PosSessionStatus,
	readonly PosSessionStatus[]
> = {
	OPEN: ['PAUSED', 'CLOSED'],
	PAUSED: ['OPEN', 'CLOSED'],
	CLOSED: [],
}

export const POS_TRANSACTION_STATUSES = [
	'OPEN',
	'COMPLETED',
	'VOIDED',
	'REFUNDED',
] as const
export type PosTransactionStatus = (typeof POS_TRANSACTION_STATUSES)[number]

export const POS_TRANSACTION_STATUS_LABELS: Record<
	PosTransactionStatus,
	string
> = {
	OPEN: 'Open',
	COMPLETED: 'Completed',
	VOIDED: 'Voided',
	REFUNDED: 'Refunded',
}

export const POS_TRANSACTION_TRANSITIONS: Record<
	PosTransactionStatus,
	readonly PosTransactionStatus[]
> = {
	OPEN: ['COMPLETED', 'VOIDED'],
	COMPLETED: ['REFUNDED'],
	VOIDED: [],
	REFUNDED: [],
}

export const POS_TRANSACTION_REASON_REQUIRED: readonly PosTransactionStatus[] =
	['VOIDED', 'REFUNDED']

// ── Trace ───────────────────────────────────────────────────────────────────

export const SHIPMENT_STATUSES = [
	'PLANNED',
	'DISPATCHED',
	'IN_TRANSIT',
	'DELIVERED',
	'EXCEPTION',
] as const
export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number]

export const SHIPMENT_STATUS_LABELS: Record<ShipmentStatus, string> = {
	PLANNED: 'Planned',
	DISPATCHED: 'Dispatched',
	IN_TRANSIT: 'In Transit',
	DELIVERED: 'Delivered',
	EXCEPTION: 'Exception',
}

export const SHIPMENT_TRANSITIONS: Record<
	ShipmentStatus,
	readonly ShipmentStatus[]
> = {
	PLANNED: ['DISPATCHED', 'EXCEPTION'],
	DISPATCHED: ['IN_TRANSIT', 'EXCEPTION'],
	IN_TRANSIT: ['DELIVERED', 'EXCEPTION'],
	DELIVERED: ['EXCEPTION'],
	EXCEPTION: [],
}

export const SHIPMENT_REASON_REQUIRED: readonly ShipmentStatus[] = ['EXCEPTION']

export const SHIPMENT_PRIORITY_STATUSES = [
	'LOW',
	'NORMAL',
	'HIGH',
	'EXPRESS',
] as const
export type ShipmentPriority = (typeof SHIPMENT_PRIORITY_STATUSES)[number]

export const SHIPMENT_PRIORITY_LABELS: Record<ShipmentPriority, string> = {
	LOW: 'Low',
	NORMAL: 'Normal',
	HIGH: 'High',
	EXPRESS: 'Express',
}

export const CARRIER_LABEL_STATUSES = [
	'QUOTED',
	'PURCHASED',
	'VOIDED',
	'ERROR',
] as const
export type CarrierLabelStatus = (typeof CARRIER_LABEL_STATUSES)[number]

export const CARRIER_LABEL_STATUS_LABELS: Record<CarrierLabelStatus, string> = {
	QUOTED: 'Quoted',
	PURCHASED: 'Purchased',
	VOIDED: 'Voided',
	ERROR: 'Error',
}

export const CARRIER_LABEL_TRANSITIONS: Record<
	CarrierLabelStatus,
	readonly CarrierLabelStatus[]
> = {
	QUOTED: ['PURCHASED', 'VOIDED', 'ERROR'],
	PURCHASED: ['VOIDED'],
	VOIDED: [],
	ERROR: ['QUOTED'],
}

export const CARRIER_LABEL_REASON_REQUIRED: readonly CarrierLabelStatus[] = [
	'ERROR',
]

export const TRACKING_EVENT_SOURCES = ['WEBHOOK', 'POLL'] as const
export type TrackingEventSource = (typeof TRACKING_EVENT_SOURCES)[number]

// ── Utility: derive labeled transitions for UI Select dropdowns ─────────────

export function getLabeledTransitions<S extends string>(
	currentStatus: S,
	transitions: Record<S, readonly S[]>,
	labels: Record<S, string>,
): { label: string; to: S }[] {
	const allowed = transitions[currentStatus]
	if (!allowed) return []
	return allowed.map((to) => ({ label: labels[to], to }))
}
