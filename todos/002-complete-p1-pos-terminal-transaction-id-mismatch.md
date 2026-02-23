---
status: complete
priority: p1
issue_id: "002"
tags: [code-review, functionality, pos, data-integrity]
dependencies: []
---

# Fix POS terminal transaction ID mismatch in sale completion

## Problem Statement

POS terminal sale completion appears to read a non-existent `id` field from created transactions, while the app generally uses `_id`. This can break line insertion and status transition for completed sales.

## Findings

- POS creates transaction header, then reads `header.id`.
  - `src/app/_shell/_views/pos/hooks/use-pos-terminal.ts:366`
  - `src/app/_shell/_views/pos/hooks/use-pos-terminal.ts:376`
- Follow-up operations use `headerId` to create lines and transition to `COMPLETED`.
  - `src/app/_shell/_views/pos/hooks/use-pos-terminal.ts:378`
  - `src/app/_shell/_views/pos/hooks/use-pos-terminal.ts:390`
- Across the codebase, entity identity is consistently `_id`.

## Proposed Solutions

### Option 1: Use `_id` from mutation return

**Approach:** Change `const headerId = (header as { _id: string })._id` and type mutation return.

**Pros:** Minimal and direct fix.

**Cons:** Still leaves weak typing if cast remains.

**Effort:** Small

**Risk:** Low

---

### Option 2: Add typed mutation result contract

**Approach:** Type `useEntityMutations`/RPC return shapes so `_id` is guaranteed at compile time.

**Pros:** Prevents similar bugs elsewhere.

**Cons:** Broader refactor.

**Effort:** Medium

**Risk:** Medium

## Recommended Action

Start with Option 1 immediately, then schedule Option 2.

## Technical Details

- Affected file: `src/app/_shell/_views/pos/hooks/use-pos-terminal.ts`
- Add/extend tests for terminal checkout flow persisted transaction + lines + status.

## Resources

- POS module docs in project AGENTS instructions.

## Acceptance Criteria

- [x] Sale completion creates header, lines, and final status using valid ID.
- [x] No runtime errors from undefined transaction ID.
- [x] POS integration test covers full checkout flow.

## Work Log

### 2026-02-23 - Review finding capture

**By:** Codex

**Actions:**
- Traced POS checkout flow from header create to line create and status transition.
- Identified inconsistent field usage for entity ID.

**Learnings:**
- Type-safe mutation return models would prevent this class of bug.

### 2026-02-23 - Implementation complete

**By:** Codex

**Actions:**
- Added `resolveEntityId` in `src/app/_shell/_views/pos/hooks/use-pos-terminal.ts` and switched checkout flow to use it, preferring `_id` with a guarded fallback to `id`.
- Updated terminal checkout to use the resolved identifier for:
  - line creation
  - final `COMPLETED` transition
- Added regression unit test in `test/uplink/pos-terminal-id.test.ts` for `_id` preference, `id` fallback, and missing-id error handling.
- Added checkout integration coverage in `test/uplink/pos-modules.test.ts` to validate header creation, line linkage by transaction ID, and completion transition.
- Verified with:
  - `bun run typecheck`
  - `bun run test test/uplink/pos-terminal-id.test.ts test/uplink/hub-modules.test.ts test/uplink/trace-modules.test.ts test/uplink/market-modules.test.ts test/uplink/replenishment-modules.test.ts test/uplink/ledger-modules.test.ts test/uplink/payroll-modules.test.ts test/uplink/pos-modules.test.ts`

**Learnings:**
- Small typed ID resolvers are an effective guardrail when RPC return typing is still broad.

## Notes

This is a functional correctness issue and should be treated as merge-blocking for POS workflow work.
