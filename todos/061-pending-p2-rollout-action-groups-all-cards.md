---
status: pending
priority: p2
issue_id: "061"
tags: [code-review, action-groups, dropdown-menu, navigation, all-modules]
dependencies: ["059", "060"]
---

# Roll Out Action Groups to All Remaining Cards

## Problem Statement

After the Purchase Order card pilot (#060), all remaining detail cards need Business Central-style action group dropdowns for consistent UX across the platform.

## Findings

### Cards requiring action groups (by priority):

**High priority** (have existing actions to migrate + rich navigation):
1. `sales-order-card.tsx` - Actions: Submit for Approval, Cancel with Release | Related: View Customer, Sales Lines, Shipments
2. `invoice-card.tsx` - Actions: Post Invoice, Submit E-Invoice | Related: View Customer, GL Entries, Customer Ledger
3. `shipment-card.tsx` - Actions: Dispatch, Mark In Transit, Deliver | Related: View Source Order, Tracking Events
4. `transfer-card.tsx` - Actions: Status transitions | Related: View From Location, To Location, Transfer Lines

**Medium priority** (simpler actions, still need navigation):
5. `session-card.tsx` - Related: View Terminal, Cashier, Transactions
6. `terminal-card.tsx` - Related: View Location, Sessions
7. `employee-card.tsx` - Related: View Bank Account, Payroll Entries, Ledger Entries
8. `bank-account-card.tsx` - Related: View Ledger Entries, Reconciliation

**Lower priority** (master data, fewer actions):
9. `customer-card.tsx` - Related: View Orders, Invoices, Ledger Entries
10. `vendor-card.tsx` - Related: View Purchase Orders, Invoices, Ledger Entries
11. `item-card.tsx` - Related: View Sales Lines, Purchase Lines, Inventory
12. `location-card.tsx` - Related: View Inventory, Transfers
13. `task-card.tsx` - Actions: Assign, Status transitions
14. `transaction-card.tsx` - Related: View Session, Customer
15. `shipment-method-card.tsx` - Minimal actions needed

## Acceptance Criteria

- [ ] All 15 card files have action groups
- [ ] Each card has at minimum a "Related" dropdown for navigating to associated records
- [ ] Cards with workflow transitions have an "Actions" dropdown
- [ ] Navigation functions work (open related record in new dialog or navigate to list)
- [ ] Consistent UX across all modules

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-02-27 | Created finding from code review | 15 cards need action groups after pilot validation |
