---
title: "feat: Ledger phase 2 collections and compliance operations"
type: feat
status: active
date: 2026-02-23
---

# feat: Ledger phase 2 collections and compliance operations

## Overview

Add operational workspaces for credit memo handling, e-invoice operations, and receivables collections so Ledger supports end-to-end finance operations, not only posting actions.

## Problem Statement / Motivation

Ledger backend and tests cover posting and e-invoicing flows, but UI remains centered on invoices and ledger lists.

- Credit memo lifecycle lacks dedicated operator workspace.
- E-invoice submission/rejection/retry workflow is not visible as queue-oriented operations.
- Collections process (aging and dunning operations) is not explicit.

## Proposed Solution

1. Add credit memo workspace:
- Create, post, and reconcile credit memos against original invoices.
- Show reason codes and balance impact.

2. Add e-invoice operations center:
- Queue view for submission status, failures, retries, provider references.
- Bulk retry and outcome tracking.

3. Add collections cockpit:
- Aging buckets, risk segmentation, and follow-up actions.
- Log communication outcomes tied to customer ledger entries.

## Technical Considerations

- Keep double-entry integrity on credit memo posting.
- Ensure e-invoice retries are idempotent and auditable.
- Collections actions should not mutate accounting balances directly.
- Standardize reference keys between invoice, submission, and customer ledger records.

## System-Wide Impact

- Interaction graph:
  - Ledger actions affect customer ledger balances and hub audit/notification surfaces.
- Error propagation:
  - Compliance submission failures must remain operationally visible without corrupting posted state.
- State lifecycle risks:
  - Duplicate submissions or duplicate credit postings under retry pressure.
- API surface parity:
  - Extend UI to match existing `creditMemos` and `eInvoicing` backend capabilities.
- Integration test scenarios:
  - Credit memo against partially paid invoice.
  - Reject + retry + accept e-invoice chain.
  - Collection follow-up action on overdue ledger entry.

## Acceptance Criteria

- [ ] Credit memo workspace supports full create/post/review lifecycle.
- [ ] E-invoice operations center shows queue, errors, retries, and outcomes.
- [ ] Collections cockpit shows aging and follow-up workflows.
- [ ] Cross-links exist between invoice, e-invoice submission, and ledger entry records.
- [ ] Integration tests cover retry idempotency and status consistency.

## Success Metrics

- Faster resolution time for e-invoice rejection incidents.
- Lower overdue receivables aging in key buckets.
- Fewer manual reconciliation tickets between finance and operations.

## Dependencies & Risks

- Depends on stable provider response contracts for e-invoicing.
- Risk: compliance workflow complexity may increase support burden without clear UX.
- Risk: collection operations may require jurisdiction-specific handling.

## Sources & References

- Ledger post + e-invoicing routes: `src/server/rpc/router/uplink/ledger.router.ts:204`
- Current invoice action UI: `src/app/_shell/_views/ledger/components/invoice-card.tsx:85`
- Ledger tests for e-invoicing retry lifecycle: `test/uplink/ledger-modules.test.ts:484`
- Navigation context: `src/app/_shell/nav-config.ts:154`
- Related prior plan: `docs/plans/2026-02-23-feat-ledger-credit-memos-and-einvoicing-compliance-plan.md`
- Institutional learnings: none found in `docs/solutions/` as of 2026-02-23.

## Enhancement Summary

**Deepened on:** 2026-02-23  
**Sections enhanced:** 8  
**Research skills applied:** `vercel-react-best-practices`, `vercel-composition-patterns`, `web-design-guidelines`, `security-sentinel`, `performance-oracle`, `architecture-strategist`, `kieran-typescript-reviewer`, `agent-native-architecture`

### Key Improvements

1. Added compliance-safe e-invoice retry/idempotency and reference-linking standards.
2. Added credit memo integrity checks and receivables collections separation of concerns.
3. Added queue observability and error-contract hardening for operational resolution speed.

### New Considerations Discovered

- Collections actions should remain operational metadata and must not mutate posted accounting entries directly.
- E-invoice provider retries require deterministic dedupe keys plus terminal-state protection.

## Deepening Addendum

### Section Manifest

- Section 1: Overview & Problem Statement - operations gap in credit memo, e-invoicing, and collections.
- Section 2: Proposed Solution - dedicated workspaces and queue-driven operations.
- Section 3: Technical Considerations - double-entry integrity, idempotent retries, audit trails.
- Section 4: System-Wide Impact - customer ledger and compliance propagation.
- Section 5: Acceptance Criteria - consistency and operational reliability gates.

### Research Insights - Overview & Problem Statement

**Best Practices**

- Separate financial posting actions from operational follow-up metadata in API boundaries.
- Keep e-invoice lifecycle state machine explicit (`QUEUED`, `SUBMITTED`, `REJECTED`, `RETRYING`, `ACCEPTED`, `FAILED`).
- Require immutable linkage between source invoice, credit memo, and submission provider reference.

**Performance Considerations**

- Use indexed queue filters by state/date/provider to support large operational views.
- Avoid broad joins in list endpoints; fetch details on demand from drilldown panels.

**Implementation Details**

```ts
// Plan-level e-invoice operation identity
interface EInvoiceOperationKey {
  invoiceId: string
  provider: string
  submissionAttempt: number
  idempotencyKey: string
}
```

**Edge Cases**

- Provider returns timeout but actually accepted submission.
- Credit memo requested against invoice already fully offset.
- Collections follow-up logged after account already settled.

### Research Insights - Proposed Solution

**Best Practices**

- Compose Ledger operations into `CreditMemoWorkspace`, `EInvoiceQueue`, and `CollectionsCockpit`.
- Require reason codes for credit memo and collections interactions.
- Show timeline of attempts/outcomes for each e-invoice record with immutable audit stamps.

**Performance Considerations**

- Poll e-invoice queue at adaptive cadence based on active retry volume.
- Invalidate only queue segments affected by retry/post actions.

**Implementation Details**

```ts
// Plan-level collections action payload
interface CollectionsAction {
  customerLedgerEntryId: string
  action: 'CALL' | 'EMAIL' | 'DISPUTE' | 'PROMISE_TO_PAY'
  outcome: string
  nextFollowUpAt?: string
}
```

**Edge Cases**

- Retry command triggered for terminal accepted state.
- Duplicate credit memo post command on network retry.
- Provider reference mismatch between callback and local record.

### Research Insights - Technical Considerations

**Best Practices**

- Use Problem Details for all queue/retry failures with provider correlation IDs.
- Require idempotency keys for credit memo post and e-invoice retry operations.
- Enforce role-based access for high-impact collections and compliance actions.

**Performance Considerations**

- Cap concurrent retry workers to avoid provider throttling cascades.
- Track queue depth and retry age as first-class operational metrics.

**Implementation Details**

```ts
// Plan-level queue SLA metric shape
interface EInvoiceQueueMetrics {
  pendingCount: number
  retryingCount: number
  meanRetryAgeMinutes: number
  oldestPendingMinutes: number
}
```

**Edge Cases**

- Callback arrives out-of-order versus local retry updates.
- Unauthorized user attempts bulk retry or credit posting.
- Collections workflow acts on stale receivable balance snapshot.

### Research Insights - Acceptance Criteria Hardening

**Additional Quality Gates**

- [ ] Credit memo posting preserves double-entry integrity and rejects duplicate post attempts.
- [ ] E-invoice retries are idempotent, auditable, and blocked for terminal states.
- [ ] Collections actions are logged as operational events without direct balance mutation.
- [ ] Queue/API errors expose machine-readable problem details with correlation identifiers.
- [ ] Cross-links between invoice, credit memo, and e-invoice provider references remain consistent.

### References

- [RFC 9457 - Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc9457)
- [Idempotency-Key HTTP Header (IETF Draft)](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/)
- [TanStack Query - Query Invalidation](https://tanstack.com/query/v5/docs/framework/react/guides/query-invalidation)
- [OWASP API Security Top 10 (2023)](https://owasp.org/API-Security/editions/2023/en/0x11-t10/)
- [OpenTelemetry - HTTP Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/http/http-spans/)
