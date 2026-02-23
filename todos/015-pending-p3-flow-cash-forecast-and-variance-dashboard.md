---
status: completed
priority: p3
issue_id: "015"
tags: [code-review, enhancement, flow, forecasting]
dependencies: []
---

# Add flow cash forecast and variance dashboards

## Problem Statement

Flow currently provides account/journal visibility but lacks scenario-based cash forecasting and variance monitoring.

## Findings

- Flow router provides CRUD surfaces for accounts/ledger/journal/gl only.
  - `src/server/rpc/router/uplink/flow.router.ts`

## Proposed Solutions

### Option 1: Forecast endpoint with rolling horizon

**Pros:** Directly supports liquidity planning.

**Cons:** Requires assumptions model.

**Effort:** Medium

**Risk:** Medium

---

### Option 2: Dashboard-only extrapolation from existing data

**Pros:** Quick to start.

**Cons:** Lower precision and transparency.

**Effort:** Small

**Risk:** Low

## Recommended Action

Option 1 with simple baseline model first.

## Technical Details

- Add forecast service using historical inflow/outflow from ledgers.
- Show actual-vs-forecast variance by period.

## Resources

- `src/app/_shell/_views/flow/dashboard.tsx`

## Acceptance Criteria

- [x] Forecast values available for configurable horizon.
- [x] Variance chart compares forecast vs actuals.
- [x] Alert thresholds for adverse variance defined.

## Work Log

### 2026-02-23 - Review finding capture

**By:** Codex

**Actions:**
- Added enhancement backlog item from flow review.

**Learnings:**
- Forecasting closes a key gap between reporting and planning.

### 2026-02-23 - Implementation

**By:** Codex

**Actions:**
- Added `flow.analytics.cashForecast` endpoint with configurable horizon, lookback window, and adverse variance threshold.
- Implemented rolling forecast model (`forecastNet`, `forecastBalance`) and actual-vs-forecast variance outputs.
- Added forecast alerting for negative projected cash and adverse variance threshold breaches.
- Added Flow dashboard forecast controls, forecast trend card, variance comparison chart, and alert surface.

**Validation:**
- `bun run test test/uplink/flow-modules.test.ts`
- `bun run typecheck`

## Notes

Optional roadmap item.
