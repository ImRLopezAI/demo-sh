---
status: pending
priority: p3
issue_id: "018"
tags: [code-review, typescript, type-safety]
dependencies: ["017"]
---

# Fix TransitionMap Type Widening and Remove `as` Casts

## Problem Statement

The `TransitionMap` type in `helpers.ts` uses `Record<string, readonly string[]>` which loses the narrow literal type information from constants.ts. This forces pervasive `as SomeStatus` casts in card components when calling `getLabeledTransitions()`.

## Findings

- **TypeScript reviewer**: "CRITICAL: TransitionMap type is too wide — loses readonly tuple info" and "Pervasive `as` casts for status values bypass type checking"
- Note: These become largely moot if StatusTransitionSelect component (todo #017) is extracted, since the casts would be centralized in one place

## Proposed Solutions

### Solution A: Make getLabeledTransitions generic with constraints (Recommended)
- Already partially generic but the `as` casts at call sites indicate type inference isn't flowing correctly
- Tighten the generic constraints so callers don't need casts
- **Pros**: Type-safe, no casts needed
- **Cons**: Slightly more complex generic signatures
- **Effort**: Small
- **Risk**: Low

### Solution B: Fix after StatusTransitionSelect extraction
- If #017 is done first, the casts are centralized in one component
- Fix the types in that single component
- **Pros**: Smaller blast radius, combined with #017
- **Cons**: Depends on #017
- **Effort**: Small
- **Risk**: Low

## Recommended Action

Solution B — fix alongside StatusTransitionSelect extraction (#017)

## Technical Details

**Affected files:**
- `src/server/rpc/router/helpers.ts` — TransitionMap type
- `src/server/db/constants.ts` — getLabeledTransitions signature
- All card components (if not extracted to shared component)

## Acceptance Criteria

- [ ] No `as SomeStatus` casts at call sites
- [ ] TypeScript infers correct literal types from constants
- [ ] No type errors

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-02-23 | Created from code review | TypeScript reviewer flagged as critical |

## Resources

- PR #1: https://github.com/ImRLopezAI/demo-sh/pull/1
