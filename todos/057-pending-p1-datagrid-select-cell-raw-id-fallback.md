---
status: pending
priority: p1
issue_id: "057"
tags: [code-review, data-grid, select-cell, foreign-key, ux-bug]
dependencies: ["056"]
---

# Fix DataGrid SelectCell Raw ID Fallback Display

## Problem Statement

The DataGrid `SelectCell` component at `src/components/data-grid/cells/select-cell.tsx` falls back to displaying the raw entity ID when options haven't loaded or no match is found (line 82-83). This causes item columns in purchase order lines, sales order lines, invoice lines, and transfer lines to display raw Convex `_id` strings like `utoh2chjc9xu5ocksmx4ta6z` instead of item descriptions.

Additionally, when the cell enters edit mode, the `<Select>` root does not pass the `items` prop, so the same Portal unmount issue from #056 applies.

## Findings

- **Line 82-83** fallback: `options.find((opt) => opt.value === value)?.label ?? value` — shows raw value when options array is empty (loading state) or value doesn't match
- **Line 107** edit mode: `<Select>` root has no `items` prop — same Portal issue as form selects
- Options are passed via column metadata (`cell.column.columnDef.meta?.cell.options`)
- Grid reconstructs when options change (via `useGrid` deps), but there may be a render cycle gap

## Proposed Solutions

### Solution 1: Add `items` prop to edit-mode Select + improve fallback (Recommended)

**Effort**: Small | **Risk**: Very Low

```tsx
// Line 107-114, add items prop:
<Select
  value={value}
  onValueChange={...}
  open={isEditing}
  onOpenChange={onOpenChange}
  items={options.reduce<Record<string, string>>((acc, opt) => {
    acc[opt.value] = opt.label;
    return acc;
  }, {})}
>

// Line 82-83, show empty string during loading:
const displayLabel =
  options.find((opt) => opt.value === value)?.label ??
  (options.length === 0 ? '' : value)
```

**Pros**: Fixes both display and edit modes, minimal change
**Cons**: None significant

## Acceptance Criteria

- [ ] Item columns in Purchase Order lines show `"ITEM001 - Widget"` not `_id`
- [ ] Item columns in Sales Order lines show descriptions
- [ ] Item columns in Invoice lines show descriptions
- [ ] Item columns in Transfer lines show descriptions
- [ ] Empty string shown during options loading (not raw ID)
- [ ] Edit mode Select shows correct label in trigger

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-02-27 | Created finding from code review | SelectCell has correct resolution logic but needs items prop for edit mode |
