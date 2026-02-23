---
status: complete
priority: p2
issue_id: "003"
tags: [code-review, functionality, market, workflow]
dependencies: []
---

# Implement market cart checkout and order orchestration workflows

## Problem Statement

Market module currently exposes CRUD for carts/cartLines and sales orders, but lacks an orchestrated checkout workflow connecting cart state, order creation, and line transfer logic.

## Findings

- Router is generic CRUD only for carts and cart lines.
  - `src/server/rpc/router/uplink/market.router.ts:40`
  - `src/server/rpc/router/uplink/market.router.ts:51`
- Carts page is read-only list, no checkout actions.
  - `src/app/_shell/_views/market/carts-list.tsx:15`
- No integration tests for cart -> order lifecycle.
  - `test/uplink/market-modules.test.ts`

## Proposed Solutions

### Option 1: Add `checkoutCart` RPC endpoint

**Approach:** Create endpoint that validates cart, creates `salesHeaders`, creates `salesLines`, marks cart as `CHECKED_OUT`.

**Pros:** Clear business API, consistent behavior.

**Cons:** Requires transaction/rollback semantics.

**Effort:** Medium

**Risk:** Medium

---

### Option 2: Client-side orchestration with existing CRUD

**Approach:** UI composes multiple existing calls.

**Pros:** No new server endpoint.

**Cons:** Partial failure risk, duplicated logic.

**Effort:** Medium

**Risk:** High

## Recommended Action

Option 1.

## Technical Details

- Add `market.carts.checkout` endpoint.
- Add order-document linking field for traceability.
- Add integration test for idempotency and partial failure behavior.

## Resources

- `src/server/rpc/router/uplink/market.router.ts`

## Acceptance Criteria

- [x] Checkout action creates order header and lines from cart.
- [x] Cart status changes to `CHECKED_OUT` atomically.
- [x] Retry handling avoids duplicate orders.
- [x] End-to-end tests cover success and failure paths.

## Work Log

### 2026-02-23 - Review finding capture

**By:** Codex

**Actions:**
- Compared market expected functionality to implemented surface.
- Identified missing orchestrated checkout workflow.

**Learnings:**
- CRUD parity exists, business-process parity does not.

### 2026-02-23 - Implementation complete

**By:** Codex

**Actions:**
- Added `market.carts.checkout` orchestration endpoint in `src/server/rpc/router/uplink/market.router.ts`:
  - validates cart and line preconditions,
  - creates sales order header + lines from cart lines,
  - updates cart to `CHECKED_OUT`,
  - performs rollback of created order/lines on failure,
  - supports idempotent retries using `externalRef = CART:<cartId>`.
- Added checkout action button to carts UI in `src/app/_shell/_views/market/carts-list.tsx`, including query invalidation for carts/cartLines/salesOrders/salesLines after success.
- Extended market integration tests in `test/uplink/market-modules.test.ts` to cover:
  - successful cart checkout,
  - idempotent retry without duplicate orders,
  - failure path for empty carts with no partial order creation.
- Verified with:
  - `bun run typecheck`
  - `bun run test test/uplink/market-modules.test.ts`
  - `bun run test test/uplink/pos-terminal-id.test.ts test/uplink/hub-modules.test.ts test/uplink/trace-modules.test.ts test/uplink/market-modules.test.ts test/uplink/replenishment-modules.test.ts test/uplink/ledger-modules.test.ts test/uplink/payroll-modules.test.ts test/uplink/pos-modules.test.ts`

**Learnings:**
- Using a deterministic cart reference (`externalRef`) is a lightweight and effective idempotency key for checkout orchestration.

## Notes

Candidate for high user impact once core defects are stabilized.
