---
status: pending
priority: p1
issue_id: "045"
tags: [code-review, actionbar, replenishment, transfers, warehouse, bulk-actions]
dependencies: ["040"]
---

# Add ActionBar to Transfers List

## Problem Statement

The transfers list (`replenishment/transfers-list.tsx`) has no bulk actions. Warehouse operations are inherently batch -- managers release transfer batches for the day, mark shipments in transit, and confirm receipts in bulk. The transfer lifecycle (DRAFT -> RELEASED -> IN_TRANSIT -> RECEIVED -> CANCELED) maps directly to bulk ActionBar operations.

## Findings

- **TypeScript Reviewer**: Rated Tier 1. Direct state machine transitions. Transfer lifecycle benefits from bulk operations.
- **Architecture Strategist**: Confirmed `transitionStatus` available for all transfer status transitions.

## Proposed Solutions

### ActionBar actions:

1. **Release Selected** -- Bulk transition DRAFT transfers to RELEASED. Gate: only DRAFT status
2. **Mark In Transit** -- Bulk transition RELEASED transfers to IN_TRANSIT. Gate: only RELEASED
3. **Confirm Receipt** -- Bulk transition IN_TRANSIT transfers to RECEIVED. Gate: only IN_TRANSIT
4. **Cancel Selected** -- Bulk transition to CANCELED. Gate: DRAFT or RELEASED

- Effort: Medium
- Risk: Low

## Technical Details

- **Affected files**:
  - MODIFY: `src/app/_shell/_views/replenishment/transfers-list.tsx`
  - USES: `src/app/_shell/_views/_shared/resolve-selected-ids.ts` (from todo 040)
- **RPC endpoints**: `$rpc.replenishment.transfers.transitionStatus`

## Acceptance Criteria

- [ ] DataGrid has `withSelect` prop
- [ ] ActionBar with lifecycle transition actions
- [ ] Each action validates selection status before enabling
- [ ] Query invalidation after transitions

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-27 | Created | From code review: warehouse operations batch workflow |

## Resources

- Current file: `src/app/_shell/_views/replenishment/transfers-list.tsx`
- Backend router: `src/server/rpc/router/uplink/replenishment.router.ts`
