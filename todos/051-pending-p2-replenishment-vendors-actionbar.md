---
status: pending
priority: p2
issue_id: "051"
tags: [code-review, actionbar, replenishment, vendors, master-data, bulk-actions]
dependencies: ["040"]
---

# Add ActionBar to Vendors List

## Problem Statement

The vendors list (`replenishment/vendors-list.tsx`) has no bulk actions. Vendor compliance reviews require batch blocking/unblocking of vendor accounts. The vendor entity has a `blocked` field that is a common target for bulk updates.

## Proposed Solutions

### ActionBar actions:

1. **Block Selected** -- Bulk set `blocked: true` for vendor compliance
2. **Unblock Selected** -- Bulk set `blocked: false`
3. **Export Selected** -- Export vendor records

- Effort: Small
- Risk: Low

## Technical Details

- **Affected files**:
  - MODIFY: `src/app/_shell/_views/replenishment/vendors-list.tsx`
- **RPC endpoints**: `$rpc.replenishment.vendors.update`

## Acceptance Criteria

- [ ] DataGrid has `withSelect` prop
- [ ] Block/Unblock actions with proper state checking
- [ ] Query invalidation after updates

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-27 | Created | From code review: vendor compliance batch operations |

## Resources

- Current file: `src/app/_shell/_views/replenishment/vendors-list.tsx`
