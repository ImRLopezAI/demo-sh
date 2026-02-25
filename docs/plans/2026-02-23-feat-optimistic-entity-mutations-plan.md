---
title: "feat: Add hybrid optimistic mutations to use-entity.ts"
type: feat
status: active
date: 2026-02-23
brainstorm: docs/brainstorms/2026-02-23-optimistic-mutations-brainstorm.md
---

# feat: Add hybrid optimistic mutations to use-entity.ts

## Overview

Add optimistic update behavior to `useEntityRecord` and `useEntityMutations` in `src/app/_shell/_views/_shared/use-entity.ts`. The approach is hybrid:

- **Detail views** use React 19's `useOptimistic` for instant UI feedback with automatic revert on failure.
- **List views** use React Query's `onMutate/onError/onSettled` to optimistically update the infinite query cache so all consumers see changes instantly.
- **Error feedback** via Sonner toast on mutation failure.
- **Type safety** upgrade from loose `string` params to `<M extends UplinkModule>` generics.

All four mutation types are covered: **create**, **update**, **delete**, **transitionStatus**.

## Problem Statement

Current mutations in `use-entity.ts` (lines 25-52) only call `invalidateQueries` on success. This means:

- UI is unresponsive during mutations — no immediate visual feedback.
- Failed mutations leave the user seeing stale state with no notification.
- No `onMutate`, `onError`, `onSettled`, `setQueryData`, or `cancelQueries` used anywhere in the codebase.

25 consumer files across 9 modules use these hooks. The fix must be centralized to avoid per-view boilerplate.

## Proposed Solution

### Architecture Decisions (from brainstorm + SpecFlow analysis)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| `startTransition` ownership | **Encapsulated inside hooks** | Minimizes consumer changes. `useEntityMutations` returns wrapper functions that handle `startTransition` internally. Consumers call `mutations.update(values)` instead of raw `mutateAsync`. |
| Card close timing | **Wait for server confirmation** | Current behavior preserved. Closing optimistically would hide error feedback from the user. |
| POS module compatibility | **Opt-out via `enableOptimistic?: boolean`** | POS has its own offline-first reducer pattern that would conflict with cache-level optimistic updates. |
| Concurrent mutation guard | **Combined `isMutating` boolean** | Exposed from `useEntityMutations`. Consumers use it to disable save/transition buttons while any mutation is pending. |
| List item matching | **Match by `_id` field** | All entities use `_id` convention from the storage layer. |
| Error toast format | **`"[Operation] failed: [server message]"`** | 5-second auto-dismiss. No retry button for v1. |
| Optimistic visual treatment | **None for v1** | Optimistic entries look identical to real entries. Sub-second operations on normal networks make this acceptable. |
| Type safety refactor | **Separate preceding PR** | Isolates the signature change (25 file touches) from the optimistic logic. |

### Key Constraint: Infinite Query Cache Structure

List data uses `useInfiniteQuery` with paged results:

```typescript
// Cache shape from use-data.ts
{
  pages: Array<{
    tableName: string
    viewId: string
    items: Record<string, any>[]
    nextOffset: number | null
  }>
  pageParams: number[]  // [0, 25, 50, ...]
}
```

The `onMutate` handler must map over `pages[].items` — it cannot treat the cache as a flat array.

## Technical Approach

### Phase 1: Type Safety Refactor (Separate PR)

**Files changed:** `src/app/_shell/_views/_shared/use-entity.ts` + 25 consumer files

- [x] Extract shared types to a common location (or import from `use-data.ts`):
  ```typescript
  type UplinkModule = Exclude<keyof typeof $rpc, 'key' | 'health'>
  type EntityOf<M extends UplinkModule> = Exclude<keyof (typeof $rpc)[M], 'key'>
  ```
- [x] Upgrade `useEntityRecord` signature: `<M extends UplinkModule>(moduleId: M, entityId: EntityOf<M> & string, ...)`
- [x] Upgrade `useEntityMutations` signature: `<M extends UplinkModule>(moduleId: M, entityId: EntityOf<M> & string, ...)`
- [x] Upgrade `useEntityKpis` signature similarly
- [x] Update all 25 consumer files to pass typed module/entity arguments (should be non-breaking since they already pass valid string literals)
- [x] Run `bun run typecheck` to verify

### Phase 2: Core Optimistic Infrastructure

**Files changed:** `src/app/_shell/_views/_shared/use-entity.ts`

#### 2a. `useEntityRecord` — Add `useOptimistic` layer

```typescript
// src/app/_shell/_views/_shared/use-entity.ts
import { useOptimistic, useTransition } from 'react'

export function useEntityRecord<M extends UplinkModule>(
  moduleId: M,
  entityId: EntityOf<M> & string,
  id: string | null,
  opts?: { enabled?: boolean },
) {
  const rpc = getRpc(moduleId, entityId)
  const query = useQuery({
    ...rpc.getById.queryOptions({ input: { id: id ?? '' } }),
    enabled: (opts?.enabled ?? true) && !!id && id !== 'new',
  })

  const [optimisticData, setOptimisticData] = useOptimistic(
    query.data,
    (current: typeof query.data, update: Partial<NonNullable<typeof query.data>>) =>
      current ? { ...current, ...update } : current
  )

  return { ...query, data: optimisticData, setOptimisticData }
}
```

Key details:
- Reducer guards against `current` being `undefined` (loading state) — returns `current` as-is.
- `setOptimisticData` is only useful inside a `startTransition` (encapsulated in phase 2b).
- Return type preserves `query.data`'s original type — transparent to existing consumers.

#### 2b. `useEntityMutations` — Add optimistic cache updates + wrapper functions

```typescript
// src/app/_shell/_views/_shared/use-entity.ts

export function useEntityMutations<M extends UplinkModule>(
  moduleId: M,
  entityId: EntityOf<M> & string,
  opts?: { enableOptimistic?: boolean },
) {
  const rpc = getRpc(moduleId, entityId)
  const queryClient = useQueryClient()
  const optimistic = opts?.enableOptimistic ?? true

  // Helper: snapshot and optimistically update infinite query cache
  function createOptimisticCallbacks(operation: 'create' | 'update' | 'delete' | 'transitionStatus') {
    if (!optimistic) {
      return { onSuccess: () => invalidate() }
    }
    return {
      onMutate: async (variables) => {
        await queryClient.cancelQueries({ queryKey: rpc.key() })
        const snapshot = queryClient.getQueriesData({ queryKey: rpc.key() })
        // Apply optimistic update to all matching queries (list + infinite)
        applyOptimisticUpdate(queryClient, rpc.key(), operation, variables)
        return { snapshot }
      },
      onError: (error, variables, context) => {
        // Rollback cache from snapshot
        if (context?.snapshot) {
          for (const [key, data] of context.snapshot) {
            queryClient.setQueryData(key, data)
          }
        }
        toast.error(`${operationLabel(operation)} failed`, {
          description: extractErrorMessage(error),
        })
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: rpc.key() })
      },
    }
  }

  const create = useMutation({
    ...rpc.create.mutationOptions(createOptimisticCallbacks('create')),
  })
  const update = useMutation({
    ...rpc.update.mutationOptions(createOptimisticCallbacks('update')),
  })
  const remove = useMutation({
    ...rpc.delete.mutationOptions(createOptimisticCallbacks('delete')),
  })
  const transitionStatus = useMutation({
    ...rpc.transitionStatus.mutationOptions(createOptimisticCallbacks('transitionStatus')),
  })

  const isMutating = create.isPending || update.isPending || remove.isPending || transitionStatus.isPending

  return { create, update, remove, transitionStatus, isMutating }
}
```

#### 2c. `applyOptimisticUpdate` helper

A utility function that manipulates the infinite query cache:

```typescript
// src/app/_shell/_views/_shared/use-entity.ts

function applyOptimisticUpdate(
  queryClient: QueryClient,
  queryKeyPrefix: unknown[],
  operation: string,
  variables: Record<string, any>,
) {
  queryClient.setQueriesData(
    { queryKey: queryKeyPrefix },
    (oldData: any) => {
      if (!oldData?.pages) return oldData  // Not an infinite query
      return {
        ...oldData,
        pages: oldData.pages.map((page: any) => ({
          ...page,
          items: applyToItems(page.items, operation, variables),
        })),
      }
    },
  )
}

function applyToItems(items: any[], operation: string, variables: Record<string, any>) {
  switch (operation) {
    case 'create':
      return [{ ...variables, _id: crypto.randomUUID(), _optimistic: true }, ...items]
    case 'update':
    case 'transitionStatus':
      return items.map(item =>
        item._id === variables.id ? { ...item, ...variables } : item
      )
    case 'delete':
      return items.filter(item => item._id !== variables.id)
    default:
      return items
  }
}
```

#### 2d. Error message extraction helper

```typescript
// src/app/_shell/_views/_shared/use-entity.ts

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error && 'message' in error) return String(error.message)
  return 'An unexpected error occurred'
}

function operationLabel(op: string): string {
  switch (op) {
    case 'create': return 'Create'
    case 'update': return 'Update'
    case 'delete': return 'Delete'
    case 'transitionStatus': return 'Status transition'
    default: return 'Operation'
  }
}
```

### Phase 3: Consumer Migration

**Scope:** Minimal changes needed since `startTransition` is encapsulated inside the hooks.

#### 3a. Add `isMutating` guard to card save buttons

For each card component that uses `useEntityMutations`, add the `isMutating` check to disable save/transition buttons:

```typescript
// Example: src/app/_shell/_views/market/components/sales-order-card.tsx
const { create, update, remove, transitionStatus, isMutating } = useEntityMutations('market', 'salesOrders')

// In JSX:
<Button disabled={isMutating} onClick={handleSave}>Save</Button>
```

**Consumer file categories** (from SpecFlow analysis):

| Category | Files | Migration Complexity |
|----------|-------|---------------------|
| Simple cards (direct CRUD) | customer-card, item-card, location-card, vendor-card, employee-card, terminal-card, shipment-method-card | Low — add `isMutating` to buttons |
| Cards with sub-entity lines | sales-order-card, invoice-card, purchase-order-card, transfer-card, bank-account-card, task-card | Medium — `isMutating` for both header + line mutations |
| Cards with custom transitions | sales-order-card, invoice-card, shipment-card | Medium — custom `onTransition` handlers already call `mutateAsync` directly, which triggers the `onMutate` layer |
| Specialty views (inline mutations) | pricing-returns, planning-workbench, shift-controls, payroll-journal, reconciliation-approvals, collections-compliance, adjustments-offcycle | Low-Medium — these define mutations inline, not via `useEntityMutations`. Some may adopt it, others keep their cross-entity patterns. |
| Shared hooks | use-status-transition | Medium — wraps `useEntityMutations` internally, needs to expose `isMutating` |

#### 3b. POS module opt-out

```typescript
// src/app/_shell/_views/pos/hooks/use-pos-terminal.ts
const { create, ... } = useEntityMutations('pos', 'transactions', { enableOptimistic: false })
```

#### 3c. `useStatusTransition` hook update

```typescript
// src/app/_shell/_views/_shared/use-status-transition.ts
// Expose isMutating from the underlying useEntityMutations
```

## System-Wide Impact

- **Interaction graph**: Mutation → `onMutate` (cancel queries + snapshot + cache update) → server call → `onSettled` (invalidate queries → refetch). For detail views, `useOptimistic` layer runs in parallel, reverting when the transition ends.
- **Error propagation**: Server errors flow to `onError` → Sonner toast + cache rollback. Cross-entity invalidation in custom handlers (`postInvoice`, `submitForApproval`) is unaffected — those run in separate `onSuccess` callbacks defined by the views.
- **State lifecycle risks**: Concurrent mutations on the same entity could corrupt the snapshot chain. Mitigated by the `isMutating` guard that disables triggers while a mutation is pending.
- **API surface parity**: `useEntityKpis` is unaffected (read-only). `useModuleData` and `useModuleList` are unaffected (they consume the cache that gets updated by `onMutate`).

## Acceptance Criteria

### Functional

- [x] `useEntityRecord` wraps query data in `useOptimistic` with shallow-merge reducer
- [x] `useEntityMutations` applies optimistic cache updates via `onMutate` for all four operations
- [x] `onError` restores cache snapshot and fires Sonner toast with error message
- [x] `onSettled` calls `invalidateQueries` for server truth convergence
- [x] `isMutating` boolean prevents concurrent mutations on the same entity
- [x] POS module can opt out via `enableOptimistic: false`
- [x] Type-safe generics match `use-data.ts` pattern (`UplinkModule`, `EntityOf<M>`)

### Non-Functional

- [x] No regressions in existing mutation behavior (all 25 consumer files work unchanged)
- [x] `bun run typecheck` passes
- [x] `bun run lint` passes

## Dependencies & Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Concurrent mutation snapshot corruption | Medium | High | `isMutating` guard disables triggers while pending |
| Infinite query cache shape mismatch | Low | High | `applyOptimisticUpdate` guards with `if (!oldData?.pages)` check |
| POS double-optimistic conflict | Low | Medium | `enableOptimistic: false` opt-out for POS consumers |
| Form dirty state reset on optimistic revert | Low | Medium | Cards wait for server confirmation before closing — form stays stable |
| Cross-entity invalidation bypassed | Low | Low | Views with custom `onSuccess` handlers retain their existing cross-entity invalidation |

## Implementation Order

```
PR 1: Type Safety Refactor
  └── Update use-entity.ts signatures + 25 consumer files
  └── No behavior changes

PR 2: Core Optimistic Infrastructure
  └── useOptimistic layer in useEntityRecord
  └── onMutate/onError/onSettled in useEntityMutations
  └── applyOptimisticUpdate helper
  └── Sonner toast integration
  └── isMutating boolean
  └── enableOptimistic option

PR 3: Consumer Migration
  └── Add isMutating guards to card buttons
  └── POS module opt-out
  └── useStatusTransition update
```

## References & Research

### Internal References

- Current implementation: `src/app/_shell/_views/_shared/use-entity.ts`
- Type-safe pattern: `src/app/_shell/hooks/use-data.ts:9-15`
- RPC client: `src/lib/rpc/rpc.ts:136` (`createTanstackQueryUtils`)
- Sonner component: `src/components/ui/sonner.tsx`
- Sonner mounted: `src/components/layout/providers.tsx:9`
- Status transition hook: `src/app/_shell/_views/_shared/use-status-transition.ts`
- POS terminal hook: `src/app/_shell/_views/pos/hooks/use-pos-terminal.ts`
- QueryClient config: `src/lib/rpc/rpc.ts:51-74` (staleTime: 60s, gcTime: 30s)

### External References

- React `useOptimistic` docs: https://react.dev/reference/react/useOptimistic
- TanStack Query optimistic updates: https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates
- Brainstorm: `docs/brainstorms/2026-02-23-optimistic-mutations-brainstorm.md`
