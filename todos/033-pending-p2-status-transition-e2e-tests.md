---
status: pending
priority: p2
issue_id: "033"
tags: [code-review, testing, e2e, status-transitions, shared-components]
dependencies: ["027"]
---

# Add Status Transition and Transition-Reason Dialog E2E Tests

The `useTransitionWithReason` hook is used by 10+ entity types across 7 modules. A regression in this shared component would silently disable mandatory reason capture across the entire platform. Zero browser tests exist for status transitions.

## Problem Statement

Status transitions are a core interaction pattern across the platform. The shared `useTransitionWithReason` hook (`src/app/_shell/_views/_shared/transition-reason.tsx`) enforces mandatory reason capture via `REASON_REQUIRED_STATUSES`. The existing E2E tests only cover document creation (sales order, purchase order) — none test status lifecycle transitions, the reason dialog, or validation.

## Findings

- `src/app/_shell/_views/_shared/transition-reason.tsx` is shared across 7+ modules
- Status dropdowns show all valid transitions for any role (no filtering)
- Mandatory reason capture for sensitive transitions is enforced only in this shared hook
- Sales order lifecycle (DRAFT→PENDING_APPROVAL→APPROVED→RELEASED) untested in browser
- Shipment lifecycle (PLANNED→DISPATCHED→IN_TRANSIT→DELIVERED) untested in browser
- Invoice lifecycle (DRAFT→POSTED) covered only at API level
- Transition reason dialog validation (empty reason when required) untested

## Proposed Solutions

### Option 1: Test the shared transition-reason component + 3 key entities (recommended)

**Approach:** Write dedicated E2E tests for the transition-reason dialog pattern, then test status lifecycles for sales orders, invoices, and shipments as representative entities.

**Effort:** Medium (2-3 days)
**Risk:** Low

## Technical Details

**Affected files:**
- `test/e2e/market/market-sales-order-lifecycle.spec.ts` — new
- `test/e2e/trace/trace-shipment-lifecycle.spec.ts` — new
- `test/e2e/shared/transition-reason-dialog.spec.ts` — new

**Key test scenarios:**
1. Open transition reason dialog for reason-required status change
2. Submit empty reason — verify validation error
3. Submit valid reason — verify transition completes
4. Sales order full lifecycle: DRAFT → PENDING_APPROVAL → APPROVED → RELEASED
5. Shipment full lifecycle: PLANNED → DISPATCHED → IN_TRANSIT → DELIVERED
6. Cancel with release triggers `cancelWithRelease` mutation

## Acceptance Criteria

- [ ] Transition reason dialog tested for required and optional reason scenarios
- [ ] Sales order full status lifecycle tested in browser
- [ ] Shipment full status lifecycle tested in browser
- [ ] Empty reason validation prevents submission

## Work Log

### 2026-02-27 - Initial Discovery

**By:** Code Review

**Actions:**
- Identified `useTransitionWithReason` as critical shared component with 0 browser tests
- TypeScript reviewer flagged status transitions as highest-risk untested pattern after financial posting

## Resources

- `src/app/_shell/_views/_shared/transition-reason.tsx`
- `src/app/_shell/_views/market/components/sales-order-card.tsx`
- `src/app/_shell/_views/trace/components/shipment-card.tsx`
