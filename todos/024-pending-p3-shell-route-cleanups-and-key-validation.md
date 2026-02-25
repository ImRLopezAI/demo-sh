---
status: pending
priority: p3
issue_id: "024"
tags: [code-review, quality, routing, cleanup]
dependencies: ["016", "017"]
---

# Cleanup Shell Route Types and Key Validation

There are low-risk cleanup opportunities in shell route code that improve maintainability and defensive behavior.

## Problem Statement

Shell route code still contains leftover types and key-validation patterns that are easy to harden. These are not blockers, but cleaning them up reduces confusion before larger routing changes.

## Findings

- `ViewComponentProps` is currently unused after switching to `RouteComponentProps<'/_shell/$'>` (`src/app/_shell/$.tsx:10`, `src/app/_shell/$.tsx:124`).
- Key guard uses `key in VIEW_COMPONENTS` (`src/app/_shell/$.tsx:109`) instead of own-property check.
- Not-found handling exists in both `beforeLoad` and render fallback paths (`src/app/_shell/$.tsx:114`, `src/app/_shell/$.tsx:128`), which is likely redundant.

## Proposed Solutions

### Option 1: Minimal hardening cleanup (recommended)

**Approach:** Remove dead interface, replace key check with `Object.hasOwn`, and keep one canonical not-found path.

**Pros:**
- Small and safe patch
- Improves readability and defensive behavior

**Cons:**
- Limited strategic impact

**Effort:** 1-2 hours

**Risk:** Low

---

### Option 2: Move route-key logic to dedicated utility

**Approach:** Extract route-key typing and validation into a shared helper with unit tests.

**Pros:**
- Easier to test and evolve
- Cleaner route file

**Cons:**
- Slightly more indirection for a small area

**Effort:** 3-5 hours

**Risk:** Low

---

### Option 3: Defer until explicit route migration

**Approach:** Leave current logic unchanged and clean up during larger route topology refactor.

**Pros:**
- Avoids interim churn

**Cons:**
- Keeps minor debt and confusion in interim

**Effort:** 0 now

**Risk:** Low

## Recommended Action

To be filled during triage.

## Technical Details

**Affected files:**
- `src/app/_shell/$.tsx`

**Related components:**
- Shell route key dispatch
- Not-found behavior

**Database changes:**
- Migration needed: No

## Resources

- `src/app/_shell/$.tsx:10`
- `src/app/_shell/$.tsx:109`
- `src/app/_shell/$.tsx:114`
- `src/app/_shell/$.tsx:124`
- `src/app/_shell/$.tsx:128`

## Acceptance Criteria

- [ ] Unused route prop interfaces are removed
- [ ] Route-key validation uses own-property semantics
- [ ] Not-found behavior has a single authoritative path
- [ ] Shell route file is easier to scan and reason about

## Work Log

### 2026-02-23 - Initial Discovery

**By:** OpenCode

**Actions:**
- Reviewed shell route diff and current type usage
- Identified low-risk defensive and readability cleanups

**Learnings:**
- Small cleanups now reduce friction during larger route migration work.

## Notes

- Execute after higher-priority routing and security issues.
