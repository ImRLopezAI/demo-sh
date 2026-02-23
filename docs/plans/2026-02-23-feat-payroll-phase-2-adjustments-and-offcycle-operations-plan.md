---
title: "feat: Payroll phase 2 adjustments and off-cycle operations"
type: feat
status: active
date: 2026-02-23
---

# feat: Payroll phase 2 adjustments and off-cycle operations

## Overview

Add payroll operations tooling for adjustment workflows, statutory reporting controls, and off-cycle/retro runs with clear compliance guardrails.

## Problem Statement / Motivation

Payroll backend supports adjustments and statutory report generation, but current UI primarily runs calculate/post/paid flow.

- Adjustment workflow is available in API but not surfaced in operator UX.
- Statutory report generation and review is not exposed in dedicated screen.
- Off-cycle and retro correction runs are not first-class operational flows.

## Proposed Solution

1. Add payroll adjustments workspace:
- Add/approve correction, bonus, and deduction adjustments per run/employee.
- Show before/after net impact preview.

2. Add statutory reporting center:
- Generate and track statutory report artifacts by run.
- Download/export and state tracking for submission readiness.

3. Add off-cycle/retro run flow:
- Create run with scope and reason (off-cycle, retro correction).
- Link correction runs to original run references.

## Technical Considerations

- Keep payroll run versioning for audit reproducibility.
- Maintain strict run-state transitions for adjustment windows.
- Ensure posting and payment remain idempotent across correction runs.
- Preserve employee-level calculation snapshots for explainability.

## System-Wide Impact

- Interaction graph:
  - Payroll run lifecycle writes employee ledger, GL entries, and bank ledger disbursements.
- Error propagation:
  - Rule/config errors should stop posting with explicit per-employee diagnostics.
- State lifecycle risks:
  - Retro runs can duplicate effects if linkage to source run is weak.
- API surface parity:
  - Add UI parity for existing adjustment/report endpoints.
- Integration test scenarios:
  - Adjustment after first calculation and before posting.
  - Statutory report regeneration policy.
  - Off-cycle run posting with downstream disbursement visibility.

## Acceptance Criteria

- [x] Payroll adjustments can be created and reviewed in UI.
- [x] Statutory reports can be generated/tracked/downloaded in UI.
- [x] Off-cycle/retro run types are supported with reference links.
- [x] Run state machine enforces allowed windows for adjustments.
- [x] Integration tests cover retro correction and idempotent payment behavior.

## Success Metrics

- Reduced payroll correction turnaround time.
- Fewer post-run manual adjustments done outside system.
- Improved statutory reporting readiness and traceability.

## Dependencies & Risks

- Depends on jurisdiction-specific ruleset quality.
- Risk: compliance errors if adjustment windows are not constrained.
- Risk: operator confusion without clear run-type semantics.

## Sources & References

- Payroll advanced endpoints: `src/server/rpc/router/uplink/payroll.router.ts:506`
- Payroll journal UI flow: `src/app/_shell/_views/payroll/payroll-journal.tsx:97`
- Payroll module tests for reports/adjustments: `test/uplink/payroll-modules.test.ts:271`
- Navigation context: `src/app/_shell/nav-config.ts:191`
- Related prior plan: `docs/plans/2026-02-23-feat-payroll-compliance-and-statutory-reporting-plan.md`
- Institutional learnings: none found in `docs/solutions/` as of 2026-02-23.

## Enhancement Summary

**Deepened on:** 2026-02-23  
**Sections enhanced:** 8  
**Research skills applied:** `vercel-react-best-practices`, `vercel-composition-patterns`, `web-design-guidelines`, `security-sentinel`, `performance-oracle`, `architecture-strategist`, `kieran-typescript-reviewer`, `agent-native-architecture`

### Key Improvements

1. Added payroll run versioning and adjustment-window controls for compliance-safe corrections.
2. Added statutory reporting traceability and submission-readiness quality gates.
3. Added off-cycle/retro linkage and idempotent payment/posting safeguards.

### New Considerations Discovered

- Payroll correction flows need clear provenance between original run, correction rationale, and resulting ledger effects.
- Statutory reporting trust depends on reproducible snapshot generation and immutable artifact metadata.

## Deepening Addendum

### Section Manifest

- Section 1: Overview & Problem Statement - missing payroll operations UX for adjustments and compliance.
- Section 2: Proposed Solution - adjustments workspace, statutory center, off-cycle/retro flow.
- Section 3: Technical Considerations - run-state controls, idempotency, explainability.
- Section 4: System-Wide Impact - employee ledger, GL, and bank disbursement propagation.
- Section 5: Acceptance Criteria - compliance and correction reproducibility gates.

### Research Insights - Overview & Problem Statement

**Best Practices**

- Keep payroll runs versioned snapshots so every posted outcome can be replayed and explained.
- Enforce strict run-state windows (`DRAFT`, `CALCULATED`, `APPROVED`, `POSTED`, `PAID`) for when adjustments are allowed.
- Require structured adjustment types and reason codes for compliance traceability.

**Performance Considerations**

- Use incremental recalculation scope (employee/run subset) for off-cycle corrections.
- Defer large artifact download generation to background jobs with status polling.

**Implementation Details**

```ts
// Plan-level payroll run identity
interface PayrollRunVersion {
  runId: string
  version: number
  runType: 'REGULAR' | 'OFF_CYCLE' | 'RETRO'
  sourceRunId?: string
}
```

**Edge Cases**

- Retro run created against already corrected source run.
- Adjustment entered after run moved to non-editable state.
- Statutory artifact generated on stale calculation snapshot.

### Research Insights - Proposed Solution

**Best Practices**

- Compose payroll operations into `AdjustmentWorkspace`, `StatutoryReportCenter`, `CorrectionRunBuilder`.
- Surface before/after gross-to-net preview at employee and aggregate levels.
- Link correction runs to original run IDs and enforce one-directional trace chain.

**Performance Considerations**

- Load run-summary first, then lazy-load employee-level drilldowns.
- Invalidate only affected run/version queries after adjustment actions.

**Implementation Details**

```ts
// Plan-level adjustment payload
interface PayrollAdjustmentInput {
  employeeId: string
  runId: string
  adjustmentType: 'BONUS' | 'DEDUCTION' | 'CORRECTION'
  amount: number
  reasonCode: string
  expectedRunVersion: number
}
```

**Edge Cases**

- Duplicate payment dispatch for off-cycle retry path.
- Negative net pay result after correction adjustment.
- Jurisdiction rule changed between source run and retro run.

### Research Insights - Technical Considerations

**Best Practices**

- Use Problem Details for calculation/post/payment failures with employee-scoped diagnostics.
- Require idempotency keys for post and payment commands across regular and correction runs.
- Restrict adjustment and posting endpoints by role/approval policy.

**Performance Considerations**

- Bound batch size for recalculation and payment dispatch.
- Track run processing time, recalculation depth, and correction retry metrics.

**Implementation Details**

```ts
// Plan-level statutory artifact metadata
interface StatutoryArtifact {
  artifactId: string
  runId: string
  runVersion: number
  jurisdiction: string
  generatedAt: string
  checksum: string
}
```

**Edge Cases**

- Posting command races with final adjustment approval.
- Statutory export retried after artifact already finalized.
- Unauthorized access to sensitive employee adjustment details.

### Research Insights - Acceptance Criteria Hardening

**Additional Quality Gates**

- [ ] Run-state machine enforces legal adjustment windows with clear rejection reasons.
- [ ] Off-cycle/retro runs include immutable linkage to source run and correction rationale.
- [ ] Post/payment operations are idempotent across retries and network failures.
- [ ] Statutory artifacts are reproducible from run snapshot metadata and checksums.
- [ ] Error responses include structured diagnostics suitable for operator remediation.

### References

- [RFC 9457 - Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc9457)
- [Idempotency-Key HTTP Header (IETF Draft)](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/)
- [TanStack Query - Query Invalidation](https://tanstack.com/query/v5/docs/framework/react/guides/query-invalidation)
- [OWASP API Security Top 10 (2023)](https://owasp.org/API-Security/editions/2023/en/0x11-t10/)
- [OpenTelemetry JS - Getting Started](https://opentelemetry.io/docs/languages/js/getting-started/)
