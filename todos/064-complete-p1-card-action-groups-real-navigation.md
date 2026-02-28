---
status: complete
priority: p1
issue_id: "064"
tags: [code-review, ux, navigation, cards, actions]
dependencies: []
---

# Implement Real Navigation for Card Action Groups

Replace no-op action dropdown handlers in card forms with real route navigation.

## Problem Statement

Many card `actionGroups` entries still use placeholder handlers, so dropdown actions do nothing. This breaks UX expectations and makes forms/cards appear incomplete.

## Findings

- Multiple files in `src/app/_shell/_views/**/components/*card.tsx` still contain `/* TODO: implement navigation */` in action handlers.
- Affected modules include `market`, `pos`, `replenishment`, `trace`, `flow`, `ledger`, `insight`, `hub`, `payroll`.
- `RecordDialogAction` already supports functional handlers; issue is missing implementation, not missing component capability.

## Proposed Solutions

### Option 1: Shared route helper + per-card mapping (recommended)

**Approach:**
- Add a shared helper to navigate to list/detail routes consistently.
- Map each card action to a specific route and optional record selection state.

**Pros:**
- Consistent behavior across modules.
- Avoids duplicated query-string logic.

**Cons:**
- Requires touching many card files.

**Effort:** 3-5 hours

**Risk:** Medium

---

### Option 2: Inline router push per file

**Approach:**
- Implement each action with local `useRouter` and hardcoded URLs.

**Pros:**
- Fast to start.

**Cons:**
- Repetitive and error-prone.
- Inconsistent record state handling.

**Effort:** 2-4 hours

**Risk:** Medium

## Recommended Action

Implemented via shared action navigation helper with card-level mapping and filtered worksheet links.

## Technical Details

**Affected files:**
- `src/app/_shell/_views/**/components/*card.tsx` with placeholder action handlers.
- New shared helper under `src/app/_shell/_views/_shared/`.

## Resources

- Prior finding set from workflows-review in this thread.

## Acceptance Criteria

- [x] No remaining `TODO: implement navigation` action handlers in card files.
- [x] Action dropdown items navigate to relevant routes or records.
- [x] Route state (`mode`, `recordId`, `_recordScope`) is applied consistently where needed.
- [x] Typecheck passes.

## Work Log

### 2026-02-27 - Todo Created

**By:** Codex

**Actions:**
- Captured non-functional card action groups as P1 implementation item.

**Learnings:**
- Existing card action UI is in place; only handler wiring is missing.

### 2026-02-27 - Implementation Complete

**By:** Codex

**Actions:**
- Added `use-action-navigation` helper for normal, create, and detail navigation.
- Wired all card action groups to real routes with worksheet-style URL filters (`f_*`).
- Added route-filter support in `useModuleData` so worksheet lists open pre-filtered.
- Ran `bun run typecheck` successfully.

**Learnings:**
- Centralizing route-state + filter serialization keeps card actions consistent across modules.

## Notes

- Coordinate with icon polish and type-safety tasks for one implementation pass.
