---
status: complete
priority: p2
issue_id: "006"
tags: [code-review, functionality, flow, automation]
dependencies: []
---

# Implement flow payment journal posting and reconciliation automation

## Problem Statement

Flow payment journal UI shows a “Post All” action but it has no implementation, leaving a visible but non-functional core operation.

## Findings

- Button exists without click handler.
  - `src/app/_shell/_views/flow/payment-journal.tsx:66`
- Journal rows are editable but no explicit posting orchestration is provided.
  - `src/app/_shell/_views/flow/payment-journal.tsx:49`
- Flow router has generic journal/status transitions but no batch post endpoint.
  - `src/server/rpc/router/uplink/flow.router.ts:32`

## Proposed Solutions

### Option 1: Client loop over `transitionStatus` for OPEN lines

**Pros:** Quick implementation.

**Cons:** Slow on large sets, partial failure risk.

**Effort:** Small

**Risk:** Medium

---

### Option 2: Server-side `postJournalBatch` endpoint

**Pros:** Better control, transactional safeguards, easier observability.

**Cons:** New API design required.

**Effort:** Medium

**Risk:** Low

## Recommended Action

Option 2.

## Technical Details

- Add batch posting endpoint with summary results (`posted`, `skipped`, `failed`).
- Add filters for batch scope (date, batch, source module).

## Resources

- `src/app/_shell/_views/flow/payment-journal.tsx`

## Acceptance Criteria

- [x] “Post All” performs real posting and reports results.
- [x] Partial failures are visible and retryable.
- [x] Audit fields updated for posted entries.
- [x] Integration test validates batch post behavior.

## Work Log

### 2026-02-23 - Review finding capture

**By:** Codex

**Actions:**
- Reviewed flow payment journal page and router behavior.
- Verified missing action wiring.

**Learnings:**
- Feature appears complete visually but not operationally.

### 2026-02-23 - Implementation complete

**By:** Codex

**Actions:**
- Added `flow.journalLines.postJournalBatch` in `src/server/rpc/router/uplink/flow.router.ts`:
  - supports scoped batch posting filters (`journalTemplate`, `journalBatch`, `sourceModule`, posting-date window),
  - validates journal-line eligibility and posting constraints,
  - posts `OPEN`/`APPROVED` lines with per-line `posted/skipped/failed` outcomes,
  - updates `statusUpdatedAt` audit field for posted lines,
  - creates GL entries (and bank ledger entries for bank-account journal lines),
  - rolls back per-line side effects when a line fails during posting.
- Wired `Post All` in `src/app/_shell/_views/flow/payment-journal.tsx`:
  - real mutation call to `postJournalBatch`,
  - button loading/disable behavior,
  - query invalidation for flow journal/gl/bank-ledger views,
  - visible batch summary showing posted/skipped/failed counts and top failure reasons.
- Extended `test/uplink/flow-modules.test.ts` with a batch-post workflow test covering:
  - mixed eligible/ineligible/invalid lines,
  - per-line outcome counts,
  - retry flow after fixing failed lines.
- Verified with:
  - `bunx biome check --write src/server/rpc/router/uplink/flow.router.ts src/app/_shell/_views/flow/payment-journal.tsx test/uplink/flow-modules.test.ts`
  - `bun run typecheck`
  - `bun run test test/uplink/flow-modules.test.ts`
  - `bun run test test/uplink/ledger-modules.test.ts test/uplink/flow-modules.test.ts`

**Learnings:**
- Batch workflow endpoints should return detailed per-record outcomes so the UI can make partial failures actionable without blocking the entire operation.

## Notes

Should be prioritized before broader flow enhancements.
