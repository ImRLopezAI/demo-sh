---
status: pending
priority: p1
issue_id: "063"
tags: [code-review, reporting, pdf, react-pdf, runtime]
dependencies: ["062"]
---

# Fix React PDF Reconciler Runtime Crash in Receipt Generation

Server-side POS receipt generation crashes at runtime when calling React PDF rendering.

## Problem Statement

Generating a POS receipt via `POST /api/rpc/pos/transactions/generateReceipt` throws a 500 due to a React PDF reconciler failure:

- `Cannot read properties of undefined (reading 'S')`
- The failure occurs inside `@react-pdf/reconciler` and bubbles from `renderReportFile`.

This blocks server-side receipt reporting and breaks ticket download UX in POS.

## Findings

- Error originates from React PDF internals:
  - `@react-pdf/reconciler/lib/reconciler-33.js`
  - `@react-pdf/renderer/src/node/renderTo.js`
- App call stack points to:
  - `src/server/reporting/pdf-runtime.tsx:13`
  - `src/server/rpc/router/uplink/pos.router.ts:281`
- Endpoint impact:
  - `POST /api/rpc/pos/transactions/generateReceipt` returns 500 in ~8ms.
- Existing reporting work is already tracked in issue `062`, but this is a blocking runtime defect requiring explicit triage and fix.

## Proposed Solutions

### Option 1: Align React PDF package versions and renderer entrypoint (recommended)

**Approach:**
- Verify and pin compatible versions for `@react-pdf/renderer` + `@react-pdf/reconciler`.
- Ensure server runtime imports only supported Node APIs from renderer.
- Remove mixed ESM/CJS import patterns in `pdf-runtime.tsx` if present.

**Pros:**
- Fixes root compatibility issue.
- Keeps current report architecture.

**Cons:**
- Requires dependency + runtime verification.

**Effort:** 1-2 hours

**Risk:** Medium

---

### Option 2: Isolate PDF rendering in dedicated server adapter

**Approach:**
- Introduce a strict adapter around `renderToStream`/`renderToBuffer`.
- Normalize document creation and guard against undefined element tree.

**Pros:**
- Better long-term stability and diagnostics.
- Cleaner boundary for all modules using reporting.

**Cons:**
- More code than immediate fix.

**Effort:** 3-5 hours

**Risk:** Medium

---

### Option 3: Temporary fallback to HTML/text receipt for POS only

**Approach:**
- Bypass React PDF for POS receipt endpoint temporarily.
- Return non-PDF printable payload while PDF runtime issue is fixed.

**Pros:**
- Restores user flow quickly.

**Cons:**
- Feature regression from PDF output.
- Adds temporary branch that must be removed.

**Effort:** 1-2 hours

**Risk:** High

## Recommended Action

To be filled during triage.

## Technical Details

**Affected files:**
- `src/server/reporting/pdf-runtime.tsx`
- `src/server/rpc/router/uplink/pos.router.ts`
- `package.json` / lockfile (React PDF dependency versions)

**Runtime signals:**
- `Cannot read properties of undefined (reading 'S')`
- stack points to reconciler and renderer internals during `renderToStream`.

## Resources

- Endpoint: `POST /api/rpc/pos/transactions/generateReceipt`
- Stack trace provided by user (2026-02-27).
- Related todo: `062-in-progress-p1-reporting-pdf-preview-pos-receipts.md`

## Acceptance Criteria

- [ ] `generateReceipt` returns a valid PDF response for known-good transaction inputs.
- [ ] No runtime error from `@react-pdf/reconciler` in server logs.
- [ ] Added regression test covering PDF render path (at least one POS transaction).
- [ ] Failure mode returns actionable error details when rendering fails.

## Work Log

### 2026-02-27 - Initial Bug Capture

**By:** Codex

**Actions:**
- Captured runtime stack trace and endpoint failure as blocking P1 todo.
- Linked dependency on ongoing reporting work (`062`).
- Documented root-cause hypotheses and fix options.

**Learnings:**
- Current server-side PDF path is operationally fragile and needs version/runtime hardening.

## Notes

- Prioritize before continuing report rollout to other modules.
