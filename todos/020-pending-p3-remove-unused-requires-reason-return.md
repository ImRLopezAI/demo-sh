---
status: pending
priority: p3
issue_id: "020"
tags: [code-review, cleanup, dead-code]
dependencies: ["016"]
---

# Remove Unused requiresReasonForStatus Return Value

## Problem Statement

The `useTransitionWithReason` hook returns a `requiresReasonForStatus` function, but no card component uses it. The hook handles reason prompting internally, so callers never need to check this externally.

## Findings

- **Simplicity reviewer**: "Unused requiresReasonForStatus return value from useTransitionWithReason"

## Proposed Solutions

### Solution A: Remove from return value (Recommended)
- Remove `requiresReasonForStatus` from the hook's return object
- Keep the internal logic (it's still used internally)
- **Pros**: Cleaner API surface, no dead code
- **Cons**: None (no consumers)
- **Effort**: Small
- **Risk**: Low

## Recommended Action

Solution A

## Technical Details

**Affected files:**
- `src/app/_shell/_views/_shared/transition-reason.tsx` — remove from return

## Acceptance Criteria

- [ ] `requiresReasonForStatus` removed from hook return
- [ ] No consumers break (grep confirms no usage)
- [ ] Hook still works correctly internally

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-02-23 | Created from code review | Simplicity reviewer flagged |

## Resources

- PR #1: https://github.com/ImRLopezAI/demo-sh/pull/1
