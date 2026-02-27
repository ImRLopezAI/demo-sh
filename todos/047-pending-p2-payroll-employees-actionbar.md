---
status: pending
priority: p2
issue_id: "047"
tags: [code-review, actionbar, payroll, employees, bulk-actions]
dependencies: ["040"]
---

# Add ActionBar to Employees List

## Problem Statement

The employees list (`payroll/employees-list.tsx`) has no bulk actions. HR operations like seasonal leave management, department-wide status changes, and pay frequency updates require batch processing. The employee model has `status: 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED'` and `payFrequency` fields that are common targets for bulk updates.

## Findings

- **RPC Explorer**: Backend has standard `transitionStatus` for employee status lifecycle
- **TypeScript Reviewer**: Rated Tier 1. Seasonal operations require bulk status changes.

## Proposed Solutions

### ActionBar actions:

1. **Set On Leave** -- Bulk transition ACTIVE employees to ON_LEAVE. Gate: only ACTIVE status
2. **Set Active** -- Bulk transition ON_LEAVE employees back to ACTIVE. Gate: only ON_LEAVE
3. **Terminate Selected** -- Bulk transition to TERMINATED with confirmation. Gate: ACTIVE or ON_LEAVE
4. **Export Selected** -- Export selected employee records

- Effort: Small-Medium
- Risk: Low

## Technical Details

- **Affected files**:
  - MODIFY: `src/app/_shell/_views/payroll/employees-list.tsx`
- **RPC endpoints**: `$rpc.payroll.employees.transitionStatus`

## Acceptance Criteria

- [ ] DataGrid has `withSelect` prop
- [ ] Status transition actions with proper gating
- [ ] Confirmation dialog for "Terminate Selected" (destructive action)
- [ ] Query invalidation after transitions

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-27 | Created | From code review: HR batch operations |

## Resources

- Current file: `src/app/_shell/_views/payroll/employees-list.tsx`
- Backend router: `src/server/rpc/router/uplink/payroll.router.ts`
