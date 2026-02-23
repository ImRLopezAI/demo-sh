---
status: completed
priority: p3
issue_id: "014"
tags: [code-review, enhancement, hub, operations]
dependencies: []
---

# Add hub SLA escalation and operations scoreboard

## Problem Statement

Hub can become more valuable as a control plane by adding SLA tracking, breach alerts, and cross-module operational scoreboards.

## Findings

- Hub currently centers on tasks and notifications with limited automation.
  - `src/server/rpc/router/uplink/hub.router.ts`

## Proposed Solutions

### Option 1: SLA fields + breach detector job

**Pros:** Actionable operational visibility.

**Cons:** Requires scheduler and threshold configs.

**Effort:** Medium

**Risk:** Low

---

### Option 2: Dashboard-only passive metrics

**Pros:** Fast release.

**Cons:** No active escalation.

**Effort:** Small

**Risk:** Low

## Recommended Action

Option 1.

## Technical Details

- Add SLA target fields on tasks.
- Add periodic breach evaluator and escalation actions.

## Resources

- `src/app/_shell/_views/hub/dashboard.tsx`

## Acceptance Criteria

- [x] SLA breaches are identified automatically.
- [x] Escalation notifications are generated.
- [x] Ops scoreboard shows module health and breach trends.

## Work Log

### 2026-02-23 - Review finding capture

**By:** Codex

**Actions:**
- Added enhancement backlog item from hub review.

**Learnings:**
- Hub value compounds with automation over static lists.

### 2026-02-23 - Implementation

**By:** Codex

**Actions:**
- Added SLA evaluation workflow on `hub.operationTasks` with automatic breach/at-risk/on-track classification.
- Added idempotent SLA breach notification generation using `[sla-task:<taskId>]` markers.
- Added `slaScoreboard` analytics endpoint with module health scores and 14-day breach trends.
- Added Hub dashboard SLA scoreboard UI (trend chart, module health list, and KPI panel).
- Added task form/grid support for SLA target/status/escalation fields.

**Validation:**
- `bun run test test/uplink/hub-modules.test.ts`
- `bun run typecheck`

## Notes

Optional roadmap item.
