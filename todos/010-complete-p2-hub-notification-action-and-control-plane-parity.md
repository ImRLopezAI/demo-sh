---
status: complete
priority: p2
issue_id: "010"
tags: [code-review, functionality, hub, control-plane]
dependencies: []
---

# Add hub notification actions and control-plane parity features

## Problem Statement

Hub is positioned as central control plane, but notifications view is read-only and lacks action workflows (mark read/archive, bulk triage, escalation).

## Findings

- Notifications list renders only DataGrid without action dialog/toolbar transitions.
  - `src/app/_shell/_views/hub/notifications-list.tsx:13`
- Router supports transitions (`UNREAD -> READ/ARCHIVED`) but UI does not invoke them.
  - `src/server/rpc/router/uplink/hub.router.ts:22`
  - `src/server/rpc/router/uplink/hub.router.ts:29`

## Proposed Solutions

### Option 1: Add row actions + bulk notification transitions

**Pros:** Immediate value, low complexity.

**Cons:** Limited orchestration depth.

**Effort:** Small

**Risk:** Low

---

### Option 2: Add alert policies and auto-task escalation

**Pros:** Aligns with control-plane role.

**Cons:** Requires policy model and scheduler.

**Effort:** Medium

**Risk:** Medium

## Recommended Action

Option 1 first, then Option 2.

## Technical Details

- Add action menu to notifications table.
- Add bulk mutation endpoint for status transitions.

## Resources

- `src/app/_shell/_views/hub/notifications-list.tsx`

## Acceptance Criteria

- [x] Notifications can be marked read/archived from UI.
- [x] Bulk action support exists for selected rows.
- [x] Hub task escalation can be configured for critical alerts (MVP).

## Work Log

### 2026-02-23 - Review finding capture

**By:** Codex

**Actions:**
- Audited hub notifications UI and routing transitions.
- Confirmed unimplemented action path.

**Learnings:**
- Existing transition APIs are underutilized by current UX.

### 2026-02-23 - Implementation complete

**By:** Codex

**Actions:**
- Extended hub notifications RPC in `src/server/rpc/router/uplink/hub.router.ts` with:
  - `bulkTransition` endpoint for selected notification status changes with per-record outcomes.
  - `escalateCritical` endpoint to create workflow-linked operation tasks from unread critical alerts with configurable scope (module, severity, assignee, due hours) and idempotent notification markers.
- Upgraded notifications UI in `src/app/_shell/_views/hub/notifications-list.tsx`:
  - row-level actions (`Read`, `Archive`),
  - selection-enabled bulk action bar (`Mark read`, `Archive`),
  - configurable escalation controls and result summaries.
- Added integration coverage in `test/uplink/hub-modules.test.ts`:
  - bulk transition mixed-outcome contract,
  - critical escalation task creation and idempotent rerun behavior.
- Verified with:
  - `bunx biome check --write src/server/rpc/router/uplink/hub.router.ts src/app/_shell/_views/hub/notifications-list.tsx test/uplink/hub-modules.test.ts`
  - `bun run test test/uplink/hub-modules.test.ts`
  - `bun run typecheck`

**Learnings:**
- Hub control-plane value improves materially when notification triage and task orchestration are connected in one workflow surface.

## Notes

This is a high-leverage productivity improvement for operations teams.
