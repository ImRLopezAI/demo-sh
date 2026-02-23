---
status: pending
priority: p2
issue_id: "017"
tags: [code-review, typescript, dry, components, react]
dependencies: []
---

# Extract StatusTransitionSelect Shared Component

## Problem Statement

~48 lines of boilerplate are repeated across 8 card components for status transition handling:
- `handleTransition` callback
- `useTransitionWithReason` hook setup
- `statusOptions` via `getLabeledTransitions()`
- `Form.Select` JSX with current status + allowed transitions
- `{reasonDialog}` in return

This totals ~360 lines of duplicated code across the codebase.

## Findings

- **TypeScript reviewer**: "MEDIUM: Extract StatusTransitionSelect component"
- **Simplicity reviewer**: "~48 lines of boilerplate repeated across 8 card components — extract StatusTransitionSelect would save ~360 LOC"

## Proposed Solutions

### Solution A: Extract StatusTransitionSelect compound component (Recommended)
- Create `src/app/_shell/_views/_shared/status-transition-select.tsx`
- Component accepts: moduleId, entityId, recordId, currentStatus, transitions map, labels map, isNew, disabled
- Encapsulates: useTransitionWithReason, getLabeledTransitions, Form.Select, reasonDialog
- Each card passes entity-specific constants and gets a complete status select
- **Pros**: ~360 LOC savings, single place to fix bugs, consistent UX
- **Cons**: Additional abstraction layer
- **Effort**: Medium
- **Risk**: Low

### Solution B: Extract just the hook logic (partial)
- Create a combined hook that merges getLabeledTransitions + useTransitionWithReason
- Keep JSX in each card
- **Pros**: Less abstraction, cards keep JSX control
- **Cons**: Only ~50% LOC savings, JSX still duplicated
- **Effort**: Small
- **Risk**: Low

## Recommended Action

Solution A — full component extraction

## Technical Details

**New file:**
- `src/app/_shell/_views/_shared/status-transition-select.tsx`

**Affected files (consumers):**
- `src/app/_shell/_views/market/components/sales-order-card.tsx`
- `src/app/_shell/_views/replenishment/components/purchase-order-card.tsx`
- `src/app/_shell/_views/replenishment/components/transfer-card.tsx`
- `src/app/_shell/_views/ledger/components/invoice-card.tsx`
- `src/app/_shell/_views/trace/components/shipment-card.tsx`
- `src/app/_shell/_views/payroll/components/employee-card.tsx`
- `src/app/_shell/_views/hub/components/task-card.tsx`
- `src/app/_shell/_views/flow/components/bank-account-card.tsx`
- `src/app/_shell/_views/pos/components/terminal-card.tsx`

## Acceptance Criteria

- [ ] New StatusTransitionSelect component created
- [ ] All 9 card components refactored to use new component
- [ ] No behavior changes — transitions work identically
- [ ] Reason dialog still appears for reason-required statuses
- [ ] TypeScript types are correctly inferred

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-02-23 | Created from code review | Both reviewers flagged independently |

## Resources

- PR #1: https://github.com/ImRLopezAI/demo-sh/pull/1
