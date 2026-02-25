---
status: pending
priority: p2
issue_id: "020"
tags: [code-review, architecture, frontend, routing]
dependencies: ["016", "017"]
---

# Migrate Modal Selection State to Route State

List views currently own detail/create state through local `selectedId` and `'new'` sentinels. This should become route state for deep-linkable detail views.

## Problem Statement

Primary entity workflows are controlled by component-local state instead of URL state. This makes detail views non-shareable, weakens SPA navigation semantics (back/forward/reload), and duplicates modal orchestration logic across modules.

## Findings

- Repeated `selectedId` state exists in many list views (`src/app/_shell/_views/market/sales-orders-list.tsx:23`, `src/app/_shell/_views/trace/shipments-list.tsx:27`, `src/app/_shell/_views/hub/tasks-list.tsx:61`).
- Create mode is encoded via `'new'` sentinel (`src/app/_shell/_views/market/sales-orders-list.tsx:35`, `src/app/_shell/_views/ledger/components/invoice-card.tsx:58`).
- Dialog open/close glue is repeated per module (`src/app/_shell/_views/market/sales-orders-list.tsx:102`, `src/app/_shell/_views/payroll/employees-list.tsx:126`).

## Proposed Solutions

### Option 1: Route-param detail pages

**Approach:** Introduce canonical routes per entity for list, create, and detail (`/entity`, `/entity/new`, `/entity/$id`) and navigate from DataGrid actions.

**Pros:**
- Canonical deep-link behavior
- Cleaner back/forward semantics
- Reusable pattern across modules

**Cons:**
- Requires route expansion
- Requires test updates

**Effort:** 1-2 weeks incremental

**Risk:** Medium

---

### Option 2: Search-param state for incremental migration (recommended)

**Approach:** Keep current list routes but move selected record and mode into search params (`?recordId=...&mode=new`).

**Pros:**
- Lower initial route churn
- Enables deep-linking quickly

**Cons:**
- Less explicit than path params
- More per-module schema boilerplate

**Effort:** 4-7 days

**Risk:** Medium

---

### Option 3: Keep modal state and add persistence shim

**Approach:** Sync `selectedId` to local storage/history state while retaining component-local control.

**Pros:**
- Minimal UI disruption

**Cons:**
- Not a real route contract
- Adds complexity without solving architecture root cause

**Effort:** 2-3 days

**Risk:** High

## Recommended Action

Use Option 2 as the rollout path for modal-to-route migration:

1. Keep explicit list routes per module/entity.
2. Replace local `selectedId` + `'new'` sentinel state with route search state:
   - `mode=detail&recordId=<id>`
   - `mode=new`
3. Use `qs` for parse/stringify consistency and nested search compatibility across modules.
4. Centralize this in a shared helper hook (for example `useRecordSearchState`) to avoid per-module drift.
5. Pilot on `market/sales-orders`, then apply to `ledger/invoices` and `replenishment/purchase-orders`.

## Technical Details

**Affected files:**
- `src/app/_shell/_views/*/*-list.tsx`
- `src/app/_shell/_views/*/components/*-card.tsx`
- `src/app/_shell/$.tsx` and route files for target modules

**Related components:**
- DataGrid edit/new handlers
- RecordDialog consumers
- Module detail forms
- Router search parse/stringify utilities (`qs`)

**Database changes:**
- Migration needed: No

## Resources

- `src/app/_shell/_views/market/sales-orders-list.tsx:23`
- `src/app/_shell/_views/market/sales-orders-list.tsx:35`
- `src/app/_shell/_views/ledger/components/invoice-card.tsx:58`
- `src/app/_shell/_views/hub/tasks-list.tsx:61`

## Acceptance Criteria

- [ ] Pilot module supports search-driven detail/create workflow on explicit list route
- [ ] No `'new'` sentinel is required in pilot flow
- [ ] Direct URL with search params (`mode`, `recordId`) renders correct detail/create state
- [ ] Closing detail clears search params and preserves list state
- [ ] Existing actions still function after migration

## Work Log

### 2026-02-23 - Initial Discovery

**By:** OpenCode

**Actions:**
- Audited list/detail interaction pattern across modules
- Counted repeated local-state modal orchestration patterns
- Mapped current mode handling to target route-driven shape

**Learnings:**
- The current pattern is consistent but duplicates logic and blocks deep-link parity.

### 2026-02-23 - Direction Confirmed

**By:** OpenCode

**Actions:**
- Captured stakeholder preference for Business Central-like search-param model
- Updated migration recommendation to use `qs`-backed search serialization

**Learnings:**
- Search-param state is the fastest path to URL-driven behavior without full nested route expansion.

## Notes

- Execute as a pilot in one or two modules before broad rollout.
