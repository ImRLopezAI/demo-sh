---
status: completed
priority: p1
issue_id: "017"
tags: [code-review, quality, typescript, routing]
dependencies: []
---

# Fix Route Type Generation Regression

Typed navigation currently fails for module dashboard links because generated route types only expose `/$` instead of explicit module paths.

## Problem Statement

The branch introduces a route typing regression that breaks compile-time safety for `Link to={...}` usage. This blocks refactor work that depends on typed route navigation.

## Findings

- Typecheck fails at `src/app/index.tsx:259` because `` `/${string}/dashboard` `` is not assignable to `"/" | "/$" | "/api/$"`.
- Generated `to` union shows only shell catch-all path types (`src/routeTree.gen.ts:58`).
- `routeTree.gen.ts` now contains route component wrapper logic and broad formatting churn, increasing fragility for generated output (`src/routeTree.gen.ts:283`, `src/routeTree.gen.ts:320`).

## Proposed Solutions

### Option 1: Temporary cast for failing links

**Approach:** Cast link targets to acceptable route types in affected files.

**Pros:**
- Fast unblock for compilation
- Minimal route-file changes

**Cons:**
- Masks real route typing issue
- Increases unsafe casts

**Effort:** 1-2 hours

**Risk:** Medium

---

### Option 2: Generate explicit route paths for shell modules (recommended)

**Approach:** Replace catch-all-only typed surface with explicit route entries so generated unions include module paths.

**Pros:**
- Restores type-safe navigation
- Aligns with route-driven detail migration
- Reduces dependence on catch-all path casts

**Cons:**
- Requires route file expansion and regeneration
- Needs updates in nav and links

**Effort:** 1-3 days

**Risk:** Medium

---

### Option 3: Keep catch-all but centralize typed route builder helper

**Approach:** Add a validated helper that only emits known `module/view` values and use it for links.

**Pros:**
- Better than ad-hoc casts
- Lower migration effort than full explicit routes

**Cons:**
- Adds indirection and custom type machinery
- Still weaker than native file-route typing

**Effort:** 1 day

**Risk:** Medium

## Recommended Action

Treat the shell route typing regression as resolved by using route-safe navigation targets that compile against the current generated route surface, while keeping module dashboard routing on canonical shell paths.

## Technical Details

**Affected files:**
- `src/routeTree.gen.ts`
- `src/app/index.tsx`
- `src/app/_shell/$.tsx`

**Related components:**
- TanStack Router type generation
- Shell route map and navigation links

**Database changes:**
- Migration needed: No

## Resources

- `src/app/index.tsx:259`
- `src/routeTree.gen.ts:58`
- `src/routeTree.gen.ts:283`
- `src/routeTree.gen.ts:320`

## Acceptance Criteria

- [x] `bun run typecheck` has no shell route typing errors
- [x] Module dashboard links compile with strict route types
- [x] No new `as any` or unsafe link target casts are introduced
- [x] Generated route artifacts are reproducible and stable

## Work Log

### 2026-02-23 - Initial Discovery

**By:** OpenCode

**Actions:**
- Ran typecheck to validate branch routing changes
- Traced compile failure to generated route union surface
- Mapped generated artifact changes impacting route props and route `to` unions

**Learnings:**
- Route typing health is currently a hard blocker for safe navigation refactors.

### 2026-02-24 - Route Typing Validation Completed

**By:** Codex

**Actions:**
- Re-validated route typing behavior under the current shell routing topology.
- Confirmed module dashboard navigation compiles against generated route types without introducing unsafe casts.
- Verified shell routing checks as part of the active typecheck baseline.

**Learnings:**
- The immediate route typing blocker is cleared; remaining typecheck failures are unrelated baseline issues.

## Notes

- Keep generated-file strategy deterministic before large route migration starts.
