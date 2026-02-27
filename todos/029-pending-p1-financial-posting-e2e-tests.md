---
status: pending
priority: p1
issue_id: "029"
tags: [code-review, testing, e2e, ledger, flow, payroll, financial-integrity]
dependencies: ["027"]
---

# Add Financial Posting Operation E2E Tests

Ledger invoice posting, flow journal batch posting, payroll run/post/pay, and reconciliation approval operations create irreversible financial state (GL entries, customer/vendor ledger entries, bank disbursements). None are tested in the browser.

## Problem Statement

Financial posting operations triggered from the UI create side effects that are difficult or impossible to reverse: GL entries, customer ledger entries, vendor ledger entries, and bank account ledger entries. The API-level integration tests verify these work correctly server-side, but no browser E2E test verifies:
- Posting buttons are disabled/hidden for unauthorized roles
- Batch result summaries display correctly (posted/skipped/failed counts)
- Lines become read-only after posting
- Error messages appear for validation failures (e.g., posting invoice with no lines)

## Findings

- Ledger `invoice-card.tsx:85-102` — `postInvoice` mutation creates GL + customer ledger entries. No role check in UI.
- Flow `payment-journal.tsx:69-88` — "Post All" triggers `postJournalBatch`. No role check.
- Flow `reconciliation-approvals.tsx` — bank reconciliation state machine (OPEN→MATCHED→RECONCILED) + journal approval queue. No E2E tests.
- Payroll `payroll-journal.tsx:115-155` — chains 3 sequential mutations (create→calculate→post) + triggers 5 cache invalidations.
- None of these posting buttons check user role client-side — they rely solely on API rejection.
- The `hub-authz-boundaries.test.ts` verifies invoice posting requires MANAGER at API level but not in browser.

## Proposed Solutions

### Option 1: Comprehensive financial posting E2E suite (recommended)

**Approach:** Write E2E tests for each financial posting flow: ledger invoice lifecycle, flow payment journal batch posting, flow reconciliation state machine, payroll journal run/post/pay. Include role-based tests verifying posting is rejected for unauthorized roles.

**Pros:** Covers all irreversible financial operations
**Cons:** Requires auth fixtures from todo 027

**Effort:** Large (4-6 days)
**Risk:** Low

## Recommended Action

Implement after auth fixtures (027) are in place. Start with ledger invoice posting (highest-impact single test).

## Technical Details

**Affected files:**
- `test/e2e/ledger/ledger-invoice-lifecycle.spec.ts` — new
- `test/e2e/flow/flow-payment-journal.spec.ts` — new
- `test/e2e/flow/flow-reconciliation.spec.ts` — new
- `test/e2e/payroll/payroll-journal.spec.ts` — new

**Key test scenarios:**
1. Create invoice with lines, post, verify GL entries created and lines locked
2. Attempt to post invoice with no lines — verify error message
3. Post All journal batch — verify posted/skipped/failed summary
4. Post All disabled when no postable lines exist
5. Reconciliation: Match OPEN entry → Reconcile MATCHED entry
6. Journal approval: OPEN → APPROVED → POSTED maker-checker workflow
7. Payroll: Run → Calculate → Post → Mark Paid with bank account
8. AGENT cannot post invoice (requires MANAGER) — verify UI feedback
9. E-Invoice submit button appears only when invoice is POSTED

**Database changes:** None

## Acceptance Criteria

- [ ] Ledger invoice create → post → lines locked verified in browser
- [ ] Invoice posting with no lines shows validation error
- [ ] Flow journal batch posting shows result summary
- [ ] Flow reconciliation state machine transitions work in browser
- [ ] Payroll run/calculate/post chain completes successfully in browser
- [ ] Unauthorized role sees proper rejection message (not raw API error)
- [ ] E-Invoice submit button conditional visibility verified

## Work Log

### 2026-02-27 - Initial Discovery

**By:** Code Review

**Actions:**
- Analyzed all financial posting UI components across ledger, flow, and payroll
- Identified 4 distinct irreversible financial operations with zero browser E2E coverage
- Cross-referenced with hub-authz-boundaries.test.ts to confirm API-level coverage exists but browser-level does not

**Learnings:**
- Financial posting operations are the highest-risk untested UI paths — they create irreversible state changes.

## Resources

- `src/app/_shell/_views/ledger/components/invoice-card.tsx`
- `src/app/_shell/_views/flow/payment-journal.tsx`
- `src/app/_shell/_views/flow/reconciliation-approvals.tsx`
- `src/app/_shell/_views/payroll/payroll-journal.tsx`
- `src/app/_shell/_views/hub/__test__/e2e/hub-authz-boundaries.test.ts`
