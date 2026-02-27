---
status: active
priority: p2
tags: [data-grid, search, performance, nuqs]
---

# Add Server-Side Search to DataGrid

## Context

The DataGrid search bar (`data-slot="grid-search"`) is currently **client-side only** — it highlights matches in already-loaded rows but never hits the server. Users searching for records not yet loaded via infinite scroll find nothing. The server's `listViewRecords` RPC **already accepts a `search` parameter** and does case-insensitive substring matching. The gap is purely client wiring.

## Approach

Use TanStack Table's built-in `globalFilter` + `onGlobalFilterChange` (already inherited via `UseDataGridProps extends TableOptions`) combined with `nuqs` for URL-synced search state. **No new DataGrid props needed** — everything flows through existing type inheritance and prop spreading.

## Changes

### 1. Install `nuqs` and add adapter

- [ ] `bun add nuqs`
- [ ] Add `NuqsAdapter` to `src/components/layout/providers.tsx`:
  ```tsx
  import { NuqsAdapter } from 'nuqs/adapters/next/app'
  // Wrap children: <NuqsAdapter>{children}</NuqsAdapter>
  ```

### 2. Bridge DataGrid search → TanStack `globalFilter`

**File:** `src/components/data-grid/hooks/use-data-grid-search.ts`

The search input currently only updates the internal store. Bridge it to TanStack Table's `globalFilter`:

- [ ] In `onSearchQueryChange` (line 407-410): add `tableRef.current?.setGlobalFilter(query)` after `store.setState`
- [ ] In `onSearchOpenChange(false)` (line 167-203): add `tableRef.current?.setGlobalFilter('')` after the batch that clears search state

This triggers `onGlobalFilterChange` on the table, which parents can subscribe to via the existing prop chain (`UseDataGridProps → ...propsRef.current → tableOptions → useReactTable`).

### 3. Wire server search in `useModuleData`

**File:** `src/app/_shell/hooks/use-data.ts`

- [ ] Import `useQueryState` and `parseAsString` from `nuqs`
- [ ] Add URL-synced search state with built-in throttle:
  ```tsx
  const [search, setSearch] = useQueryState('q', parseAsString.withDefault('').withOptions({ throttleMs: 350 }))
  ```
- [ ] Pass to `useInfiniteQuery` input: `search: search || undefined`
- [ ] Pass to `useGrid` config:
  ```tsx
  onGlobalFilterChange: (value) => setSearch(value || null),
  globalFilterFn: () => true,  // disable client-side row filtering (server handles it)
  ```

**Why `globalFilterFn: () => true`:** The server already returns filtered data. Without this, TanStack's `getFilteredRowModel` would double-filter client-side. Setting it to always-true means all server-returned rows pass through. The DataGrid's existing search highlighting (store-based `searchMatches`) still works independently.

**How query reset works:** When `search` changes, ORPC derives a new query key from the input closure. React Query treats it as a new query, fetches from `initialPageParam: 0`.

### Files NOT modified

- `src/components/data-grid/hooks/use-data-grid.ts` — no changes. `onGlobalFilterChange` and `globalFilterFn` already flow through `...propsRef.current` spread (line 1385) into `useReactTable` (line 1427).
- `src/components/data-grid/compound/index.tsx` — no changes. `CreateDataGridProps extends Omit<UseDataGridProps, 'columns'>` inherits all `TableOptions` props.
- `src/server/rpc/router/helpers.ts` — no changes. `listViewRecords` already accepts `search` and does substring matching.
- **No view components** — `onGlobalFilterChange` and `search` are wired inside `useModuleData`.

## Data Flow

```
User types in search bar
  → onSearchQueryChange(text)
    → store.setState('searchQuery', text)        [immediate - UI shows typed text]
    → table.setGlobalFilter(text)                [immediate - triggers onGlobalFilterChange]
      → onGlobalFilterChange(text)               [passed via existing props]
        → nuqs setSearch(text)                   [350ms throttle via nuqs]
          → URL updates: ?q=text                 [shareable/bookmarkable]
          → useModuleData re-reads search        [React re-render]
            → useInfiniteQuery re-keys           [new server fetch from offset 0]
              → server filters with search       [case-insensitive substring]
                → grid re-renders with filtered data
  → debouncedSearch(text)                        [150ms - client highlight on loaded rows]
```

## Verification

- [ ] `bun run typecheck` — no type errors
- [ ] `bun run test:e2e` — existing E2E tests pass
- [ ] Manual: `/market/sales-orders` → type in search → grid re-fetches filtered results from server
- [ ] Manual: URL shows `?q=searchterm` → refresh page → search persists
- [ ] Manual: clear search or press Escape → grid returns to unfiltered, `?q` removed from URL
