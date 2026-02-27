---
status: pending
priority: p2
issue_id: "036"
tags: [code-review, testing, e2e, performance, dashboards, navigation]
dependencies: ["027"]
---

# Add Dashboard Load and Navigation Performance E2E Tests

9 module dashboards with KPI widgets/charts and cross-module navigation with lazy-loaded components have zero performance regression tests.

## Problem Statement

Each module dashboard loads multiple data sources in parallel, renders Recharts charts, and displays KPI cards. Cross-module navigation triggers full component unmount/remount with lazy loading. No test measures load times, catches performance regressions, or verifies memory cleanup.

## Findings

- 9 dashboards each fire 2-3 parallel data queries + chart rendering
- Recharts components not lazy-loaded — adds bundle weight to each dashboard chunk
- `QueryClient` has `gcTime: 30s` — visiting 9 modules within 30s stacks datasets in memory
- Navigation triggers full React.lazy() chunk download + Suspense boundary
- No prefetching of adjacent module chunks
- `ScrollInterceptor` registers/unregisters wheel event listener on every mount/unmount
- Playwright 60s timeout masks slow loads

## Proposed Solutions

### Option 1: Performance budget tests for dashboards + navigation sweep (recommended)

**Approach:** Write tests that: (1) Navigate to each of the 9 dashboards and assert render within 5s, (2) Sequential navigation through all 9 modules measuring cumulative heap growth, (3) Assert no console errors during navigation.

**Effort:** Small (1-2 days)
**Risk:** Low

## Technical Details

**Affected files:**
- `test/e2e/performance/dashboard-load.spec.ts` — new
- `test/e2e/performance/navigation-sweep.spec.ts` — new

## Acceptance Criteria

- [ ] All 9 dashboards render within 5 seconds
- [ ] Sequential module navigation shows no monotonic memory growth
- [ ] No console errors during navigation sweep
- [ ] Suspense fallback duration tracked

## Work Log

### 2026-02-27 - Initial Discovery

**By:** Code Review

**Actions:**
- Performance reviewer identified dashboard loads and navigation as untested performance surfaces
- Architecture reviewer flagged gcTime stacking as potential memory issue

## Resources

- `src/app/_shell/_views/*/dashboard.tsx` (9 files)
- `src/app/_shell/view-components.tsx`
- `src/lib/rpc/rpc.ts:61` (QueryClient config)
