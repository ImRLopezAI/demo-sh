---
status: pending
priority: p2
issue_id: "050"
tags: [code-review, actionbar, pos, transactions, sessions, bulk-actions]
dependencies: ["040"]
---

# Add ActionBar to POS Transactions and Sessions Lists

## Problem Statement

POS transactions-list and sessions-list have no bulk actions. End-of-day operations require managers to void transactions, issue refunds, and close multiple sessions simultaneously. The backend exposes `governTransaction` (void/refund) and `closeShift` mutations.

## Findings

- **RPC Explorer**: Backend has `governTransaction` (govern refund/void commands), `closeShift` (close shift with variance controls)
- **TypeScript Reviewer**: Rated Tier 2. End-of-day manager operations.

## Proposed Solutions

### Transactions List ActionBar:
1. **Void Selected** -- Bulk void OPEN/COMPLETED transactions. Gate: appropriate status
2. **Issue Refunds** -- Bulk initiate refunds for COMPLETED transactions

### Sessions List ActionBar:
1. **Close Selected Sessions** -- Bulk close OPEN/PAUSED sessions for end-of-day

- Effort: Medium (2 views)
- Risk: Medium -- void/refund operations are sensitive; needs confirmation dialogs

## Technical Details

- **Affected files**:
  - MODIFY: `src/app/_shell/_views/pos/transactions-list.tsx`
  - MODIFY: `src/app/_shell/_views/pos/sessions-list.tsx`
- **RPC endpoints**: `$rpc.pos.transactions.governTransaction`, `$rpc.pos.sessions.closeShift`

## Acceptance Criteria

- [ ] Both DataGrids have `withSelect` prop
- [ ] Transactions: Void and Refund actions with confirmation dialogs
- [ ] Sessions: Close sessions action with status gating
- [ ] Proper error handling for failed operations in batch

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-27 | Created | From code review: POS end-of-day operations |

## Resources

- Current files: `src/app/_shell/_views/pos/transactions-list.tsx`, `src/app/_shell/_views/pos/sessions-list.tsx`
- Backend router: `src/server/rpc/router/uplink/pos.router.ts`
