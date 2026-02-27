---
status: pending
priority: p1
issue_id: "044"
tags: [code-review, actionbar, market, sales-orders, bulk-actions]
dependencies: ["040"]
---

# Add ActionBar to Sales Orders List

## Problem Statement

The sales orders list (`market/sales-orders-list.tsx`) has no bulk actions. The backend exposes `submitForApproval`, `approveOrder`, `rejectOrder`, and `cancelWithRelease` mutations that are not surfaced for multi-select operations. Retailers managing dozens of quotes-turned-orders need batch approval and cancellation daily.

## Findings

- **RPC Explorer**: Backend has `approveOrder`, `rejectOrder`, `cancelWithRelease` (cancel and release active reservations), standard `transitionStatus`
- **TypeScript Reviewer**: Rated Tier 1. Customer-facing workflow with existing backend endpoints.

## Proposed Solutions

### ActionBar actions:

1. **Submit for Approval** -- Bulk submit DRAFT orders. Gate: only DRAFT status
2. **Approve Selected** -- Bulk approve PENDING_APPROVAL orders. Gate: only PENDING_APPROVAL
3. **Cancel Selected** -- Bulk cancel with reservation release. Gate: DRAFT or PENDING_APPROVAL
4. **Export Selected** -- Export selected rows

- Effort: Medium
- Risk: Low -- all mutations exist

## Technical Details

- **Affected files**:
  - MODIFY: `src/app/_shell/_views/market/sales-orders-list.tsx`
  - USES: `src/app/_shell/_views/_shared/resolve-selected-ids.ts` (from todo 040)
- **RPC endpoints**: `$rpc.market.salesHeaders.approveOrder`, `$rpc.market.salesHeaders.rejectOrder`, `$rpc.market.salesHeaders.cancelWithRelease`, `$rpc.market.salesHeaders.transitionStatus`

## Acceptance Criteria

- [ ] DataGrid has `withSelect` prop
- [ ] ActionBar with selection count
- [ ] "Submit for Approval" transitions DRAFT -> PENDING_APPROVAL
- [ ] "Approve Selected" transitions PENDING_APPROVAL -> APPROVED
- [ ] "Cancel Selected" cancels and releases reservations
- [ ] Status-aware button disabling
- [ ] Query invalidation for salesHeaders, salesLines after actions

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-27 | Created | From code review: customer-facing workflow |

## Resources

- Current file: `src/app/_shell/_views/market/sales-orders-list.tsx`
- Backend router: `src/server/rpc/router/uplink/market.router.ts`
