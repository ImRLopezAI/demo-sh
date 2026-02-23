---
status: complete
priority: p1
issue_id: "001"
tags: [code-review, functionality, ux, workflow]
dependencies: []
---

# Add transition reason capture workflow across modules

## Problem Statement

Multiple module transitions require a reason at the API level, but the UI does not collect or submit reasons. This creates blocked workflows (users click transition actions and receive backend validation errors).

## Findings

- Backend enforces reason for specific statuses in several modules.
  - `src/server/rpc/router/uplink/market.router.ts:16`
  - `src/server/rpc/router/uplink/replenishment.router.ts:16`
  - `src/server/rpc/router/uplink/replenishment.router.ts:44`
  - `src/server/rpc/router/uplink/ledger.router.ts:14`
  - `src/server/rpc/router/uplink/pos.router.ts:14`
  - `src/server/rpc/router/uplink/trace.router.ts:16`
  - `src/server/rpc/router/uplink/flow.router.ts:15`
  - `src/server/rpc/router/uplink/flow.router.ts:29`
  - `src/server/rpc/router/uplink/flow.router.ts:42`
- UI transition handlers call `toStatus` without `reason`.
  - `src/app/_shell/_views/market/components/sales-order-card.tsx:169`
  - `src/app/_shell/_views/replenishment/components/purchase-order-card.tsx:174`
  - `src/app/_shell/_views/replenishment/components/transfer-card.tsx:129`
  - `src/app/_shell/_views/ledger/components/invoice-card.tsx:134`
  - `src/app/_shell/_views/trace/components/shipment-card.tsx:127`

## Proposed Solutions

### Option 1: Per-card reason dialog

**Approach:** Add a small confirmation dialog with optional/required reason text area before invoking transition.

**Pros:** Fast to ship, minimal backend changes.

**Cons:** Duplicated UI logic in many cards.

**Effort:** Medium

**Risk:** Low

---

### Option 2: Shared transition hook + dialog component

**Approach:** Introduce a shared `TransitionWithReasonDialog` and metadata map per module/status.

**Pros:** Consistent UX, reusable, lower long-term maintenance.

**Cons:** Slightly larger initial refactor.

**Effort:** Medium

**Risk:** Medium

---

### Option 3: Auto-generated reason fallback

**Approach:** Send default reason when omitted.

**Pros:** Smallest implementation.

**Cons:** Poor audit quality; hides user intent.

**Effort:** Small

**Risk:** Medium

## Recommended Action

Prefer Option 2.

## Technical Details

- Affected layers: UI transition cards, shared dialog component, optional RPC metadata endpoint.
- Add test coverage for reason-required and reason-optional transitions.

## Resources

- Plan: `docs/plans/2026-02-22-fix-uplink-module-functionality-parity-plan.md`

## Acceptance Criteria

- [x] All reason-required transitions prompt for reason before submit.
- [x] Submitted reason is stored in `statusReason` where applicable.
- [x] No transition action fails due to missing reason in UI.
- [x] Module tests cover reason-required flows.

## Work Log

### 2026-02-23 - Review finding capture

**By:** Codex

**Actions:**
- Mapped backend reason requirements and UI transition calls.
- Confirmed mismatch between API contract and UI behavior.

**Learnings:**
- This is a cross-module workflow blocker and should be handled by shared UX.

### 2026-02-23 - Implementation complete

**By:** Codex

**Actions:**
- Added shared transition reason infrastructure in `src/app/_shell/_views/_shared/transition-reason.tsx`, including module/entity status rules and a reusable reason dialog.
- Wired reason-aware transitions for all affected cards:
  - `src/app/_shell/_views/market/components/sales-order-card.tsx`
  - `src/app/_shell/_views/replenishment/components/purchase-order-card.tsx`
  - `src/app/_shell/_views/replenishment/components/transfer-card.tsx`
  - `src/app/_shell/_views/ledger/components/invoice-card.tsx`
  - `src/app/_shell/_views/trace/components/shipment-card.tsx`
  - `src/app/_shell/_views/hub/components/task-card.tsx`
  - `src/app/_shell/_views/payroll/components/employee-card.tsx`
- Aligned UI transition maps with backend workflow definitions for missing paths:
  - Added `RELEASED -> CANCELED` on transfers.
  - Added `EXCEPTION` transitions on shipments.
- Added missing module coverage for reason-required transitions:
  - `test/uplink/hub-modules.test.ts`
  - `test/uplink/trace-modules.test.ts`
- Verified with:
  - `bun run typecheck`
  - `bun run test test/uplink/pos-terminal-id.test.ts test/uplink/hub-modules.test.ts test/uplink/trace-modules.test.ts test/uplink/market-modules.test.ts test/uplink/replenishment-modules.test.ts test/uplink/ledger-modules.test.ts test/uplink/payroll-modules.test.ts test/uplink/pos-modules.test.ts`

**Learnings:**
- A centralized reason map keeps UI and backend transition contracts aligned and prevents repeated module-level drift.

## Notes

Applies to market, replenishment, ledger, trace, flow, payroll, hub, and pos transition surfaces.
