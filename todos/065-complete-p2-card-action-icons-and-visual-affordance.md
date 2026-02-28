---
status: complete
priority: p2
issue_id: "065"
tags: [code-review, ux, ui, icons, cards]
dependencies: ["064"]
---

# Add Action Icons to Card Dropdown Menus

Improve action menu clarity by adding meaningful icons for each card action.

## Problem Statement

Card action menus lack visual affordances. Users cannot quickly infer action purpose, reducing scanability and perceived polish.

## Findings

- `RecordDialogAction` supports `icon?: React.ReactNode`.
- Action rendering already displays `action.icon` in dropdown items.
- Most card action items currently set only `label` and `onClick`.

## Proposed Solutions

### Option 1: Add semantic Lucide icons per action (recommended)

**Approach:**
- Import icon primitives from `lucide-react`.
- Assign consistent iconography by action intent (navigate, print, post, receive, related record).

**Pros:**
- Immediate UX improvement with minimal structural change.

**Cons:**
- Requires updating many files.

**Effort:** 2-3 hours

**Risk:** Low

---

### Option 2: Group-level icon only

**Approach:**
- Keep item rows text-only, add icon to group trigger label.

**Pros:**
- Fewer changes.

**Cons:**
- Lower clarity at item level.

**Effort:** 1-2 hours

**Risk:** Low

## Recommended Action

Implemented semantic iconography for card action dropdown items during action wiring rollout.

## Technical Details

**Affected files:**
- `src/app/_shell/_views/**/components/*card.tsx`
- `src/app/_shell/_views/_shared/record-dialog.tsx` (verify spacing only if needed)

## Resources

- `RecordDialogAction` type and dropdown rendering in `record-dialog.tsx`.

## Acceptance Criteria

- [x] Action items across updated cards include meaningful icons.
- [x] Icons are visually aligned and do not break dropdown layout.
- [x] Typecheck passes.

## Work Log

### 2026-02-27 - Todo Created

**By:** Codex

**Actions:**
- Added P2 todo for icon affordance improvements in card action menus.

**Learnings:**
- No framework changes needed; capability already exists.

### 2026-02-27 - Implementation Complete

**By:** Codex

**Actions:**
- Added Lucide icons to action items across updated card dialogs in flow, hub, insight, market, ledger, payroll, pos, replenishment, and trace.
- Kept icon usage semantic by action intent (print, navigate, post, receive, related record).
- Verified compile safety with `bun run typecheck`.

**Learnings:**
- Existing dropdown rendering already handled icon spacing, so updates were low-risk.

## Notes

- Implement alongside navigation wiring to avoid duplicate file passes.
