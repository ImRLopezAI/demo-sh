---
status: pending
priority: p1
issue_id: "041"
tags: [code-review, actionbar, replenishment, purchase-orders, bulk-actions]
dependencies: ["040"]
---

# Add ActionBar to Purchase Orders List

## Problem Statement

The purchase orders list (`replenishment/purchase-orders-list.tsx`) has no bulk actions. Procurement workflows are inherently batch-oriented -- managers approve, receive, and cancel POs in batches daily. The backend already exposes `transitionStatus`, `receive`, and `postInvoice` mutations but none are surfaced for multi-select operations.

This was identified as the **highest-value ActionBar** across the entire codebase by all review agents.

## Findings

- **RPC Explorer**: Backend has `receive` (receive PO quantities), `postInvoice` (create purchase invoice from received-not-invoiced PO quantities), plus standard `transitionStatus` with DRAFT -> PENDING_APPROVAL -> APPROVED -> REJECTED -> COMPLETED -> CANCELED
- **TypeScript Reviewer**: Rated as Tier 1 priority. Procurement is batch-native.
- **Architecture Strategist**: Confirmed status transitions are fully supported in the CRUD router

## Proposed Solutions

### ActionBar actions:

1. **Approve Selected** -- Bulk transition PENDING_APPROVAL -> APPROVED. Gate: only enabled when all selected have status PENDING_APPROVAL
2. **Receive Selected** -- Bulk invoke `receive` mutation on APPROVED orders. Gate: only enabled for APPROVED status
3. **Cancel Selected** -- Bulk transition to CANCELED. Gate: only enabled for DRAFT or PENDING_APPROVAL status
4. **Export Selected** -- Export selected rows

- Effort: Medium
- Risk: Low -- all mutations already exist on the backend

## Technical Details

- **Affected files**:
  - MODIFY: `src/app/_shell/_views/replenishment/purchase-orders-list.tsx`
  - USES: `src/app/_shell/_views/_shared/resolve-selected-ids.ts` (from todo 040)
- **RPC endpoints**: `$rpc.replenishment.purchaseOrders.transitionStatus`, `$rpc.replenishment.purchaseOrders.receive`

## Acceptance Criteria

- [ ] DataGrid has `withSelect` prop
- [ ] ActionBar appears when rows are selected
- [ ] "Approve Selected" transitions PENDING_APPROVAL orders to APPROVED
- [ ] "Receive Selected" invokes receive mutation on APPROVED orders
- [ ] "Cancel Selected" transitions DRAFT/PENDING_APPROVAL orders to CANCELED
- [ ] Buttons are disabled when selection doesn't match required status
- [ ] Query invalidation after each bulk action
- [ ] Selection count displayed in ActionBar

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-27 | Created | From code review: highest-value ActionBar |

## Resources

- Current file: `src/app/_shell/_views/replenishment/purchase-orders-list.tsx`
- Backend router: `src/server/rpc/router/uplink/replenishment.router.ts`
- Pattern reference: `src/app/_shell/_views/hub/notifications-list.tsx` lines 867-917
