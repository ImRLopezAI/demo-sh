---
title: "Decomposing monolithic views into atomic spec-driven json-render components"
date: 2026-03-29
category: best-practices
module: json-render
problem_type: best_practice
component: tooling
severity: high
applies_when:
  - Adding new dashboard sections or UI components to any Uplink module
  - Composing module views from JSON spec definitions
  - Refactoring monolithic view files into reusable atomic units
  - Maintaining design consistency across 9+ module dashboards
tags:
  - json-render
  - atomic-components
  - spec-driven-ui
  - dashboard-decomposition
  - react-context
  - catalog-registry
  - refactoring
  - component-architecture
---

# Decomposing monolithic views into atomic spec-driven json-render components

## Context

The Uplink platform had a hybrid architecture where JSON-render specs existed but the actual rendering was done by 120+ monolithic view files in `src/app/_shell/_views/`. Each module dashboard was a single 300-500 line component handling data fetching, metric computation, and all rendering. The spec system existed but was a thin facade — specs pointed to page-sized components instead of composing small sections.

This meant:
- Specs were not the true source of UI composition
- Adding a KPI card required editing a 400+ line component and risking regressions
- Shared patterns were hidden inside monolithic files
- Design consistency was impossible to enforce centrally

## Guidance

### The Atomic Dashboard Decomposition Pattern

Each dashboard is decomposed into three layers:

**Layer 1: Data Provider** (`{Module}DashboardData`)

A React component that wraps children with a Context provider. It fetches all required data, computes derived metrics in a single `useMemo`, and exposes `isLoading`.

```typescript
// src/lib/json-render/components/insight-dashboard.tsx
function useInsightDashboardData() {
  const { items: ledgerEntries, isLoading: ledgerLoading } =
    useModuleData<'insight', ItemLedgerEntry>('insight', 'itemLedgerEntries', 'all')
  const { items: valueEntries, isLoading: valueLoading } =
    useModuleData<'insight', ValueEntry>('insight', 'valueEntries', 'all')

  const isLoading = ledgerLoading || valueLoading

  return React.useMemo(() => ({
    isLoading,
    metricItems: [ /* derived KPIs */ ],
    entryTypeMix: buildCategorySeries(ledgerEntries.map(e => e.entryType)),
    monthlyMovement: buildMonthlySeries(ledgerEntries, e => e.postingDate),
    // ... all other derived data
  }), [isLoading, ledgerEntries, valueEntries])
}

export function InsightDashboardData({ children }: { children?: React.ReactNode }) {
  const value = useInsightDashboardData()
  return (
    <InsightDashboardContext.Provider value={value}>
      {children}
    </InsightDashboardContext.Provider>
  )
}
```

**Layer 2: Section Components** (5-11 per module, zero props)

Each section reads from context and renders using shared UI primitives. Zero props means they are fully spec-composable.

```typescript
export function InsightKpiStrip() {
  const { metricItems } = useInsightDashboardContext()
  return <MetricStrip items={metricItems} />
}

export function InsightRecentEntries() {
  const { isLoading, recentEntries } = useInsightDashboardContext()
  return (
    <RecordListPanel
      title="Recent Ledger Entries"
      items={recentEntries}
      isLoading={isLoading}
      emptyMessage="No ledger entries found."
    />
  )
}
```

**Layer 3: Spec Composition**

The spec declares the element tree. The provider wraps all consumers.

```typescript
'/insight/dashboard': {
  page: {
    root: 'dashboard',
    elements: {
      dashboard: { type: 'DashboardPageStack', children: ['provider'] },
      provider: {
        type: 'InsightDashboardData',
        children: ['header', 'kpis', 'distribution', 'trend', 'lowerGrid'],
      },
      header: { type: 'PageHeader', props: { title: 'Insight Dashboard', description: '...' } },
      kpis: { type: 'InsightKpiStrip' },
      distribution: { type: 'InsightEntryTypeDistribution' },
      trend: { type: 'InsightMovementTrend' },
      lowerGrid: {
        type: 'DashboardThreeColumnGrid',
        children: ['stats', 'recentEntries', 'locations'],
      },
      stats: { type: 'InsightInventoryStats' },
      recentEntries: { type: 'InsightRecentEntries' },
      locations: { type: 'InsightLocationSummary' },
    },
  },
},
```

### Shared UI Primitives

All section components compose from these shared building blocks in `src/components/ui/json-render/`:

- `MetricStrip` — 6-column KPI card grid
- `RecordListPanel` — list with leading badges, status indicators, and loading skeletons
- `StackedDistributionPanel` — stacked bar + grid distribution breakdown
- `StatRowsPanel` — stat rows with descriptions
- `DashboardTrendChart` — Recharts bar chart for time-series
- `DashboardDistributionChart` — Recharts pie chart for categories
- `PageHeader` — page title banner
- `DashboardPageStack` — vertical spacing wrapper
- `DashboardThreeColumnGrid` — 3-column layout for summary panels

### Incremental Migration Strategy

1. **Start with a pilot module** (we used `insight`) to validate the pattern
2. **Use re-export shims** during migration — old `_shared/` files re-export from new canonical locations so non-migrated modules keep compiling
3. **Delete views by proof, not assumption** — a file is deletable only when no imports remain in registry, specs, tests, or shared helpers
4. **Scale with parallel agents** — once the pattern is proven, dispatch agents to decompose remaining modules simultaneously

## Why This Matters

**Without this pattern:**
- Adding a dashboard section requires editing a 400+ line component and understanding its internal data flow
- Specs are decorative — the real page structure lives in JSX
- Design consistency requires manual cross-module auditing
- New modules must copy-paste from existing dashboards

**With this pattern:**
- Adding a section is a one-line spec change
- Specs are the single source of page structure
- Shared UI primitives enforce visual consistency
- New modules compose from the same building blocks

## When to Apply

- When creating a new module dashboard
- When adding sections to an existing dashboard
- When extracting reusable UI patterns from existing components
- When any `_views/`-style monolithic component exceeds ~200 lines

## Examples

### Before: Monolithic dashboard (465 lines)

```typescript
// src/app/_shell/_views/insight/dashboard.tsx
export default function Dashboard() {
  const { items: ledgerEntries, isLoading } = useModuleData(...)
  const { items: valueEntries } = useModuleData(...)
  const { items: locations } = useModuleData(...)

  // 100+ lines of data computation
  const totalCost = valueEntries.reduce(...)
  const monthlyMovement = buildMonthlySeries(...)

  return (
    <div className="space-y-5">
      <PageHeader ... />
      {/* 300+ lines of inline JSX for KPIs, charts, lists, grids */}
    </div>
  )
}
```

### After: Atomic composition (spec + 7 focused components)

- `insight-dashboard.tsx` — 347 lines: data provider + 7 section components
- `specs/insight.ts` — 11-element spec tree describing dashboard layout
- Each section: 5-15 lines, reads from context, renders one shared primitive

### Gotchas learned during this refactoring

1. **Always preserve loading states.** The monolithic dashboard had `if (isLoading) return <Skeleton />` at the top. Decomposed sections lost this — users saw empty states flash before data arrived. Fix: include `isLoading` in context and check it in every section that shows data-dependent content.

2. **Spec type names are strings — no compile-time validation.** A spec referenced `HubStats` but the component was named `HubOperationsStats`. TypeScript didn't catch it. Fix: add a spec validation test that asserts every element `type` exists in catalog components.

3. **Triple-file amplification.** Each new section requires changes to the dashboard file, `catalog.ts`, and `registry.tsx`. Consider a `dashboardSection()` catalog helper or auto-binding to reduce this.

## Related

- Plan: `docs/plans/2026-03-29-001-refactor-decompose-json-render-views-plan.md`
- PR: https://github.com/ImRLopezAI/demo-sh/pull/3
- Refresh candidate: `docs/plans/2026-02-23-feat-insight-phase-2-forecast-workbench-and-alerting-plan.md` — references deleted `_views/insight/dashboard.tsx`
