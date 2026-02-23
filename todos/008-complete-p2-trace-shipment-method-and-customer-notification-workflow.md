---
status: complete
priority: p2
issue_id: "008"
tags: [code-review, functionality, trace, logistics]
dependencies: []
---

# Complete trace shipment-method management and customer notification workflows

## Problem Statement

Trace has shipment tracking entities, but shipment methods are read-only in UI and customer-facing delivery notification flow is missing.

## Findings

- Shipment methods page is read-only table; no create/edit dialog.
  - `src/app/_shell/_views/trace/shipment-methods-list.tsx:11`
- Router has generic CRUD for methods and shipments but no notification operations.
  - `src/server/rpc/router/uplink/trace.router.ts:26`
- Shipment card supports status transitions but no communication side effects.
  - `src/app/_shell/_views/trace/components/shipment-card.tsx`

## Proposed Solutions

### Option 1: Add shipment-method CRUD dialog + notification hooks

**Pros:** Immediate operations improvement.

**Cons:** Notification implementation details may vary by channel.

**Effort:** Medium

**Risk:** Low

---

### Option 2: Add event-driven trace workflow service

**Pros:** Scales well for carriers/channels.

**Cons:** Higher complexity.

**Effort:** Large

**Risk:** Medium

## Recommended Action

Option 1 first, then incremental event-driven evolution.

## Technical Details

- Add method management card and validation.
- Add event emitters on shipment status transition (`DISPATCHED`, `IN_TRANSIT`, `DELIVERED`, `EXCEPTION`).

## Resources

- `src/app/_shell/_views/trace/shipment-methods-list.tsx`

## Acceptance Criteria

- [x] Users can create/update/shutdown shipment methods.
- [x] Customer notification trigger exists on shipment lifecycle changes.
- [x] Tests cover method CRUD and notification trigger points.

## Work Log

### 2026-02-23 - Review finding capture

**By:** Codex

**Actions:**
- Audited trace lists, cards, and router operations.
- Confirmed lack of method management UI and notifications.

**Learnings:**
- Tracking without customer communication is incomplete for logistics UX.

### 2026-02-23 - Implementation complete

**By:** Codex

**Actions:**
- Added shipment lifecycle notification orchestration in `src/server/rpc/router/uplink/trace.router.ts`:
  - new `trace.shipments.transitionWithNotification` endpoint with transition validation and reason enforcement,
  - automatic dispatch/delivery timestamp updates where applicable,
  - notification trigger creation in `moduleNotifications` for lifecycle events (`DISPATCHED`, `IN_TRANSIT`, `DELIVERED`, `EXCEPTION`).
- Added shipment-method management UI:
  - new dialog card `src/app/_shell/_views/trace/components/shipment-method-card.tsx`,
  - updated `src/app/_shell/_views/trace/shipment-methods-list.tsx` to support create/edit workflow.
- Updated shipment transition UI in `src/app/_shell/_views/trace/components/shipment-card.tsx`:
  - status transitions now call `transitionWithNotification`,
  - invalidates shipments and hub notifications data after transition.
- Expanded trace integration tests in `test/uplink/trace-modules.test.ts`:
  - shipment-method create/update/shutdown workflow,
  - shipment transition notification trigger assertions and reason requirement coverage.
- Verified with:
  - `bunx biome check --write src/server/rpc/router/uplink/trace.router.ts src/app/_shell/_views/trace/shipment-methods-list.tsx src/app/_shell/_views/trace/components/shipment-method-card.tsx src/app/_shell/_views/trace/components/shipment-card.tsx test/uplink/trace-modules.test.ts`
  - `bun run typecheck`
  - `bun run test test/uplink/trace-modules.test.ts`
  - `bun run test test/uplink/ledger-modules.test.ts test/uplink/flow-modules.test.ts test/uplink/payroll-modules.test.ts test/uplink/trace-modules.test.ts`

**Learnings:**
- Shipment status transitions should be treated as workflow events, not only state changes, so customer/internal communication hooks remain consistent.

## Notes

Can integrate with hub notifications for internal visibility.
