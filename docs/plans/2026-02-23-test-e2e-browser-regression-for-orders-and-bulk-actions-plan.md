---
title: "test: E2E browser regression for orders and bulk actions"
type: refactor
status: completed
date: 2026-02-23
---

# test: E2E browser regression for orders and bulk actions

## Overview

Add browser-level end-to-end test coverage for the highest-risk UI workflows: order forms with lines and Hub bulk selection/actions.

## Problem Statement / Motivation

Current test suite is integration-focused and API-heavy; it does not assert DOM behavior for complex forms and multi-select actions.

- Recent bug: selected rows showed as “0 selected” in bulk action bar.
- Sales/Purchase order forms had malformed layout and line issues.
- No dedicated browser test runner is configured in package scripts.

## Proposed Solution

Introduce browser E2E tests and CI gating for critical user flows.

Test packs:

- Hub notifications bulk select and transition actions.
- New sales order with draft lines and save flow.
- New purchase order vendor picker display/value behavior and line grid.
- POS terminal essential checkout flow smoke path.

## Technical Considerations

- Use deterministic seeded data and predictable IDs.
- Add selectors via stable `data-testid` where needed.
- Capture screenshots/videos on failures for debugging.
- Run on pull requests touching module views/forms.

## System-Wide Impact

- Interaction graph:
  - UI behavior validation across module routes in `_shell/$`.
- Error propagation:
  - Client-side rendering and state-sync regressions become visible pre-merge.
- State lifecycle risks:
  - Flaky async UI interactions; must include robust waits and retry-safe assertions.
- API surface parity:
  - E2E tests validate behavior on top of existing RPC API tests.
- Integration scenarios:
  - Selection persistence across pagination.
  - Add/remove lines before first save.
  - Vendor/customer display label vs stored ID.

## Acceptance Criteria

- [x] Browser test framework is configured and documented.
- [x] E2E spec for Hub bulk select/action passes consistently.
- [x] E2E specs for Sales/Purchase order create-with-lines flow pass.
- [x] CI can run the E2E smoke subset on relevant changes.
- [x] Failure artifacts are generated for debugging.

## Success Metrics

- Prevent recurrence of known UI regressions in covered workflows.
- E2E suite pass rate above 95% on CI for non-flaky runs.
- Time-to-diagnosis reduced via attached failure artifacts.

## Dependencies & Risks

- Dependencies:
  - Stable local/dev test environment and seed data.
  - Route-level selectors in key components.
- Risks:
  - Flakiness due to async rendering and transitions.
  - Longer CI runtime if not split into smoke/full suites.

## Implementation Phases

### Phase 1: tooling and baseline

- Add browser runner dependencies and scripts in `package.json`.
- Add test config and fixtures.

### Phase 2: critical flow coverage

- Create specs for:
  - `src/app/_shell/_views/hub/notifications-list.tsx`
  - `src/app/_shell/_views/market/components/sales-order-card.tsx`
  - `src/app/_shell/_views/replenishment/components/purchase-order-card.tsx`

### Phase 3: CI integration

- Add smoke execution to PR checks.
- Add nightly full-suite option.

## Sources & References

- Route resolver for module views:
  - `src/app/_shell/$.tsx`
- Existing integration test baseline:
  - `test/uplink/cross-module-workflows.test.ts`
- Known UI bug area:
  - `src/app/_shell/_views/hub/notifications-list.tsx`
