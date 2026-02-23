---
title: "feat: Trace phase 2 carrier ops and customer communications"
type: feat
status: active
date: 2026-02-23
---

# feat: Trace phase 2 carrier ops and customer communications

## Overview

Operationalize Trace carrier capabilities with dedicated UI for carrier accounts, rate/label workflows, timeline triage, and customer communication automation.

## Problem Statement / Motivation

Trace backend includes carrier operations and timeline APIs, but UI currently emphasizes shipment CRUD and status transitions.

- Carrier account/rate quote/label purchase capabilities are not surfaced in dedicated operations views.
- Tracking timeline and event triage are not central operator workflows.
- Customer communication templates for delay/exception lifecycle are missing.

## Proposed Solution

1. Add carrier operations workspace:
- Manage carrier accounts and capabilities.
- Rate-shop and purchase labels from shipment context.

2. Add shipment timeline + exception triage:
- Unified timeline view with event source, status mapping, and resolution actions.
- Exception taxonomy and triage outcome capture.

3. Add customer communications automation:
- Triggered templates for dispatched/in-transit/exception/delivered updates.
- Opt-in policy and communication log per shipment.

## Technical Considerations

- Preserve webhook signature validation and event idempotency.
- Ensure timeline ordering is robust to out-of-order carrier events.
- Keep communication sends idempotent with dedupe keys.
- Align notification severity/status between Trace and Hub.

## System-Wide Impact

- Interaction graph:
  - Carrier ops writes labels/events; shipment state updates trigger module notifications and customer messages.
- Error propagation:
  - Carrier API failures should produce actionable retries, not silent drops.
- State lifecycle risks:
  - Duplicate tracking events and duplicate customer sends under retries.
- API surface parity:
  - Add UI parity for existing carrier ops APIs and timeline endpoint.
- Integration test scenarios:
  - Quote then purchase then ingest tracking chain.
  - Duplicate webhook event handling.
  - Exception event triggering communications and hub notification.

## Acceptance Criteria

- [ ] Carrier account and label/rate operations are available from UI.
- [ ] Shipment timeline shows normalized event chain and triage actions.
- [ ] Customer communication templates can be configured and triggered.
- [ ] Duplicate events/messages are prevented through idempotency controls.
- [ ] Integration tests cover carrier event ingestion and timeline consistency.

## Success Metrics

- Faster mean time to resolve shipment exceptions.
- Improved on-time customer communication coverage.
- Reduced manual carrier support interventions.

## Dependencies & Risks

- Depends on external carrier API stability and webhook reliability.
- Risk: notification over-send without strict dedupe.
- Risk: timeline confusion if normalization rules are unclear.

## Sources & References

- Trace carrier ops endpoints: `src/server/rpc/router/uplink/trace.router.ts:233`
- Shipment status transition with notification: `src/server/rpc/router/uplink/trace.router.ts:571`
- Current trace dashboard KPI usage: `src/app/_shell/_views/trace/dashboard.tsx:47`
- Trace module tests for carrier ops/timeline: `test/uplink/trace-modules.test.ts:87`
- Related prior plan: `docs/plans/2026-02-23-feat-trace-carrier-integration-and-delivery-kpis-plan.md`
- Institutional learnings: none found in `docs/solutions/` as of 2026-02-23.

## Enhancement Summary

**Deepened on:** 2026-02-23  
**Sections enhanced:** 8  
**Research skills applied:** `vercel-react-best-practices`, `vercel-composition-patterns`, `web-design-guidelines`, `security-sentinel`, `performance-oracle`, `architecture-strategist`, `kieran-typescript-reviewer`, `agent-native-architecture`

### Key Improvements

1. Added carrier webhook/event normalization and timeline ordering safeguards.
2. Added rate/label operations hardening with idempotent purchase flows and retry visibility.
3. Added customer communications dedupe, policy, and compliance guardrails.

### New Considerations Discovered

- Shipment timeline trust requires deterministic event ordering and source-of-truth precedence rules.
- Customer notification quality depends on strict dedupe keys and template lifecycle governance.

## Deepening Addendum

### Section Manifest

- Section 1: Overview & Problem Statement - carrier operations and customer comms UX gaps.
- Section 2: Proposed Solution - carrier workspace, triage timeline, communication automation.
- Section 3: Technical Considerations - webhook validation, idempotency, dedupe.
- Section 4: System-Wide Impact - shipment state, notifications, and customer messaging propagation.
- Section 5: Acceptance Criteria - event consistency and communication reliability gates.

### Research Insights - Overview & Problem Statement

**Best Practices**

- Normalize carrier events into a canonical schema before UI rendering or downstream decisions.
- Keep webhook ingest idempotent by carrier event ID + shipment context.
- Separate operational shipment timeline from outbound customer communication timeline while cross-linking both.

**Performance Considerations**

- Ingest events asynchronously and render timeline from indexed event store.
- Use server-side pagination for event-heavy shipments.

**Implementation Details**

```ts
// Plan-level canonical event shape
interface ShipmentTimelineEvent {
  shipmentId: string
  eventId: string
  carrierCode: string
  eventType: string
  occurredAt: string
  normalizedStatus: 'DISPATCHED' | 'IN_TRANSIT' | 'EXCEPTION' | 'DELIVERED'
}
```

**Edge Cases**

- Out-of-order carrier events with older timestamps arriving late.
- Duplicate webhook deliveries during carrier retry windows.
- Carrier status mapping ambiguity for custom status codes.

### Research Insights - Proposed Solution

**Best Practices**

- Compose Trace operations into `CarrierOpsPanel`, `TimelineTriageBoard`, `CommunicationTemplateCenter`.
- Require triage outcome codes and next action on exception events.
- Use template versioning for customer comms with shipment-context variable validation.

**Performance Considerations**

- Update timeline incrementally rather than full refetch on each event.
- Poll carrier account/rate operations adaptively based on active workflows.

**Implementation Details**

```ts
// Plan-level communication dedupe key
const customerMessageKey = `${shipmentId}:${templateVersion}:${normalizedStatus}:${windowBucket}`
```

**Edge Cases**

- Label purchased but tracking number not yet propagated.
- Communication triggered before customer opt-in status is confirmed.
- Exception resolved but stale message queued from previous state.

### Research Insights - Technical Considerations

**Best Practices**

- Validate webhook signatures and rotate secrets on policy-defined cadence.
- Use Problem Details payloads for carrier API failures and retry decisions.
- Emit trace correlation IDs across ingest, triage, and communication send pipeline.

**Performance Considerations**

- Bound retry attempts by error class (transient vs terminal).
- Monitor ingest lag, duplicate-event ratio, and communication delivery latency.

**Implementation Details**

```ts
// Plan-level triage transition payload
interface TimelineTriageAction {
  eventId: string
  action: 'ACKNOWLEDGE' | 'ESCALATE' | 'RESOLVE'
  reasonCode: string
  expectedEventVersion: number
}
```

**Edge Cases**

- Secret mismatch during webhook validation rollout.
- Communication provider timeout causes uncertain delivery state.
- Unauthorized edits to customer communication templates.

### Research Insights - Acceptance Criteria Hardening

**Additional Quality Gates**

- [ ] Webhook and carrier events are idempotent with deterministic duplicate suppression.
- [ ] Timeline ordering remains consistent under out-of-order event ingestion.
- [ ] Customer communication sends enforce opt-in policy, dedupe, and audit logging.
- [ ] Carrier label/rate operations surface retriable vs terminal failures clearly.
- [ ] Event and notification records share correlation IDs for cross-system debugging.

### References

- [RFC 9457 - Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc9457)
- [Idempotency-Key HTTP Header (IETF Draft)](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/)
- [OpenTelemetry - HTTP Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/http/http-spans/)
- [OWASP API Security Top 10 (2023)](https://owasp.org/API-Security/editions/2023/en/0x11-t10/)
- [MDN - Broadcast Channel API](https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API)
