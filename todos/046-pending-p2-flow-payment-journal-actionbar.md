---
status: pending
priority: p2
issue_id: "046"
tags: [code-review, actionbar, flow, payment-journal, selective-posting, bulk-actions]
dependencies: ["040"]
---

# Add ActionBar to Payment Journal (Flow)

## Problem Statement

The flow payment journal (`flow/payment-journal.tsx`) currently has a "Post All" button that posts every postable journal line. There is no way to selectively approve, void, or post specific lines. The ActionBar would allow selective posting, which is a significant UX improvement over the all-or-nothing approach.

## Findings

- **RPC Explorer**: Backend has `postJournalBatch` which already supports batch posting with per-line outcomes
- **TypeScript Reviewer**: Rated Tier 2. Selective posting is a significant UX improvement.
- **Code Simplicity Reviewer**: Confirmed this is a real user need, not over-engineering.

## Proposed Solutions

### ActionBar actions:

1. **Approve Selected** -- Bulk transition OPEN lines to APPROVED. Gate: only OPEN status
2. **Void Selected** -- Bulk transition OPEN/APPROVED lines to VOIDED. Gate: OPEN or APPROVED
3. **Post Selected** -- Post only selected lines instead of all. Gate: OPEN or APPROVED
4. **Export Selected** -- Export selected journal lines

- Effort: Medium
- Risk: Low -- batch posting already exists

## Technical Details

- **Affected files**:
  - MODIFY: `src/app/_shell/_views/flow/payment-journal.tsx`
- **RPC endpoints**: `$rpc.flow.journalLines.postJournalBatch`, `$rpc.flow.journalLines.transitionStatus`

## Acceptance Criteria

- [ ] DataGrid has `withSelect` prop
- [ ] Selective posting replaces or supplements the "Post All" button
- [ ] "Void Selected" prevents accidental posting of incorrect entries
- [ ] Per-line status validation before enabling actions

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-27 | Created | From code review: selective posting UX |

## Resources

- Current file: `src/app/_shell/_views/flow/payment-journal.tsx`
- Backend router: `src/server/rpc/router/uplink/flow.router.ts`
