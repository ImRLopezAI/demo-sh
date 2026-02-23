---
title: "fix: Restore Uplink module functionality parity and parent-child document integrity"
type: fix
status: completed
date: 2026-02-22
---

# fix: Restore Uplink module functionality parity and parent-child document integrity

## Overview

Multiple Uplink modules expose generic CRUD surfaces, but key business workflows are missing or partially broken in UI/API integration. Two user-reported failures confirm this gap:

1. Sales order creation cannot complete with lines in a single flow.
2. Purchase order line lists can show lines that do not belong to the selected order.

This plan closes those defects and expands coverage across all modules so each advertised module capability has an executable workflow, integrity checks, and tests.

## Problem Statement

The platform currently relies heavily on a shared CRUD abstraction. This gives fast scaffolding, but it also causes functional gaps:

- Parent-child document workflows (header + lines) are inconsistent across modules.
- Line ownership is enforced only by convention in UI, not by robust query contracts.
- Tests validate table presence/listing/status transitions, but do not validate real user flows (create parent with lines, line isolation by parent, cross-module business actions).
- Several module capabilities in project documentation are not yet represented as callable business operations beyond CRUD/status transitions.

### User-reported defects (confirmed)

- Sales order line creation is blocked during first-time order creation because line operations depend on an existing `documentNo`.
- Purchase order lines are fetched through a view slug that is treated as `viewId` (not parent filter), causing unrelated lines to appear.

## Research Summary

### Local findings

- No relevant brainstorm exists in `docs/brainstorms/` (folder absent on 2026-02-22).
- No institutional learnings were found in `docs/solutions/` (folder absent).
- Routes are present for all nav items, but most module behaviors are generic CRUD/status transitions.

### Root causes in current code

- `useModuleData` sends `viewId` only; it does not support server-side parent filtering.
  - `src/app/_shell/hooks/use-data.ts:17`
  - `src/app/_shell/hooks/use-data.ts:31`
- Purchase lines view passes record id where a view id is expected.
  - `src/app/_shell/_views/replenishment/components/purchase-order-card.tsx:81`
  - `src/app/_shell/_views/replenishment/components/purchase-order-card.tsx:87`
- Sales order lines are intentionally empty for `isNew`, and row-add requires existing `documentNo`.
  - `src/app/_shell/_views/market/components/sales-order-card.tsx:135`
  - `src/app/_shell/_views/market/components/sales-order-card.tsx:138`
  - `src/app/_shell/_views/market/components/sales-order-card.tsx:163`
- Shared CRUD helper has no compound endpoint for atomic header+lines create and no first-class parent filter contract.
  - `src/server/rpc/router/helpers.ts:184`
  - `src/server/rpc/router/helpers.ts:246`
- Current uplink tests focus on schema presence/listing/transitions, not header-line workflow integrity.
  - `test/uplink/market-modules.test.ts:37`
  - `test/uplink/replenishment-modules.test.ts:36`

## Proposed Solution

Implement a functional parity program in three tracks:

1. Document integrity foundation
- Add explicit parent-scoped list APIs for line entities.
- Add atomic document create/update workflows for header+lines.
- Enforce line ownership and parent existence at API boundaries.

2. Module workflow completion
- For each module, implement at least one complete business flow matching documented capabilities (not just CRUD).
- Prioritize Market and Replenishment first (reported defects), then remaining modules.

3. Test and observability hardening
- Add integration tests for parent-child isolation, atomic creates, and transition guards.
- Add workflow-level tests for each module’s core business path.

## Technical Approach

### Architecture

Introduce specialized routers alongside the existing generic CRUD router:

- Keep `createTenantScopedCrudRouter` for base operations.
- Add module-specific orchestration endpoints for document workflows:
  - `market.salesOrders.createWithLines`
  - `market.salesOrders.updateWithLines`
  - `replenishment.purchaseOrders.createWithLines`
  - `replenishment.purchaseOrders.updateWithLines`
  - Apply same pattern to invoice/transfer/shipment where needed.

Introduce parent filtering contract:

- Extend list/listViewRecords inputs with optional `filters` object.
- Support exact-match filters for parent keys (`documentNo`, `invoiceNo`, `transferNo`, `shipmentNo`, etc.).
- Validate parent ownership (tenant + relation existence) before returning lines.

### Implementation Phases

#### Phase 1: Critical bug fixes (Market/Replenishment)

- Add parent-filter support in RPC query input and implementation.
- Update purchase-order line loading to filter by `documentNo` from header, not route record id.
- Refactor sales-order create flow to support staged lines before first save:
  - Option A: client-side draft lines, persisted after header create.
  - Option B: `createWithLines` endpoint (preferred).
- Add API guard: cannot insert line with non-existent parent document.
- Add/adjust tests for:
  - Sales: create order with 1..N lines in one action.
  - Replenishment: line list shows only selected order lines.

#### Phase 2: Parent-child parity across document modules

- Apply same parent-filtering + ownership checks to:
  - Ledger invoice lines
  - Replenishment transfer lines
  - Trace shipment lines
  - POS transaction lines
  - Market cart lines
- Standardize a reusable helper for line filtering:
  - `getLinesByParent({ table, parentField, parentValue, tenantId })`
- Add module-level tests for line isolation in each document module.

#### Phase 3: Functional completion by module

- Market:
  - Sales order submit/approve/complete workflows with invariants.
  - Cart checkout creating downstream sales signal.
- Replenishment:
  - Purchase lifecycle to received/invoiced quantities.
  - Transfer lifecycle with quantity shipped/received consistency.
- Ledger:
  - Invoice posting workflow with customer ledger/gl side effects.
- Flow:
  - Bank reconciliation transitions with mismatch handling.
- Payroll:
  - Payroll journal -> posting workflow with employee/bank/GL consistency.
- POS:
  - Session lifecycle + transaction completion/void/refund flow.
- Trace:
  - Shipment dispatch/in-transit/delivered path with tracking data quality.
- Insight:
  - Ensure read models and KPI views reflect state changes from other modules.
- Hub:
  - Cross-module exception/task/notification flow from workflow failures.

#### Phase 4: Hardening and rollout

- Add regression suite for critical document flows.
- Add lightweight telemetry counters:
  - invalid line-parent attempts
  - cross-tenant filter denials
  - failed status transitions
- Release by feature flags per module if needed.

## Alternative Approaches Considered

1. Patch only the two reported UI bugs.
- Rejected: fixes symptoms but leaves same defect class in invoice/transfer/shipment/pos lines.

2. Replace generic CRUD abstraction completely.
- Rejected now: too large for current bug-fix scope; higher delivery risk.

3. Keep generic CRUD only, enforce all behavior in client.
- Rejected: security/integrity risk and duplicated logic across modules.

## System-Wide Impact

### Interaction graph

- `createWithLines` (Market/Replenishment) triggers:
  - header insert -> line inserts -> flow-field recomputation (`lineCount`, `totalAmount`) -> list/kpi refresh.
- Parent filter APIs affect:
  - list views in cards/dialogs -> DataGrid rows -> transition decisions tied to visible lines.

### Error and failure propagation

- Expected failures:
  - Parent not found.
  - Parent belongs to another tenant.
  - Invalid status transition.
  - Line payload validation errors.
- Handling:
  - API returns explicit typed errors.
  - UI shows actionable errors in dialog footer/form messages.
  - No partial success on `createWithLines` (all-or-fail contract).

### State lifecycle risks

- Risk: partial write (header created, lines missing).
  - Mitigation: orchestration endpoint with transactional semantics (or rollback strategy if in-memory adapter cannot provide hard transaction).
- Risk: stale line totals.
  - Mitigation: assert flow-field values in integration tests.

### API surface parity

Interfaces that must remain aligned:

- RPC router (`src/server/rpc/router/uplink/*.router.ts`)
- Shared hooks (`src/app/_shell/hooks/use-data.ts`)
- Dialog cards (`src/app/_shell/_views/**/components/*-card.tsx`)
- Uplink integration tests (`test/uplink/*-modules.test.ts`)

### Integration test scenarios

- Create header with lines; verify:
  - all lines belong to header,
  - `lineCount/totalAmount` are correct,
  - line list for another header excludes those lines.
- Transition header status with invalid/valid reasons.
- Delete line and verify aggregate recalculation.
- Tenant isolation for line listing and mutation.
- Concurrent edit attempts on same header/lines (where applicable).

## Module-by-Module Missing Functionality Backlog

### Market

- [x] Header+line atomic create flow for sales orders.
- [x] Parent-scoped sales line list API.
- [x] Checkout/cart-to-order workflow consistency checks.

### Replenishment

- [x] Parent-scoped purchase line list API.
- [x] Header+line atomic create flow for purchase orders.
- [x] Transfer line parent isolation and lifecycle validations.

### Ledger

- [x] Invoice line parent isolation (invoiceNo scoped).
- [x] Invoice posting side effects verification (customer ledger / GL linkage).

### Flow

- [x] Reconciliation workflow completion beyond status toggles (scope-adjusted to posting + forecasting workflows; real bank integration/auto-matching excluded).
- [x] Journal posting pipeline constraints.

### Payroll

- [x] Payroll cycle execution workflow (not only CRUD/status).
- [x] Posting validations across employee ledger, GL, and bank entries.

### POS

- [x] Session-aware transaction orchestration.
- [x] Transaction-line parent isolation and refund/void invariants.

### Trace

- [x] Shipment-line parent isolation.
- [x] Shipment orchestration tied to source docs and method constraints.

### Insight

- [x] Ensure derived KPI/read models update from module events/workflows.
- [x] Add validation for location/inventory analytics consistency.

### Hub

- [x] Operational event ingestion from failed module workflows.
- [x] Workflow-linked task/notification automation.

## Acceptance Criteria

### Functional requirements

- [x] Users can create Sales Orders with lines in one user flow (no manual second pass required).
- [x] Purchase Order line grids only show lines for the selected PO.
- [x] Parent-child line isolation is enforced across all document modules.
- [x] API rejects line create/update when parent relation is invalid.
- [x] Core workflow endpoints exist for each module’s documented primary capability.

### Non-functional requirements

- [x] No cross-tenant data leakage through list/listViewRecords filters.
- [x] No regression in existing status transition constraints.
- [x] Query/filter performance remains acceptable for 25-row paginated lists.

### Quality gates

- [x] New integration tests for Market/Replenishment header-line workflows pass.
- [x] Added parity tests for remaining document modules pass.
- [x] Typecheck and test suites pass for affected packages.

## Success Metrics

- `0` known reproductions of:
  - sales create-with-lines failure,
  - purchase-order wrong-lines display.
- `100%` pass rate for new parent-child integrity tests in `test/uplink`.
- Reduction in support incidents labeled `line-ownership` or `document-workflow`.

## Dependencies and Risks

### Dependencies

- RPC contract updates and client hook updates must ship together.
- UI cards depend on updated list filtering semantics.
- Test fixtures may require deterministic document numbering behavior.

### Risks

- Broad router changes can break unaffected modules.
- Shared hook changes can regress list rendering if not backward compatible.
- In-memory adapter rollback semantics may not match production DB transaction behavior.

### Mitigations

- Feature flag new composite endpoints.
- Keep existing endpoints intact while migrating UI incrementally.
- Add targeted regression tests module by module.

## Resource Requirements

- 1 backend engineer (RPC/data integrity focus)
- 1 frontend engineer (dialogs/hooks/data-grid flows)
- 1 QA automation pass on cross-module workflow suite

## Future Considerations

- Domain services layer per module to reduce overreliance on generic CRUD.
- Event-driven cross-module orchestration (Hub as control plane).
- Dedicated “document editor” shared component with built-in line orchestration.

## Documentation Plan

- Update module docs with explicit workflow endpoints and invariants.
- Document parent-filter contract and required usage patterns in shared hook docs.
- Add troubleshooting playbook for document-line mismatches.

## Sources and References

### Internal references

- `src/app/_shell/hooks/use-data.ts:17`
- `src/app/_shell/hooks/use-data.ts:31`
- `src/app/_shell/_views/market/components/sales-order-card.tsx:135`
- `src/app/_shell/_views/market/components/sales-order-card.tsx:163`
- `src/app/_shell/_views/replenishment/components/purchase-order-card.tsx:81`
- `src/app/_shell/_views/replenishment/components/purchase-order-card.tsx:87`
- `src/server/rpc/router/helpers.ts:184`
- `src/server/rpc/router/helpers.ts:246`
- `src/server/db/index.ts:132`
- `src/server/db/index.ts:484`
- `src/server/db/index.ts:1322`
- `test/uplink/market-modules.test.ts:37`
- `test/uplink/replenishment-modules.test.ts:36`

### Related planning context

- `docs/plans/ui-ux-improvement-plan.md`
