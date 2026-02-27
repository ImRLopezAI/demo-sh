---
status: pending
priority: p2
issue_id: "032"
tags: [code-review, testing, simplification, architecture]
dependencies: []
---

# Simplify Test Structure and Fix Mislabeled E2E Tests

9 identical `collectHrefs` functions are copy-pasted across 9 nav-routes test files. These and other tests live in `__test__/e2e/` directories but are Vitest unit tests, not Playwright E2E tests. ~410 lines of dead/duplicated code should be removed or consolidated.

## Problem Statement

The test structure has three significant issues:
1. **Duplication:** 9 nav-routes test files each contain an identical 26-line `collectHrefs` function (333 lines total).
2. **Mislabeling:** Files in `__test__/e2e/` directories are Vitest unit/integration tests, not browser E2E. The describe blocks say "(e2e)" reinforcing the false label. Playwright's `testDir: 'test/e2e'` never scans these directories.
3. **Dead scaffolding:** 18 `.gitkeep` files in `__test__/e2e/` and `__test__/unit/` serve no purpose (directories already have files, and Playwright ignores the e2e dirs). 9 `*-views.test.ts` files just check `typeof Dashboard === 'function'` — TypeScript already guarantees this at compile time.

## Findings

- 9x `*-nav-routes.test.ts` at 37 lines each = 333 lines of copy-pasted code
- Each file imports `vitest` not `@playwright/test` — these are unit tests
- `hub-authz-boundaries.test.ts` (259 lines) and `hub-cross-module-workflows.test.ts` (538 lines) are API integration tests using `createCaller()`, not browser tests
- 9x `*-views.test.ts` files (~108 lines total) are redundant with TypeScript type checking
- 18x `.gitkeep` files provide false signal that directories are "ready" for Playwright
- Relative import `'../../../../../../../test/uplink/helpers'` is 7 levels deep and fragile

## Proposed Solutions

### Option 1: Consolidate and reclassify (recommended)

**Approach:**
1. Replace 9 nav-routes files with 1 parameterized test at `src/app/_shell/__test__/nav-routes.test.ts`
2. Move hub authz + cross-module tests to `test/integration/` or `__test__/integration/`
3. Delete 9 `*-views.test.ts` typeof-check files
4. Delete 18 `.gitkeep` files
5. Fix the 7-level-deep relative import with a `@test/*` path alias

**Estimated LOC reduction:** ~410 lines, 27 files reduced to ~3

**Effort:** Small (1 day)
**Risk:** Low

## Recommended Action

Implement Option 1. This is a cleanup task that can be done independently.

## Technical Details

**Affected files:**
- Delete: 9x `*-nav-routes.test.ts`, 9x `*-views.test.ts`, 18x `.gitkeep`
- Move: `hub-authz-boundaries.test.ts`, `hub-cross-module-workflows.test.ts`
- Create: `src/app/_shell/__test__/nav-routes.test.ts` (single parameterized file)
- Update: `vitest.config.ts` or `tsconfig.json` for `@test/*` alias

**Database changes:** None

## Acceptance Criteria

- [ ] Nav-routes coverage maintained in single parameterized test file
- [ ] No files in `__test__/e2e/` directories are Vitest tests
- [ ] Hub authz and cross-module tests relocated to appropriate directory
- [ ] typeof-check smoke tests deleted
- [ ] .gitkeep files removed
- [ ] Deep relative import replaced with path alias

## Work Log

### 2026-02-27 - Initial Discovery

**By:** Code Review

**Actions:**
- Code simplicity reviewer identified 410 lines of dead/duplicated test code
- Architecture reviewer flagged mislabeled e2e directories as false coverage signal

**Learnings:**
- The per-module `__test__/e2e/` scaffolding was premature — it created the impression of E2E coverage where none exists.

## Resources

- `src/app/_shell/_views/market/__test__/e2e/market-nav-routes.test.ts`
- `src/app/_shell/_views/hub/__test__/e2e/hub-authz-boundaries.test.ts`
- `src/app/_shell/_views/hub/__test__/e2e/hub-cross-module-workflows.test.ts`
