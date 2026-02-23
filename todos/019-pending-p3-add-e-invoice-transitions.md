---
status: pending
priority: p3
issue_id: "019"
tags: [code-review, constants, completeness]
dependencies: []
---

# Add Missing E_INVOICE_TRANSITIONS to constants.ts

## Problem Statement

The constants.ts file defines `E_INVOICE_STATUSES` and `E_INVOICE_STATUS_LABELS` but does NOT define `E_INVOICE_TRANSITIONS`. The eInvoice status field in the invoice card is intentionally kept as a read-only StatusBadge (since eInvoice status is system-managed), but the transitions map should exist for completeness and documentation purposes.

## Findings

- **TypeScript reviewer**: "HIGH: Missing E_INVOICE_TRANSITIONS in constants.ts"

## Proposed Solutions

### Solution A: Add E_INVOICE_TRANSITIONS as empty/restricted (Recommended)
- Add transitions map with no allowed manual transitions (empty arrays)
- Documents that eInvoice status is system-managed
- **Pros**: Consistent with other entity patterns, self-documenting
- **Cons**: Minimal — it's just documentation
- **Effort**: Small
- **Risk**: Low

### Solution B: Add a comment explaining intentional omission
- Add a comment in constants.ts explaining why transitions are absent
- **Pros**: No code change
- **Cons**: Less discoverable than actual code
- **Effort**: Small
- **Risk**: Low

## Recommended Action

Solution A — add restricted transitions map

## Technical Details

**Affected files:**
- `src/server/db/constants.ts`

## Acceptance Criteria

- [ ] E_INVOICE_TRANSITIONS defined in constants.ts
- [ ] Transitions reflect system-managed nature (no manual transitions or limited)
- [ ] eInvoice StatusBadge remains read-only in invoice card

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-02-23 | Created from code review | TypeScript reviewer flagged |

## Resources

- PR #1: https://github.com/ImRLopezAI/demo-sh/pull/1
