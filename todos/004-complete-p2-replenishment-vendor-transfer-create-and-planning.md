---
status: complete
priority: p2
issue_id: "004"
tags: [code-review, functionality, replenishment, planning]
dependencies: []
---

# Add replenishment vendor/transfer creation workflows and planning operations

## Problem Statement

Replenishment currently supports PO creation, but vendor and transfer workflows are partially implemented in UI and planning logic is missing (rules/allocation/proposals).

## Findings

- Vendors list has no “new vendor” action; card update flow only.
  - `src/app/_shell/_views/replenishment/vendors-list.tsx:21`
  - `src/app/_shell/_views/replenishment/components/vendor-card.tsx:41`
  - `src/app/_shell/_views/replenishment/components/vendor-card.tsx:75`
- Transfers list has no “new transfer” action; card update flow only.
  - `src/app/_shell/_views/replenishment/transfers-list.tsx:17`
  - `src/app/_shell/_views/replenishment/components/transfer-card.tsx:77`
  - `src/app/_shell/_views/replenishment/components/transfer-card.tsx:102`
- Router has no replenishment planning endpoints beyond CRUD.
  - `src/server/rpc/router/uplink/replenishment.router.ts:54`

## Proposed Solutions

### Option 1: Complete CRUD UX first, planning second

**Approach:** Add new vendor/transfer create paths and editable lines, then add proposal endpoints.

**Pros:** Fast UX parity and incremental delivery.

**Cons:** Planning value delayed.

**Effort:** Medium

**Risk:** Low

---

### Option 2: Ship full planning engine in one phase

**Approach:** Demand analysis, min/max, reorder suggestions, allocation priority.

**Pros:** Strong business value.

**Cons:** Large scope and risk.

**Effort:** Large

**Risk:** High

## Recommended Action

Option 1 followed by scoped Option 2 MVP.

## Technical Details

- Affected UI: vendors and transfers cards/lists.
- New server endpoints: `generatePurchaseProposals`, `generateTransferProposals`, `allocateShortage`.

## Resources

- `src/server/rpc/router/uplink/replenishment.router.ts`

## Acceptance Criteria

- [x] Vendor create flow exists and persists correctly.
- [x] Transfer create flow exists and supports line management.
- [x] Planning MVP endpoint returns ranked proposals from current inventory/sales signals.
- [x] Integration tests cover create + planning outputs.

## Work Log

### 2026-02-23 - Review finding capture

**By:** Codex

**Actions:**
- Reviewed replenishment lists/cards and router capabilities.
- Mapped missing operational flows and planning gaps.

**Learnings:**
- Current module is mostly maintenance CRUD, not planning workflow.

### 2026-02-23 - Implementation complete

**By:** Codex

**Actions:**
- Completed vendor creation UX:
  - Added New Vendor action to `src/app/_shell/_views/replenishment/vendors-list.tsx`.
  - Added create flow to `src/app/_shell/_views/replenishment/components/vendor-card.tsx` with `onCreated` support and new-form defaults.
- Completed transfer creation and line management UX:
  - Added New Transfer action to `src/app/_shell/_views/replenishment/transfers-list.tsx`.
  - Extended `src/app/_shell/_views/replenishment/components/transfer-card.tsx` to support:
    - transfer header creation,
    - draft lines while creating a new transfer,
    - transfer line add/update/delete for existing transfers.
- Added planning MVP endpoints in `src/server/rpc/router/uplink/replenishment.router.ts`:
  - `generatePurchaseProposals`
  - `generateTransferProposals`
  - `allocateShortage`
- Extended replenishment integration tests in `test/uplink/replenishment-modules.test.ts` for:
  - vendor creation,
  - transfer create + line management,
  - planning proposal outputs and shortage allocation behavior.
- Verified with:
  - `bun run typecheck`
  - `bun run test test/uplink/replenishment-modules.test.ts`
  - `bun run test test/uplink/pos-terminal-id.test.ts test/uplink/hub-modules.test.ts test/uplink/trace-modules.test.ts test/uplink/market-modules.test.ts test/uplink/replenishment-modules.test.ts test/uplink/ledger-modules.test.ts test/uplink/payroll-modules.test.ts test/uplink/pos-modules.test.ts`

**Learnings:**
- A small planning surface (ranked proposals + explicit shortage allocation) delivers immediate replenishment utility without blocking on a full planning engine rollout.

## Notes

Core replenishment value depends on proposal and allocation automation.
