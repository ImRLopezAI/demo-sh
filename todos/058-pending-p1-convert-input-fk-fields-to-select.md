---
status: pending
priority: p1
issue_id: "058"
tags: [code-review, form, foreign-key, input, select, combobox, ux-bug]
dependencies: ["056"]
---

# Convert Plain Input FK Fields to Select/Combobox

## Problem Statement

Several card forms use plain `Form.Input` fields for foreign key references that should use `Form.Select` or `Form.Combo` with entity lookups. These fields display raw IDs with no way for users to search or select from available records.

## Findings

| Card File | FK Field | Current | Should Be | Entity Source |
|-----------|----------|---------|-----------|---------------|
| `hub/components/task-card.tsx` | `assigneeUserId` | Form.Input | Form.Combo | Users list |
| `payroll/components/employee-card.tsx` | `bankAccountId` | Form.Input | Form.Combo | Bank accounts |
| `pos/components/terminal-card.tsx` | `locationCode` | Form.Input | Form.Combo | Locations |
| `pos/components/session-card.tsx` | `cashierId` | Form.Input (readonly) | Form.Combo or resolved display | Employees |
| `pos/components/transaction-card.tsx` | `customerId` | Form.Input (readonly) | Resolved display | Customers |
| `trace/components/shipment-card.tsx` | `itemId` in lines grid | Plain text column | DataGrid select cell | Items |

### Notes
- `session-card.tsx` `cashierId` is readonly - should at minimum display the employee name
- `transaction-card.tsx` `customerId` is readonly - should display customer name
- `terminal-card.tsx` `locationCode` should use the same Combobox pattern as `transfer-card.tsx` (which correctly uses locations list)
- `shipment-card.tsx` lines grid has `itemId` as a plain text column with no select options

## Proposed Solutions

### Solution: Replace Input with Combo/Select using `useModuleList`

**Effort**: Medium | **Risk**: Low

For editable fields, replace `Form.Input` with `Form.Combo`:
```tsx
const { data: locationsList } = useModuleList('insight', 'locations', { limit: 100 })

<Form.Combo value={field.value} onValueChange={field.onChange}>
  <Form.Combo.Input showClear placeholder='Search locations...' />
  <Form.Combo.Content>
    <Form.Combo.List>
      {(locationsList?.items ?? []).map(l => (
        <Form.Combo.Item key={l._id} value={l.code}>{l.code} - {l.name}</Form.Combo.Item>
      ))}
    </Form.Combo.List>
  </Form.Combo.Content>
</Form.Combo>
```

For readonly fields, resolve the name from the fetched list:
```tsx
const customerName = customersList?.items?.find(c => c._id === field.value)?.name ?? field.value
<Form.Input value={customerName} readOnly />
```

## Acceptance Criteria

- [ ] `task-card.tsx` assigneeUserId uses Combobox with user list
- [ ] `employee-card.tsx` bankAccountId uses Combobox with bank accounts
- [ ] `terminal-card.tsx` locationCode uses Combobox with locations (same pattern as transfer-card)
- [ ] `session-card.tsx` cashierId displays employee name (readonly)
- [ ] `transaction-card.tsx` customerId displays customer name (readonly)
- [ ] `shipment-card.tsx` lines grid itemId uses DataGrid select cell with item options
- [ ] All new Combobox fields use `items` prop or render function from #056

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-02-27 | Created finding from code review | 6 FK fields use plain Input instead of Select/Combobox |
