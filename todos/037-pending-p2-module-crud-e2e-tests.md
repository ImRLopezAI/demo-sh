---
status: pending
priority: p2
issue_id: "037"
tags: [code-review, testing, e2e, crud, modules]
dependencies: ["027"]
---

# Add Module CRUD Lifecycle E2E Tests

Core CRUD operations (create, read, update, delete) for entities across 7 modules have zero browser E2E coverage beyond sales orders and purchase orders.

## Problem Statement

The existing 3 E2E tests cover creating sales orders (market) and purchase orders (replenishment). No browser tests cover CRUD for: items, customers, carts (market), invoices (ledger), bank accounts (flow), employees (payroll), locations (insight), shipments/shipment-methods (trace), vendors/transfers (replenishment), or tasks (hub).

## Findings

- 15+ entity types with card components have zero CRUD E2E tests
- All use the same `useRecordSearchState` + card component pattern
- Record creation uses the card's `onCreated` callback to navigate to detail
- Record detail uses URL search params (`mode=detail&recordId=...`)
- Entity mutations handled by shared `useEntityMutations` hook

## Proposed Solutions

### Option 1: CRUD tests for highest-traffic entities (recommended)

**Approach:** Write E2E tests for 6 key entities: market/customers, market/items, ledger/invoices, payroll/employees, trace/shipments, replenishment/vendors. These use the RecordCard POM from todo 027 for efficient authoring.

**Effort:** Medium (3-4 days)
**Risk:** Low

## Technical Details

**Affected files:**
- `test/e2e/market/market-customers-crud.spec.ts` — new
- `test/e2e/market/market-items-crud.spec.ts` — new
- `test/e2e/payroll/payroll-employees-crud.spec.ts` — new
- `test/e2e/trace/trace-shipments-crud.spec.ts` — new
- `test/e2e/replenishment/replenishment-vendors-crud.spec.ts` — new
- `test/e2e/hub/hub-tasks-crud.spec.ts` — new

## Acceptance Criteria

- [ ] Create entity → verify in list
- [ ] Open entity detail → verify fields populated
- [ ] Edit entity → verify changes persisted
- [ ] List view correctly reflects CRUD operations
- [ ] URL deep-link to record detail works (reload-safe)

## Work Log

### 2026-02-27 - Initial Discovery

**By:** Code Review

**Actions:**
- TypeScript reviewer cataloged 15+ entity types with card components and zero CRUD E2E tests
- Confirmed shared `useRecordSearchState` pattern makes POM-based testing efficient

## Resources

- `src/app/_shell/_views/_shared/use-record-search-state.ts`
- `src/app/_shell/_views/_shared/record-dialog.tsx`
- Card components: `sales-order-card.tsx`, `invoice-card.tsx`, `employee-card.tsx`, etc.
