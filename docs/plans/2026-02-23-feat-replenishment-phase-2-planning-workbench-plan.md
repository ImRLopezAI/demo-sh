---
title: "feat: Replenishment phase 2 planning workbench"
type: feat
status: active
date: 2026-02-23
---

# feat: Replenishment phase 2 planning workbench

## Overview

Build a replenishment planning workbench that operationalizes proposal generation/allocation into planner workflows with supplier performance and exception queues.

## Problem Statement / Motivation

Replenishment has strong backend planning endpoints and procure-to-pay actions, but planners still lack consolidated planning UX.

- Proposal and allocation endpoints are primarily API/test-driven.
- Supplier performance signals are not centralized for decision-making.
- Exception handling (late receipts, invoicing mismatch, blocked vendors) is distributed across lists.

## Proposed Solution

1. Add planning workbench:
- Run/generate purchase and transfer proposals from UI.
- Approve, modify, or reject proposals with reason capture.

2. Add supplier scorecards:
- Lead-time variance, fill rate, price variance, invoice match rate.
- Link scorecards to planner action recommendations.

3. Add exception queue:
- Unified queue for late receipts, over/under receipts, invoice mismatch, constrained allocation.
- Bulk triage actions and assignment to operations tasks.

## Technical Considerations

- Preserve idempotency for proposal generation and allocation actions.
- Avoid duplicate proposal runs from UI + scheduler overlap.
- Define exception taxonomy and consistent status transitions.
- Keep planner actions auditable and permission-controlled.

## System-Wide Impact

- Interaction graph:
  - Planning actions update purchase/transfer documents and feed hub tasks/notifications.
- Error propagation:
  - Proposal generation failures should surface line-level root cause and partial-scope context.
- State lifecycle risks:
  - Duplicate or stale proposals if run windows are not tracked.
- API surface parity:
  - Expose proposal/allocation capabilities in UI with explicit controls.
- Integration test scenarios:
  - Generate proposals with demand spike conditions.
  - Allocation under constrained stock.
  - Exception triage updates downstream tasking.

## Acceptance Criteria

- [x] Planner can run purchase/transfer proposal generation from UI.
- [x] Planner can inspect and action proposal results in one screen.
- [x] Supplier scorecards are visible and filterable.
- [x] Exception queue supports triage, assignment, and status transitions.
- [x] Tests cover proposal idempotency and duplicate-run protections.

## Success Metrics

- Reduced manual planning cycle time.
- Improved supplier on-time and fill-rate KPIs.
- Lower unresolved exception backlog.

## Dependencies & Risks

- Depends on clean upstream demand and receipt data.
- Risk: over-automation can produce low-trust proposals without explainability.
- Risk: race conditions with scheduled jobs if no run-window lock is applied.

## Sources & References

- Replenishment planner endpoints: `src/server/rpc/router/uplink/replenishment.router.ts:1029`
- Purchase lifecycle UI: `src/app/_shell/_views/replenishment/components/purchase-order-card.tsx:137`
- Replenishment module tests (proposals/allocation): `test/uplink/replenishment-modules.test.ts:714`
- Navigation context: `src/app/_shell/nav-config.ts:82`
- Related prior plan: `docs/plans/2026-02-23-feat-replenishment-procure-to-pay-lifecycle-plan.md`
- Institutional learnings: none found in `docs/solutions/` as of 2026-02-23.

## Enhancement Summary

**Deepened on:** 2026-02-23  
**Sections enhanced:** 8  
**Research skills applied:** `vercel-react-best-practices`, `vercel-composition-patterns`, `web-design-guidelines`, `security-sentinel`, `performance-oracle`, `architecture-strategist`, `kieran-typescript-reviewer`, `agent-native-architecture`

### Key Improvements

1. Added run-window controls and idempotency keys for proposal generation safety.
2. Added supplier-scorecard decision support standards and exception taxonomy alignment.
3. Added concurrency and observability hardening for planner + scheduler coexistence.

### New Considerations Discovered

- Planning trust requires explicit proposal explainability (source demand signal, safety stock rule, constraint reason).
- Exception queues need strict state transition ownership to avoid unresolved backlog loops.

## Deepening Addendum

### Section Manifest

- Section 1: Overview & Problem Statement - planner UX gap over existing APIs.
- Section 2: Proposed Solution - planning workbench, supplier scorecards, exception queue.
- Section 3: Technical Considerations - idempotency, duplicate-run prevention, permission controls.
- Section 4: System-Wide Impact - procurement, transfer, and task-notification propagation.
- Section 5: Acceptance Criteria - idempotency and triage quality gates.

### Research Insights - Overview & Problem Statement

**Best Practices**

- Treat proposal generation as a command with explicit run identity and immutable snapshot metadata.
- Store proposal explanation fields at line level (trigger rule, demand window, allocated source) for planner confidence.
- Keep scheduler and manual planner actions unified behind one dedupe strategy.

**Performance Considerations**

- Partition planning queries by location/vendor bands to avoid unbounded scans.
- Stream or chunk large proposal results rather than materializing full datasets in one response.

**Implementation Details**

```ts
// Plan-level run identity contract
interface PlanningRunIdentity {
  runId: string
  trigger: 'SCHEDULED' | 'MANUAL'
  windowStart: string
  windowEnd: string
  policyVersion: string
}
```

**Edge Cases**

- Scheduler and UI trigger same window simultaneously.
- Supplier master data changes during an active run.
- Transfer proposal references inventory that was consumed post-snapshot.

### Research Insights - Proposed Solution

**Best Practices**

- Compose workbench with `RunLauncher`, `ProposalReviewTable`, `SupplierScorecardPanel`, `ExceptionQueue`.
- Enforce reason capture for approve/reject/edit actions on proposals.
- Use a normalized exception taxonomy (`LATE_RECEIPT`, `INVOICE_MISMATCH`, `ALLOC_CONFLICT`, `VENDOR_BLOCKED`).

**Performance Considerations**

- Lazy-load scorecard detail panels and historical trend charts.
- Use targeted invalidation per run and exception bucket after actions.

**Implementation Details**

```ts
// Plan-level proposal action input
interface ProposalActionInput {
  proposalId: string
  action: 'APPROVE' | 'REJECT' | 'MODIFY'
  reasonCode: string
  expectedVersion: number
}
```

**Edge Cases**

- Approve action submitted against stale proposal version.
- Bulk triage partially fails due to mixed permission scope.
- Scorecard KPI denominator is zero for new suppliers.

### Research Insights - Technical Considerations

**Best Practices**

- Require idempotency key for run-generation and bulk triage commands.
- Use Problem Details with line-level diagnostics for partial generation failures.
- Emit trace spans around proposal generation, allocation, and exception transitions.

**Performance Considerations**

- Implement retry with jitter only for transient dependencies, not validation failures.
- Apply hard limits to run scope and provide continuation tokens for large result sets.

**Implementation Details**

```ts
// Plan-level partial failure payload
interface ProposalGenerationWarning {
  itemId: string
  locationCode: string
  code: 'INSUFFICIENT_HISTORY' | 'SUPPLIER_BLOCKED' | 'CONSTRAINT_FAILURE'
  detail: string
}
```

**Edge Cases**

- Duplicate proposals from retrying failed HTTP responses.
- Exception queue item transitions performed out of order.
- Unauthorized vendor-sensitive scorecard visibility.

### Research Insights - Acceptance Criteria Hardening

**Additional Quality Gates**

- [ ] Proposal generation is idempotent per run window and policy version.
- [ ] Planner actions enforce optimistic concurrency and structured reason codes.
- [ ] Exception taxonomy is consistent across API, UI, and notification surfaces.
- [ ] Scheduler/manual overlaps are detected and surfaced without double materialization.
- [ ] Traceability metadata links proposal lines to source demand and supplier context.

### References

- [Idempotency-Key HTTP Header (IETF Draft)](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/)
- [RFC 9457 - Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc9457)
- [TanStack Query - Query Invalidation](https://tanstack.com/query/v5/docs/framework/react/guides/query-invalidation)
- [TanStack Query - Query Keys](https://tanstack.com/query/v5/docs/framework/react/guides/query-keys)
- [OpenTelemetry JS - Getting Started](https://opentelemetry.io/docs/languages/js/getting-started/)
- [OWASP API Security Top 10 (2023)](https://owasp.org/API-Security/editions/2023/en/0x11-t10/)
