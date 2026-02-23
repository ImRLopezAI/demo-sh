---
status: complete
priority: p2
issue_id: "007"
tags: [code-review, functionality, payroll, finance]
dependencies: []
---

# Add payroll run and posting workflow beyond employee CRUD

## Problem Statement

Payroll module supports employee and journal data operations, but lacks a payroll-run workflow (period selection, gross-to-net execution, posting and disbursement checkpoints).

## Findings

- Router exposes generic CRUD/status entities only.
  - `src/server/rpc/router/uplink/payroll.router.ts:58`
- UI has employee management and journal posting, but no payroll cycle orchestration.
  - `src/app/_shell/_views/payroll/payroll-journal.tsx`
- Tests do not validate payroll-cycle outcomes.
  - `test/uplink/payroll-modules.test.ts`

## Proposed Solutions

### Option 1: Add payroll run entity and lifecycle

**Pros:** Establishes explicit business process.

**Cons:** Requires schema and UI additions.

**Effort:** Medium

**Risk:** Medium

---

### Option 2: Keep current journal-centric flow, add helper commands

**Pros:** Minimal schema changes.

**Cons:** Process remains implicit and error-prone.

**Effort:** Small

**Risk:** Medium

## Recommended Action

Option 1.

## Technical Details

- Add `payrollRuns` table/entity with statuses (`DRAFT`, `CALCULATED`, `POSTED`, `PAID`).
- Link run to generated journal lines and bank ledger entries.

## Resources

- `src/server/rpc/router/uplink/payroll.router.ts`

## Acceptance Criteria

- [x] Payroll run can be created for a period and employee scope.
- [x] Gross-to-net calculation results are traceable.
- [x] Posting creates consistent finance records.
- [x] Tests cover run lifecycle and failure scenarios.

## Work Log

### 2026-02-23 - Review finding capture

**By:** Codex

**Actions:**
- Compared payroll module features to implemented surfaces.
- Identified missing orchestration layer.

**Learnings:**
- Payroll value depends on period workflow, not only records CRUD.

### 2026-02-23 - Implementation complete

**By:** Codex

**Actions:**
- Added payroll run domain model in `src/server/db/index.ts`:
  - new `payrollRuns` table with lifecycle status, period scope, employee/amount totals, posting/disbursement counters, and calculation snapshot fields.
- Extended payroll RPC in `src/server/rpc/router/uplink/payroll.router.ts`:
  - added `payrollRuns` CRUD router,
  - added `calculateRun` for gross-to-net calculation snapshots,
  - added `postRun` to create employee-ledger + payroll journal + balancing GL entries with rollback and idempotent retry behavior,
  - added `markRunPaid` to create payroll disbursement bank entry and settle employee-ledger entries with rollback and idempotent retry behavior.
- Updated payroll UI in `src/app/_shell/_views/payroll/payroll-journal.tsx`:
  - added `Run Current Payroll` action (create run + calculate + post),
  - added `Mark Latest Run Paid` action,
  - added run execution summary and latest-run status panel.
- Expanded payroll integration tests in `test/uplink/payroll-modules.test.ts`:
  - payroll run full lifecycle test (create/calculate/post/paid + side-effect assertions),
  - rollback failure test for post-run finance writes.
- Verified with:
  - `bunx biome check --write src/server/db/index.ts src/server/rpc/router/uplink/payroll.router.ts src/app/_shell/_views/payroll/payroll-journal.tsx test/uplink/payroll-modules.test.ts`
  - `bun run typecheck`
  - `bun run test test/uplink/payroll-modules.test.ts`
  - `bun run test test/uplink/ledger-modules.test.ts test/uplink/flow-modules.test.ts test/uplink/payroll-modules.test.ts`

**Learnings:**
- Payroll orchestration needs dedicated lifecycle APIs because generic journal transitions cannot guarantee end-to-end consistency across employee ledger, GL, and bank disbursement states.

## Notes

Coordinate with flow/bank disbursement workflows.
