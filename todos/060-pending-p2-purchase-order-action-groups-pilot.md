---
status: pending
priority: p2
issue_id: "060"
tags: [code-review, purchase-order, action-groups, dropdown-menu, navigation, replenishment]
dependencies: ["059"]
---

# Implement Action Groups on Purchase Order Card (Pilot)

## Problem Statement

The purchase order card currently renders "Receive Remaining" and "Create Invoice" as flat buttons in the footer alongside Cancel and Save. This should be migrated to the new action groups pattern to validate the architecture before rolling out to all cards.

## Findings

Current footer buttons (purchase-order-card.tsx lines 398-443):
- Receive Remaining (conditional: APPROVED/COMPLETED + unreceived lines)
- Create Invoice (conditional: APPROVED/COMPLETED + received-but-not-invoiced lines)
- Cancel
- Save

Missing actions (from Business Central reference):
- Navigate to Vendor card
- View Purchase Lines (scroll to section)
- View Purchase Receipts
- View Purchase Invoices
- Status transitions (Approve, Reject, Cancel) - currently only via status Select

## Proposed Solutions

### Action Groups for Purchase Order Card

```typescript
const actionGroups = React.useMemo(() => [
  {
    label: 'Actions',
    items: [
      { label: 'Receive Remaining', icon: <PackageCheck />, onClick: handleReceive, disabled: !canReceive },
      { label: 'Create Invoice', icon: <FileText />, onClick: handleCreateInvoice, disabled: !canCreateInvoice },
      { label: 'Submit for Approval', icon: <Send />, onClick: () => requestTransition('PENDING_APPROVAL'), disabled: currentStatus !== 'DRAFT' },
      { label: 'Approve', icon: <Check />, onClick: () => requestTransition('APPROVED'), disabled: currentStatus !== 'PENDING_APPROVAL' },
    ],
  },
  {
    label: 'Related',
    items: [
      { label: 'View Vendor', icon: <Building />, onClick: () => navigateToRecord('replenishment', 'vendors', header?.vendorId) },
      { label: 'Purchase Receipts', icon: <ClipboardList />, onClick: () => navigateToList('replenishment', 'purchaseReceipts', { documentNo: header?.documentNo }) },
      { label: 'Purchase Invoices', icon: <Receipt />, onClick: () => navigateToList('replenishment', 'purchaseInvoices', { purchaseOrderId: header?._id }) },
    ],
  },
], [canReceive, canCreateInvoice, currentStatus, header])
```

## Acceptance Criteria

- [ ] Purchase Order card uses action groups instead of flat footer buttons
- [ ] "Actions" dropdown with Receive, Create Invoice, Submit, Approve
- [ ] "Related" dropdown with View Vendor, Purchase Receipts, Purchase Invoices
- [ ] All actions respect conditional enable/disable logic
- [ ] Footer only contains Cancel and Save buttons
- [ ] Pattern validated and ready for rollout to other cards

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-02-27 | Created finding from code review | Purchase Order is the best pilot candidate (most existing actions) |
