---
status: pending
priority: p2
issue_id: "049"
tags: [code-review, actionbar, market, carts, bulk-actions]
dependencies: ["040"]
---

# Add ActionBar to Carts List

## Problem Statement

The carts list (`market/carts-list.tsx`) has per-row "Checkout" buttons which are tedious when processing a backlog of open carts. A bulk ActionBar would allow managers to convert multiple OPEN carts to orders simultaneously and abandon stale carts.

## Findings

- **RPC Explorer**: Backend has `checkout` mutation for cart -> sales order conversion
- **TypeScript Reviewer**: Rated Tier 1. Replaces per-row pattern with efficient bulk processing.

## Proposed Solutions

### ActionBar actions:

1. **Bulk Checkout** -- Convert multiple OPEN carts to orders simultaneously. Gate: only OPEN status
2. **Abandon Selected** -- Mark stale carts as abandoned to clean up. Gate: only OPEN status

- Effort: Small
- Risk: Low -- checkout mutation already exists

## Technical Details

- **Affected files**:
  - MODIFY: `src/app/_shell/_views/market/carts-list.tsx`
- **RPC endpoints**: `$rpc.market.carts.checkout`

## Acceptance Criteria

- [ ] DataGrid has `withSelect` prop
- [ ] "Bulk Checkout" converts all selected OPEN carts
- [ ] "Abandon Selected" marks stale carts as abandoned
- [ ] Per-row checkout buttons can coexist with bulk ActionBar

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-27 | Created | From code review: replaces per-row pattern |

## Resources

- Current file: `src/app/_shell/_views/market/carts-list.tsx`
- Backend router: `src/server/rpc/router/uplink/market.router.ts`
