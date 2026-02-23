---
title: "feat: Market phase 2 pricing and returns operations"
type: feat
status: active
date: 2026-02-23
---

# feat: Market phase 2 pricing and returns operations

## Overview

Add operator and agent tooling for pricing simulation, reservation monitoring, and returns-to-credit-memo flow to close the remaining commercial operations gap in Market.

## Problem Statement / Motivation

Market supports order/cart workflows, but high-value pricing controls and return operations are still fragmented.

- Pricing evaluation endpoints exist but are not surfaced in dedicated planning UI.
- Reservations are created/released through order transitions, but there is no monitoring/aging console.
- Return and RMA lifecycle is not first-class in Market UI.

## Proposed Solution

1. Add pricing simulation workspace:
- Quote line/cart pricing with tax and promotion inputs before save/approval.
- Explain applied rules for operator confidence.

2. Add reservation operations console:
- Monitor reservation aging, over-allocations, release reasons.
- Bulk release/reassign support for stale reservations.

3. Add returns workflow:
- Create return authorization in Market.
- Trigger/track downstream credit memo workflow in Ledger.

## Technical Considerations

- Keep pricing engine deterministic and side-effect free.
- Preserve inventory integrity when reservation actions happen outside order transitions.
- Ensure return lifecycle has explicit status model and audit trail.
- Avoid bypassing existing role/permission checks on checkout/approval surfaces.

## System-Wide Impact

- Interaction graph:
  - Market pricing/reservation actions influence Sales Orders, inventory allocations, and Ledger credit memo triggers.
- Error propagation:
  - Rule evaluation errors must be structured (invalid promotion, tax mismatch, missing policy).
- State lifecycle risks:
  - Reservation leaks and double release under concurrent operator actions.
- API surface parity:
  - Expose existing market pricing capabilities in UI; add return workflow endpoints where missing.
- Integration test scenarios:
  - Multi-line simulated pricing vs saved order totals.
  - Reservation release under concurrent submit/cancel.
  - Return creation with downstream credit memo linkage.

## Acceptance Criteria

- [x] Pricing simulation screen supports line and cart-level previews.
- [x] Reservation monitor shows active/stale/conflicting reservations.
- [x] Operators can perform controlled reservation release/reassignment.
- [x] Return workflow links to ledger credit memo references.
- [x] Integration tests cover pricing parity and reservation concurrency.

## Success Metrics

- Reduced order approval rework due to pricing surprises.
- Reduced stale reservation count and stock lock incidents.
- Faster return-to-credit handling time.

## Dependencies & Risks

- Depends on stable promotion/tax policy data and reservation records.
- Risk: inconsistent totals if simulation and save-time evaluation diverge.
- Risk: cross-module returns flow complexity with Ledger.

## Sources & References

- Market order/cart workflows: `src/server/rpc/router/uplink/market.router.ts:539`
- Checkout path and constraints: `src/server/rpc/router/uplink/market.router.ts:1034`
- Existing cart checkout UI: `src/app/_shell/_views/market/carts-list.tsx:29`
- Existing sales-order UI workflow: `src/app/_shell/_views/market/components/sales-order-card.tsx:112`
- Market workflow tests: `test/uplink/market-modules.test.ts:541`
- Related prior plan: `docs/plans/2026-02-23-feat-market-pricing-promotions-tax-and-reservations-plan.md`
- Institutional learnings: none found in `docs/solutions/` as of 2026-02-23.

## Enhancement Summary

**Deepened on:** 2026-02-23  
**Sections enhanced:** 8  
**Research skills applied:** `vercel-react-best-practices`, `vercel-composition-patterns`, `web-design-guidelines`, `security-sentinel`, `performance-oracle`, `architecture-strategist`, `kieran-typescript-reviewer`, `agent-native-architecture`

### Key Improvements

1. Added deterministic simulation parity controls so preview totals and persisted order totals cannot drift silently.
2. Added reservation concurrency and stale-lock controls with explicit release/reassign guardrails.
3. Added return-to-ledger credit memo traceability contract and audit expectations.

### New Considerations Discovered

- Pricing simulation must expose rule provenance (promotion/tax source) to avoid operator mistrust and rework.
- Reservation actions require conflict-safe idempotency and lock-version checks to prevent double release.

## Deepening Addendum

### Section Manifest

- Section 1: Overview & Problem Statement - pricing, reservation, and returns operational blind spots.
- Section 2: Proposed Solution - simulation workspace, reservation console, returns workflow.
- Section 3: Technical Considerations - determinism, inventory integrity, authz, auditability.
- Section 4: System-Wide Impact - cross-module propagation to Ledger and stock state.
- Section 5: Acceptance Criteria - measurable parity and concurrency quality gates.

### Research Insights - Overview & Problem Statement

**Best Practices**

- Treat pricing simulation as a read-only command with the same pricing pipeline and versioned rule inputs as checkout.
- Return normalized error objects for policy gaps (missing tax policy, inactive promo, invalid return reason) so UI can guide remediation.
- Keep operator and agent parity for pricing preview, reservation release, and return initiation.

**Performance Considerations**

- Cache simulation responses by deterministic key (`cartFingerprint + pricingPolicyVersion`) for short windows.
- Use paginated reservation queries with server-side filtering for aging/conflict views.

**Implementation Details**

```ts
// Plan-level shape for deterministic pricing request keys
const pricingSimulationKey = {
  cartId,
  customerGroup,
  locationCode,
  pricingPolicyVersion,
  taxPolicyVersion,
}
```

**Edge Cases**

- Promotion expires between simulation and order commit.
- Reservation release is triggered while order confirm is in-flight.
- Return created for partially invoiced or split-shipment orders.

### Research Insights - Proposed Solution

**Best Practices**

- Split Market operations UI into `PricingSimulationPanel`, `ReservationHealthTable`, and `ReturnAuthorizationPanel` to keep workflows explicit.
- Require structured reason codes for release/reassign/refund actions.
- Link every return record to the originating sales line and downstream Ledger document reference.

**Performance Considerations**

- Use targeted query invalidation for reservation and return records after mutations.
- Apply bounded polling only for reservation states likely to change (active/stale), not archived rows.

**Implementation Details**

```ts
// Plan-level API response contract for return creation
interface ReturnAuthorizationResult {
  returnId: string
  salesOrderId: string
  status: 'OPEN' | 'APPROVED' | 'POSTED' | 'CLOSED'
  ledgerCreditMemoRef?: string
}
```

**Edge Cases**

- Duplicate return submissions from retry or double-click.
- Release action on already released or transferred reservation.
- Return reason conflicts with policy (non-returnable window exceeded).

### Research Insights - Technical Considerations

**Best Practices**

- Adopt `application/problem+json` error payloads with correlation IDs across pricing/reservation/returns APIs.
- Require idempotency keys for state-changing reservation and return commands.
- Enforce optimistic concurrency (record version/etag) on reservation mutations.

**Performance Considerations**

- Avoid cart-wide recomputation when only one line changes; support line-scoped simulation where possible.
- Cap retry attempts for inventory writes and surface conflict paths instead of hidden retries.

**Implementation Details**

```ts
// Plan-level mutation guard fields
type ReservationMutationInput = {
  reservationId: string
  expectedVersion: number
  action: 'RELEASE' | 'REASSIGN'
  reasonCode: string
}
```

**Edge Cases**

- Cross-module timeout when creating Ledger credit memo reference.
- Tax rounding differences across jurisdictions and currency precision.
- Unauthorized release attempts for high-value orders.

### Research Insights - Acceptance Criteria Hardening

**Additional Quality Gates**

- [ ] Simulation and checkout totals match within configured rounding policy for all supported tax regimes.
- [x] Reservation release/reassign actions are idempotent and conflict-safe under concurrent execution.
- [ ] Return records include immutable linkage to source order/line and optional Ledger credit memo reference.
- [ ] Problem Details responses include machine-readable `type`, `status`, and `correlationId` fields.
- [ ] Operational UI actions are keyboard accessible and focus-safe for modal confirmation flows.

### References

- [TanStack Query - Query Keys](https://tanstack.com/query/v5/docs/framework/react/guides/query-keys)
- [TanStack Query - Query Invalidation](https://tanstack.com/query/v5/docs/framework/react/guides/query-invalidation)
- [RFC 9457 - Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc9457)
- [Idempotency-Key HTTP Header (IETF Draft)](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/)
- [OWASP API Security Top 10 (2023)](https://owasp.org/API-Security/editions/2023/en/0x11-t10/)
- [WAI-ARIA APG - Dialog (Modal) Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
