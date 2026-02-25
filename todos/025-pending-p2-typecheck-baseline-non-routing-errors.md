---
status: pending
priority: p2
issue_id: "025"
tags: [code-review, quality, typescript, tooling]
dependencies: []
---

# Restore Typecheck Baseline for Non-routing Errors

The repository currently has multiple TypeScript errors unrelated to shell routing. Keeping these unresolved will hide regressions during the route refactor.

## Problem Statement

`bun run typecheck` currently fails in several files outside the shell route change. This weakens confidence in refactor changes and makes it harder to isolate newly introduced issues.

## Findings

- Flow field calculations use values that may be undefined (`convex/components/tableEngine/lib/flowFields.ts:115`, `convex/components/tableEngine/lib/flowFields.ts:134`).
- Dashboard tooltip props mismatch expected component contract (`src/app/_shell/_views/_shared/dashboard-widgets.tsx:95`, `src/app/_shell/_views/_shared/dashboard-widgets.tsx:170`, `src/app/_shell/_views/flow/dashboard.tsx:411`).
- Shell route typing error is tracked separately in issue 017 and should be addressed in parallel.

## Proposed Solutions

### Option 1: Fix all current non-routing type errors before route migration (recommended)

**Approach:** Patch undefined checks and tooltip prop usage until `bun run typecheck` is green (excluding issue 017 scope if split across PRs).

**Pros:**
- Clean baseline for future refactors
- Easier CI signal interpretation

**Cons:**
- Short-term effort not directly tied to feature work

**Effort:** 0.5-1.5 days

**Risk:** Low

---

### Option 2: Temporary selective exclusions

**Approach:** Add targeted `@ts-expect-error`/file excludes for known failures, then remove gradually.

**Pros:**
- Fast unblock

**Cons:**
- Hides real bugs
- Encourages tech debt growth

**Effort:** 1-3 hours

**Risk:** Medium

---

### Option 3: Split typecheck into strict domains

**Approach:** Run module-scoped typecheck targets to isolate unstable areas while refactor proceeds.

**Pros:**
- Better ownership boundaries
- Incremental quality improvement

**Cons:**
- Tooling complexity
- Still leaves global baseline red

**Effort:** 1 day

**Risk:** Medium

## Recommended Action

To be filled during triage.

## Technical Details

**Affected files:**
- `convex/components/tableEngine/lib/flowFields.ts`
- `src/app/_shell/_views/_shared/dashboard-widgets.tsx`
- `src/app/_shell/_views/flow/dashboard.tsx`

**Related components:**
- Typecheck workflow
- Chart tooltip component typing
- Flow field calculation utility

**Database changes:**
- Migration needed: No

## Resources

- `convex/components/tableEngine/lib/flowFields.ts:115`
- `convex/components/tableEngine/lib/flowFields.ts:134`
- `src/app/_shell/_views/_shared/dashboard-widgets.tsx:95`
- `src/app/_shell/_views/_shared/dashboard-widgets.tsx:170`
- `src/app/_shell/_views/flow/dashboard.tsx:411`

## Acceptance Criteria

- [ ] `bun run typecheck` passes for non-routing modules
- [ ] No new `@ts-ignore` directives introduced for these issues
- [ ] Tooltip prop usage matches expected component types
- [ ] Flow field logic handles undefined values safely

## Work Log

### 2026-02-23 - Initial Discovery

**By:** OpenCode

**Actions:**
- Ran project typecheck during review workflow
- Cataloged non-routing errors impacting baseline confidence

**Learnings:**
- A green baseline is needed before large routing and state migration work.

## Notes

- Coordinate this cleanup with issue 017 to avoid duplicate effort.
