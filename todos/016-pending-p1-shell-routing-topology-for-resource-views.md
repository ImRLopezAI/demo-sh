---
status: pending
priority: p1
issue_id: "016"
tags: [code-review, architecture, routing, spa]
dependencies: []
---

# Build Explicit List Routes with Search-Based Resource State

The current shell route model relies on a single catch-all route key map. This blocks a stable URL contract for detail/create flows and keeps record state trapped in local component state.

## Problem Statement

The shell uses `/_shell/$` plus a static `VIEW_COMPONENTS` object as a dispatch table. That works for static module pages, but it prevents route-native list/detail/create flows. The refactor goal (replace modal-heavy detail cards with route-driven detail views) cannot be delivered cleanly without changing this topology.

## Findings

- `createFileRoute('/_shell/$')` and `_splat` validation are hardcoded to static keys in `src/app/_shell/$.tsx:113` and `src/app/_shell/$.tsx:116`.
- Only route keys that exist in `VIEW_COMPONENTS` are allowed (`src/app/_shell/$.tsx:109`).
- No module view currently consumes router params/search directly; views still rely on local modal state (`src/app/_shell/_views/market/sales-orders-list.tsx:23`, `src/app/_shell/_views/ledger/invoices-list.tsx:31`).
- The same limitation appears in generated route types, which currently model shell pages as `/$` rather than explicit module paths (`src/routeTree.gen.ts:39`).

## Proposed Solutions

### Option 1: Keep catch-all and parse dynamic segments manually

**Approach:** Continue with `/_shell/$` and implement custom parsing for segment patterns (`module/entity/id`) inside a shell resolver.

**Pros:**
- Lower short-term file churn
- Can stage migration with fewer route files

**Cons:**
- Weak route typing
- More custom parser logic to maintain
- Harder deep-link guarantees and loader ownership

**Effort:** 2-4 days

**Risk:** Medium

---

### Option 2: Move to explicit file-based list/new/detail routes

**Approach:** Create explicit route files per module/entity (`/list`, `/new`, `/$id`) and move selection state into route params/search.

**Pros:**
- Strong type safety for params and links
- Native deep-link and back/forward behavior
- Cleaner migration path away from modal CRUD as primary flow

**Cons:**
- Requires route tree and nav refactor
- Initial migration touches multiple modules

**Effort:** 1-2 weeks incremental

**Risk:** Medium

---

### Option 3: Hybrid route model (list routes explicit, detail in search params) (recommended)

**Approach:** Keep list routes explicit and represent selected record in URL search (`?recordId=...&mode=new`).

**Pros:**
- Faster migration than full nested routes
- Deep-link support without full route-file expansion

**Cons:**
- Less expressive than param routes
- Search schema complexity across modules

**Effort:** 4-6 days

**Risk:** Medium

## Recommended Action

Adopt Option 3 as the approved migration bridge:

1. Convert shell catch-all to explicit list routes for pilot entities.
2. Represent detail/create state in search params using a shared contract:
   - `?mode=detail&recordId=<id>`
   - `?mode=new`
3. Standardize query serialization/deserialization with `qs` for consistency with Business Central-style URL behavior.
4. Add one shared search helper per route family to validate and normalize invalid combinations.
5. Revisit path-param detail routes only after search-param model is stable and adopted broadly.

## Technical Details

**Affected files:**
- `src/app/_shell/$.tsx`
- `src/routeTree.gen.ts`
- `src/app/_shell/nav-config.ts`
- `src/app/_shell/_views/**`

**Related components:**
- Shell route dispatcher
- Module list/detail views
- Sidebar navigation mapping

**Database changes:**
- Migration needed: No

## Resources

- `src/app/_shell/$.tsx:109`
- `src/app/_shell/$.tsx:113`
- `src/app/_shell/$.tsx:116`
- `src/routeTree.gen.ts:39`

## Acceptance Criteria

- [x] Shell routes support explicit canonical list URLs for at least one pilot entity
- [x] Detail and create states are URL-addressable via search params (`mode`, `recordId`)
- [x] Detail views are deep-linkable and reload-safe
- [x] Back/forward behavior closes detail view by navigation, not local state reset
- [x] Existing module dashboards remain reachable

## Work Log

### 2026-02-23 - Initial Discovery

**By:** OpenCode

**Actions:**
- Reviewed shell route dispatch and static route-key validation
- Validated `_splat` constraints against desired dynamic detail route behavior
- Correlated route topology with repeated modal selection state patterns

**Learnings:**
- Current topology is effective for static module pages but blocks resource-level route migration.

### 2026-02-23 - Direction Confirmed

**By:** OpenCode

**Actions:**
- Captured stakeholder decision to use hybrid explicit-list + search-param detail model
- Added `qs` standardization requirement for search param consistency

**Learnings:**
- Hybrid model provides the best migration speed/risk tradeoff while preserving SPA deep-link behavior.

### 2026-02-24 - Sales Orders Pilot Shifted to Path-Based Detail

**By:** Codex

**Actions:**
- Added explicit file routes for `/market/sales-orders`, `/market/sales-orders/new`, and `/market/sales-orders/$recordId`
- Converted Sales Orders row/new actions to navigate to dedicated pages instead of opening a modal
- Added compatibility redirect in list view for legacy `?mode=detail|new` query links
- Updated Sales Order editor to support full-page presentation for route-native detail/create screens

**Learnings:**
- Search-param detail state can bridge migration, but path-based detail routes better match expected page navigation UX for record workflows.

### 2026-02-24 - Plan Alignment Correction (Search Params as Source of Truth)

**By:** Codex

**Actions:**
- Removed temporary `/market/sales-orders/new` and `/market/sales-orders/$recordId` route files
- Switched Sales Orders interactions back to search-driven state updates using TanStack Router `search` (`mode`, `recordId`, `_recordScope`)
- Kept full-page detail/create presentation while remaining on canonical `/market/sales-orders` route

**Learnings:**
- Full-page UX and search-param state are compatible; path params are not required for non-modal record workflows.

## Notes

- This item is the architecture prerequisite for the modal-to-route refactor plan.
