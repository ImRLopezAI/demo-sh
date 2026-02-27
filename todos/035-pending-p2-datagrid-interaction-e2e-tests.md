---
status: pending
priority: p2
issue_id: "035"
tags: [code-review, testing, e2e, datagrid, shared-components]
dependencies: ["027"]
---

# Add DataGrid Shared Interaction E2E Tests

17 list views across all 9 modules use the DataGrid component with filter, sort, search, and export. None of these toolbar interactions are tested in any browser context.

## Problem Statement

Every list view uses the `useModuleData` → `DataGrid` composition with `<DataGrid.Toolbar filter sort search export />`. Filter, sort, search, and export are foundational data exploration tools. A CSS regression or broken event handler means users cannot find records. Zero browser tests exist for any DataGrid interaction.

## Findings

- 17 list views use DataGrid across all 9 modules
- DataGrid toolbar provides filter, sort, search, export — all untested
- Export generates CSV/JSON/Excel files client-side — no download verification
- Infinite scroll with `fetchNextPage`/`hasNextPage` — no scroll test
- Column inference runs O(rows × columns) on every data change
- Row selection + bulk actions pattern used but only tested for hub notifications

## Proposed Solutions

### Option 1: Representative DataGrid test on one list view (recommended)

**Approach:** Write a comprehensive DataGrid interaction test on `market/sales-orders` (the most feature-rich list view). Cover: search, filter by column, sort ascending/descending, export CSV, infinite scroll pagination, row selection.

**Effort:** Small (1-2 days)
**Risk:** Low

## Technical Details

**Affected files:**
- `test/e2e/shared/datagrid-interactions.spec.ts` — new (using market/sales-orders as test surface)

## Acceptance Criteria

- [ ] DataGrid search filters visible rows
- [ ] Column sort toggles ascending/descending
- [ ] Filter by column value narrows results
- [ ] Export CSV downloads a file
- [ ] Infinite scroll loads next page on scroll to bottom
- [ ] Row selection checkbox works and updates selected count

## Work Log

### 2026-02-27 - Initial Discovery

**By:** Code Review

**Actions:**
- Performance reviewer identified DataGrid as highest-impact shared component with zero interaction tests
- Architecture reviewer recommended one representative test vs 17 duplicate tests

## Resources

- `src/components/data-grid/data-grid.tsx`
- `src/components/data-grid/compound/index.tsx`
- `src/app/_shell/hooks/use-data.ts`
