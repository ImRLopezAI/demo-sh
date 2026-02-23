---
status: complete
priority: p2
issue_id: "009"
tags: [code-review, functionality, insight, analytics]
dependencies: []
---

# Add insight location creation workflow and forecasting inputs

## Problem Statement

Insight supports analytics views and location editing, but lacks location creation flow and forecasting/decision-support operations expected from the module scope.

## Findings

- Location card only updates existing record (`update` mutation only).
  - `src/app/_shell/_views/insight/components/location-card.tsx:96`
  - `src/app/_shell/_views/insight/components/location-card.tsx:112`
- Locations list has edit-only flow, no new-location action.
  - `src/app/_shell/_views/insight/locations-list.tsx:19`
- Router is generic CRUD, no forecasting-specific operations.
  - `src/server/rpc/router/uplink/insight.router.ts:25`

## Proposed Solutions

### Option 1: Add location create UX + API usage

**Pros:** Quick functional parity for master data.

**Cons:** Does not cover forecasting gap.

**Effort:** Small

**Risk:** Low

---

### Option 2: Add forecasting endpoints (demand trend, velocity, stock-out risk)

**Pros:** Aligns module with analytics mission.

**Cons:** Requires model and metric definitions.

**Effort:** Medium

**Risk:** Medium

## Recommended Action

Deliver Option 1 + scoped Option 2 MVP.

## Technical Details

- Add new location button and create mutation path.
- Add computed analytics endpoint with filterable horizon.

## Resources

- `src/app/_shell/_views/insight/components/location-card.tsx`

## Acceptance Criteria

- [x] User can create a new location from insight UI.
- [x] Forecasting endpoint returns validated trend outputs.
- [x] Tests verify create path and forecast endpoint contract.

## Work Log

### 2026-02-23 - Review finding capture

**By:** Codex

**Actions:**
- Reviewed insight UI and router capabilities.
- Confirmed create and forecasting workflow gaps.

**Learnings:**
- Insight is currently dashboard-centric, with limited decision automation.

### 2026-02-23 - Implementation complete

**By:** Codex

**Actions:**
- Added insight forecasting endpoint in `src/server/rpc/router/uplink/insight.router.ts`:
  - new `insight.forecastDemand` endpoint with filterable horizon, location, and item scope,
  - returns demand/velocity/stock-out risk signals with validated output structure.
- Enabled location creation workflow in insight UI:
  - updated `src/app/_shell/_views/insight/components/location-card.tsx` to support create + update modes,
  - added New Location action in `src/app/_shell/_views/insight/locations-list.tsx`.
- Expanded insight integration tests in `test/uplink/insight-modules.test.ts`:
  - location creation path coverage,
  - forecast endpoint contract and signal output coverage.
- Verified with:
  - `bunx biome check --write src/server/rpc/router/uplink/insight.router.ts src/app/_shell/_views/insight/locations-list.tsx src/app/_shell/_views/insight/components/location-card.tsx test/uplink/insight-modules.test.ts`
  - `bun run typecheck`
  - `bun run test test/uplink/insight-modules.test.ts`
  - `bun run test test/uplink/ledger-modules.test.ts test/uplink/flow-modules.test.ts test/uplink/payroll-modules.test.ts test/uplink/trace-modules.test.ts test/uplink/insight-modules.test.ts`

**Learnings:**
- Forecast signals become immediately actionable when exposed as a stable contract (risk tier + demand velocity) and can now feed replenishment planning workflows.

## Notes

Forecast outputs should be consumable by replenishment planning endpoints.
