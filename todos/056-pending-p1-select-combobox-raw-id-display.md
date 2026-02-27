---
status: pending
priority: p1
issue_id: "056"
tags: [code-review, select, combobox, form, foreign-key, base-ui, ux-bug]
dependencies: []
---

# Fix Select/Combobox Displaying Raw IDs Instead of Entity Names

## Problem Statement

Across nearly all detail/form cards, `Form.Select` and `Form.Combo` fields that reference foreign entities (vendorId, customerId, itemId, etc.) display raw Convex `_id` strings like `dl3v9cak8r20hnbcv1whev9i` instead of human-readable names. This is a user-facing bug visible on every entity form in the system. Even after selecting an item from the dropdown, the display reverts to the raw ID when the popup closes.

## Findings

### Root Cause (confirmed via @base-ui/react source analysis)

`@base-ui/react` Select uses a Portal for items. When the popup is closed, items unmount and their labels are removed from the internal `valuesRef`. `SelectValue` then falls back to `stringifyAsLabel(value)` which returns the raw value string.

`@base-ui/react` provides an **`items` prop** on `<Select.Root>` specifically for this scenario (`node_modules/@base-ui/react/select/root/SelectRoot.d.ts` lines 87-102):

```typescript
items?: Record<string, React.ReactNode> | ReadonlyArray<{
  label: React.ReactNode;
  value: any;
}>;
```

Documentation states: "When specified, `<Select.Value>` renders the label of the selected item instead of the raw value."

Additionally, `<Select.Value>` accepts a `children` render function (`(value: any) => React.ReactNode`) as an alternative.

**Neither mechanism is used anywhere in the codebase.**

### Affected Files (Form Select FK fields)

| Card File | FK Field | Component |
|-----------|----------|-----------|
| `replenishment/components/purchase-order-card.tsx` | `vendorId` (line 539) | Form.Select |
| `market/components/sales-order-card.tsx` | `customerId` (line 511) | Form.Select |
| `ledger/components/invoice-card.tsx` | `customerId` (line 506) | Form.Combo |
| `trace/components/shipment-card.tsx` | `shipmentMethodCode` (line 350) | Form.Combo |
| `replenishment/components/transfer-card.tsx` | `fromLocationCode` / `toLocationCode` (lines 352, 389) | Form.Combo |
| `pos/components/session-card.tsx` | `terminalId` (line 141) | Form.Combo |

### Affected Files (DataGrid select cells in line grids)

| Card File | Column | Grid |
|-----------|--------|------|
| `replenishment/components/purchase-order-card.tsx` | `itemId` (line 638) | Purchase Lines |
| `market/components/sales-order-card.tsx` | `itemId` (line 604) | Order Lines |
| `ledger/components/invoice-card.tsx` | `itemId` (line 642) | Invoice Lines |
| `replenishment/components/transfer-card.tsx` | `itemId` (line 469) | Transfer Lines |

## Proposed Solutions

### Solution 1: Add `items` prop to Select roots (Recommended)

**Effort**: Small | **Risk**: Very Low

Create a shared utility and add the `items` prop to all Form.Select usages:

```typescript
// src/lib/select-items.ts
export function toSelectItemsMap<T extends { _id: string }>(
  items: T[],
  getLabel: (item: T) => string,
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const item of items) {
    map[item._id] = getLabel(item);
  }
  return map;
}
```

Usage in cards:
```tsx
const vendorItemsMap = React.useMemo(
  () => toSelectItemsMap(vendorOptions, (v) =>
    `${v.name ?? 'Unnamed'}${v.vendorNo ? ` (${v.vendorNo})` : ''}`
  ),
  [vendorOptions],
);

<Form.Select value={field.value} onValueChange={field.onChange} items={vendorItemsMap}>
  {/* trigger and content unchanged */}
</Form.Select>
```

**Pros**: Uses library's built-in mechanism, zero custom components, minimal diff per file
**Cons**: Need to add `items` prop to each Select instance

### Solution 2: Use `children` render function on SelectValue

**Effort**: Small | **Risk**: Low

```tsx
<Form.Select.Value placeholder='Select vendor'>
  {(value: string | null) => {
    if (!value) return null;
    const vendor = vendorOptions.find(v => v._id === value);
    return vendor ? `${vendor.name} (${vendor.vendorNo})` : value;
  }}
</Form.Select.Value>
```

**Pros**: Explicit control, no new props on Select root
**Cons**: Linear scan per render (negligible for <100 items), render function parameter typed as `any`

### Solution 3: For Combobox - use `getOptionLabel` or wrapper

The Combobox input shows the raw value. The fix is to provide a custom `getOptionLabel` or resolve the label in the input display. Need to investigate `@base-ui/react` Combobox API for equivalent of `items` prop.

## Recommended Action

Implement Solution 1 for Select fields + investigate Combobox API for equivalent mechanism.

## Technical Details

**Affected files**: 6 card files (Select/Combo), 4 card files (DataGrid), 1 shared component (select-cell.tsx)
**Components**: `src/components/ui/select.tsx`, `src/components/ui/form.tsx`
**New file**: `src/lib/select-items.ts`

## Acceptance Criteria

- [ ] Vendor field on Purchase Order card shows vendor name, not `_id`
- [ ] Customer field on Sales Order card shows customer name, not `_id`
- [ ] Customer field on Invoice card shows customer name, not `_id`
- [ ] All other FK Select/Combo fields show entity names
- [ ] DataGrid select cells in line grids show item descriptions
- [ ] Labels persist after closing and reopening the dropdown
- [ ] New records with blank FK show placeholder text
- [ ] `toSelectItemsMap` utility created and used consistently

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-02-27 | Created finding from code review | Root cause: `@base-ui/react` `items` prop not used; Portal unmounts items on close |

## Resources

- `@base-ui/react` Select.Root `items` prop: `node_modules/@base-ui/react/select/root/SelectRoot.d.ts:87-102`
- `@base-ui/react` Select.Value `children` render: `node_modules/@base-ui/react/select/value/SelectValue.d.ts:24-26`
- `resolveSelectedLabel` source: `node_modules/@base-ui/react/utils/resolveValueLabel.js:68-106`
