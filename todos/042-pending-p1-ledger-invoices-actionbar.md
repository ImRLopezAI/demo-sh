---
status: pending
priority: p1
issue_id: "042"
tags: [code-review, actionbar, ledger, invoices, e-invoicing, compliance, bulk-actions]
dependencies: ["040"]
---

# Add ActionBar to Invoices List

## Problem Statement

The invoices list (`ledger/invoices-list.tsx`) has no bulk actions. Invoice posting and e-invoice submission are compliance-critical batch operations. Month-end closing requires posting dozens of draft invoices simultaneously. The backend exposes `postInvoice`, e-invoice `submit`, and `retryRejected` mutations.

## Findings

- **RPC Explorer**: Backend has `postInvoice` (post draft invoice to create customer ledger + GL entries), `submit` (submit to e-invoicing provider), `retryRejected` (retry rejected e-invoice submissions)
- **TypeScript Reviewer**: Rated as Tier 1 priority. Compliance-critical batch operations.
- **Architecture Strategist**: Confirmed dual status fields (`status` and `eInvoiceStatus`) warrant separate action groups

## Proposed Solutions

### ActionBar actions:

1. **Post Selected** -- Bulk invoke `postInvoice` on DRAFT invoices. Gate: only DRAFT status
2. **Submit E-Invoice** -- Bulk invoke `submit` on POSTED invoices where eInvoiceStatus is DRAFT or POSTED. Gate: status === POSTED
3. **Retry Rejected** -- Bulk invoke `retryRejected` on invoices where eInvoiceStatus is REJECTED
4. **Export Selected** -- Export selected rows for audit

- Effort: Medium
- Risk: Low -- all mutations exist; posting is idempotent

## Technical Details

- **Affected files**:
  - MODIFY: `src/app/_shell/_views/ledger/invoices-list.tsx`
  - USES: `src/app/_shell/_views/_shared/resolve-selected-ids.ts` (from todo 040)
- **RPC endpoints**: `$rpc.ledger.invoices.postInvoice`, `$rpc.ledger.eInvoiceSubmissions.submit`, `$rpc.ledger.eInvoiceSubmissions.retryRejected`

## Acceptance Criteria

- [ ] DataGrid has `withSelect` prop
- [ ] ActionBar with selection count
- [ ] "Post Selected" posts DRAFT invoices
- [ ] "Submit E-Invoice" submits POSTED invoices to tax authority
- [ ] "Retry Rejected" retries REJECTED e-invoice submissions
- [ ] Status-aware button disabling
- [ ] Query invalidation for invoices, customerLedger, and glEntries after posting

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-27 | Created | From code review: compliance-critical batch operation |

## Resources

- Current file: `src/app/_shell/_views/ledger/invoices-list.tsx`
- Backend router: `src/server/rpc/router/uplink/ledger.router.ts`
