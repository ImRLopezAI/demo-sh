---
status: pending
priority: p1
issue_id: "031"
tags: [code-review, testing, e2e, smoke, deployment-gate]
dependencies: ["027"]
---

# Add Smoke E2E Tests for All 47 Routes

No deployment safety net exists — only 3 of 47 routes have any browser test. A single broken import or rendering error on 44 routes would reach production undetected.

## Problem Statement

The platform has 47 registered view routes across 9 modules. Only 3 have Playwright browser tests. A Tier 1 smoke test that navigates to every route, verifies the page heading renders, and checks for console errors would provide a basic deployment gate. The current `@smoke` tag on 3 tests is insufficient.

## Findings

- 47 routes registered in `src/app/_shell/view-components.tsx` and `src/app/_shell/nav-config.ts`
- 3 Playwright tests cover 3 routes (hub/notifications, market/sales-orders, replenishment/purchase-orders)
- 44 routes have zero browser test coverage
- All views use React.lazy() with Suspense — a broken chunk would only fail at runtime
- Navigation between modules triggers full component unmount/remount cycles

## Proposed Solutions

### Option 1: Parameterized smoke test (recommended)

**Approach:** Single spec file that iterates over all routes from `nav-config.ts`, navigates to each, verifies: page loads without console errors, heading or primary content is visible within 10 seconds, no uncaught exceptions. Tag as `@smoke` for CI gate.

**Pros:**
- One file covers all 47 routes
- Automatically picks up new routes when nav-config changes
- Fast to write and maintain
- Can run in under 3 minutes with parallelization

**Cons:**
- Only catches rendering failures, not functional regressions

**Effort:** Small (1 day)
**Risk:** Low

## Recommended Action

Implement the parameterized smoke test as the first E2E test after infrastructure (027) is ready. Use it as a CI deployment gate.

## Technical Details

**Affected files:**
- `test/e2e/smoke.spec.ts` — new

**Database changes:** None

## Acceptance Criteria

- [ ] Every route in nav-config.ts has a smoke test
- [ ] Each test navigates to the route and verifies primary content renders
- [ ] Console errors cause test failure
- [ ] Total smoke suite runs in under 3 minutes
- [ ] Tagged @smoke for CI selection via `--grep @smoke`
- [ ] New routes added to nav-config are automatically covered

## Work Log

### 2026-02-27 - Initial Discovery

**By:** Code Review

**Actions:**
- Counted 47 routes in nav-config.ts, confirmed only 3 have Playwright tests
- Architecture review recommended tiered testing: Tier 1 smoke for all routes

**Learnings:**
- A parameterized smoke test is the highest-leverage single test file — covers 44 untested routes in ~50 lines of code.

## Resources

- `src/app/_shell/nav-config.ts`
- `src/app/_shell/view-components.tsx`
- `playwright.config.ts`
