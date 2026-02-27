---
status: active
priority: p2
tags: [data-grid, search, filters, performance, nuqs]
---

# Add Server-Side Search & Filtering to DataGrid

## Context

The DataGrid's search bar and column filter menu are currently **client-side only** — they only operate on rows already loaded via infinite scroll. Users filtering for records not yet loaded find nothing. The server's `listViewRecords` RPC already accepts both `search` (substring match) and `filters` (currently equality-only) parameters. The gap is:

1. **Search**: Not wired to server at all
2. **Column filters**: Rich operators on the client (contains, greaterThan, isBetween, isAnyOf…) but the server's `matchesFilters` only does simple equality
3. **URL persistence**: Neither search nor filters are reflected in the URL — can't share a filtered view

**Goal:** A partner opening a shared URL like `?q=Swa&filters=[...]` sees exactly the same filtered table state.

## Approach

1. **Extend the server's `matchesFilters`** to support the same operators as the client-side `getFilterFn`
2. **Use `nuqs`** (with `nuqs/adapters/react`) to sync both `search` and `columnFilters` to URL params
3. **Use `manualFiltering: true`** on TanStack Table so the server handles all filtering
4. **Bridge DataGrid UI → nuqs → server** via `onGlobalFilterChange` and `onColumnFiltersChange`

## Changes

### 1. Install `nuqs` and add adapter

- [ ] `bun add nuqs`
- [ ] Add `NuqsAdapter` to `src/components/layout/providers.tsx`:
  ```tsx
  import { NuqsAdapter } from 'nuqs/adapters/react'
  // Wrap children: <NuqsAdapter>{children}</NuqsAdapter>
  ```

> **Important:** Use `nuqs/adapters/react` — NOT `nuqs/adapters/next/app`. This app runs on vinext, and the generic React adapter uses `window.history.pushState` directly without framework-specific dependencies.

### 2. Extend server `matchesFilters` to support rich operators

**File:** `src/server/rpc/router/helpers.ts`

The current `matchesFilters` only does equality checks. Extend it to support the same operators as the client-side `getFilterFn` in `src/components/data-grid/lib/data-grid-filters.ts`.

- [ ] Update `queryOptsSchema` to accept structured filters:
  ```tsx
  const filterValueSchema = z.object({
    operator: z.string(),
    value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]).optional(),
    endValue: z.union([z.string(), z.number()]).optional(),
  })

  const structuredFiltersSchema = z.array(
    z.object({
      id: z.string(),
      value: filterValueSchema,
    })
  ).optional()
  ```

- [ ] Add `structuredFilters` to `queryOptsSchema` alongside the existing `filters` (backward-compatible):
  ```tsx
  const queryOptsSchema = z.object({
    with: z.record(z.string(), z.boolean()).optional(),
    filters: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
    structuredFilters: structuredFiltersSchema,
    orderBy: z.object({ field: z.string(), direction: z.enum(['asc', 'desc']).default('asc') }).optional(),
    columns: z.record(z.string(), z.boolean()).optional(),
  })
  ```

- [ ] Rewrite `matchesFilters` to handle structured filters with operators:
  ```tsx
  const matchesStructuredFilters = (
    row: Record<string, any>,
    filters: Array<{ id: string; value: { operator: string; value?: any; endValue?: any } }> | undefined,
  ) => {
    if (!filters || filters.length === 0) return true
    for (const filter of filters) {
      const cellValue = row[filter.id]
      const { operator, value, endValue } = filter.value

      // Empty/not-empty checks
      if (operator === 'isEmpty') {
        if (cellValue != null && cellValue !== '' && !(Array.isArray(cellValue) && cellValue.length === 0)) return false
        continue
      }
      if (operator === 'isNotEmpty') {
        if (cellValue == null || cellValue === '' || (Array.isArray(cellValue) && cellValue.length === 0)) return false
        continue
      }
      // Boolean
      if (operator === 'isTrue') { if (cellValue !== true) return false; continue }
      if (operator === 'isFalse') { if (cellValue !== false && cellValue) return false; continue }

      if (value === undefined || value === null || value === '') continue

      const cellStr = String(cellValue ?? '').toLowerCase()
      const valStr = typeof value === 'string' ? value.toLowerCase() : String(value)

      // Text operators
      if (operator === 'contains') { if (!cellStr.includes(valStr)) return false; continue }
      if (operator === 'notContains') { if (cellStr.includes(valStr)) return false; continue }
      if (operator === 'equals') { /* numeric, date, string equality */ ... }
      if (operator === 'startsWith') { if (!cellStr.startsWith(valStr)) return false; continue }
      if (operator === 'endsWith') { if (!cellStr.endsWith(valStr)) return false; continue }

      // Numeric operators
      if (typeof cellValue === 'number' && typeof value === 'number') {
        if (operator === 'greaterThan' && !(cellValue > value)) return false
        if (operator === 'lessThan' && !(cellValue < value)) return false
        if (operator === 'isBetween' && typeof endValue === 'number' && !(cellValue >= value && cellValue <= endValue)) return false
        // ... greaterThanOrEqual, lessThanOrEqual, notEquals
        continue
      }

      // Date operators (before, after, onOrBefore, onOrAfter, isBetween)
      // ... same logic as client-side getFilterFn

      // Select operators (is, isNot, isAnyOf, isNoneOf)
      if (operator === 'isAnyOf' && Array.isArray(value)) {
        const matches = Array.isArray(cellValue)
          ? cellValue.some(v => value.some(fv => String(v) === String(fv)))
          : value.some(fv => String(cellValue) === String(fv))
        if (!matches) return false
        continue
      }
      // ... isNoneOf, is, isNot
    }
    return true
  }
  ```

- [ ] Update `listViewRecords` handler to use both:
  ```tsx
  .handler(({ input, context }) => {
    // ...existing tenant check...
    const search = input.search?.trim().toLowerCase()
    const items = table.findMany({
      where: (row) => {
        if ((row.tenantId ?? 'demo-tenant') !== tenantId) return false
        if (!matchesFilters(row, input.filters)) return false          // legacy simple filters
        if (!matchesStructuredFilters(row, input.structuredFilters)) return false  // new rich filters
        if (search) {
          return Object.values(row).some((v: any) => {
            if (v == null) return false
            return String(v).toLowerCase().includes(search)
          })
        }
        return true
      },
      // ...
    })
  })
  ```

> **Why a new `structuredFilters` field instead of changing `filters`?** Backward compatibility. The existing `filters` param is used by views that pass simple key-value filters via `useModuleData(module, entity, view, { filters: { status: 'DRAFT' } })`. Those still work unchanged. The new `structuredFilters` carries the rich operator-based filters from the DataGrid UI.

### 3. Harden server input validation

**File:** `src/server/rpc/router/helpers.ts`

- [ ] Add bounds to both `listInputSchema` and `viewListInputSchema`:
  ```tsx
  search: z.string().max(200).optional(),
  limit: z.number().min(1).max(200).default(25),
  offset: z.number().min(0).default(0),
  ```

### 4. Bridge DataGrid search → TanStack `globalFilter`

**File:** `src/components/data-grid/hooks/use-data-grid-search.ts`

- [ ] In `onSearchQueryChange` (line 407-410): add `tableRef.current?.setGlobalFilter(query)` after `store.setState`
- [ ] In `onSearchOpenChange(false)` (line 167-203): add `tableRef.current?.setGlobalFilter('')` before the `dataGridRef.current.focus()` call

### 5. Wire server search + filters in `useModuleData`

**File:** `src/app/_shell/hooks/use-data.ts`

- [ ] Import nuqs:
  ```tsx
  import { useQueryState, parseAsString, parseAsJson } from 'nuqs'
  import type { ColumnFiltersState } from '@tanstack/react-table'
  import { keepPreviousData } from '@tanstack/react-query'
  ```

- [ ] Add URL-synced state for both search and column filters:
  ```tsx
  const [search, setSearch] = useQueryState('q', parseAsString.withDefault('').withOptions({ throttleMs: 350 }))
  const [columnFilters, setColumnFilters] = useQueryState('filters',
    parseAsJson<ColumnFiltersState>().withDefault([]).withOptions({ throttleMs: 350 })
  )
  ```

- [ ] Map TanStack `ColumnFiltersState` to the server's `structuredFilters` format:
  ```tsx
  const structuredFilters = React.useMemo(() => {
    if (columnFilters.length === 0) return undefined
    return columnFilters.map((f) => ({
      id: f.id,
      value: f.value as { operator: string; value?: any; endValue?: any },
    }))
  }, [columnFilters])
  ```

- [ ] Pass both to `useInfiniteQuery` input:
  ```tsx
  input: (context: number) => ({
    viewId: viewSlug,
    limit: pageSize,
    offset: context,
    filters: options?.filters,              // static filters from view config (unchanged)
    structuredFilters: structuredFilters,    // dynamic filters from DataGrid UI
    search: search || undefined,
  }),
  ```

- [ ] Add `placeholderData` to prevent empty flash:
  ```tsx
  placeholderData: keepPreviousData,
  ```

- [ ] Pass filter/search config to `useGrid`:
  ```tsx
  const DataGrid = useGrid<T>(
    () => ({
      data: items ?? [],
      isLoading: query.isLoading,
      readOnly: true,
      enableSearch: true,
      manualFiltering: true,
      // Hydrate table state from URL on mount (for shared links)
      globalFilter: search || '',
      state: { columnFilters },
      // Bridge search bar → URL → server
      onGlobalFilterChange: (updater) => {
        const value = typeof updater === 'function' ? updater(search ?? '') : updater
        setSearch(value || null)
      },
      // Bridge column filters → URL → server
      onColumnFiltersChange: (updater) => {
        const value = typeof updater === 'function' ? updater(columnFilters) : updater
        setColumnFilters(value.length > 0 ? value : null)
      },
      infiniteScroll: {
        loadMore: () => {
          if (!query.isFetching) fetchNextPage()
        },
        hasMore: Boolean(data?.pages[data.pages.length - 1].nextOffset),
        isLoading: query.isFetchingNextPage,
      },
    }),
    [items, query.isLoading, query.isFetching, data, search, columnFilters],
  )
  ```

**Why `manualFiltering: true`:** Tells TanStack Table to skip `getFilteredRowModel` entirely — no client-side filtering at all. The server handles both search and column filters. This eliminates the ~7,500 no-op filter calls per keystroke that `globalFilterFn: () => true` would still trigger.

**How query re-keying works:** ORPC's `infiniteOptions` evaluates `input(initialPageParam)` to derive a concrete query key object: `{ viewId, limit, offset: 0, search, structuredFilters, filters }`. When any of these change, React Query treats it as a new query and fetches from offset 0. Previous results stay cached briefly (30s `gcTime` in `src/lib/rpc/rpc.ts`) then are GC'd.

### 6. Reset scroll position on filter/search change

When search or filters change, data drops from potentially 500 rows to a smaller set.

- [ ] Add an effect in `useModuleData` that resets the scroll position when `search` or `columnFilters` change. This could be:
  - A `React.useEffect` keyed on `[search, columnFilters]` that calls `window.scrollTo(0, 0)` or targets the grid scroll container
  - Or expose a `scrollToTop` ref from the DataGrid compound component

### Files NOT modified

- `src/components/data-grid/hooks/use-data-grid.ts` — no changes. `onGlobalFilterChange`, `onColumnFiltersChange`, `manualFiltering`, `globalFilter`, and `state` already flow through `...propsRef.current` spread (line 1385) into `useReactTable` (line 1427).
- `src/components/data-grid/compound/index.tsx` — no changes. `CreateDataGridProps extends Omit<UseDataGridProps, 'columns'>` inherits all `TableOptions` props.
- `src/components/data-grid/data-grid-filter-menu.tsx` — no changes. It already calls `table.setColumnFilters()`, which triggers `onColumnFiltersChange`.
- `src/components/data-grid/lib/data-grid-filters.ts` — no changes. Client-side filter logic stays for non-server-filtered grids.
- **No view components** — everything is wired inside `useModuleData`.

## Data Flow

```
Search bar:
  User types "Swa"
    → onSearchQueryChange("Swa")
      → store.setState('searchQuery', "Swa")       [immediate - input shows typed text]
      → table.setGlobalFilter("Swa")               [immediate]
        → onGlobalFilterChange(updater)             [via existing prop chain]
          → nuqs setSearch("Swa")                   [350ms throttle]
            → URL: ?q=Swa                           [shareable]

Column filters:
  User adds filter: Type isAnyOf [ORDER, QUOTE]
    → DataGridFilterMenu calls table.setColumnFilters([...])
      → onColumnFiltersChange(updater)              [via existing prop chain]
        → nuqs setColumnFilters([...])              [350ms throttle]
          → URL: ?q=Swa&filters=[...]               [shareable]

Server fetch (triggered by either URL change):
  → useModuleData re-reads search + columnFilters   [React re-render]
    → structuredFilters derived from columnFilters   [useMemo]
    → useInfiniteQuery re-keys                      [new query key from evaluated input]
      → server applies search + structuredFilters    [matchesStructuredFilters + substring search]
        → grid re-renders with filtered data
          → placeholderData shows previous results until new data arrives

Shared URL:
  Partner opens ?q=Swa&filters=[{"id":"documentType","value":{"operator":"isAnyOf","value":["ORDER","QUOTE"]}}]
    → nuqs initializes search="Swa", columnFilters=[...]
    → useGrid receives globalFilter="Swa", state={columnFilters:[...]}
    → DataGrid shows "Swa" in search input, filter badge shows "2"
    → Server returns data matching both search and filters
```

## Known Limitations & Future Improvements

- **Client highlight staleness:** The `refreshMatches` effect in `use-data-grid-search.ts` doesn't depend on `data` changes. After server-filtered data arrives, highlights may briefly reference stale rows. Future improvement: add data as a dependency to the refresh effect.
- **Server search scans all fields:** `Object.values(row).some(...)` matches against metadata fields too. Future: add `searchableFields` config to `CrudRouterConfig`.
- **Query cache during filtering:** Each unique filter combination creates a cache entry. The 30s `gcTime` mitigates this, but rapid filter changes could accumulate ~10-20MB before GC.
- **Sort URL persistence:** Sorting state could also be URL-persisted via nuqs for complete table state sharing. Out of scope for this plan.

## Verification

- [ ] `bun run typecheck` — no type errors
- [ ] `bun run test:e2e` — existing E2E tests pass
- [ ] Manual: `/market/sales-orders` → type in search → grid re-fetches filtered results from server
- [ ] Manual: add column filters (Type isAnyOf, Lines greaterThan, Total Amount isBetween) → server filters correctly
- [ ] Manual: combine search + column filters → both applied server-side
- [ ] Manual: URL shows `?q=searchterm&filters=[...]` → refresh page → both search and filters persist
- [ ] Manual: share URL with filters → partner sees exact same filtered view
- [ ] Manual: clear search or press Escape → `?q` removed, filters remain
- [ ] Manual: click "Reset filters" → `?filters` removed, search remains
- [ ] Manual: scroll down → type search → grid resets to top
- [ ] Manual: rapid typing → grid shows previous results (not empty flash) until new data arrives
