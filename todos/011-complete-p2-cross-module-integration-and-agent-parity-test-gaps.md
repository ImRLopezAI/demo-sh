---
status: complete
priority: p2
issue_id: "011"
tags: [code-review, quality, testing, agent-native]
dependencies: []
---

# Expand cross-module integration tests and agent-native parity checks

## Problem Statement

Current tests are strong for table registration, relations, and basic transitions, but broader business workflows across modules are not validated end-to-end.

## Findings

- Existing tests are mostly module-isolated and CRUD/transition-oriented.
  - `test/uplink/*.test.ts`
- Recent additions improved line scoping for market/replenishment only; parity still missing for other line-based workflows.
- Agent-native perspective: some workflows are UI-local (e.g., creating POS session in-memory), limiting parity for non-UI agents.
  - `src/app/_shell/_views/pos/components/session-select-dialog.tsx:74`

## Proposed Solutions

### Option 1: Add integration scenarios per module pair

**Approach:** Validate market->ledger->trace and payroll->flow chains with real data mutations.

**Pros:** High confidence against regressions.

**Cons:** More setup/fixture complexity.

**Effort:** Medium

**Risk:** Low

---

### Option 2: Add contract tests + smoke workflow suite

**Pros:** Faster and smaller.

**Cons:** Less behavioral coverage.

**Effort:** Small

**Risk:** Medium

## Recommended Action

Option 1 with phased rollout.

## Technical Details

- Add integration suites for:
  - order to invoice to shipment
  - payroll journal to bank ledger
  - POS transaction header+lines completion

## Resources

- `test/uplink/market-modules.test.ts`
- `test/uplink/replenishment-modules.test.ts`
- `test/uplink/payroll-modules.test.ts`
- `test/uplink/flow-modules.test.ts`

## Acceptance Criteria

- [x] At least 3 end-to-end cross-module scenarios covered.
- [x] Failure path tests verify no orphan/partial state.
- [x] Agent-invocable API flows exist for workflows currently only in UI-local state.

## Work Log

### 2026-02-23 - Review finding capture

**By:** Codex

**Actions:**
- Assessed test scope and depth across uplink module suites.
- Identified missing chain-level validation and agent parity gaps.

**Learnings:**
- High-level module confidence exists; system workflow confidence is still limited.

### 2026-02-23 - Implementation complete

**By:** Codex

**Actions:**
- Added agent-invocable POS session start workflow in `src/server/rpc/router/uplink/pos.router.ts`:
  - new `pos.sessions.startSession` endpoint with terminal validation, tenant checks, optional open-session reuse/idempotency, and explicit session lifecycle defaults.
- Wired POS session creation UI to API workflow in `src/app/_shell/_views/pos/components/session-select-dialog.tsx`:
  - replaced local-only synthetic session IDs with real server-created sessions.
- Expanded POS coverage in `test/uplink/pos-modules.test.ts`:
  - added session-start API contract + idempotent reuse test.
- Added end-to-end cross-module suite in `test/uplink/cross-module-workflows.test.ts` covering:
  - market checkout -> ledger invoice posting -> trace shipment dispatch + notification,
  - payroll run calculate/post/pay -> flow bank ledger visibility,
  - POS start-session API -> transaction + line completion workflow.
- Added failure-path regression checks for orphan-state prevention:
  - ledger post attempt without invoice lines leaves no accounting side effects,
  - payroll paid transition with invalid bank account leaves run/disbursement state consistent.
- Verified with:
  - `bunx biome check --write src/server/rpc/router/uplink/pos.router.ts src/app/_shell/_views/pos/components/session-select-dialog.tsx test/uplink/pos-modules.test.ts test/uplink/cross-module-workflows.test.ts`
  - `bun run test test/uplink/pos-modules.test.ts test/uplink/cross-module-workflows.test.ts`
  - `bun run typecheck`

**Learnings:**
- Cross-module confidence improves significantly when tests validate real business chains and explicit rollback/no-orphan invariants rather than module-isolated transitions.

## Notes

This backlog item reduces regression risk as missing functionality is added.
