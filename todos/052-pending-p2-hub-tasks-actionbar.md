---
status: pending
priority: p2
issue_id: "052"
tags: [code-review, actionbar, hub, tasks, operations, bulk-actions]
dependencies: ["040"]
---

# Add ActionBar to Hub Tasks List

## Problem Statement

The hub tasks list (`hub/tasks-list.tsx`) has no bulk actions. Operations managers need to bulk-assign tasks, close completed tasks, and escalate priority on overdue items. The task entity has `status`, `priority`, and `assigneeUserId` fields.

## Proposed Solutions

### ActionBar actions:

1. **Assign To** -- Bulk assign selected tasks to a user (with user picker)
2. **Close Selected** -- Bulk transition to DONE. Gate: IN_PROGRESS or OPEN
3. **Escalate Priority** -- Bulk bump priority (LOW -> MEDIUM, MEDIUM -> HIGH, etc.)
4. **Export Selected** -- Export selected tasks

- Effort: Medium
- Risk: Low

## Technical Details

- **Affected files**:
  - MODIFY: `src/app/_shell/_views/hub/tasks-list.tsx`
- **RPC endpoints**: `$rpc.hub.operationTasks.update`, `$rpc.hub.operationTasks.transitionStatus`

## Acceptance Criteria

- [ ] DataGrid has `withSelect` prop
- [ ] Assign, Close, Escalate actions
- [ ] Priority escalation bumps to next level
- [ ] Query invalidation after actions

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-02-27 | Created | From code review: operations task management |

## Resources

- Current file: `src/app/_shell/_views/hub/tasks-list.tsx`
- Backend router: `src/server/rpc/router/uplink/hub.router.ts`
