---
title: "feat: Insight phase 2 forecast workbench and alerting"
type: feat
status: active
date: 2026-02-23
---

# feat: Insight phase 2 forecast workbench and alerting

## Overview

Turn Insight from passive dashboards into an operator workbench for demand forecasting, inventory risk segmentation, and alert subscriptions.

## Problem Statement / Motivation

Insight has forecasting logic in backend and basic analytics screens in UI, but planning/alerting workflows are missing.

- `forecastDemand` exists but is not exposed as an interactive planning surface.
- No dedicated slow/obsolete stock segmentation view.
- No alert subscription system for high-risk inventory signals.

## Proposed Solution

1. Add forecast workbench:
- Interactive controls for horizon, location, item, and risk threshold.
- Compare forecast demand with stock cover and risk class.

2. Add inventory segmentation views:
- Slow movers, no-movers, and potential stockout candidates.
- Saved filters for planners by location/category.

3. Add alert subscriptions:
- Create module notifications for stockout risk and inventory drift events.
- Support per-module/per-location subscription settings.

## Technical Considerations

- Reuse forecast endpoint contract to avoid parallel logic in UI.
- Define deterministic segmentation rules and expose them to users.
- Alerting should integrate with Hub notifications to avoid duplicate channels.
- Keep query footprints bounded for large item/location datasets.

## System-Wide Impact

- Interaction graph:
  - Insight forecast and segmentation feed replenishment planning and hub operational alerts.
- Error propagation:
  - Invalid filter/horizon inputs should return actionable validation.
- State lifecycle risks:
  - Alert spam if deduplication windows and thresholds are not enforced.
- API surface parity:
  - Add UI parity for existing forecast endpoint and planned alert endpoints.
- Integration test scenarios:
  - Forecast by location/item with realistic seeded history.
  - Alert deduplication for repeated high-risk signals.
  - Planner filter persistence across sessions.

## Acceptance Criteria

- [ ] Forecast workbench available from Insight nav.
- [ ] Workbench supports horizon/location/item inputs and displays risk-ranked outputs.
- [ ] Slow/obsolete stock segmentation views are available and filterable.
- [ ] Alert subscription creates actionable Hub notifications with deduplication.
- [ ] Integration tests cover forecast rendering and alert trigger behavior.

## Success Metrics

- Increased proactive replenishment actions driven by forecast view.
- Reduced unplanned stockout incidents.
- Reduced obsolete inventory aging in top locations.

## Dependencies & Risks

- Depends on ledger/value-entry data quality and timeliness.
- Risk: planner distrust if model assumptions are opaque.
- Risk: alert fatigue without threshold tuning.

## Sources & References

- Insight forecast endpoint: `src/server/rpc/router/uplink/insight.router.ts:46`
- Insight dashboard/list views: `src/app/_shell/_views/insight/dashboard.tsx:1`
- Insight endpoint tests: `test/uplink/insight-modules.test.ts:131`
- Navigation context: `src/app/_shell/nav-config.ts:127`
- Institutional learnings: none found in `docs/solutions/` as of 2026-02-23.

## Enhancement Summary

**Deepened on:** 2026-02-23  
**Sections enhanced:** 8  
**Research skills applied:** `vercel-react-best-practices`, `vercel-composition-patterns`, `web-design-guidelines`, `security-sentinel`, `performance-oracle`, `architecture-strategist`, `kieran-typescript-reviewer`, `agent-native-architecture`

### Key Improvements

1. Added forecast explainability and confidence guardrails so planners can trust model outputs.
2. Added segmentation and alert deduplication strategy to prevent noisy operations.
3. Added bounded-query and persistence patterns for high-cardinality inventory datasets.

### New Considerations Discovered

- Forecast workbench adoption depends on showing model inputs, data freshness, and confidence intervals directly in results.
- Alerting must include suppression windows and escalation policy to avoid fatigue.

## Deepening Addendum

### Section Manifest

- Section 1: Overview & Problem Statement - transition from passive dashboards to active planning.
- Section 2: Proposed Solution - forecast workbench, segmentation views, subscription alerts.
- Section 3: Technical Considerations - deterministic rules, query bounds, notification integration.
- Section 4: System-Wide Impact - replenishment planning and hub notification propagation.
- Section 5: Acceptance Criteria - trust, dedupe, and operational usability gates.

### Research Insights - Overview & Problem Statement

**Best Practices**

- Show forecast assumptions (horizon, seasonality basis, history window, location scope) alongside output rows.
- Pair forecast with confidence bands and risk class definitions to support explainable planning decisions.
- Keep segmentation logic centrally defined and versioned so dashboards and exports match.

**Performance Considerations**

- Use server-driven pagination and pre-aggregated metrics for category/location drilldowns.
- Apply query cancellation for rapidly changing filters to reduce waterfall requests.

**Implementation Details**

```ts
// Plan-level workbench filter state
interface ForecastWorkbenchFilters {
  horizonDays: number
  locationCodes: string[]
  itemIds: string[]
  riskThreshold: number
  signalWindowDays: number
}
```

**Edge Cases**

- Sparse history items produce unstable forecast noise.
- New item/location combinations with no baseline demand.
- Contradictory signals between stock cover and forecast trend.

### Research Insights - Proposed Solution

**Best Practices**

- Compose workbench into `ForecastControls`, `RiskTable`, `StockCoverPanel`, `AlertPolicyEditor`.
- Persist planner filter presets per user/location and make preset provenance visible.
- Trigger alert notifications only after threshold persistence across an evaluation window.

**Performance Considerations**

- Load heavy forecast outputs lazily by tab/section to improve first paint.
- Use background refetch with stale-while-revalidate behavior for planner sessions.

**Implementation Details**

```ts
// Plan-level alert dedupe key shape
const dedupeKey = `${module}:${location}:${item}:${riskType}:${windowStart}`
```

**Edge Cases**

- Duplicate alerts when the same risk is emitted from multiple data pipelines.
- Planner preset saved against deprecated category or location identifiers.
- Rapid filter changes during long-running forecast query.

### Research Insights - Technical Considerations

**Best Practices**

- Return validation and domain errors with Problem Details payloads for bad horizon/filter combinations.
- Emit correlation IDs from Insight alert evaluations into Hub notification records.
- Keep segmentation thresholds configurable but schema-validated.

**Performance Considerations**

- Enforce hard limits on item/location cardinality per query request.
- Prefer batched aggregation queries instead of client-side joins on large result sets.

**Implementation Details**

```ts
// Plan-level alert policy contract
interface InventoryAlertPolicy {
  stockoutRiskThreshold: number
  obsoleteDaysThreshold: number
  dedupeMinutes: number
  escalationMinutes: number
}
```

**Edge Cases**

- Policy changes mid-evaluation causing inconsistent alert state.
- Out-of-order data ingest producing transient false spikes.
- Missing location mappings between Insight and Hub.

### Research Insights - Acceptance Criteria Hardening

**Additional Quality Gates**

- [ ] Forecast output includes model assumptions, freshness timestamp, and confidence indicator.
- [ ] Alert generation enforces dedupe/suppression windows and records escalation outcomes.
- [ ] Segmentation results are reproducible for the same input snapshot and threshold version.
- [ ] Query endpoints reject over-broad cardinality requests with actionable validation details.
- [ ] Workbench controls and tables remain keyboard-accessible with clear focus order.

### References

- [TanStack Query - Query Cancellation](https://tanstack.com/query/v5/docs/react/guides/query-cancellation)
- [TanStack Query - Query Keys](https://tanstack.com/query/v5/docs/framework/react/guides/query-keys)
- [TanStack Query - Query Invalidation](https://tanstack.com/query/v5/docs/framework/react/guides/query-invalidation)
- [RFC 9457 - Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc9457)
- [Zod - Schema Validation](https://zod.dev/)
- [OWASP API Security Top 10 (2023)](https://owasp.org/API-Security/editions/2023/en/0x11-t10/)
- [WAI-ARIA APG - Grid Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/)
