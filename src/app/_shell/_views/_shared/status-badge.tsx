import { Badge } from '@/components/ui/badge'

type BadgeVariant =
	| 'success'
	| 'warning'
	| 'info'
	| 'destructive'
	| 'outline'
	| 'secondary'

const STATUS_VARIANT_MAP: Record<string, BadgeVariant> = {
	COMPLETED: 'success',
	DELIVERED: 'success',
	ACTIVE: 'success',
	POSTED: 'success',
	APPROVED: 'success',
	DONE: 'success',
	RECONCILED: 'success',
	RECEIVED: 'success',
	ONLINE: 'success',
	CLOSED: 'success',

	PENDING_APPROVAL: 'warning',
	IN_PROGRESS: 'warning',
	IN_TRANSIT: 'warning',
	RELEASED: 'warning',
	DISPATCHED: 'warning',
	PAUSED: 'warning',
	MAINTENANCE: 'warning',
	ON_LEAVE: 'warning',
	HIGH: 'warning',
	CRITICAL: 'warning',
	EXPRESS: 'warning',

	OPEN: 'info',
	MATCHED: 'info',
	CHECKED_OUT: 'info',

	REJECTED: 'destructive',
	CANCELED: 'destructive',
	VOIDED: 'destructive',
	TERMINATED: 'destructive',
	REVERSED: 'destructive',
	BLOCKED: 'destructive',
	EXCEPTION: 'destructive',
	REFUNDED: 'destructive',
	INACTIVE: 'destructive',

	DRAFT: 'outline',
	PLANNED: 'outline',

	ARCHIVED: 'secondary',
	OFFLINE: 'secondary',
	ABANDONED: 'secondary',
	LOW: 'secondary',
	MEDIUM: 'secondary',
	NORMAL: 'secondary',
	READ: 'secondary',
	UNREAD: 'secondary',
}

export function StatusBadge({ status }: { status?: string | null }) {
	if (!status) return null
	const variant = STATUS_VARIANT_MAP[status] ?? 'secondary'
	const label = status.replace(/_/g, ' ')
	return <Badge variant={variant}>{label}</Badge>
}
