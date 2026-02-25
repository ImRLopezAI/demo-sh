# Optimistic Mutations for use-entity.ts

**Date:** 2026-02-23
**Status:** Brainstorm
**Scope:** `src/app/_shell/_views/_shared/use-entity.ts`

---

## What We're Building

A hybrid optimistic update system for `useEntityMutations` and `useEntityRecord` that:

1. **Detail views (single record):** Use React's `useOptimistic` hook for instant UI feedback with automatic revert on failure.
2. **List views (query cache):** Use React Query's `onMutate/onError/onSettled` pattern to optimistically update cached lists so all components see changes immediately.
3. **Error feedback:** Toast notifications via Sonner when mutations fail after an optimistic update.
4. **Type safety:** Adopt the generic pattern from `use-data.ts` (`UplinkModule`, `EntityOf<M>`) instead of loose `string` types.

Covers all four mutation types: **create**, **update**, **delete**, **transitionStatus**.

**Dependency note:** Sonner must be installed (or already present) for toast notifications.

---

## Why This Approach (Hybrid)

### Problem

Current mutations in `use-entity.ts` only call `invalidateQueries` on success. This means:

- UI is unresponsive during mutation (no immediate feedback).
- Failed mutations don't revert — the user sees stale state or no feedback.
- No `onMutate`, `onError`, or `onSettled` callbacks anywhere in the codebase.

### Why not just React Query onMutate?

- Manual rollback logic is error-prone (forgotten rollbacks = cache corruption).
- The generic nature of `use-entity.ts` makes shaping `setQueryData` harder for single records.
- Rollback bugs are silent and hard to debug.

### Why not just React useOptimistic?

- Only the component using the hook sees the optimistic state.
- List views with multiple consumers wouldn't reflect changes until cache invalidates.

### Why hybrid?

- **Detail views** (entity cards/forms) typically have a single consumer per record — `useOptimistic` is perfect here. Auto-revert eliminates rollback bugs.
- **List views** (data grids, tables) are consumed by multiple components — cache-level updates via `onMutate` ensure all consumers see the change instantly.
- Both strategies converge on the same cache invalidation on `onSettled`, so the source of truth always comes from the server.

---

## Key Decisions

1. **Approach:** Hybrid — `useOptimistic` for detail views, React Query cache for lists.
2. **Scope:** All four mutations (create, update, delete, transitionStatus).
3. **Error UX:** Toast notifications via Sonner on mutation failure.
4. **Centralization:** Logic lives in `use-entity.ts`, centralized and type-safe.
5. **Type safety:** Upgrade from loose `string` params to `<M extends UplinkModule>` generics matching `use-data.ts` pattern.
6. **startTransition:** Required for `useOptimistic` — mutation calls must be wrapped in `startTransition`.

---

## How the Two Strategies Connect

The hybrid approach has two independent layers that don't need to coordinate directly:

1. **Detail view (`useEntityRecord`)** — wraps query data in `useOptimistic`. The consumer calls `setOptimisticData` inside a `startTransition` before calling `mutateAsync`. The optimistic state auto-reverts when the transition ends (success or failure).

2. **List cache (`useEntityMutations`)** — `onMutate` optimistically updates the list cache. `onError` rolls back. `onSettled` invalidates. This is self-contained inside the mutation hook.

**They run independently.** A detail card update triggers both: the detail view sees the optimistic state via `useOptimistic`, and the list cache updates via `onMutate`. When invalidation runs on `onSettled`, both converge to server truth.

**Key constraint:** List data uses `useInfiniteQuery` with paged results (`{ pages: [{ items: T[], nextOffset }] }`). The `onMutate` handler must map over `pages[].items` to update/remove/insert into the correct page — it cannot treat the cache as a flat array.

---

## Technical Shape

### Detail View: `useEntityRecord` adds `useOptimistic` layer

- Wraps `query.data` in `useOptimistic(query.data, mergeReducer)`.
- Exposes `setOptimisticData` for consumers to call inside `startTransition`.
- Reducer does a shallow merge: `(current, partial) => ({ ...current, ...partial })`.
- When `query.data` is `undefined` (still loading), `useOptimistic` passes through `undefined` — no special handling needed.
- Returns optimistic data as `data` (transparent to existing consumers that don't use `setOptimisticData`).

### List Cache: `useEntityMutations` adds `onMutate/onError/onSettled`

- **`onMutate`**: Cancels in-flight queries, snapshots current cache (both list and infinite query caches), applies optimistic update by mapping over `pages[].items`.
- **`onError`**: Restores snapshot, fires Sonner toast with error message.
- **`onSettled`**: Calls `invalidateQueries` (existing behavior, now moved from `onSuccess`).
- **Create**: Prepends a temporary entry (with `crypto.randomUUID()` temp ID and `pending: true` flag) to the first page.
- **Delete**: Filters the item out of all pages.
- **Update/transitionStatus**: Merges partial data into the matching item across pages.

### Consumer Usage Pattern

```typescript
// In a detail card component
const { data, setOptimisticData } = useEntityRecord('market', 'salesOrders', id)
const { update } = useEntityMutations('market', 'salesOrders')

function handleSave(values) {
  startTransition(async () => {
    setOptimisticData(values)         // instant UI update
    await update.mutateAsync(values)  // server call + list cache handled internally
  })
}
```

---

## Constraints

- **Infinite query structure**: List caches are paged (`{ pages: [{ items, nextOffset }] }`). Optimistic updates must preserve this structure.
- **Cross-entity invalidation**: Some views (invoice posting, cart checkout) invalidate multiple entities. The `onSettled` invalidation in `useEntityMutations` handles the primary entity; cross-entity invalidation remains the view's responsibility.
- **`startTransition` + `mutateAsync` at call sites**: Consumers using `setOptimisticData` must wrap calls in `startTransition` and use `mutateAsync` (not `mutate`) so the transition stays alive for the full async operation. This is a new requirement for existing views.
- **Type safety refactor is separable**: Decision #5 (upgrading to `<M extends UplinkModule>` generics) can be done as a preceding step or bundled in. If bundled, all existing call sites need updating in the same PR.
