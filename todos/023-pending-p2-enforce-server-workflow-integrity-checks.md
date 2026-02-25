---
status: pending
priority: p2
issue_id: "023"
tags: [code-review, security, backend, integrity]
dependencies: ["019"]
---

# Enforce Workflow Integrity Rules on the Server

UI-only guards currently enforce some workflow rules (like editable lines in draft state), but server endpoints do not consistently enforce equivalent constraints.

## Problem Statement

Business workflow restrictions must be enforced server-side. Otherwise direct API calls can bypass client UI checks and mutate records in invalid states.

## Findings

- Invoice line editing is guarded in UI with `canEditLines` (`src/app/_shell/_views/ledger/components/invoice-card.tsx:229`) and conditional row handlers (`src/app/_shell/_views/ledger/components/invoice-card.tsx:261`, `src/app/_shell/_views/ledger/components/invoice-card.tsx:296`, `src/app/_shell/_views/ledger/components/invoice-card.tsx:328`).
- The invoice line router is generic CRUD and has no status-based write guard (`src/server/rpc/router/uplink/ledger.router.ts:25`).
- Generic update paths accept partial schemas and merge data broadly (`src/server/db/definitions/schema.ts:435`, `src/server/rpc/router/helpers.ts:357`).

## Proposed Solutions

### Option 1: Entity-specific server guard hooks (recommended)

**Approach:** Add pre-write hooks in CRUD config (or module routers) to validate parent/header status before create/update/delete.

**Pros:**
- Enforces workflow rules at trust boundary
- Reusable pattern for other entities

**Cons:**
- Requires additional policy code per constrained entity

**Effort:** 2-5 days

**Risk:** Medium

---

### Option 2: Replace sensitive entities with custom routers

**Approach:** Keep generic CRUD for simple entities; move workflow-heavy entities (invoices, purchase orders, transfers) to bespoke handlers.

**Pros:**
- Maximum control over workflow invariants
- Easier to audit for critical domains

**Cons:**
- More code and maintenance overhead
- Less helper reuse

**Effort:** 1-2 weeks

**Risk:** Medium

---

### Option 3: Database constraint/triggers for status locks

**Approach:** Add persistence-level protections to reject writes for disallowed statuses.

**Pros:**
- Strong final guardrail
- Protects all callers

**Cons:**
- Harder to evolve and test in app layer
- Error messaging may be less domain-friendly

**Effort:** 3-7 days

**Risk:** Medium

## Recommended Action

To be filled during triage.

## Technical Details

**Affected files:**
- `src/server/rpc/router/helpers.ts`
- `src/server/rpc/router/uplink/ledger.router.ts`
- Other workflow-heavy module routers

**Related components:**
- Invoice and document line mutations
- Workflow status transition logic

**Database changes:**
- Migration needed: Possibly (if DB-level constraints are chosen)

## Resources

- `src/app/_shell/_views/ledger/components/invoice-card.tsx:229`
- `src/app/_shell/_views/ledger/components/invoice-card.tsx:296`
- `src/server/rpc/router/uplink/ledger.router.ts:25`
- `src/server/rpc/router/helpers.ts:357`
- `src/server/db/definitions/schema.ts:435`

## Acceptance Criteria

- [ ] Server rejects disallowed line mutations when parent document status is locked
- [ ] UI and API workflow rules are consistent
- [ ] Integration tests cover direct API bypass attempts
- [ ] Error responses are actionable and domain-specific

## Work Log

### 2026-02-23 - Initial Discovery

**By:** OpenCode

**Actions:**
- Compared UI workflow guards against server mutation handlers
- Identified status-lock assumptions enforced only in frontend code
- Mapped candidate server enforcement points

**Learnings:**
- Client-side restrictions are insufficient for workflow integrity in multi-client systems.

## Notes

- This should be prioritized in financial and inventory-critical modules first.
