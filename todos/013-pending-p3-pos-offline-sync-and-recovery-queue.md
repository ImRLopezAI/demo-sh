---
status: completed
priority: p3
issue_id: "013"
tags: [code-review, enhancement, pos, resilience]
dependencies: []
---

# Add POS offline sync and recovery queue

## Problem Statement

POS should support degraded/offline operation for high-volume environments; current terminal workflow is online mutation-centric.

## Findings

- POS terminal flow performs direct mutations during checkout without local retry queue semantics.
  - `src/app/_shell/_views/pos/hooks/use-pos-terminal.ts`

## Proposed Solutions

### Option 1: Local queue with retry worker

**Pros:** Better reliability during network issues.

**Cons:** Requires conflict strategy.

**Effort:** Medium

**Risk:** Medium

---

### Option 2: Soft offline (draft receipts only)

**Pros:** Smaller scope.

**Cons:** Limited real offline capability.

**Effort:** Small

**Risk:** Low

## Recommended Action

Option 1.

## Technical Details

- Store pending transactions locally with idempotency key.
- Reconcile once connectivity returns.

## Resources

- `src/app/_shell/_views/pos/hooks/use-pos-terminal.ts`

## Acceptance Criteria

- [x] Checkout can proceed while backend is temporarily unavailable.
- [x] Pending transactions sync automatically when connectivity is restored.
- [x] Duplicate transaction prevention enforced.

## Work Log

### 2026-02-23 - Review finding capture

**By:** Codex

**Actions:**
- Added enhancement backlog item from POS module review.

**Learnings:**
- Offline resilience is a major differentiator for POS.

### 2026-02-23 - Implementation

**By:** Codex

**Actions:**
- Added offline POS queue persistence helpers with idempotency keys and processed-key tracking.
- Added automatic queue flush on reconnect/interval and manual `Sync now` action in terminal header.
- Added queue status UI (online/offline, pending queue count, sync-in-progress, sync errors).
- Added tests for queue deduplication, retry behavior, and processed-key short-circuiting.

**Validation:**
- `bun run test test/uplink/pos-terminal-id.test.ts test/uplink/pos-modules.test.ts`
- `bun run typecheck`

## Notes

Optional roadmap item after P1/P2 parity work.
