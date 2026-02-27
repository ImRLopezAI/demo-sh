---
status: pending
priority: p1
issue_id: "043"
tags: [code-review, actionbar, trace, shipments, logistics, bulk-actions]
dependencies: ["040"]
---

# Add ActionBar to Shipments List

## Problem Statement

The shipments list (`trace/shipments-list.tsx`) has no bulk actions. Shipment lifecycle management (dispatch, label purchasing, priority escalation) requires batch operations. The backend exposes `transitionWithNotification` (status transitions with customer notification triggers) and `purchaseLabel` mutations.

## Findings

- **RPC Explorer**: Backend has `transitionWithNotification` (PLANNED -> DISPATCHED -> IN_TRANSIT -> DELIVERED), `purchaseLabel` (purchase shipping label), `quoteRate` (get carrier rate quote)
- **TypeScript Reviewer**: Rated Tier 1. Clear lifecycle workflow with existing backend support.

## Proposed Solutions

### ActionBar actions:

1. **Dispatch Selected** -- Bulk transition PLANNED shipments to DISPATCHED with notification. Gate: only PLANNED status
2. **Purchase Labels** -- Bulk invoke `purchaseLabel` for selected shipments that need labels
3. **Escalate Priority** -- Bulk upgrade priority (e.g., NORMAL -> HIGH) on overdue shipments
4. **Export Selected** -- Export selected rows

- Effort: Medium
- Risk: Low -- mutations exist and handle notifications

## Technical Details

- **Affected files**:
  - MODIFY: `src/app/_shell/_views/trace/shipments-list.tsx`
  - USES: `src/app/_shell/_views/_shared/resolve-selected-ids.ts` (from todo 040)
- **RPC endpoints**: `$rpc.trace.shipments.transitionWithNotification`, `$rpc.trace.carrierOps.purchaseLabel`

## Acceptance Criteria

- [ ] DataGrid has `withSelect` prop
- [ ] "Dispatch Selected" transitions PLANNED shipments and emits notification triggers
- [ ] "Purchase Labels" invokes label purchasing for selected shipments
- [ ] Status-aware button disabling
- [ ] Query invalidation after actions

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-27 | Created | From code review: logistics workflow batch operation |

## Resources

- Current file: `src/app/_shell/_views/trace/shipments-list.tsx`
- Backend router: `src/server/rpc/router/uplink/trace.router.ts`
