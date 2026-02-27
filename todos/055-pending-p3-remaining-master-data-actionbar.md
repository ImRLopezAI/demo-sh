---
status: pending
priority: p3
issue_id: "055"
tags: [code-review, actionbar, master-data, low-volume, bulk-actions]
dependencies: ["040"]
---

# Add ActionBar to Remaining Low-Volume Master Data Views

## Problem Statement

A few master data views have small record counts where bulk actions have marginal value but would maintain consistency across the platform.

## Affected Views

- `insight/locations-list.tsx` -- Warehouse/store/DC locations (small dataset)
  - Actions: Activate/Deactivate selected locations
- `pos/terminals-list.tsx` -- POS terminal hardware records (small dataset)
  - Actions: Set Maintenance Mode, Set Online/Offline
- `trace/shipment-methods-list.tsx` -- Carrier method reference data (very small dataset)
  - Actions: Activate/Deactivate selected methods
- `flow/bank-accounts-list.tsx` -- Bank account records (small dataset)
  - Actions: Block/Unblock selected accounts

## Proposed Solutions

Add minimal ActionBars with activate/deactivate or block/unblock toggle actions. These are low-priority because the record counts are typically <50 and per-record editing is adequate.

- Effort: Small (4 views, simple toggle actions)
- Risk: None

## Acceptance Criteria

- [ ] All 4 views have `withSelect` and ActionBar
- [ ] Status/active toggle actions
- [ ] Consistent with other ActionBar patterns in the codebase

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-27 | Created | From code review: consistency across all views |

## Resources

- Files: locations-list.tsx, terminals-list.tsx, shipment-methods-list.tsx, bank-accounts-list.tsx
