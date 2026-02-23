---
title: "fix: Replace read-only status badges with Select dropdowns using centralized DB constants"
type: fix
status: completed
date: 2026-02-23
deepened: 2026-02-23
---

## Enhancement Summary

**Deepened on:** 2026-02-23
**Research agents used:** 12 (TypeScript reviewer, pattern-recognition, architecture-strategist, code-simplicity, performance-oracle, frontend-races, security-sentinel, spec-flow-analyzer, best-practices-researcher, framework-docs-researcher, vercel-react-best-practices, vercel-composition-patterns)

### Critical Findings That Changed The Plan

1. **The `update` RPC endpoint does NOT validate status transitions** — binding status to `Form.Select` via `field.onChange` would send status changes through the general `update` endpoint on save, completely bypassing transition validation, role checks, reason requirements, and audit logging. This is a security and data integrity hole.
2. **The Select must route through `transitionStatus`** — the `onValueChange` handler must call `requestTransition()` from `useTransitionWithReason`, NOT `field.onChange`. The status field must NOT be part of the form's save payload.
3. **Show only valid next statuses** — the dropdown must filter against the transition map, not show all possible statuses.
4. **Merge identical constants** — `SALES_ORDER_STATUSES` and `PURCHASE_ORDER_STATUSES` are byte-for-byte identical; extract as shared `DOCUMENT_APPROVAL_STATUSES`.
5. **Read-only forms keep StatusBadge** — POS session-card, transaction-card (read-only views) and eInvoiceStatus (system-driven) must NOT become Selects.
6. **Standardize STATUS_TRANSITIONS format** — unify to `{ label: string; to: string }[]` pattern across all components, eliminating the competing plain string array pattern and separate `TRANSITION_LABELS` maps.

---

# fix: Replace read-only status badges with Select dropdowns using centralized DB constants

## Overview

All status fields across every module's form components are rendered as read-only `StatusBadge` components. Users cannot change the status directly from the form — they must use transition buttons (which exist in some but not all components). The fix involves:

1. Creating a centralized constants file (`src/server/db/constants.ts`) exporting all status enum arrays as `as const` declarations with label maps and transition maps
2. Replacing the read-only `StatusBadge` with `Form.Select` dropdowns in form components that have editable status, populated from valid next statuses (not all statuses), routing changes through `transitionStatus` (not the general `update` endpoint)

## Problem Statement

- Status fields in forms are **not editable** — they display as static badges
- Status enum values are **duplicated** across components — each card component hardcodes its own `STATUS_TRANSITIONS` map and type definitions
- The DB schema (`src/server/db/index.ts`) defines status enums via `z.enum()` inline, but these values are not exported as reusable constants
- Some forms show transition buttons, others show nothing — inconsistent UX
- Transition maps are duplicated between server router configs and client card components (drift risk)
- Two competing `STATUS_TRANSITIONS` formats exist: plain string arrays vs `{label, to}[]` objects

## Proposed Solution

### Phase 1: Create centralized constants file

Create `src/server/db/constants.ts` with status enums, label maps, and transition maps grouped by domain. Merge identical value sets.

```typescript
// src/server/db/constants.ts

// ── Shared Document Approval Workflow (used by sales orders + purchase orders) ──
export const DOCUMENT_APPROVAL_STATUSES = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELED'] as const;
export type DocumentApprovalStatus = typeof DOCUMENT_APPROVAL_STATUSES[number];

export const DOCUMENT_APPROVAL_STATUS_LABELS: Record<DocumentApprovalStatus, string> = {
  DRAFT: 'Draft',
  PENDING_APPROVAL: 'Pending Approval',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  COMPLETED: 'Completed',
  CANCELED: 'Canceled',
};

export const DOCUMENT_APPROVAL_TRANSITIONS: Record<DocumentApprovalStatus, { label: string; to: DocumentApprovalStatus }[]> = {
  DRAFT: [{ label: 'Submit for Approval', to: 'PENDING_APPROVAL' }],
  PENDING_APPROVAL: [{ label: 'Approve', to: 'APPROVED' }, { label: 'Reject', to: 'REJECTED' }],
  APPROVED: [{ label: 'Complete', to: 'COMPLETED' }, { label: 'Cancel', to: 'CANCELED' }],
  REJECTED: [{ label: 'Return to Draft', to: 'DRAFT' }],
  COMPLETED: [],
  CANCELED: [],
};

// ── Market-specific ──
export const CART_STATUSES = ['OPEN', 'CHECKED_OUT', 'ABANDONED'] as const;
export const INVENTORY_RESERVATION_STATUSES = ['ACTIVE', 'RELEASED', 'EXPIRED', 'CONSUMED'] as const;

// ── Replenishment ──
export const PURCHASE_INVOICE_STATUSES = ['DRAFT', 'POSTED', 'CANCELED'] as const;
export type PurchaseInvoiceStatus = typeof PURCHASE_INVOICE_STATUSES[number];
export const PURCHASE_INVOICE_STATUS_LABELS: Record<PurchaseInvoiceStatus, string> = {
  DRAFT: 'Draft', POSTED: 'Posted', CANCELED: 'Canceled',
};

export const TRANSFER_STATUSES = ['DRAFT', 'RELEASED', 'IN_TRANSIT', 'RECEIVED', 'CANCELED'] as const;
export type TransferStatus = typeof TRANSFER_STATUSES[number];
export const TRANSFER_STATUS_LABELS: Record<TransferStatus, string> = {
  DRAFT: 'Draft', RELEASED: 'Released', IN_TRANSIT: 'In Transit', RECEIVED: 'Received', CANCELED: 'Canceled',
};
export const TRANSFER_TRANSITIONS: Record<TransferStatus, { label: string; to: TransferStatus }[]> = {
  DRAFT: [{ label: 'Release', to: 'RELEASED' }],
  RELEASED: [{ label: 'Ship', to: 'IN_TRANSIT' }, { label: 'Cancel', to: 'CANCELED' }],
  IN_TRANSIT: [{ label: 'Receive', to: 'RECEIVED' }],
  RECEIVED: [],
  CANCELED: [],
};

// ── Ledger ──
export const SALES_INVOICE_STATUSES = ['DRAFT', 'POSTED', 'REVERSED'] as const;
export type SalesInvoiceStatus = typeof SALES_INVOICE_STATUSES[number];
export const SALES_INVOICE_STATUS_LABELS: Record<SalesInvoiceStatus, string> = {
  DRAFT: 'Draft', POSTED: 'Posted', REVERSED: 'Reversed',
};

export const E_INVOICE_STATUSES = ['DRAFT', 'POSTED', 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'CANCELED'] as const;
export const CREDIT_MEMO_STATUSES = ['DRAFT', 'POSTED', 'CANCELED'] as const;
export const JOURNAL_LINE_STATUSES = ['OPEN', 'APPROVED', 'POSTED', 'VOIDED'] as const;
export const RECONCILIATION_STATUSES = ['OPEN', 'MATCHED', 'RECONCILED', 'EXCEPTION'] as const;

// ── Trace ──
export const SHIPMENT_STATUSES = ['PLANNED', 'DISPATCHED', 'IN_TRANSIT', 'DELIVERED', 'EXCEPTION'] as const;
export type ShipmentStatus = typeof SHIPMENT_STATUSES[number];
export const SHIPMENT_STATUS_LABELS: Record<ShipmentStatus, string> = {
  PLANNED: 'Planned', DISPATCHED: 'Dispatched', IN_TRANSIT: 'In Transit', DELIVERED: 'Delivered', EXCEPTION: 'Exception',
};
export const SHIPMENT_TRANSITIONS: Record<ShipmentStatus, { label: string; to: ShipmentStatus }[]> = {
  PLANNED: [{ label: 'Dispatch', to: 'DISPATCHED' }],
  DISPATCHED: [{ label: 'In Transit', to: 'IN_TRANSIT' }, { label: 'Exception', to: 'EXCEPTION' }],
  IN_TRANSIT: [{ label: 'Deliver', to: 'DELIVERED' }, { label: 'Exception', to: 'EXCEPTION' }],
  DELIVERED: [],
  EXCEPTION: [],
};

export const CARRIER_LABEL_STATUSES = ['QUOTED', 'PURCHASED', 'VOIDED', 'ERROR'] as const;

// ── Flow ──
export const BANK_ACCOUNT_STATUSES = ['ACTIVE', 'INACTIVE', 'BLOCKED'] as const;
export type BankAccountStatus = typeof BANK_ACCOUNT_STATUSES[number];
export const BANK_ACCOUNT_STATUS_LABELS: Record<BankAccountStatus, string> = {
  ACTIVE: 'Active', INACTIVE: 'Inactive', BLOCKED: 'Blocked',
};

// ── Payroll ──
export const EMPLOYEE_STATUSES = ['ACTIVE', 'ON_LEAVE', 'TERMINATED'] as const;
export type EmployeeStatus = typeof EMPLOYEE_STATUSES[number];
export const EMPLOYEE_STATUS_LABELS: Record<EmployeeStatus, string> = {
  ACTIVE: 'Active', ON_LEAVE: 'On Leave', TERMINATED: 'Terminated',
};
export const EMPLOYEE_TRANSITIONS: Record<EmployeeStatus, { label: string; to: EmployeeStatus }[]> = {
  ACTIVE: [{ label: 'Set On Leave', to: 'ON_LEAVE' }, { label: 'Terminate', to: 'TERMINATED' }],
  ON_LEAVE: [{ label: 'Reactivate', to: 'ACTIVE' }, { label: 'Terminate', to: 'TERMINATED' }],
  TERMINATED: [],
};

export const PAYROLL_RUN_STATUSES = ['RUNNING', 'COMPLETED', 'FAILED'] as const;
export const COMPLIANCE_REPORT_STATUSES = ['GENERATED', 'VOIDED'] as const;

// ── POS ──
export const TERMINAL_STATUSES = ['ONLINE', 'OFFLINE', 'MAINTENANCE'] as const;
export const POS_SESSION_STATUSES = ['OPEN', 'PAUSED', 'CLOSED'] as const;
export const POS_TRANSACTION_STATUSES = ['OPEN', 'COMPLETED', 'VOIDED', 'REFUNDED'] as const;

// ── Hub ──
export const TASK_STATUSES = ['OPEN', 'IN_PROGRESS', 'BLOCKED', 'DONE'] as const;
export type TaskStatus = typeof TASK_STATUSES[number];
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  OPEN: 'Open', IN_PROGRESS: 'In Progress', BLOCKED: 'Blocked', DONE: 'Done',
};
export const TASK_TRANSITIONS: Record<TaskStatus, { label: string; to: TaskStatus }[]> = {
  OPEN: [{ label: 'Start', to: 'IN_PROGRESS' }, { label: 'Block', to: 'BLOCKED' }],
  IN_PROGRESS: [{ label: 'Block', to: 'BLOCKED' }, { label: 'Complete', to: 'DONE' }],
  BLOCKED: [{ label: 'Resume', to: 'IN_PROGRESS' }, { label: 'Complete', to: 'DONE' }],
  DONE: [],
};

export const SLA_STATUSES = ['ON_TRACK', 'AT_RISK', 'BREACHED'] as const;
export const NOTIFICATION_STATUSES = ['UNREAD', 'READ', 'ARCHIVED'] as const;
export const AUDIT_LOG_STATUSES = ['SUCCESS', 'DENIED', 'FAILED'] as const;
export const SCHEDULED_JOB_STATUSES = ['IDLE', 'SUCCESS', 'FAILED'] as const;
export const SCHEDULED_JOB_RUN_STATUSES = ['RUNNING', 'SUCCESS', 'FAILED', 'SKIPPED'] as const;
export const ORDER_WORKFLOW_STATUSES = ['RUNNING', 'FAILED', 'COMPLETED'] as const;
export const WORKFLOW_STEP_STATUSES = ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED'] as const;
```

### Research Insights (Phase 1)

**Best Practices:**
- `z.enum()` in Zod v4 accepts `readonly` arrays directly — no spreading needed (`z.enum(STATUSES)` works, not `z.enum([...STATUSES])`)
- Add `Record<Status, string>` label maps for each status set — provides exhaustive compile-time checking and eliminates the `s.replace(/_/g, ' ')` pattern scattered across components
- Use Zod's `.extract()` and `.exclude()` methods for creating narrowed subsets (e.g., terminal-only statuses)
- Merge `SALES_ORDER_STATUSES` and `PURCHASE_ORDER_STATUSES` into shared `DOCUMENT_APPROVAL_STATUSES` since they are byte-for-byte identical with identical transition maps

**Simplicity:**
- Only export constants that are actually consumed by client-side forms — server-only constants (AUDIT_LOG_STATUSES, SCHEDULED_JOB_STATUSES, etc.) only need to exist for the Zod schema, not in the shared constants
- Only create separate types when the values actually differ from another constant

### Phase 2: Update `src/server/db/index.ts` to use constants

Replace inline `z.enum([...])` calls with references to the constants:

```typescript
import { DOCUMENT_APPROVAL_STATUSES, TRANSFER_STATUSES, ... } from './constants';

// Before:
status: z.enum(['DRAFT', 'PENDING_APPROVAL', ...]).default('DRAFT'),

// After:
status: z.enum(DOCUMENT_APPROVAL_STATUSES).default('DRAFT'),
```

### Phase 3: Replace StatusBadge with status Select in form components

**CRITICAL: The Select must NOT bind to `field.onChange`.** The `onValueChange` handler must route through `requestTransition()` from `useTransitionWithReason`, keeping the status field outside the form's save payload. This preserves all transition validation, role checks, reason requirements, and audit logging that the `transitionStatus` endpoint enforces.

**The Select must show only valid next statuses (plus current status), NOT all possible statuses.**

**Pattern to apply in each card component:**

```tsx
// Before:
<Form.Item>
  <Form.Label>Status</Form.Label>
  <div className="...">
    <StatusBadge status={currentStatus} />
  </div>
</Form.Item>
// ... with separate transition buttons in footer

// After:
<Form.Item>
  <Form.Label>Status</Form.Label>
  <Form.Select.Root
    value={currentStatus}
    onValueChange={(newStatus) => {
      // Route through transition system, NOT field.onChange
      if (newStatus !== currentStatus) {
        requestTransition(newStatus);
      }
    }}
    disabled={isNew || !nextStatuses.length}
  >
    <Form.Select.Trigger>
      <Form.Select.Value />
    </Form.Select.Trigger>
    <Form.Select.Content>
      {/* Current status always shown */}
      <Form.Select.Item key={currentStatus} value={currentStatus}>
        {STATUS_LABELS[currentStatus]}
      </Form.Select.Item>
      {/* Only valid next statuses */}
      {nextStatuses.map((t) => (
        <Form.Select.Item key={t.to} value={t.to}>
          {t.label}
        </Form.Select.Item>
      ))}
    </Form.Select.Content>
  </Form.Select.Root>
</Form.Item>
```

### Research Insights (Phase 3)

**Architecture (CRITICAL):**
- The `update` RPC handler at `src/server/rpc/router/helpers.ts:340-371` does NOT validate status transitions, enforce role requirements, or require reasons. Only the `transitionStatus` handler at lines 387-447 does. Binding status to the form submit flow would bypass ALL workflow enforcement.
- Custom transition handlers exist that do more than just change status: `submitForApproval` (creates inventory reservations), `cancelWithRelease` (releases reservations), `postInvoice` (creates G/L entries), `transitionWithNotification` (sends customer notifications). A generic Select must route to these custom endpoints for their respective transitions.

**Race Conditions (CRITICAL):**
- If the Select fires `onValueChange` and a reason dialog opens, the user may cancel. The Select's displayed value must revert to the server's actual status. Since we bind `value={currentStatus}` (from server data, not form state), canceling the reason dialog naturally leaves the Select showing the correct value.
- If the transition fails server-side, the query invalidation from `useEntityMutations` will refetch, and `currentStatus` will remain the server's actual value.

**Security:**
- Role-gated transitions (MANAGER required for APPROVED, REJECTED, COMPLETED, etc.) are enforced by `transitionStatus`. The Select dropdown approach preserves this because it routes through `requestTransition`.
- Reason requirements for destructive transitions (REJECTED, CANCELED, TERMINATED, etc.) are enforced by `useTransitionWithReason`. The Select triggers the same reason dialog flow.

**Performance:**
- Pre-compute label maps at module scope instead of calling `.replace(/_/g, ' ')` inside render
- `@base-ui/react` Select portal is lazy by default — no DOM overhead when closed
- The constants arrays are `as const` and stable — no per-render allocation

**Base-UI Integration:**
- `onValueChange` signature is `(value, eventDetails)` — do NOT pass `field.onChange` directly
- Put `ref` on `Select.Trigger` (the focusable element) for form focus management
- Put `onBlur` on `Select.Trigger` for touch-tracking

**Composition:**
- Inline the `Form.Select` pattern directly in each card — do NOT create a reusable `StatusSelect` component. 7 lines of inline JSX is preferable to an abstraction that hides intent and couples form integration with Select rendering.

### Phase 4: Remove transition buttons where Select replaces them

For cards that get the status Select, the separate transition buttons in the footer become redundant. Remove them and keep only:
- Save/Cancel buttons
- Domain-specific action buttons that call custom endpoints (e.g., "Receive Remaining", "Create Invoice", "Submit E-Invoice")

### Phase 5: Standardize STATUS_TRANSITIONS format

Replace all per-component `STATUS_TRANSITIONS` constants with imports from `constants.ts`. Unify on the `{ label: string; to: string }[]` format. Delete:
- Per-component `STATUS_TRANSITIONS` maps
- Separate `TRANSITION_LABELS` maps (in purchase-order-card, transfer-card)
- Inline type definitions that duplicate the constants

## Component Classification

### Full Select replacement (7 components — have existing transition support)
- `market/components/sales-order-card.tsx` — status Select, remove footer transition buttons
- `replenishment/components/purchase-order-card.tsx` — status Select, remove footer transition buttons
- `replenishment/components/transfer-card.tsx` — status Select, remove footer transition buttons
- `ledger/components/invoice-card.tsx` — status Select only (NOT eInvoiceStatus, which is system-driven)
- `trace/components/shipment-card.tsx` — status Select, remove footer transition buttons
- `payroll/components/employee-card.tsx` — status Select, remove Status FormSection, keep one display location
- `hub/components/task-card.tsx` — status Select, remove Status FormSection buttons

### New Select with new transition support (2 components — need wiring)
- `flow/components/bank-account-card.tsx` — add `useTransitionWithReason` + status Select
- `pos/components/terminal-card.tsx` — add `useTransitionWithReason` + status Select

### Keep StatusBadge — read-only (3 components)
- `pos/components/session-card.tsx` — read-only view, no Save functionality
- `pos/components/transaction-card.tsx` — read-only view, no Save functionality
- `ledger/components/invoice-card.tsx` `eInvoiceStatus` field — system-driven, not user-driven

## Affected Files

### New File
- `src/server/db/constants.ts` — Centralized status enum constants, label maps, and transition maps

### Modified Files

**DB Layer:**
- `src/server/db/index.ts` — Import and use constants in z.enum() definitions

**Server Routers (import transitions from constants):**
- `src/server/rpc/router/uplink/market.router.ts` — Import `DOCUMENT_APPROVAL_TRANSITIONS`
- `src/server/rpc/router/uplink/replenishment.router.ts` — Import transitions
- `src/server/rpc/router/uplink/ledger.router.ts` — Import transitions
- `src/server/rpc/router/uplink/trace.router.ts` — Import transitions
- `src/server/rpc/router/uplink/payroll.router.ts` — Import transitions
- `src/server/rpc/router/uplink/hub.router.ts` — Import transitions

**Card Components (see classification above):**
- `src/app/_shell/_views/market/components/sales-order-card.tsx`
- `src/app/_shell/_views/replenishment/components/purchase-order-card.tsx`
- `src/app/_shell/_views/replenishment/components/transfer-card.tsx`
- `src/app/_shell/_views/ledger/components/invoice-card.tsx`
- `src/app/_shell/_views/trace/components/shipment-card.tsx`
- `src/app/_shell/_views/flow/components/bank-account-card.tsx`
- `src/app/_shell/_views/payroll/components/employee-card.tsx`
- `src/app/_shell/_views/hub/components/task-card.tsx`
- `src/app/_shell/_views/pos/components/terminal-card.tsx`

## Acceptance Criteria

- [ ] `src/server/db/constants.ts` exists with status enums as `as const` arrays, label maps, transition maps, and derived types
- [ ] Identical status sets are merged (`DOCUMENT_APPROVAL_STATUSES` shared by sales orders and purchase orders)
- [ ] `src/server/db/index.ts` uses the constants from the new file in `z.enum()` calls
- [ ] Server routers import transition maps from the constants file (single source of truth)
- [ ] Form components with editable status use `Form.Select` showing only valid next statuses
- [ ] The Select's `onValueChange` routes through `requestTransition()` / `useTransitionWithReason`, NOT through `field.onChange` / form submit
- [ ] The Select uses label maps for display text (no `.replace(/_/g, ' ')`)
- [ ] Read-only forms (POS session, transaction) keep StatusBadge
- [ ] System-driven statuses (eInvoiceStatus) keep StatusBadge
- [ ] Terminal states show a disabled Select with no available transitions
- [ ] Reason-required transitions (REJECTED, CANCELED, etc.) still trigger the reason dialog
- [ ] Custom transition endpoints (submitForApproval, postInvoice, etc.) are still called for their respective transitions
- [ ] STATUS_TRANSITIONS format is unified to `{ label: string; to: string }[]` across all components
- [ ] Redundant transition buttons are removed where the Select replaces them
- [ ] Duplicate status displays within the same form are consolidated to one location
- [ ] TypeScript compilation passes with no errors
- [ ] All existing tests pass

## Technical Considerations

- The `Form.Select` component is built on `@base-ui/react/select` and already exists in the UI library
- The `StatusBadge` component remains for read-only contexts (grid cells, list items, notifications, read-only forms)
- The Select's `value` prop must be bound to `currentStatus` (from server data), NOT form state — this prevents desync on cancel/failure
- `onValueChange` signature is `(value, eventDetails)` — wrap the handler, do not pass `field.onChange` directly
- Base-UI Select portals are lazy — no DOM overhead when closed
- The transition maps are the single source of truth shared between server router configs and client components, eliminating drift risk
- For cards with custom transition endpoints (sales-order: `submitForApproval`/`cancelWithRelease`, invoice: `postInvoice`, shipment: `transitionWithNotification`), the `onValueChange` handler must check the target status and route to the correct custom mutation

## Edge Cases

- **New record creation:** Status defaults to initial value (DRAFT, OPEN, ACTIVE). The Select shows the default with no transitions available (no current record = no transitions).
- **Concurrent edits:** If another user transitions the record while the form is open, the query refetch updates `currentStatus`, and the Select reflects the new state. The available transitions update accordingly.
- **Reason dialog cancel:** Since the Select's `value` is bound to `currentStatus` (server truth), canceling the reason dialog naturally leaves the Select showing the correct value.
- **Server rejection:** The mutation failure does not change `currentStatus`. The Select remains correct. An error toast is shown.

## References

- DB schema: `src/server/db/index.ts`
- Form compound component: `src/components/ui/form.tsx`
- Select component: `src/components/ui/select.tsx`
- StatusBadge: `src/app/_shell/_views/_shared/status-badge.tsx`
- Transition hook: `src/app/_shell/_views/_shared/transition-reason.tsx`
- Entity mutations: `src/app/_shell/_views/_shared/use-entity.ts`
- CRUD router helpers: `src/server/rpc/router/helpers.ts` (lines 340-447)
- Base-UI Select docs: https://base-ui.com/react/components/select
- Base-UI Forms handbook: https://base-ui.com/react/handbook/forms
- Zod enum API: https://zod.dev/api
