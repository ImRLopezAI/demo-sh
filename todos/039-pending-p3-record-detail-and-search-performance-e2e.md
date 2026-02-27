---
status: pending
priority: p3
issue_id: "039"
tags: [code-review, testing, e2e, performance, record-detail, search]
dependencies: ["027"]
---

# Add Record Detail Open/Close and Search Performance E2E Tests

Record detail views cause full DataGrid unmount/remount cycles. Global and grid search have no performance tests.

## Problem Statement

When a record is selected, the entire DataGrid is unmounted and replaced with a card component. When closed, the DataGrid remounts, reinitializes the virtualizer, re-runs column inference, and potentially re-fetches data. No test measures this round-trip or verifies data preservation. Additionally, DataGrid search performs cell-by-cell matching across all visible columns (250 rows × 15 columns = 3,750 cells per keystroke) with no performance test.

## Findings

- Record open/close triggers full component lifecycle (mount → unmount → remount)
- URL-driven state causes router navigation on every open/close
- DataGrid search matches 3,750+ cells per keystroke at current scale
- Global Cmd+K search pre-computes entries from nav config (low risk)
- No performance baselines established for any of these paths

## Proposed Solutions

### Option 1: Round-trip and search latency tests (recommended)

**Approach:** Write E2E tests measuring: (1) time from record click to card render, (2) time from card close to grid restoration with data intact, (3) DataGrid search latency with 250-row dataset.

**Effort:** Small (1 day)
**Risk:** Low

## Technical Details

**Affected files:**
- `test/e2e/performance/record-detail-cycle.spec.ts` — new
- `test/e2e/performance/search-latency.spec.ts` — new

## Acceptance Criteria

- [ ] Record open renders card within 2 seconds
- [ ] Record close restores grid with data within 3 seconds
- [ ] DataGrid search returns results within 500ms per keystroke
- [ ] Data preserved across open/close cycles (no re-fetch)

## Work Log

### 2026-02-27 - Initial Discovery

**By:** Code Review

**Actions:**
- Performance reviewer identified record open/close as a full component lifecycle with no test
- Architecture reviewer noted search matching scales O(rows × columns) with no baseline

## Resources

- `src/app/_shell/_views/market/sales-orders-list.tsx:135-145`
- `src/components/data-grid/data-grid-search.tsx`
