---
title: "feat: Flow phase 2 reconciliation and approvals"
type: feat
status: active
date: 2026-02-23
---

# feat: Flow phase 2 reconciliation and approvals

## Overview

Expand Flow operations with a reconciliation console, maker-checker payment controls, and scenario-based cash planning to strengthen finance governance and predictability.

## Problem Statement / Motivation

Flow already supports batch posting and forecasting, but reconciliation and approval governance are still thin at UI workflow level.

- Reconciliation statuses exist without a focused matching/exception console.
- Payment journal supports batch post but lacks robust approval workflow UX.
- Forecast is available, but scenario planning (best/base/worst) is not.

## Proposed Solution

1. Add reconciliation console:
- Match/open/exception/reconciled actions with operator workflow.
- Exception reason quality controls and aging buckets.

2. Add maker-checker controls:
- Approval queue for high-value or sensitive journal batches.
- Distinct maker and checker actions with audit stamps.

3. Add scenario cash planner:
- Best/base/worst assumptions over forecast horizon.
- Variance view and threshold-alert simulation before commitment.

## Technical Considerations

- Enforce role separation between submitter and approver.
- Keep posted-state transitions immutable and reasoned.
- Reconciliation matching must be deterministic and traceable.
- Scenario planner should use non-destructive overlays, not mutate baseline data.

## System-Wide Impact

- Interaction graph:
  - Journal/reconciliation actions propagate to GL and bank ledgers and inform hub SLA/ops signals.
- Error propagation:
  - Posting/reconciliation failures must include actionable reasons per line/document.
- State lifecycle risks:
  - Double-post risk if approval and post actions race.
- API surface parity:
  - Extend UI to leverage existing post/forecast APIs plus new approval/reconciliation actions.
- Integration test scenarios:
  - Approval-required vs auto-post path.
  - Reconciliation exception then recovery.
  - Scenario deltas reflected in planner without writing production values.

## Acceptance Criteria

- [ ] Reconciliation console supports open/matched/exception/reconciled workflows.
- [ ] Maker-checker rules are enforceable and auditable.
- [ ] Scenario planner supports configurable assumptions and comparison output.
- [ ] Batch posting honors approval gates for configured thresholds.
- [ ] Integration tests cover approval races and reconciliation transitions.

## Success Metrics

- Reduced unresolved reconciliation exception backlog.
- Reduced unauthorized or unreviewed postings.
- Improved forecast confidence for short-term cash operations.

## Dependencies & Risks

- Depends on clean bank-ledger event quality and account mappings.
- Risk: governance complexity can slow daily operations if not tuned.
- Risk: scenario misuse if assumptions are not transparent.

## Sources & References

- Flow posting + forecasting routes: `src/server/rpc/router/uplink/flow.router.ts:134`
- Payment journal UI action: `src/app/_shell/_views/flow/payment-journal.tsx:69`
- Forecast dashboard integration: `src/app/_shell/_views/flow/dashboard.tsx:137`
- Flow module tests: `test/uplink/flow-modules.test.ts:219`
- Related prior plan: `docs/plans/2026-02-23-feat-scheduled-automation-for-ops-and-planning-plan.md`
- Institutional learnings: none found in `docs/solutions/` as of 2026-02-23.

## Enhancement Summary

**Deepened on:** 2026-02-23  
**Sections enhanced:** 8  
**Research skills applied:** `vercel-react-best-practices`, `vercel-composition-patterns`, `web-design-guidelines`, `security-sentinel`, `performance-oracle`, `architecture-strategist`, `kieran-typescript-reviewer`, `agent-native-architecture`

### Key Improvements

1. Added deterministic reconciliation matching and exception lifecycle hardening.
2. Added maker-checker separation and approval race protections for sensitive postings.
3. Added scenario-planning isolation rules so projections do not mutate production balances.

### New Considerations Discovered

- Approval and posting paths require explicit conflict contracts to prevent double-posting under concurrent actions.
- Reconciliation usability depends on transparent match rationale and exception aging visibility.

## Deepening Addendum

### Section Manifest

- Section 1: Overview & Problem Statement - reconciliation and governance UX gaps.
- Section 2: Proposed Solution - reconciliation console, maker-checker queue, scenario planner.
- Section 3: Technical Considerations - role separation, immutability, deterministic matching.
- Section 4: System-Wide Impact - GL/bank propagation and operational alerts.
- Section 5: Acceptance Criteria - race-free approval and non-destructive forecast safeguards.

### Research Insights - Overview & Problem Statement

**Best Practices**

- Define reconciliation matching hierarchy (exact, tolerance-based, manual override) with explicit rationale fields.
- Enforce maker-checker role separation server-side, not only in UI affordances.
- Keep scenario planning data in overlay records tied to author/timestamp and baseline version.

**Performance Considerations**

- Use incremental reconciliation loads by statement window and account segment.
- Precompute mismatch buckets for dashboard summary cards.

**Implementation Details**

```ts
// Plan-level reconciliation status model
type ReconciliationStatus = 'OPEN' | 'MATCHED' | 'EXCEPTION' | 'RECONCILED'
```

**Edge Cases**

- One bank entry matches multiple potential journal lines.
- Approver acts on batch already posted by background process.
- Scenario assumptions changed during active comparison session.

### Research Insights - Proposed Solution

**Best Practices**

- Compose Flow screens into `ReconciliationConsole`, `ApprovalQueue`, `ScenarioPlanner`, `VarianceInspector`.
- Require reason code and comment for manual match overrides and rejected approvals.
- Display immutable approval trail (maker, checker, timestamp, reason) in batch details.

**Performance Considerations**

- Refresh approval queue with adaptive polling based on pending count.
- Invalidate reconciliation bucket queries selectively after match/exception actions.

**Implementation Details**

```ts
// Plan-level approval payload
interface JournalApprovalDecision {
  batchId: string
  decision: 'APPROVE' | 'REJECT'
  reasonCode: string
  expectedStatus: 'PENDING_APPROVAL'
}
```

**Edge Cases**

- Self-approval attempt by same actor (maker == checker).
- Posting attempt without required approval for thresholded amount.
- Reconciliation reopened after late-arriving bank correction event.

### Research Insights - Technical Considerations

**Best Practices**

- Use Problem Details for failed match/post/approval actions with actionable guidance.
- Require idempotency keys for post and approval commands.
- Instrument approval and reconciliation transitions with trace spans and correlation IDs.

**Performance Considerations**

- Cap auto-retry for posting/approval commands to avoid cascading duplicate submissions.
- Track latency and backlog metrics by status bucket to drive operations tuning.

**Implementation Details**

```ts
// Plan-level scenario isolation guard
interface ScenarioPlan {
  scenarioId: string
  baselineVersion: string
  assumptions: Record<string, number>
  isPersistedToLedger: false
}
```

**Edge Cases**

- Duplicate approval requests caused by slow client retries.
- Exception resolution performed on stale reconciliation version.
- Unauthorized bypass attempt via direct API call.

### Research Insights - Acceptance Criteria Hardening

**Additional Quality Gates**

- [ ] Maker-checker controls prevent self-approval and enforce threshold policy consistently.
- [ ] Approval/post commands are idempotent and reject stale or invalid status transitions.
- [ ] Reconciliation matching logic is deterministic with explicit match rationale stored.
- [ ] Scenario planner writes never mutate baseline ledger or posted states.
- [ ] Queue and reconciliation errors return machine-readable Problem Details.

### References

- [RFC 9457 - Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc9457)
- [Idempotency-Key HTTP Header (IETF Draft)](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/)
- [TanStack Query - Query Keys](https://tanstack.com/query/v5/docs/framework/react/guides/query-keys)
- [TanStack Query - Query Invalidation](https://tanstack.com/query/v5/docs/framework/react/guides/query-invalidation)
- [OpenTelemetry JS - Getting Started](https://opentelemetry.io/docs/languages/js/getting-started/)
- [OWASP API Security Top 10 (2023)](https://owasp.org/API-Security/editions/2023/en/0x11-t10/)
