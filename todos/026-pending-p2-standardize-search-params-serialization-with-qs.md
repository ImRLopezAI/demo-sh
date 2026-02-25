---
status: pending
priority: p2
issue_id: "026"
tags: [code-review, frontend, routing, quality]
dependencies: ["020"]
---

# Standardize Search Param Serialization with `qs`

The selected hybrid route model depends on reliable and consistent search param behavior across modules.

## Problem Statement

As detail/create state moves into search params, ad-hoc `URLSearchParams` usage can produce inconsistent serialization and parsing behavior across modules. A single `qs` configuration is needed to keep URLs predictable and stable.

## Findings

- Hybrid model requires shared search contract (`mode`, `recordId`) in all migrated list routes.
- Without a single parser/stringifier strategy, module-level implementation drift is likely.
- Existing routing configuration currently does not define a shared custom search serialization strategy (`src/router.tsx:14`).

## Proposed Solutions

### Option 1: Router-level `qs` integration (recommended)

**Approach:** Define one shared search parser/stringifier backed by `qs`, and use it as the router-level default for all routes.

**Pros:**
- Uniform behavior across modules
- Supports nested and future complex search payloads
- Minimizes repeated parsing logic in route files

**Cons:**
- Introduces one dependency
- Requires careful default config to avoid breaking current URLs

**Effort:** 3-6 hours

**Risk:** Low

---

### Option 2: Module-level `qs` utilities only

**Approach:** Keep router defaults, but call shared `qs` helper in each module route.

**Pros:**
- Lower blast radius

**Cons:**
- Easier to misapply
- Repetition in route modules

**Effort:** 5-8 hours

**Risk:** Medium

---

### Option 3: Stay with native URLSearchParams

**Approach:** Avoid `qs`; keep scalar-only contract and strict route validators.

**Pros:**
- No extra dependency

**Cons:**
- Less flexibility for evolving search schemas
- More manual normalization logic

**Effort:** 2-4 hours

**Risk:** Medium

## Recommended Action

To be filled during triage.

## Technical Details

**Affected files:**
- `package.json`
- `src/router.tsx`
- `src/lib/**` (shared search helper)
- Migrated list route files under `src/app/_shell/**`

**Related components:**
- TanStack Router configuration
- Search schema validators
- List/detail route state helpers

**Database changes:**
- Migration needed: No

## Resources

- `src/router.tsx:14`

## Acceptance Criteria

- [ ] `qs` strategy is defined once and reused everywhere
- [ ] Search param behavior is deterministic for `mode` and `recordId`
- [ ] Invalid/partial search states are normalized consistently
- [ ] Existing non-migrated routes keep expected behavior

## Work Log

### 2026-02-23 - Initial Discovery

**By:** OpenCode

**Actions:**
- Captured stakeholder recommendation to align with Business Central-like search behavior
- Created follow-up item to standardize serialization strategy

**Learnings:**
- Shared serialization contract is a key enabler for hybrid route migration quality.

## Notes

- Coordinate with issue 020 pilot implementation.
