---
title: "refactor: Decompose json-render views into atomic components"
type: refactor
status: completed
date: 2026-03-29
---

**Deepening lenses applied:** `deepen-plan`, `vercel-composition-patterns`, `vercel-react-best-practices`, `frontend-design`

# refactor: Decompose json-render views into atomic components

## Overview

Replace the current hybrid JSON-render setup, where many spec routes still render through large `src/app/_shell/_views/**` components, with a composition-first architecture built from smaller reusable UI pieces. The target state is spec-driven pages assembled from focused primitives and small smart wrappers, not route-sized React view files.

This is a staged refactor, not a bulk delete. `_views` can only be removed after each route no longer depends on them through the JSON-render registry, shell route maps, shared helpers, or tests.

## Problem Statement / Motivation

The current migration is incomplete:

- `src/lib/json-render/registry.tsx` still imports many `_views` files directly and exposes them as registry components.
- `src/app/_shell/view-components.tsx` still maps route keys to `_views` dynamic imports.
- `src/app/_shell/_views/**` contains roughly 120 files, including route-sized screens, shared helpers, and tests.
- The result is a hybrid architecture where JSON specs exist, but much of the real rendering logic still lives inside large view components.

That creates four concrete problems:

1. Specs are not the true source of UI composition.
2. Large view files hide reusable patterns that should be explicit in the catalog.
3. Deleting `_views` today would break registry imports and route resolution.
4. Design consistency and module distinctiveness are harder to control when page structure is trapped inside large components.

## Goals

- Make JSON-render specs the primary definition of page structure.
- Break route-sized views into small reusable building blocks that compose like Lego pieces.
- Move reusable UI pieces into `src/components/**` or focused JSON-render wrappers instead of `_views`.
- Shrink `src/lib/json-render/registry.tsx` so it maps small components, not whole screens.
- Remove shell route dependencies on `_views`.
- Define objective deletion criteria so each `_views` file can be removed safely.

## Non-Goals

- Rebuilding every module UI in one pass.
- Converting all smart behavior into generic abstractions prematurely.
- Removing module-specific design language. Each module should still keep a distinct visual identity.
- Rewriting stable server/router/data code unless the view decomposition requires a boundary cleanup.

## Current State

### Active architectural facts

- Catch-all JSON-render routing is live under `src/app/[[...slug]]/**`.
- The app spec is composed in `src/lib/json-render/specs/index.ts`.
- The JSON-render catalog already exposes useful shared blocks such as `PageHeader`, `SectionGrid`, `FormSection`, `KpiCards`, `StatusBadge`, and `ModuleListView`.
- The JSON-render registry still binds many entries to full `_views` screens and `_views/_shared` helpers.
- Legacy shell route files still exist in `src/app/_shell/**`.

### Migration blockers

- Several catalog entries are too coarse or too implementation-specific.
- Smart UI state is still embedded inside large route components.
- Shared logic and shared presentation are mixed together in `_views/_shared/**`.
- Tests and plans still point at `_views` paths, so removal needs a managed transition.

## Research Findings

### Repo patterns

- Route specs are already separated by module in `src/lib/json-render/specs/*.ts`.
- Registry composition is centralized in `src/lib/json-render/registry.tsx`.
- Shared shell-era UI helpers already exist and can be extracted instead of rewritten.
- The repo expectation is composition over one-off module components in `src/components/**`, while module-local UI belongs under `src/app/_shell/_views/**` today.

### Planning implication

The correct move is not “delete `_views`.” The correct move is:

1. extract reusable pieces,
2. add smaller catalog/registry components,
3. rewrite specs to compose them,
4. delete leftover route-sized views only after their call sites disappear.

## Proposed Solution

### Target architecture

Adopt a four-layer UI model:

1. `src/lib/json-render/specs/**`
   Route and section composition only. Specs describe layout, information hierarchy, and component wiring.

2. `src/lib/json-render/catalog.ts`
   Schema for atomic and mid-size building blocks. These should be small, composable, and intentionally named.

3. `src/lib/json-render/registry.tsx`
   Thin runtime bindings from catalog entries to React implementations. Registry components should mostly wrap reusable UI, not whole screens.

4. `src/components/**` plus narrowly scoped smart wrappers
   Reusable presentation, form controls, cards, panels, charts, toolbars, detail sections, and small data-aware bridges.

### Composition rules

- Prefer section-sized building blocks over page-sized ones.
- Prefer slots and children over boolean prop proliferation.
- Prefer explicit variant components over boolean mode props.
- Keep module-specific data fetching in small wrappers near the registry boundary.
- Keep page structure in specs, not in JSX route files.
- Keep visual primitives reusable; keep domain orchestration localized.
- If a component name sounds like a page, it is too large for the target architecture.

### Registry boundary rules

The registry should be treated as a thin adapter layer, not a second page system.

- Allowed:
  - small presentational components
  - section components
  - narrow smart wrappers that adapt data or actions to presentational children
- Discouraged:
  - route-sized dashboard, list, or workbench components
  - wrappers that both fetch data and decide page layout
  - generic “do everything” adapters

Practical rule:
If a registry binding needs to know the entire route shape, it belongs in the spec or needs decomposition.

### Component sizing rubric

Allowed sizes:

- Primitive: badge, stat, field, toolbar action, list row, chart card.
- Section: KPI strip, filter toolbar, activity panel, detail form section, approval rail.
- Smart wrapper: entity list adapter, mutation action group, state hydrator bridge.

Avoid:

- Full dashboard components.
- Full list page components.
- Full workbench components unless they are temporary migration shims.

### Target component taxonomy

Use three stable layers so the catalog does not become another dumping ground:

1. Primitive
   Stateless or nearly stateless presentation, such as badges, field rows, empty states, KPI tiles, and action buttons.

2. Section
   Small composed blocks with one job, such as `FilterToolbar`, `RecordHeader`, `TrendPanel`, `EntitySummary`, or `MutationActions`.

3. Smart bridge
   Thin wrappers that translate runtime concerns into section props, such as filter state hydration, mutation feedback wiring, or list-to-grid adapters.

Do not introduce a fourth “page component” layer inside the registry.

## Workstreams

### 1. Inventory and classify `_views`

Create a migration inventory grouped by:

- Route-sized screens
- Shared presentational pieces
- Shared smart hooks/utilities
- Dialog/detail card components
- Tests

Each file gets one target disposition:

- extract to reusable component
- keep temporarily as shim
- replace with spec composition
- delete after imports are removed

### 2. Define the atomic catalog

Expand the JSON-render catalog with smaller pieces such as:

- `PageSection`
- `MetricCard`
- `MetricStrip`
- `FilterToolbar`
- `ActionToolbar`
- `RecordSummary`
- `DetailPanel`
- `EntityDataTable`
- `EmptyStatePanel`
- `TimelinePanel`
- `StatusSummary`
- `SplitPane`
- `KeyValueList`

These names are illustrative. Final names should reflect existing design vocabulary and avoid overlap with current shadcn entries.

Catalog acceptance rules:

- A new catalog component must be reused by at least 2 routes or clearly unlock a repeated pattern.
- Props should describe content and structure, not route identity.
- Children/slot composition is preferred over long prop surfaces.
- Avoid booleans like `isCompact`, `isEditable`, `showHeader`, `withFooter` when explicit variants or nested children express the same intent more clearly.

### 3. Extract shared UI from `_views/_shared`

Move stable reusable UI out of `_views/_shared/**` into:

- `src/components/ui/**` for generic presentation primitives
- `src/components/data-grid/**` for table/list composition
- `src/components/layout/**` for layout sections/shell helpers
- `src/lib/json-render/**` for renderer-specific bridges only

Rule:
If a unit can render without knowing a module route, it should not live under `_views`.

Extraction heuristic:

- Move to `src/components/**` when the unit is renderer-agnostic.
- Keep in `src/lib/json-render/**` when the unit exists only to bridge catalog props, actions, or state.
- Keep module-local temporarily only when the behavior is still too entangled to separate safely in the same slice.

### 4. Introduce migration shims

For large screens that cannot be decomposed in one pass, introduce temporary shims:

- Registry entry remains stable.
- Shim delegates into extracted section components.
- Spec moves from “whole-screen component” to “section composition.”

This lets the team migrate one route at a time without breaking the whole app.

### 5. Migrate route specs module by module

Recommended sequence:

1. Landing and dashboards
2. Straightforward list pages
3. Detail/dialog card flows
4. Workbenches and highly interactive routes
5. POS terminal and reporting-style builders last

Reason:
This sequence removes the simplest large views first, unlocks shared components early, and preserves momentum before tackling high-state surfaces.

### Route conversion protocol

Every converted route should follow the same order:

1. identify the current `_views` file and all imports it pulls in
2. separate presentational sections from hooks and mutations
3. extract repeated sections into reusable components
4. add or refine catalog entries for those sections
5. bind the new sections in `registry.tsx`
6. rewrite the route spec to compose those sections directly
7. keep a temporary shim only if parity cannot be reached in one slice
8. remove route-map and registry references to the old `_views` file
9. run typecheck and route verification

### 6. Remove shell route dependencies

After JSON-render route parity is achieved for a module:

- remove entries from `src/app/_shell/view-components.tsx`
- remove dead shell routing helpers
- remove `ModuleRoutePage` and related shell-only code if nothing references it

### 7. Delete `_views` by proof, not assumption

A `_views` file is deletable only when:

- no import remains in `src/lib/json-render/registry.tsx`
- no import remains in `src/app/_shell/view-components.tsx`
- no tests import it
- no shared helper imports it
- the route spec renders equivalent UI using smaller components
- `bun run typecheck` passes

## Module Rollout Strategy

### Pilot module selection

Recommended pilot: `insight`

Reasoning:

- strong dashboard + list mix, which exercises both section composition and table/list composition
- lower interaction complexity than `pos` and `hub/reporting`
- likely to yield reusable KPI, chart, filter, and ledger-list patterns that other modules can share

Fallback pilot:

- `trace` if shipping simplicity matters most
- `flow` if list/detail financial surfaces are a higher strategic priority

Do not start with:

- `pos` because terminal runtime state is too interaction-heavy
- `hub/reporting` because builder-style UI will distort the component vocabulary too early

### Phase 1: Foundations

- Build the migration inventory.
- Expand catalog and registry for atomic pieces.
- Extract common shared UI from `_views/_shared/**`.
- Add a lintable convention for banning new page-sized registry bindings.

Deliverables:

- `_views` inventory doc with disposition per file
- initial component taxonomy and naming rules
- first batch of extracted shared sections
- deletion checklist committed to the plan or a companion doc

### Phase 2: Simple route conversion

- Convert dashboard and list routes in one or two modules first.
- Prefer modules with lower interaction complexity, such as `insight`, `flow`, or `trace`.
- Use these routes to validate the component model and naming.

Recommended first two routes:

1. `insight/dashboard`
2. `insight/item-ledger` or `trace/shipments`

Success condition for Phase 2:

- both routes render from smaller catalog components
- no direct registry import of the old route-sized view
- no net increase in route-specific glue code

### Phase 3: Card and dialog decomposition

- Replace module-specific `*-card.tsx` and similar detail/edit components with form sections, action groups, and record summary components.
- Standardize mutation feedback, confirmation, and status transitions around shared wrappers.

Design constraint:

Do not create one giant `EntityCard` abstraction. Prefer explicit domain-neutral sections such as:

- `RecordIdentity`
- `RecordStatusRail`
- `RecordMetaGrid`
- `RecordFormSection`
- `RecordActionBar`

### Phase 4: Advanced workbenches

- Migrate planning, control-room, and journal-style pages.
- Introduce narrow smart wrappers only where data orchestration cannot live entirely in specs.

### Phase 5: Shell removal

- Remove obsolete shell route files.
- Delete orphaned `_views`.
- Update tests and docs to new file paths and component boundaries.

Hard gate:

Do not remove shell infrastructure repo-wide until at least one full module has completed route parity and cleanup successfully.

## Acceptance Criteria

- [ ] New JSON-render routes do not bind directly to page-sized `_views` files.
- [ ] Shared presentational logic previously under `_views/_shared/**` is moved to reusable component locations.
- [ ] At least one pilot module renders dashboards and list pages from smaller catalog components instead of route-sized screen components.
- [ ] `src/lib/json-render/registry.tsx` primarily maps small building blocks and thin smart wrappers, not whole screens.
- [ ] `src/app/_shell/view-components.tsx` is reduced or removed for migrated modules.
- [ ] A written deletion checklist exists and is used before removing any `_views` file.
- [ ] `bun run typecheck` passes after each migration slice.
- [ ] Browser regression coverage exists for pilot routes before wider rollout.
- [ ] Pilot routes retain module-specific visual character after decomposition and do not collapse into generic cross-module layouts.
- [ ] New section components avoid boolean-prop sprawl and expose composition-friendly APIs.

## Risks and Mitigations

### Risk: over-abstracting too early

Mitigation:
Start from repeated structure across 2 to 3 routes before promoting a new catalog entry. Do not invent a generic component for a single screen.

### Risk: visual regression during decomposition

Mitigation:
Take screenshot baselines for pilot routes and verify route parity after each slice. Keep temporary shims where needed.

### Risk: hiding data logic in generic wrappers

Mitigation:
Keep data-aware wrappers explicit and narrowly named. Reuse presentation broadly, not orchestration indiscriminately.

### Risk: migration stalls on complex workbenches

Mitigation:
Defer the most stateful routes until the component vocabulary and testing strategy are proven on simpler pages.

### Risk: spec files become unreadable

Mitigation:
Keep specs structural. When a spec starts encoding large derived objects inline, extract builders or typed constants adjacent to the module spec rather than hiding structure inside JSX again.

### Risk: bundle growth from duplicative adapters

Mitigation:
Use direct imports instead of broad barrels for new UI pieces, and prune dead shell imports as each route is migrated.

## Implementation Notes

### Recommended file moves

- Reusable presentational pieces out of `src/app/_shell/_views/_shared/**`
- New atomic UI into `src/components/ui/**`
- Data-grid specific composition into `src/components/data-grid/**`
- JSON-render-only bridges into `src/lib/json-render/**`
- Specs remain in `src/lib/json-render/specs/**`

### Files likely to change early

- `src/lib/json-render/catalog.ts`
- `src/lib/json-render/registry.tsx`
- `src/lib/json-render/specs/*.ts`
- `src/components/ui/**`
- `src/components/data-grid/**`
- `src/app/_shell/_views/_shared/**`
- `src/app/_shell/view-components.tsx`
- `src/app/_shell/module-route-page.tsx`

### Suggested guardrails

- Add an ESLint or review rule: no new registry bindings that point to route-sized files under `_views/<module>/<page>.tsx`.
- Prefer one component per concern.
- Prefer children-based composition and slot patterns.
- Avoid “mega components” that mix page layout, data fetching, mutation handling, and section rendering.
- Avoid barrel imports for frequently used UI sections if they noticeably obscure ownership or increase bundle reach.

### Suggested directory target

Use these destinations consistently:

- `src/components/ui/json-render/` for renderer-friendly presentational sections
- `src/components/data-grid/` for grid and list composition
- `src/components/layout/` for shell-neutral layout sections
- `src/lib/json-render/components/` for renderer-specific smart bridges
- `src/lib/json-render/specs/<module>.ts` for route composition and static builders

This keeps reusable UI out of `_views` without forcing all runtime-specific code into generic component folders.

## SpecFlow Considerations

User flow gaps to explicitly verify during migration:

- empty, loading, and error states for every composed section
- mutation toasts and confirm flows
- filter/search state hydration
- detail/edit/create flows for list-backed entities
- keyboard and accessibility parity for action toolbars and dialogs
- responsive layout parity between current `_views` and new spec compositions

## Testing and Verification

- Typecheck on every migration slice with `bun run typecheck`
- Route smoke coverage for each converted module
- Browser regression tests for pilot dashboards and list routes
- Visual comparison for section-level parity on converted screens
- Dead import scan before deletion:
  - `rg "_views/<target>" src test`

Recommended verification ladder per slice:

1. `bun run typecheck`
2. targeted unit tests for extracted hooks/components
3. route smoke render for the converted route
4. browser verification of loading, empty, populated, and mutation states
5. dead-import scan for the replaced `_views` file

### Deletion checklist

Before deleting any `_views` file, verify all of the following:

- spec route composes the replacement from section components
- registry no longer imports the file
- shell route map no longer imports the file
- no shared helper depends on the file
- no tests import the file
- route screenshots or browser checks match expected behavior closely enough
- typecheck is green

Deletion happens only after all boxes are true.

## Open Questions

- Which module should be the first pilot: `insight`, `flow`, or `trace`?
- Do we want to keep any shell route compatibility during rollout, or cut over per module immediately?
- Should module-specific smart wrappers live under `src/lib/json-render/components/<module>` or remain near specs/registry until the migration stabilizes?

Recommended default answers unless new constraints appear:

- Start with `insight`
- Cut over per module, not repo-wide
- Place smart wrappers in `src/lib/json-render/components/<module>` when they are truly module-specific; otherwise keep them generic and reusable

## Recommended Next Step

Start with a narrow pilot:

1. inventory `_views` for one lower-complexity module,
2. extract 5 to 8 reusable section components,
3. rewrite one dashboard and one list route spec to use them,
4. delete only the now-orphaned view files,
5. measure whether the resulting component vocabulary is actually reusable before scaling the pattern repo-wide.

Concrete first slice:

1. inventory `insight/dashboard.tsx`, `insight/item-ledger-list.tsx`, and any `_shared` dependencies they pull in
2. extract shared sections for page header, KPI row, chart panels, filter toolbar, and list shell
3. add catalog/registry bindings for those sections
4. rewrite `src/lib/json-render/specs/insight.ts` to compose them
5. remove direct route-sized registry bindings for the migrated insight routes
6. verify and then delete only the orphaned view files

## File Inventory

- `src/lib/json-render/catalog.ts`
- `src/lib/json-render/registry.tsx`
- `src/lib/json-render/specs/index.ts`
- `src/lib/json-render/specs/insight.ts`
- `src/lib/json-render/specs/flow.ts`
- `src/lib/json-render/specs/trace.ts`
- `src/app/_shell/view-components.tsx`
- `src/app/_shell/module-route-page.tsx`
- `src/app/_shell/_views/**`
- `src/components/ui/**`
- `src/components/data-grid/**`

## Sources

- Repository architecture and route setup in `src/app/**` and `src/lib/json-render/**`
- Existing `_views` and shared helpers in `src/app/_shell/_views/**`
- Existing plan history in `docs/plans/**`
