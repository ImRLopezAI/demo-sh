---
status: pending
priority: p2
issue_id: "053"
tags: [code-review, actionbar, payroll, journal, selective-posting, bulk-actions]
dependencies: ["040"]
---

# Add ActionBar to Payroll Journal

## Problem Statement

The payroll journal (`payroll/payroll-journal.tsx`) has "Run Current Payroll" and "Mark Latest Run Paid" buttons but no selective line-level actions. Like the flow payment journal, selective approval and voiding of individual journal lines would prevent posting incorrect entries.

## Proposed Solutions

### ActionBar actions:

1. **Approve Selected** -- Bulk transition OPEN lines to APPROVED
2. **Void Selected** -- Bulk transition incorrect entries to VOIDED
3. **Export Selected** -- Export selected journal lines

- Effort: Small-Medium
- Risk: Low

## Technical Details

- **Affected files**:
  - MODIFY: `src/app/_shell/_views/payroll/payroll-journal.tsx`
- **RPC endpoints**: `$rpc.payroll.journalLines.transitionStatus`

## Acceptance Criteria

- [ ] DataGrid has `withSelect` prop
- [ ] Approve and Void actions with status gating
- [ ] Coexists with existing "Run Current Payroll" button

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-27 | Created | From code review: selective journal line management |

## Resources

- Current file: `src/app/_shell/_views/payroll/payroll-journal.tsx`
- Backend router: `src/server/rpc/router/uplink/payroll.router.ts`
