---
title: "feat: Hub phase 2 orchestration control room"
type: feat
status: active
date: 2026-02-23
---

# feat: Hub phase 2 orchestration control room

## Overview

Add an operator-grade control room in Hub for order orchestration, incident timelines, and SLA policy tuning so Hub can run cross-module workflows from UI instead of test-only/API-only entry points.

## Problem Statement / Motivation

Hub already exposes advanced orchestration and SLA procedures, but the UI/nav currently covers dashboards, tasks, and notifications only.

- `orderFulfillment` start/resume/status exists in backend but is not exposed as a first-class view.
- Operators must correlate tasks, notifications, and audit entries manually across screens.
- SLA behavior is visible, but policy tuning is not centralized.

## Proposed Solution

1. Add a new `/hub/order-fulfillment` view:
- Start flow for an order ID.
- Resume failed/paused workflow by workflow ID.
- Display stage-by-stage workflow status.

2. Add an incident timeline panel:
- Correlate operation task, notification, and audit log entries by correlation markers.
- Show ordered event timeline with actor, status, and failure reason.

3. Add SLA policy controls:
- Module-level policy editor for breach lookahead, due windows, escalation thresholds.
- Save revisions through existing module settings/revision APIs.

## Technical Considerations

- Enforce role/permission boundaries for orchestration actions.
- Keep idempotency behavior visible to avoid duplicate starts.
- Use optimistic UI only for local state; orchestration status must be server truth.
- Reuse existing Hub query invalidation strategy for consistency.

## System-Wide Impact

- Interaction graph:
  - Hub UI action triggers `hub.orderFulfillment.*`, which triggers Market/Ledger/Trace transitions and feeds Hub tasks/notifications.
- Error propagation:
  - Orchestration stage errors must map to actionable incident rows with retry-safe affordances.
- State lifecycle risks:
  - Duplicate orchestration starts and stale run states if polling/subscriptions are inconsistent.
- API surface parity:
  - Adds UI parity for existing backend capabilities without breaking current dashboards.
- Integration test scenarios:
  - Start success path.
  - Start idempotent retry.
  - Resume from failed stage.
  - Permission-denied start.

## Acceptance Criteria

- [x] New `hub/order-fulfillment` route is available in navigation.
- [x] Operators can start and resume workflows from UI.
- [x] Stage timeline renders real status from `getOrderFulfillmentStatus`.
- [x] Incident timeline correlates task + notification + audit records.
- [x] SLA policy updates are versioned and rollback-capable.
- [x] E2E coverage validates orchestration UI happy path and failure resume.

## Success Metrics

- Reduced mean time to detect orchestration failures.
- Reduced mean time to recover failed order workflows.
- Fewer manual support escalations for “where is my order in workflow?”

## Dependencies & Risks

- Depends on stable orchestration markers and consistent correlation IDs.
- Risk: noisy timelines if event normalization is weak.
- Risk: operator misuse without permission-safe action controls.

## Sources & References

- Backend orchestration endpoints: `src/server/rpc/router/uplink/hub.router.ts:3591`
- SLA scoring/evaluation: `src/server/rpc/router/uplink/hub.router.ts:2212`
- Hub dashboard surfaces: `src/app/_shell/_views/hub/dashboard.tsx:142`
- Hub notifications and settings UI: `src/app/_shell/_views/hub/notifications-list.tsx:194`
- Cross-module orchestration test coverage: `src/app/_shell/_views/hub/__test__/e2e/hub-cross-module-workflows.test.ts:273`
- Related prior plan: `docs/plans/2026-02-23-feat-cross-module-sales-to-fulfillment-orchestration-plan.md`
- Institutional learnings: none found in `docs/solutions/` as of 2026-02-23.

## Enhancement Summary

**Deepened on:** 2026-02-23  
**Sections enhanced:** 8  
**Research skills applied:** `vercel-react-best-practices`, `vercel-composition-patterns`, `web-design-guidelines`, `security-sentinel`, `performance-oracle`, `architecture-strategist`, `kieran-typescript-reviewer`, `agent-native-architecture`

### Key Improvements

1. Added explicit idempotency, error contract, and observability patterns for orchestration lifecycle actions.
2. Added concrete UI architecture guidance for control-room screens (composition, accessibility, polling, and mutation consistency).
3. Added security and operational hardening requirements for incident timeline and SLA policy controls.

### New Considerations Discovered

- Orchestration start/resume operations need explicit dedupe semantics plus conflict-safe status codes to prevent duplicate downstream side effects.
- Timeline and SLA dashboards should use bounded polling/cancellation and query-key discipline to avoid cache drift and waterfall fetches.

## Deepening Addendum

### Section Manifest

- Section 1: Overview & Problem Statement - orchestration parity and operator UX gaps.
- Section 2: Proposed Solution - control-room route, timeline composition, SLA policy editing.
- Section 3: Technical Considerations - idempotency, authz, cache consistency, observability.
- Section 4: System-Wide Impact - error propagation, state lifecycle, API parity.
- Section 5: Acceptance Criteria - measurable quality gates.

### Research Insights - Overview & Problem Statement

**Best Practices**

- Treat orchestration actions (`start`, `resume`) as idempotent commands with replay-safe semantics.
- Model failures with machine-readable HTTP problem details to improve operator and agent remediation flows.
- Keep UI and agent parity for all control-room actions (start, resume, status, policy edit) so operations are automatable.

**Performance Considerations**

- Use stable query keys and targeted invalidation for workflow status + incident timeline queries.
- Use bounded polling intervals and cancellation when route is inactive to avoid stale and expensive dashboards.

**Implementation Details**

```ts
// Hub orchestration status query pattern (plan-level pseudo-code)
const statusQuery = useQuery({
  ...$rpc.hub.orderFulfillment.getOrderFulfillmentStatus.queryOptions({
    input: { workflowId },
  }),
  enabled: Boolean(workflowId),
  refetchInterval: (q) => (q.state.data?.status === 'RUNNING' ? 5000 : false),
  retry: (failureCount, err) => failureCount < 3,
})
```

**Edge Cases**

- Duplicate start requests from retries or double-clicks.
- Resume attempts against terminal or unknown workflow stages.
- Status screen open in multiple tabs causing conflicting optimistic state.

### Research Insights - Proposed Solution

**Best Practices**

- Compose the control-room screen as explicit subcomponents: `WorkflowCommandPanel`, `TimelinePanel`, `PolicyEditor`, `RunHealthPanel`.
- Use modal/dialog flows that conform to ARIA dialog pattern for high-risk actions.
- Enforce role and permission checks server-side for all state-changing control-room commands.

**Performance Considerations**

- Prefer parallel query execution for independent timeline, task, and audit data.
- Avoid broad cache busting; invalidate only impacted query families after mutation.

**Implementation Details**

```ts
// Mutation contract with conflict-safe handling and invalidation fan-out
const resumeMutation = useMutation({
  ...$rpc.hub.orderFulfillment.resumeOrderFulfillment.mutationOptions({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: $rpc.hub.orderFulfillment.key() })
      queryClient.invalidateQueries({ queryKey: $rpc.hub.operationTasks.key() })
      queryClient.invalidateQueries({ queryKey: $rpc.hub.notifications.key() })
    },
  }),
})
```

**Edge Cases**

- Resume called while workflow is already running.
- SLA policy rollback to incompatible schema version.
- Correlation markers missing in legacy records.

### Research Insights - Technical Considerations

**Best Practices**

- Standardize API errors using `application/problem+json` and include correlation IDs.
- Instrument orchestration stages with OpenTelemetry spans and consistent stage attributes.
- Require explicit idempotency key handling for command-like endpoints.

**Performance Considerations**

- Use retry with exponential backoff/jitter for transient orchestration dependencies.
- Cap retries for operational commands to avoid cascading failures.

**Implementation Details**

```ts
// Plan-level API contract shape
type Problem = {
  type: string
  title: string
  status: number
  detail?: string
  instance?: string
  correlationId?: string
}
```

**Edge Cases**

- Network split between Hub and downstream modules.
- Partial success (invoice posted, shipment pending) requiring deterministic resume point.
- Unauthorized access attempts on policy endpoints.

### Research Insights - Acceptance Criteria Hardening

**Additional Quality Gates**

- [x] Orchestration start/resume endpoints are idempotent and return deterministic conflict responses.
- [x] Control-room queries use stable query keys and targeted invalidation only.
- [ ] Incident timeline is keyboard-navigable and dialog actions meet ARIA modal requirements.
- [ ] OpenTelemetry traces exist for each workflow stage transition.
- [ ] Problem Details responses include correlation identifiers for operator support.

### References

- [TanStack Query - Query Invalidation](https://tanstack.com/query/v5/docs/framework/react/guides/query-invalidation)
- [TanStack Query - Optimistic Updates](https://tanstack.com/query/v5/docs/framework/react/guides/optimistic-updates)
- [TanStack Query - Query Cancellation](https://tanstack.com/query/v5/docs/react/guides/query-cancellation)
- [TanStack Query - Query Keys](https://tanstack.com/query/v5/docs/framework/react/guides/query-keys)
- [TanStack Router - File-Based Routing](https://tanstack.com/router/v1/docs/framework/react/routing/file-based-routing)
- [React - useTransition](https://react.dev/reference/react/useTransition)
- [WAI-ARIA APG - Dialog (Modal) Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- [RFC 9457 - Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc9457)
- [Idempotency-Key HTTP Header (IETF Draft)](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/)
- [OWASP API Security Top 10 (2023)](https://owasp.org/API-Security/editions/2023/en/0x11-t10/)
- [OpenTelemetry JS - Getting Started](https://opentelemetry.io/docs/languages/js/getting-started/)
- [OpenTelemetry - HTTP Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/http/http-spans/)
