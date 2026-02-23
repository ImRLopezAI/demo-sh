---
status: pending
priority: p2
issue_id: "016"
tags: [code-review, typescript, dry, constants]
dependencies: []
---

# Deduplicate Reason-Required Logic Between constants.ts and transition-reason.tsx

## Problem Statement

The reason-required status map is duplicated in two places:
1. `src/server/db/constants.ts` — per-entity `*_REASON_REQUIRED` arrays (e.g., `BANK_ACCOUNT_REASON_REQUIRED`)
2. `src/app/_shell/_views/_shared/transition-reason.tsx` (lines 23-37) — `REASON_REQUIRED_STATUSES` map

These will silently drift if one is updated without the other. The constants.ts version is the source of truth, but the transition-reason hook uses its own copy.

## Findings

- **TypeScript reviewer**: "Duplicated reason-required logic between constants.ts and transition-reason.tsx — will silently drift"
- **Simplicity reviewer**: "Biggest DRY violation in the PR"
- Both reviewers independently flagged this as a significant concern

## Proposed Solutions

### Solution A: Import from constants.ts into transition-reason.tsx (Recommended)
- Replace the hardcoded `REASON_REQUIRED_STATUSES` map in transition-reason.tsx with imports from constants.ts
- Build the map dynamically from the per-entity `*_REASON_REQUIRED` arrays
- **Pros**: Single source of truth, type-safe, no drift risk
- **Cons**: Slightly more complex import structure
- **Effort**: Small
- **Risk**: Low

### Solution B: Move all reason-required logic to transition-reason.tsx
- Remove `*_REASON_REQUIRED` from constants.ts, keep only in the hook
- **Pros**: Simpler constants.ts
- **Cons**: Moves domain logic away from entity definitions, breaks colocation principle
- **Effort**: Small
- **Risk**: Low

## Recommended Action

Solution A — import from constants.ts into transition-reason.tsx

## Technical Details

**Affected files:**
- `src/server/db/constants.ts` — source of truth (no changes needed)
- `src/app/_shell/_views/_shared/transition-reason.tsx` — replace lines 23-37

## Acceptance Criteria

- [ ] Single source of truth for reason-required statuses
- [ ] No duplicated status lists
- [ ] Transition reason dialog still works correctly for all entities
- [ ] TypeScript types remain correct

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-02-23 | Created from code review | Both reviewers flagged independently |

## Resources

- PR #1: https://github.com/ImRLopezAI/demo-sh/pull/1
