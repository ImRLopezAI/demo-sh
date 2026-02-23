---
title: "feat: Uplink enhancement program roadmap"
type: feat
status: completed
date: 2026-02-23
---

# feat: Uplink enhancement program roadmap

## Overview

Program-level execution roadmap for the enhancement plans requested on 2026-02-23.

Explicitly excluded from this roadmap:

- Flow real bank integration and auto reconciliation matching.

## Scope (Plan Set)

1. `docs/plans/2026-02-23-feat-atomic-sales-and-purchase-orders-with-lines-plan.md`
2. `docs/plans/2026-02-23-feat-replenishment-procure-to-pay-lifecycle-plan.md`
3. `docs/plans/2026-02-23-feat-cross-module-sales-to-fulfillment-orchestration-plan.md`
4. `docs/plans/2026-02-23-feat-hub-rbac-settings-and-audit-trails-plan.md`
5. `docs/plans/2026-02-23-feat-scheduled-automation-for-ops-and-planning-plan.md`
6. `docs/plans/2026-02-23-test-e2e-browser-regression-for-orders-and-bulk-actions-plan.md`
7. `docs/plans/2026-02-23-feat-ledger-credit-memos-and-einvoicing-compliance-plan.md`
8. `docs/plans/2026-02-23-feat-trace-carrier-integration-and-delivery-kpis-plan.md`
9. `docs/plans/2026-02-23-feat-market-pricing-promotions-tax-and-reservations-plan.md`
10. `docs/plans/2026-02-23-feat-payroll-compliance-and-statutory-reporting-plan.md`

## Delivery Sequence

### Wave 1 (Stability and correctness)

- Atomic sales/purchase orders with lines.
- E2E browser regression coverage.

### Wave 2 (Financial and operational depth)

- Replenishment procure-to-pay lifecycle.
- Ledger credit memos and e-invoicing compliance.
- Hub RBAC/settings/audit trails.

### Wave 3 (Automation and scale)

- Scheduled automation for operations/planning.
- Cross-module sales-to-fulfillment orchestration.

### Wave 4 (Commercial and workforce maturity)

- Market pricing/promotions/tax/reservations.
- Payroll compliance/statutory reporting.
- Trace carrier integration and delivery KPIs.

## Dependency Notes

- Wave 1 should complete before Wave 2 to reduce compounding regression risk.
- Hub RBAC/audit should land before broad scheduler/orchestration rollout.
- Market pricing/tax and Payroll compliance require additional rule management UX.

## Wave Ownership and Gates

| Wave | Owner | Milestone | Test Gate |
| --- | --- | --- | --- |
| 1 | Platform Core | Atomic order orchestration + E2E smoke baseline merged | `test/uplink/market-modules.test.ts`, `test/uplink/replenishment-modules.test.ts`, Playwright smoke spec list |
| 2 | Finance Ops | Procure-to-pay + Ledger compliance + Hub governance merged | `test/uplink/replenishment-modules.test.ts`, `test/uplink/ledger-modules.test.ts`, `test/uplink/hub-modules.test.ts` |
| 3 | Automation & Orchestration | Scheduler + cross-module workflow automation merged | `test/uplink/hub-modules.test.ts`, `test/uplink/cross-module-workflows.test.ts` |
| 4 | Commerce, Logistics, Workforce | Market controls + Payroll compliance + Trace carrier integrations merged | `test/uplink/market-modules.test.ts`, `test/uplink/payroll-modules.test.ts`, `test/uplink/trace-modules.test.ts` |

## Acceptance Criteria

- [x] All 10 plans are approved and triaged into implementation waves.
- [x] Each wave has clear owner, milestone, and test gate definition.
- [x] Excluded Flow bank integration remains out of current delivery scope.
