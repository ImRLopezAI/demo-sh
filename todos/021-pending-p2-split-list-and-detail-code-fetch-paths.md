---
status: pending
priority: p2
issue_id: "021"
tags: [code-review, performance, frontend, routing]
dependencies: ["020"]
---

# Split List and Detail Code/Fetch Paths

List screens currently import and mount heavy detail editors, causing unnecessary bundle weight and background data work.

## Problem Statement

Even when a detail editor is closed, list screens often include editor dependencies and supporting queries. This increases load cost and refetch churn for list-only sessions.

## Findings

- Lists render detail cards directly, keeping editor code in list route chunk (`src/app/_shell/_views/market/sales-orders-list.tsx:102`, `src/app/_shell/_views/insight/locations-list.tsx:94`).
- Some editors perform broad data loading independent of open state (`src/app/_shell/_views/market/components/sales-order-card.tsx:124`, `src/app/_shell/_views/market/components/sales-order-card.tsx:141`, `src/app/_shell/_views/ledger/components/invoice-card.tsx:111`).
- Location editor pulls map components into list path (`src/app/_shell/_views/insight/components/location-card.tsx:4`).
- Shared mutation invalidation is broad (`src/app/_shell/_views/_shared/use-entity.ts:29`).

## Proposed Solutions

### Option 1: Route-level split with nested detail routes (recommended)

**Approach:** Move detail editors to child routes and lazy-load per detail path.

**Pros:**
- Best code-splitting characteristics
- No editor fetches on list-only visits
- Aligns with route-driven architecture

**Cons:**
- Requires route migrations and test updates

**Effort:** 4-8 days for pilot modules

**Risk:** Medium

---

### Option 2: Conditional mount + dynamic import in current list routes

**Approach:** Keep modal UX but mount editors only when open and load with `React.lazy`.

**Pros:**
- Faster incremental performance win
- Lower routing churn upfront

**Cons:**
- Preserves modal-state architecture debt
- Still requires per-module patching

**Effort:** 2-4 days

**Risk:** Low

---

### Option 3: Query-level optimization only

**Approach:** Keep structure but tighten invalidations and add `enabled` guards for all non-essential queries.

**Pros:**
- Smallest change scope
- Immediate network churn reduction

**Cons:**
- Bundle-size cost remains
- Does not solve route/deep-link goals

**Effort:** 1-3 days

**Risk:** Low

## Recommended Action

To be filled during triage.

## Technical Details

**Affected files:**
- `src/app/_shell/_views/*/*-list.tsx`
- `src/app/_shell/_views/*/components/*-card.tsx`
- `src/app/_shell/_views/_shared/use-entity.ts`

**Related components:**
- DataGrid list pages
- Record detail editors
- Shared query invalidation helpers

**Database changes:**
- Migration needed: No

## Resources

- `src/app/_shell/_views/market/sales-orders-list.tsx:102`
- `src/app/_shell/_views/market/components/sales-order-card.tsx:124`
- `src/app/_shell/_views/market/components/sales-order-card.tsx:141`
- `src/app/_shell/_views/insight/locations-list.tsx:94`
- `src/app/_shell/_views/insight/components/location-card.tsx:4`
- `src/app/_shell/_views/_shared/use-entity.ts:29`

## Acceptance Criteria

- [ ] List-only navigation does not load heavy editor dependencies for pilot modules
- [ ] Closed-detail state does not trigger editor-only data queries
- [ ] Mutation invalidation is scoped to affected records/views where possible
- [ ] Measurable reduction in initial JS loaded for pilot list pages

## Work Log

### 2026-02-23 - Initial Discovery

**By:** OpenCode

**Actions:**
- Reviewed list/detail composition in representative modules
- Identified eager editor imports and non-scoped query patterns
- Mapped performance opportunities aligned with route migration

**Learnings:**
- Architecture and performance concerns can be addressed together by splitting list/detail routes.

## Notes

- Pair this with issue 020 to avoid duplicated effort.
