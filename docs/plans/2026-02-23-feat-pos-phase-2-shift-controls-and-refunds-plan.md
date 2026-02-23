---
title: "feat: POS phase 2 shift controls and refunds"
type: feat
status: active
date: 2026-02-23
---

# feat: POS phase 2 shift controls and refunds

## Overview

Add shift-level financial controls, controlled refund/void operations, and terminal/device health monitoring to improve POS reliability and auditability in store operations.

## Problem Statement / Motivation

POS terminal and offline queue behavior are present, but critical end-of-shift and refund governance workflows are still missing.

- No shift reconciliation workflow (expected vs counted cash).
- Refund/void operations are not managed in a dedicated approval center.
- Device/peripheral health is not centralized for store operators.

## Proposed Solution

1. Add shift reconciliation screen:
- End-of-shift count capture, variance reason, manager sign-off.
- Reconciliation history by terminal/session.

2. Add refund/void operations center:
- Locate by receipt, enforce reason templates and role approvals.
- Track outcomes and flags for high-risk patterns.

3. Add terminal health dashboard:
- Terminal + scanner/printer/payment-device status.
- Alert store ops when sessions are open on degraded devices.

## Technical Considerations

- Preserve current offline queue and idempotency model during refund flows.
- Enforce manager approval and reason-required controls for void/refund.
- Keep session lifecycle consistent with reconciliation close events.
- Use bounded polling/subscription for device health to avoid UI overload.

## System-Wide Impact

- Interaction graph:
  - POS session/transaction actions impact market inventory and financial downstream modules.
- Error propagation:
  - Device failures and payment reversals must generate clear operational alerts.
- State lifecycle risks:
  - Offline queue replay colliding with refund events on synced transactions.
- API surface parity:
  - Extend POS UI around existing session/transaction APIs and add reconciliation endpoints.
- Integration test scenarios:
  - Close shift with variance and manager approval.
  - Refund after offline-synced sale.
  - Device degraded during active session.

## Acceptance Criteria

- [x] Shift reconciliation flow exists with variance + reason capture.
- [x] Refund/void center supports receipt lookup and approval controls.
- [x] Device health dashboard surfaces terminal and peripheral status.
- [x] Offline queue remains safe for replay with refund edge cases.
- [x] Integration tests cover shift-close, refund governance, and offline conflict paths.

## Success Metrics

- Reduced un-reconciled session count.
- Reduced refund processing time with higher audit quality.
- Faster detection of terminal/device outages impacting checkout.

## Dependencies & Risks

- Depends on reliable session metadata and device telemetry availability.
- Risk: refund abuse if approval and reason controls are weak.
- Risk: operational friction if reconciliation flow is too heavy.

## Sources & References

- POS router and start-session API: `src/server/rpc/router/uplink/pos.router.ts:83`
- POS terminal runtime flow: `src/app/_shell/_views/pos/terminal-view.tsx:1`
- POS session start UI: `src/app/_shell/_views/pos/components/session-select-dialog.tsx:66`
- POS module tests: `test/uplink/pos-modules.test.ts:72`
- Related pending item context: `todos/013-pending-p3-pos-offline-sync-and-recovery-queue.md`
- Institutional learnings: none found in `docs/solutions/` as of 2026-02-23.

## Enhancement Summary

**Deepened on:** 2026-02-23  
**Sections enhanced:** 8  
**Research skills applied:** `vercel-react-best-practices`, `vercel-composition-patterns`, `web-design-guidelines`, `security-sentinel`, `performance-oracle`, `architecture-strategist`, `kieran-typescript-reviewer`, `agent-native-architecture`

### Key Improvements

1. Added shift-close reconciliation controls with manager sign-off and immutable variance rationale.
2. Added refund/void governance hardening for offline replay and abuse prevention.
3. Added terminal/peripheral health observability and degraded-session safeguards.

### New Considerations Discovered

- Offline queue replay must be conflict-aware with post-sale refund/void actions.
- Refund trust and fraud control depend on strict reason templates, approval thresholds, and auditability.

## Deepening Addendum

### Section Manifest

- Section 1: Overview & Problem Statement - shift, refund, and device governance gaps.
- Section 2: Proposed Solution - shift reconciliation, refund center, health dashboard.
- Section 3: Technical Considerations - idempotency, approvals, session lifecycle consistency.
- Section 4: System-Wide Impact - inventory, financial posting, and ops alert propagation.
- Section 5: Acceptance Criteria - replay safety and operational reliability gates.

### Research Insights - Overview & Problem Statement

**Best Practices**

- Treat shift close as a controlled state transition with mandatory counted amounts and variance reason.
- Require manager authorization for high-risk void/refund actions with policy thresholds.
- Model device health severity levels and expose actionable runbooks in UI.

**Performance Considerations**

- Use incremental session history queries to keep terminal UI responsive during high transaction volume.
- Keep telemetry sampling bounded and aggregate peripheral health server-side.

**Implementation Details**

```ts
// Plan-level shift reconciliation contract
interface ShiftCloseInput {
  sessionId: string
  countedCash: number
  expectedCash: number
  varianceReasonCode: string
  managerApprovalId: string
}
```

**Edge Cases**

- Session close attempted while pending offline queue items remain unsynced.
- Refund requested for sale that is still syncing from offline mode.
- Peripheral disconnect flapping causes noisy health transitions.

### Research Insights - Proposed Solution

**Best Practices**

- Compose POS operations into `ShiftReconciliationPanel`, `RefundGovernanceQueue`, `TerminalHealthBoard`.
- Use structured refund reason taxonomy and enforce receipt lookup before action.
- Require explicit conflict resolution flow when replay and refund touch same transaction.

**Performance Considerations**

- Use selective query invalidation for session/refund/device data after mutations.
- Apply adaptive polling on health board only for degraded terminals.

**Implementation Details**

```ts
// Plan-level refund decision payload
interface RefundDecisionInput {
  transactionId: string
  lineIds?: string[]
  reasonCode: string
  approvalRequired: boolean
  expectedTransactionVersion: number
}
```

**Edge Cases**

- Duplicate refund requests from terminal retries.
- Manager approval revoked while request is pending.
- Shift variance reason omitted on non-zero differences.

### Research Insights - Technical Considerations

**Best Practices**

- Use idempotency keys for refund/void commands and offline replay apply operations.
- Return Problem Details for replay conflicts and approval policy failures.
- Audit all refund and shift-close actions with actor/device/session correlation IDs.

**Performance Considerations**

- Cap replay batch sizes to avoid UI lockups during reconnect.
- Track sync lag, replay failure ratio, and reconciliation backlog metrics.

**Implementation Details**

```ts
// Plan-level replay conflict shape
interface ReplayConflict {
  queuedOperationId: string
  conflictType: 'ALREADY_REFUNDED' | 'ALREADY_VOIDED' | 'VERSION_MISMATCH'
  resolution: 'SKIP' | 'MANUAL_REVIEW'
}
```

**Edge Cases**

- Partial replay success leaves terminal in mixed local/remote state.
- Unauthorized staff attempts manual void override.
- Device health shows stale data due to network partition.

### Research Insights - Acceptance Criteria Hardening

**Additional Quality Gates**

- [x] Shift close requires variance reason and manager sign-off for policy-defined thresholds.
- [x] Refund/void commands are idempotent and conflict-safe with offline replay operations.
- [x] Device health dashboard distinguishes transient vs persistent degradation states.
- [x] Audit trail links every high-risk action to session, actor, terminal, and timestamp.
- [x] Operational errors expose machine-readable causes and remediation hints.

### References

- [RFC 9457 - Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc9457)
- [Idempotency-Key HTTP Header (IETF Draft)](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/)
- [MDN - Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [MDN - Background Synchronization API](https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API)
- [OWASP API Security Top 10 (2023)](https://owasp.org/API-Security/editions/2023/en/0x11-t10/)
- [WAI-ARIA APG - Dialog (Modal) Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
