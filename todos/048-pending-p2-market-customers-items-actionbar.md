---
status: pending
priority: p2
issue_id: "048"
tags: [code-review, actionbar, market, customers, items, master-data, bulk-actions]
dependencies: ["040"]
---

# Add ActionBar to Market Master Data Lists (Customers + Items)

## Problem Statement

Market's master data views (customers-list, items-list) have no bulk actions. Both entities have boolean fields (`blocked` for customers, inventory management for items) that are common targets for batch operations during compliance sweeps or catalog management.

## Findings

- **TypeScript Reviewer**: Rated Tier 2. Customers have `blocked` field for compliance; items need bulk price/status management.
- **Code Simplicity Reviewer**: Confirmed these are editable master data views that warrant ActionBar, unlike read-only ledger views.

## Proposed Solutions

### Customers List ActionBar:
1. **Block Selected** -- Bulk set `blocked: true` for compliance/credit holds
2. **Unblock Selected** -- Bulk set `blocked: false`
3. **Export Selected** -- Export customer records

### Items List ActionBar:
1. **Adjust Price** -- Bulk percentage or fixed price adjustment on selected items
2. **Discontinue** -- Bulk mark items as inactive/discontinued
3. **Export Selected** -- Export catalog data

- Effort: Medium (2 views)
- Risk: Low

## Technical Details

- **Affected files**:
  - MODIFY: `src/app/_shell/_views/market/customers-list.tsx`
  - MODIFY: `src/app/_shell/_views/market/items-list.tsx`
- **RPC endpoints**: `$rpc.market.customers.update`, `$rpc.market.items.update`

## Acceptance Criteria

- [ ] Both DataGrids have `withSelect` prop
- [ ] Customers: Block/Unblock actions with proper state checking
- [ ] Items: Price adjustment and discontinue actions
- [ ] Query invalidation after bulk updates

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-27 | Created | From code review: master data bulk management |

## Resources

- Current files: `src/app/_shell/_views/market/customers-list.tsx`, `src/app/_shell/_views/market/items-list.tsx`
- Backend router: `src/server/rpc/router/uplink/market.router.ts`
