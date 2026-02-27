---
status: pending
priority: p1
issue_id: "030"
tags: [code-review, testing, e2e, security, authorization, rbac]
dependencies: ["027"]
---

# Add Browser-Level Authorization Enforcement E2E Tests

No browser E2E test verifies that unauthorized users are prevented from accessing restricted routes, seeing restricted actions, or executing restricted operations. All 47 routes are accessible to any authenticated user regardless of role.

## Problem Statement

The `ModuleRoutePage` component renders any view based solely on the URL path with no route guard. The navigation sidebar and global search expose all 47 routes regardless of role. Status dropdowns show all valid transitions without filtering by user role. Action buttons (Post, Approve, Delete, Start Workflow) have no client-side role checks. A VIEWER can navigate to `/hub/order-fulfillment`, see the "Start Workflow" button, click it, and only then receive an API error.

The `hub-authz-boundaries.test.ts` comprehensively tests role enforcement at the API layer, but no test verifies the UI correctly prevents unauthorized actions.

## Findings

- `src/app/_shell/module-route-page.tsx` — renders any view from `VIEW_COMPONENTS` with no role check
- `src/app/_shell/shell-layout.tsx` — wraps children with no authorization
- `src/components/layout/header/search.tsx:28-55` — global search indexes all nav routes regardless of role
- `src/app/_shell/_views/ledger/components/invoice-card.tsx:229-233` — status dropdown shows all transitions for any role
- `src/app/_shell/_views/flow/payment-journal.tsx` — Post All button disabled only by mutation state, not role
- `src/app/_shell/_views/payroll/payroll-journal.tsx` — Run/Post/Pay buttons have no role check
- `src/app/_shell/_views/hub/order-fulfillment.tsx` — Start/Resume workflow and SLA Policy Editor exposed to all roles
- `src/components/data-grid/data-grid-export.tsx` — CSV/JSON/Excel export available to all roles on all list views

## Proposed Solutions

### Option 1: Role-based route access tests (recommended)

**Approach:** Use auth fixtures from todo 027 to run E2E tests authenticating as each role. Verify: route access denied for restricted modules, action buttons hidden/disabled for insufficient roles, status dropdowns filtered by role, and error messages are user-friendly (not raw API errors).

**Pros:** Comprehensive authorization coverage in browser
**Cons:** Requires auth infrastructure first; may reveal that the UI currently has NO role-based gating (which would be a finding, not a test problem)

**Effort:** Large (3-5 days after auth fixtures exist)
**Risk:** Low

## Recommended Action

After auth fixtures (027) are built, write authorization E2E tests for the 5 highest-risk areas: financial posting, POS session start, order approval, data export, and workflow orchestration.

## Technical Details

**Affected files:**
- `test/e2e/auth/route-access.spec.ts` — new
- `test/e2e/auth/action-visibility.spec.ts` — new
- `test/e2e/auth/export-restrictions.spec.ts` — new

**Key test scenarios:**
1. VIEWER navigates to /payroll/payroll-journal — verify restricted access
2. VIEWER navigates to /hub/order-fulfillment — verify Start Workflow disabled
3. AGENT attempts invoice posting — verify MANAGER required message in UI
4. VIEWER opens sales order card — verify Approve not in status dropdown
5. VIEWER exports payroll employee data — verify export restricted or redacted
6. VIEWER uses Cmd+K search — verify restricted routes not listed
7. Error messages for unauthorized actions are user-friendly, not raw API errors

**Database changes:** None

## Acceptance Criteria

- [ ] Route-level access restrictions verified for VIEWER on financial/admin routes
- [ ] Financial posting buttons disabled/hidden for insufficient roles
- [ ] Status transition dropdowns filtered by user role
- [ ] Data export restricted for sensitive modules (payroll, flow, ledger)
- [ ] Global search filtered by role
- [ ] Unauthorized action attempts show user-friendly error messages

## Work Log

### 2026-02-27 - Initial Discovery

**By:** Code Review

**Actions:**
- Security review identified all 47 routes accessible regardless of role
- Analyzed ModuleRoutePage, ShellLayout, and global search for authorization checks
- Found zero client-side role filtering on action buttons, status dropdowns, or data export

**Learnings:**
- The UI currently has no role-based gating — it relies entirely on API rejection. This is defense-in-depth gap.

## Resources

- `src/app/_shell/module-route-page.tsx`
- `src/app/_shell/shell-layout.tsx`
- `src/components/layout/header/search.tsx`
- `src/app/_shell/_views/hub/__test__/e2e/hub-authz-boundaries.test.ts`
- `src/components/data-grid/data-grid-export.tsx`
