---
title: "feat: Atomic sales and purchase orders with lines"
type: feat
status: completed
date: 2026-02-23
---

# feat: Atomic sales and purchase orders with lines

## Overview

Create first-class atomic APIs for creating and updating Sales Orders and Purchase Orders together with their lines in one request, with rollback on failure and strict parent-child integrity.

## Problem Statement / Motivation

Current UI flows create headers first and then loop line inserts. This leaves gaps in reliability and UX for new records.

- Sales order and purchase order dialogs stage lines in client state and persist lines after header save.
- Failures between header write and line writes can leave partial state.
- There is no explicit domain contract for `createWithLines` / `updateWithLines`.

## Proposed Solution

Add module-specific orchestration endpoints while keeping generic CRUD for base operations:

- `market.salesOrders.createWithLines`
- `market.salesOrders.updateWithLines`
- `replenishment.purchaseOrders.createWithLines`
- `replenishment.purchaseOrders.updateWithLines`

Update both forms to call these endpoints for primary save flow and keep existing line CRUD only for post-create row edits.

## Technical Considerations

- Preserve tenant isolation checks from shared helper contracts.
- Use idempotency token support for create mutations to prevent accidental duplicate orders.
- Keep transaction semantics explicit: all-or-nothing header+lines write.
- Return created header and normalized lines to avoid client-side refetch races.

## System-Wide Impact

- Interaction graph:
  - Dialog submit in `src/app/_shell/_views/market/components/sales-order-card.tsx` and `src/app/_shell/_views/replenishment/components/purchase-order-card.tsx` triggers orchestration mutation, then list invalidation for headers and lines.
- Error propagation:
  - Validation errors return field-level details for header and line index.
  - Business rule errors return domain code (`PARENT_NOT_FOUND`, `INVALID_LINE`, `TRANSITION_NOT_ALLOWED`).
- State lifecycle risks:
  - Eliminates partial document persistence from header-first/line-later writes.
- API surface parity:
  - Keep existing CRUD routes, add new orchestration routes, and expose both in typed RPC client.
- Integration scenarios:
  - Create 0-line (reject), 1-line, and multi-line documents.
  - Update with line add/change/remove in one request.
  - Retry same idempotency key (must not duplicate).

## Acceptance Criteria

- [x] `market.salesOrders.createWithLines` creates header and lines atomically.
- [x] `replenishment.purchaseOrders.createWithLines` creates header and lines atomically.
- [x] `updateWithLines` supports add/update/delete deltas in one mutation.
- [x] UI forms submit through orchestration endpoint for initial save.
- [x] No partial writes are left when any line fails validation.
- [x] Tests cover atomicity, idempotency, and parent-child integrity.

## Success Metrics

- Order creation failure incidents due to partial writes: 0 in test scenarios.
- Median clicks to create order with lines reduced by at least 30%.
- 100% pass rate for new integration cases in market/replenishment suites.

## Dependencies & Risks

- Dependencies:
  - Existing CRUD router helpers in `src/server/rpc/router/helpers.ts`.
  - Form behavior in order cards.
- Risks:
  - Type drift between line payload in UI and server schema.
  - Race conditions from stale local draft lines if dialog remains open after error.

## Implementation Phases

### Phase 1: API contracts

- Add Zod schemas for header+lines payloads in:
  - `src/server/rpc/router/uplink/market.router.ts`
  - `src/server/rpc/router/uplink/replenishment.router.ts`
- Implement atomic write + rollback behavior.

### Phase 2: UI migration

- Update submit handlers in:
  - `src/app/_shell/_views/market/components/sales-order-card.tsx`
  - `src/app/_shell/_views/replenishment/components/purchase-order-card.tsx`

### Phase 3: testing

- Add/extend integration coverage:
  - `test/uplink/market-modules.test.ts`
  - `test/uplink/replenishment-modules.test.ts`
  - `test/uplink/cross-module-workflows.test.ts`

## Sources & References

- Existing staged line behavior:
  - `src/app/_shell/_views/market/components/sales-order-card.tsx`
  - `src/app/_shell/_views/replenishment/components/purchase-order-card.tsx`
- Shared CRUD abstraction:
  - `src/server/rpc/router/helpers.ts`
- Existing module router surfaces:
  - `src/server/rpc/router/uplink/market.router.ts`
  - `src/server/rpc/router/uplink/replenishment.router.ts`
