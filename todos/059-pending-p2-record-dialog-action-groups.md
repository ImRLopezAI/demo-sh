---
status: pending
priority: p2
issue_id: "059"
tags: [code-review, record-dialog, dropdown-menu, actions, navigation, architecture, business-central]
dependencies: []
---

# Add Business Central-Style Action Group Dropdowns to RecordDialog

## Problem Statement

Detail/form views (RecordDialog) lack structured action menus like Business Central's "Actions", "Related", "Navigate", and "Automate" dropdowns. Currently, all actions are flat buttons in the header footer area. This doesn't scale (purchase-order-card already has 4 buttons) and provides no way to navigate to related records or access contextual utilities.

Business Central reference screenshots show:
- **Actions dropdown**: Approve, Post, Submit, Receive, Cancel, etc.
- **Related dropdown**: View Vendor/Customer, View Items, View Ledger Entries
- **Navigate dropdown**: Go to related records
- **Automate dropdown**: Workflow automations

## Findings

- `RecordDialog` at `src/app/_shell/_views/_shared/record-dialog.tsx` only has a `footer` prop (raw ReactNode)
- No `DropdownMenu` usage exists in any detail view
- `DropdownMenu` component at `src/components/ui/dropdown-menu.tsx` is fully built but unused in views
- Purchase Order card already has 4+ buttons in footer (Receive Remaining, Create Invoice, Cancel, Save)
- No way to navigate from a Purchase Order to its Vendor card, or Invoice to Customer card

## Proposed Solutions

### Solution 1: Structured `actionGroups` prop on RecordDialog (Recommended)

**Effort**: Medium | **Risk**: Low

Extend RecordDialog with a typed `actionGroups` prop:

```typescript
interface RecordDialogAction {
  label: string
  icon?: React.ReactNode
  onClick: () => void
  disabled?: boolean
  variant?: 'default' | 'destructive'
}

interface RecordDialogActionGroup {
  label: string  // "Actions", "Related", "Navigate"
  items: RecordDialogAction[]
}

// On RecordDialog:
actionGroups?: RecordDialogActionGroup[]
```

Render as DropdownMenu buttons in the header bar:
```tsx
{actionGroups?.map(group => (
  <DropdownMenu key={group.label}>
    <DropdownMenuTrigger asChild>
      <Button variant='outline' size='sm'>{group.label} <ChevronDown /></Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent>
      {group.items.map(item => (
        <DropdownMenuItem key={item.label} onClick={item.onClick} disabled={item.disabled}>
          {item.icon} {item.label}
        </DropdownMenuItem>
      ))}
    </DropdownMenuContent>
  </DropdownMenu>
))}
```

**Pros**: Backward-compatible (footer prop unchanged), composable, uses existing DropdownMenu, typed
**Cons**: Cards need to define their own action groups

### Solution 2: Render prop for toolbar area

**Effort**: Medium | **Risk**: Low

Add a `toolbar` render prop separate from `footer`:
```tsx
toolbar?: React.ReactNode  // Renders between title area and save/cancel buttons
```

Cards render DropdownMenus directly.

**Pros**: Maximum flexibility
**Cons**: No consistent structure, each card reimplements dropdown patterns

## Recommended Action

Solution 1. Pilot on `purchase-order-card.tsx` first (most actions already exist as buttons), then roll out.

## Technical Details

**Files to modify**: `src/app/_shell/_views/_shared/record-dialog.tsx`
**Files to update**: All 16 card files (incrementally)
**Existing components to use**: `src/components/ui/dropdown-menu.tsx`

## Acceptance Criteria

- [ ] RecordDialog accepts `actionGroups` prop
- [ ] Action groups render as DropdownMenu buttons in the header area
- [ ] Existing `footer` prop continues to work for Save/Cancel
- [ ] Action groups can be conditionally enabled/disabled per record state
- [ ] At least one card (purchase-order-card) migrated as pilot

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-02-27 | Created finding from code review | RecordDialog needs structured action menus; DropdownMenu component already available |
