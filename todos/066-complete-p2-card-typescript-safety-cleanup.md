---
status: complete
priority: p2
issue_id: "066"
tags: [code-review, typescript, quality, forms]
dependencies: []
---

# Reduce Unsafe Type Assertions in Cards and Form Flows

Replace high-risk `as unknown as` patterns in card/form code with stronger typed transformations.

## Problem Statement

Current card/form code uses broad assertions (`as unknown as Record<string, unknown>`) that can mask schema mismatches and runtime bugs.

## Findings

- Unsafe assertions appear in key card flows (sales orders, invoices, transfers, vendors, purchase orders).
- These assertions are used in mutation payload paths where type drift can break server contracts silently.

## Proposed Solutions

### Option 1: Introduce explicit typed mapper functions (recommended)

**Approach:**
- Add local helpers to map form rows to mutation payload shapes.
- Remove double-cast patterns in touched files.

**Pros:**
- Better safety and readability.
- Fewer hidden runtime failures.

**Cons:**
- Slightly more verbose code.

**Effort:** 2-4 hours

**Risk:** Medium

---

### Option 2: Keep casts but narrow to single assertions

**Approach:**
- Replace `as unknown as` with direct assertions close to API boundaries.

**Pros:**
- Lower effort.

**Cons:**
- Leaves structural safety weak.

**Effort:** 1-2 hours

**Risk:** Medium

## Recommended Action

Completed targeted cast cleanup in touched card flows by replacing double-casts with explicit payload mapping.

## Technical Details

**Potential files:**
- `src/app/_shell/_views/market/components/sales-order-card.tsx`
- `src/app/_shell/_views/ledger/components/invoice-card.tsx`
- `src/app/_shell/_views/replenishment/components/transfer-card.tsx`
- `src/app/_shell/_views/replenishment/components/purchase-order-card.tsx`
- `src/app/_shell/_views/replenishment/components/vendor-card.tsx`

## Resources

- Type assertions discovered via `rg "as unknown as" src/app/_shell/_views`.

## Acceptance Criteria

- [x] Reduce or remove unsafe double-cast usage in touched card flows.
- [x] No behavioral regressions in card save/update interactions.
- [x] Typecheck passes.

## Work Log

### 2026-02-27 - Todo Created

**By:** Codex

**Actions:**
- Added P2 TypeScript safety cleanup todo for card/form code.

**Learnings:**
- Several casts are concentrated in grid row update + mutation payload paths.

### 2026-02-27 - Implementation Complete

**By:** Codex

**Actions:**
- Removed `as unknown as` patterns from updated card mutation paths by mapping explicit payload objects.
- Simplified header/vendor casts to direct typed assertions where safe.
- Confirmed remaining double-casts are outside targeted card scope.
- Ran `bun run typecheck` successfully.

**Learnings:**
- Most risky assertions were concentrated in grid row update mutation payloads.

## Notes

- Prioritize high-traffic card flows first.
