---
status: pending
priority: p3
issue_id: "038"
tags: [code-review, testing, e2e, playwright, ci, configuration]
dependencies: ["027"]
---

# Expand Playwright Configuration for Scale and Multi-Browser

The current Playwright config has a single Chromium project, no parallelization, no test tiering, and generous timeouts that mask slow loads.

## Problem Statement

The Playwright config is minimal: single Chromium browser, 60s timeout, no sharding, no module-based projects, no `grep` pattern support for tiered execution. As E2E tests scale from 3 to 50+, serial execution against a single browser could reach 15-30 minutes. No mobile viewport testing exists despite responsive layouts.

## Findings

- Single `chromium` project — no WebKit or Firefox coverage
- No `fullyParallel: true` — tests run serially within files
- 60s timeout generous enough to mask 10+ second load times
- No `grep` patterns for `@smoke`, `@functional`, `@workflow` tier selection
- No mobile viewport project (POS terminal and dashboards have responsive layouts)
- `retries: process.env.CI ? 1 : 0` but no sharding for parallel CI execution

## Proposed Solutions

### Option 1: Tiered projects with parallelization (recommended)

**Approach:** Add Playwright projects for: smoke (all routes, fast), functional (CRUD + transitions), workflow (cross-module). Add `fullyParallel: true`. Add mobile viewport project. Reduce default timeout to 30s. Add `grep` support.

**Effort:** Small (half day)
**Risk:** Low

## Technical Details

**Affected files:**
- `playwright.config.ts`

## Acceptance Criteria

- [ ] `fullyParallel: true` enabled
- [ ] `grep` patterns supported for `@smoke`, `@functional`, `@workflow`
- [ ] Mobile viewport project added (e.g., iPhone 13)
- [ ] Default timeout reduced from 60s to 30s
- [ ] CI can shard tests across workers
- [ ] `trace: 'on'` in CI for proactive performance regression detection

## Work Log

### 2026-02-27 - Initial Discovery

**By:** Code Review

**Actions:**
- Performance and architecture reviewers flagged Playwright config as insufficient for scaling beyond 3 tests

## Resources

- `playwright.config.ts`
