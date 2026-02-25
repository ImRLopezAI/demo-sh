---
status: pending
priority: p2
issue_id: "022"
tags: [code-review, quality, typescript, architecture]
dependencies: []
---

# Strengthen Type Contracts in Shared Entity Hooks

Shared entity hooks currently rely on string IDs and broad casts that weaken compile-time guarantees.

## Problem Statement

`useEntity` helpers use string-based module/entity lookups and cast payloads to generic records in multiple cards. This reduces type safety, hides invalid payload shapes until runtime, and complicates refactors.

## Findings

- `getRpc` accepts untyped `moduleId` and `entityId` and casts through `unknown` (`src/app/_shell/_views/_shared/use-entity.ts:6`, `src/app/_shell/_views/_shared/use-entity.ts:8`).
- Shared hook signatures use `string` identifiers instead of constrained generics (`src/app/_shell/_views/_shared/use-entity.ts:13`, `src/app/_shell/_views/_shared/use-entity.ts:25`).
- Several cards cast update payloads to `Record<string, unknown>` (`src/app/_shell/_views/market/components/sales-order-card.tsx:202`, `src/app/_shell/_views/ledger/components/invoice-card.tsx:324`).

## Proposed Solutions

### Option 1: Generic, constrained shared hooks (recommended)

**Approach:** Refactor shared hooks to `useEntityRecord<M, E>` and `useEntityMutations<M, E>` with module/entity constrained to `$rpc` keys and typed input/output payloads.

**Pros:**
- Better compile-time guarantees
- Reduces unsafe casts in module cards
- Improves confidence during route refactor

**Cons:**
- Requires generic type plumbing
- Some module files need type updates

**Effort:** 2-5 days

**Risk:** Medium

---

### Option 2: Module-specific wrapper hooks

**Approach:** Keep shared helper loose, but introduce typed wrappers per module/entity domain.

**Pros:**
- Incremental adoption
- Localized type complexity

**Cons:**
- More wrapper files
- Potential duplication across modules

**Effort:** 2-4 days

**Risk:** Low

---

### Option 3: Runtime schema validation only

**Approach:** Keep existing casts but validate payloads at runtime before mutation.

**Pros:**
- Better runtime safety
- Lower TS refactor effort

**Cons:**
- Compile-time quality remains weak
- Additional runtime overhead

**Effort:** 1-3 days

**Risk:** Medium

## Recommended Action

To be filled during triage.

## Technical Details

**Affected files:**
- `src/app/_shell/_views/_shared/use-entity.ts`
- `src/app/_shell/_views/*/components/*-card.tsx`

**Related components:**
- Shared RPC utility layer
- Form submit and mutation flows

**Database changes:**
- Migration needed: No

## Resources

- `src/app/_shell/_views/_shared/use-entity.ts:6`
- `src/app/_shell/_views/_shared/use-entity.ts:13`
- `src/app/_shell/_views/market/components/sales-order-card.tsx:202`
- `src/app/_shell/_views/ledger/components/invoice-card.tsx:324`

## Acceptance Criteria

- [ ] Shared entity hooks are constrained by module/entity type parameters
- [ ] Card/editor mutations do not require `unknown` or `Record<string, unknown>` casts
- [ ] Typecheck catches invalid payload fields at compile time
- [ ] Pilot module refactor compiles without unsafe RPC helper casts

## Work Log

### 2026-02-23 - Initial Discovery

**By:** OpenCode

**Actions:**
- Audited shared entity helper signatures and casts
- Traced mutation call sites with unsafe payload conversions
- Mapped typed-hook options compatible with `$rpc` contract

**Learnings:**
- Type quality is a leverage point for safer architecture migration.

## Notes

- Coordinate with issue 017 so route typing and data typing evolve together.
