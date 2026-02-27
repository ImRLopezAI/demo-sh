---
status: pending
priority: p1
issue_id: "040"
tags: [code-review, architecture, datagrid, actionbar, shared-infrastructure]
dependencies: []
---

# Extract Shared ActionBar Infrastructure

## Problem Statement

The DataGrid.ActionBar compound API is used in exactly 1 of 27 list views (hub/notifications-list.tsx). Before adding ActionBars to the other views, shared infrastructure must be extracted to avoid duplicating ~30 lines of selection-resolution logic across 15+ views.

The `resolveSelectedNotificationIds` function in `notifications-list.tsx` (lines 112-143) contains no module-specific logic but is currently inlined in that single view.

## Findings

- **TypeScript Reviewer**: Recommended extracting a generic `resolveSelectedIds<T>` utility
- **Architecture Strategist**: Confirmed the dual-resolution pattern (row selection + cell selection) is universal and must be shared
- **Code Simplicity Reviewer**: Validated that a shared utility (not an abstraction layer) is the right approach -- ~30 lines, avoids premature abstraction

## Proposed Solutions

### Option A: Shared utility function (Recommended)

Create `src/app/_shell/_views/_shared/resolve-selected-ids.ts`:

```ts
import type { Table } from '@tanstack/react-table'
import type { SelectionState } from '@/components/data-grid/types/data-grid'

export function resolveSelectedIds<TData extends { _id: string }>(
  table: Table<TData>,
  selectionState?: SelectionState,
): string[]
```

- Pros: Minimal, no abstraction overhead, type-safe
- Cons: None significant
- Effort: Small
- Risk: Low

### Option B: ActionBar preset factories

Create `src/app/_shell/_views/_shared/action-bar-presets.tsx` with factories for common actions (bulk delete, bulk transition, export selected).

- Pros: Maximum code reuse
- Cons: Premature abstraction for 8 views, adds indirection
- Effort: Medium
- Risk: Medium -- may not accommodate view-specific needs

## Recommended Action

Option A. Extract the `resolveSelectedIds` utility first. Refactor `notifications-list.tsx` to use it. Then use it in all subsequent ActionBar implementations.

## Technical Details

- **Affected files**:
  - NEW: `src/app/_shell/_views/_shared/resolve-selected-ids.ts`
  - MODIFY: `src/app/_shell/_views/hub/notifications-list.tsx` (refactor to use shared utility)
- **Components**: DataGrid compound ActionBar API
- **Database changes**: None

## Acceptance Criteria

- [ ] `resolveSelectedIds` utility created with proper TypeScript generics
- [ ] `notifications-list.tsx` refactored to import and use the shared utility
- [ ] No behavioral changes to existing notifications ActionBar
- [ ] Type-safe: works with any entity type that has `_id: string`

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-27 | Created | From code review: ActionBar infrastructure gap |

## Resources

- Existing implementation: `src/app/_shell/_views/hub/notifications-list.tsx` lines 112-143
- DataGrid ActionBar API: `src/components/data-grid/ui/action-bar.tsx`
- DataGrid compound wrapper: `src/components/data-grid/compound/index.tsx` lines 226-301
