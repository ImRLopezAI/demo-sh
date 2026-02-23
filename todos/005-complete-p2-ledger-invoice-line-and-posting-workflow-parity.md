---
status: complete
priority: p2
issue_id: "005"
tags: [code-review, functionality, ledger, accounting]
dependencies: []
---

# Complete ledger invoice line management and posting workflow parity

## Problem Statement

Ledger invoices can be created and transitioned, but invoice lines are currently read-only in the invoice dialog and posting side effects are not validated end-to-end.

## Findings

- Invoice lines grid is read-only in card.
  - `src/app/_shell/_views/ledger/components/invoice-card.tsx:145`
- Router exposes generic invoice and invoice-line CRUD but no domain posting orchestration endpoint.
  - `src/server/rpc/router/uplink/ledger.router.ts:38`
- Tests validate transitions, not posting side effects.
  - `test/uplink/ledger-modules.test.ts`

## Proposed Solutions

### Option 1: Enable line CRUD in invoice card using existing endpoints

**Pros:** Fast improvement in UX parity.

**Cons:** Posting side effects still implicit.

**Effort:** Medium

**Risk:** Low

---

### Option 2: Add `postInvoice` orchestration endpoint with side-effect assertions

**Pros:** Strong accounting integrity.

**Cons:** Larger backend effort.

**Effort:** Medium

**Risk:** Medium

## Recommended Action

Combine Option 1 + Option 2.

## Technical Details

- Enable editable line grid and parent-scoped line operations.
- Add posting operation that ensures customer ledger + GL updates.

## Resources

- `src/app/_shell/_views/ledger/components/invoice-card.tsx`
- `src/server/rpc/router/uplink/ledger.router.ts`

## Acceptance Criteria

- [x] Invoice lines can be added/updated/deleted in UI.
- [x] Posting operation updates related accounting records predictably.
- [x] Integration tests verify posting side effects and rollback behavior.

## Work Log

### 2026-02-23 - Review finding capture

**By:** Codex

**Actions:**
- Traced ledger UI and router capabilities.
- Confirmed line-editing and posting parity gaps.

**Learnings:**
- Status transitions alone are insufficient for accounting workflows.

### 2026-02-23 - Implementation complete

**By:** Codex

**Actions:**
- Added `ledger.invoices.postInvoice` orchestration endpoint in `src/server/rpc/router/uplink/ledger.router.ts`:
  - validates tenant scope, invoice status, line presence, and invoice totals,
  - creates customer ledger + balanced GL entries on post,
  - enforces idempotent retries for already-posted invoices,
  - rolls back invoice status and created entries on posting failures.
- Updated `src/app/_shell/_views/ledger/components/invoice-card.tsx`:
  - enabled invoice line add/update/delete in-grid editing,
  - added draft-line support while creating a new invoice,
  - switched Post action to use `ledger.invoices.postInvoice`,
  - locked line editing for non-draft invoices.
- Expanded `test/uplink/ledger-modules.test.ts` with integration coverage for:
  - invoice line CRUD + parent-scoped filtering,
  - postInvoice side effects (customer ledger + GL linkage),
  - idempotent posting retries,
  - rollback behavior under forced side-effect failure.
- Verified with:
  - `bunx biome check --write src/server/rpc/router/uplink/ledger.router.ts src/app/_shell/_views/ledger/components/invoice-card.tsx test/uplink/ledger-modules.test.ts`
  - `bun run typecheck`
  - `bun run test test/uplink/ledger-modules.test.ts`

**Learnings:**
- Posting must be a dedicated domain workflow endpoint, not only a generic status transition, to ensure accounting side effects stay consistent.

## Notes

This is a key finance-domain parity gap.
