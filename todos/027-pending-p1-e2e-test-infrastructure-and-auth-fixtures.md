---
status: pending
priority: p1
issue_id: "027"
tags: [code-review, testing, e2e, playwright, infrastructure, security]
dependencies: []
---

# Build E2E Test Infrastructure with Role-Based Auth Fixtures

The platform has 47 routes across 9 modules but only 3 Playwright E2E tests. No mechanism exists to test as different roles, and the per-module `__test__/e2e/` scaffolding is disconnected from Playwright.

## Problem Statement

All 3 existing Playwright E2E tests run as MANAGER (the dev-mode default from `resolveServerBootstrapAuthIdentity`). There is no Playwright fixture to authenticate as VIEWER, AGENT, MANAGER, or ADMIN. The `playwright.config.ts` has a single Chromium project with no role variation. Without role-based test infrastructure, no authorization enforcement can be verified in the browser.

Additionally, the per-module `__test__/e2e/` directories contain Vitest unit/integration tests mislabeled as E2E. Playwright's `testDir` points to `test/e2e/` and will never scan those directories.

## Findings

- `playwright.config.ts` has `testDir: 'test/e2e'` — per-module `src/.../__test__/e2e/` dirs are invisible to Playwright
- `src/server/rpc/init.ts:48-65` hardcodes MANAGER role in dev mode — all E2E tests run with maximum permissions
- 9 `*-nav-routes.test.ts` files in `__test__/e2e/` are Vitest unit tests (import from `vitest`, not `@playwright/test`)
- `hub-authz-boundaries.test.ts` and `hub-cross-module-workflows.test.ts` are API-level Vitest tests, not browser E2E
- No Page Object Model (POM) layer exists for shared UI patterns (DataGrid, record cards, status transitions)
- No shared Playwright fixtures for module navigation, grid interaction, or record editing
- The existing `selectFirstOption` and `openEditorFromNewButton` helpers are local to a single spec file

## Proposed Solutions

### Option 1: Playwright projects per role with header/cookie injection

**Approach:** Add Playwright projects for VIEWER, AGENT, MANAGER, ADMIN. Pass the role via a custom header or cookie that `resolveServerBootstrapAuthIdentity` reads in dev mode.

**Pros:**
- Clean role isolation per test project
- No mock complexity — uses the real auth path
- Can run role-specific tests in parallel CI shards

**Cons:**
- Requires a small server-side change to accept role override in dev mode
- Multiple browser contexts increase CI time

**Effort:** Medium (2-3 days)

**Risk:** Low

---

### Option 2: Build POM + fixtures layer in test/e2e/fixtures/ (recommended)

**Approach:** Create shared Playwright fixtures for Shell navigation, DataGrid interaction, RecordCard editing, and StatusTransition verification. Add role-based Playwright projects. Restructure test/e2e/ with per-module subdirectories.

**Pros:**
- Scalable authoring — individual module tests become thin POM orchestrations
- One DataGrid POM covers all 17 list views
- Role fixtures enable security E2E tests across all modules

**Cons:**
- Higher upfront investment
- POM layer needs maintenance as UI evolves

**Effort:** Large (1-2 weeks)

**Risk:** Low

## Recommended Action

Implement Option 2. Build the POM + fixtures layer first, then use it to rapidly author module-specific E2E tests.

## Technical Details

**Affected files:**
- `playwright.config.ts` — add role projects, parallelization, module sharding
- `test/e2e/fixtures/` — new directory for shell, grid, card, auth fixtures
- `src/server/rpc/init.ts` — accept role override header in dev mode
- `src/app/_shell/_views/*/___test__/e2e/` — relocate or reclassify mislabeled tests

**Target structure:**
```
test/e2e/
  fixtures/
    shell.fixture.ts
    data-grid.fixture.ts
    record-card.fixture.ts
    auth.fixture.ts
  hub/
  market/
  pos/
  ledger/
  flow/
  payroll/
  insight/
  trace/
  replenishment/
  cross-module/
  smoke.spec.ts
```

**Database changes:** None

## Acceptance Criteria

- [ ] Playwright config supports VIEWER, AGENT, MANAGER, ADMIN projects
- [ ] Shell fixture provides `navigateTo(module, view)` helper
- [ ] DataGrid fixture provides filter, sort, search, export, selectRow helpers
- [ ] RecordCard fixture provides open, fill, save, close helpers
- [ ] Auth fixture sets role per browser context
- [ ] test/e2e/ has per-module subdirectories ready for specs
- [ ] Mislabeled `__test__/e2e/` Vitest tests are reclassified or relocated

## Work Log

### 2026-02-27 - Initial Discovery

**By:** Code Review

**Actions:**
- Analyzed all 6 review agents' findings on E2E test gap
- Inventoried all 47 routes, existing 3 Playwright tests, and mislabeled Vitest tests
- Identified role-based auth as the critical prerequisite for security E2E tests

**Learnings:**
- The testing pyramid has strong API-level coverage but 94% of routes lack browser E2E tests
- Per-module e2e scaffolding (.gitkeep) was premature and misleading

## Resources

- `playwright.config.ts`
- `test/e2e/orders-and-bulk-actions.spec.ts`
- `src/server/rpc/init.ts:48-65`
- `src/app/_shell/view-components.tsx`
