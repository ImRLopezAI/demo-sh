---
status: pending
priority: p2
issue_id: "034"
tags: [code-review, testing, e2e, cross-module, workflows]
dependencies: ["027", "029"]
---

# Add Cross-Module Workflow Browser E2E Tests

5 critical business workflows are tested at the API level in `hub-cross-module-workflows.test.ts` but have zero browser-level counterparts. The core value proposition of the platform is module integration.

## Problem Statement

The `hub-cross-module-workflows.test.ts` tests 5 critical multi-module workflows via API callers. None have browser-level E2E tests that verify users can navigate between modules, trigger workflows, and see data propagation.

## Findings

- Market → Ledger → Trace: Cart checkout → invoice posting → shipment dispatch
- Payroll → Flow: Payroll run → bank disbursement
- Replenishment → Ledger: Purchase order → vendor invoice → payables
- Hub Order Fulfillment: Cross-module orchestration with resume on failure
- POS → Market: Session → transaction completion

All tested at API level, none in browser.

## Proposed Solutions

### Option 1: Browser equivalents of the 3 highest-value workflows (recommended)

**Approach:** Write browser E2E tests for: (1) Market checkout → Ledger invoice → Trace shipment, (2) Hub order fulfillment start/resume, (3) Payroll posting → Flow bank disbursement.

**Effort:** Large (4-5 days)
**Risk:** Medium — cross-module tests are inherently slower and more fragile

## Technical Details

**Affected files:**
- `test/e2e/cross-module/market-to-ledger-to-trace.spec.ts` — new
- `test/e2e/cross-module/hub-order-fulfillment.spec.ts` — new
- `test/e2e/cross-module/payroll-to-flow.spec.ts` — new

## Acceptance Criteria

- [ ] Market checkout creates order visible in ledger and trace modules
- [ ] Hub order fulfillment starts workflow and shows stage timeline
- [ ] Payroll posting creates bank ledger entries visible in flow module
- [ ] All cross-module tests tagged @workflow for selective CI execution

## Work Log

### 2026-02-27 - Initial Discovery

**By:** Code Review

**Actions:**
- Architecture reviewer identified cross-module browser tests as the highest-risk coverage gap
- Existing API-level tests provide the exact flow specifications for browser tests

## Resources

- `src/app/_shell/_views/hub/__test__/e2e/hub-cross-module-workflows.test.ts`
- `src/app/_shell/_views/hub/order-fulfillment.tsx`
