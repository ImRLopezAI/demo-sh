---
status: pending
priority: p3
issue_id: "054"
tags: [code-review, actionbar, ledger-views, read-only, export, bulk-actions]
dependencies: ["040"]
---

# Add Export-Only ActionBar to Read-Only Ledger Views

## Problem Statement

10 read-only ledger/journal views have no ActionBar. While these are immutable audit records that should NOT have mutation actions, users need to select and export subsets of ledger data for audit, compliance, and reconciliation purposes.

## Affected Views (10 total)

- `ledger/customer-ledger-list.tsx` -- Customer receivable entries
- `ledger/gl-entries-list.tsx` -- General ledger postings
- `flow/bank-ledger-list.tsx` -- Bank account ledger entries
- `flow/gl-entries-list.tsx` -- Flow G/L entries
- `insight/item-ledger-list.tsx` -- Inventory movement log
- `insight/value-entries-list.tsx` -- Cost/sales value entries
- `payroll/employee-ledger-list.tsx` -- Employee compensation entries
- `payroll/gl-entries-list.tsx` -- Payroll G/L postings
- `payroll/bank-ledger-list.tsx` -- Payroll bank entries

## Proposed Solutions

### ActionBar actions (same for all):
1. **Export Selected** -- Export selected rows to CSV/Excel for audit purposes
2. **Copy to Clipboard** -- Copy selected entries for pasting into reconciliation tools

**IMPORTANT**: NO mutation actions. These are immutable records. Adding bulk delete, update, or status transition actions would be a compliance anti-pattern.

- Effort: Small (10 views, identical pattern)
- Risk: None

## Acceptance Criteria

- [ ] All 10 views have `withSelect` prop
- [ ] ActionBar with selection count and export-only actions
- [ ] NO mutation actions on any of these views
- [ ] Export respects current filter/sort state

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-27 | Created | From code review: read-only export capability |

## Resources

- Pattern: Minimal ActionBar with Selection + Export only
- All 10 files listed in affected views above
