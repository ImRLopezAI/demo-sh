---
title: "feat: Data-driven reporting system with dataset builder (BC style)"
type: feat
status: active
date: 2026-02-28
deepened: 2026-02-28
---

# Rebuild hub.reporting — Data-Driven Report System (BC Style)

## Enhancement Summary

**Deepened on:** 2026-02-28
**Sections enhanced:** 22
**Research agents used:** 14

### Agents Used
1. Dataset executor patterns (best-practices-researcher)
2. Zod recursive schemas (best-practices-researcher)
3. PDF generation patterns (best-practices-researcher)
4. Report builder UI patterns (best-practices-researcher)
5. TypeScript review (kieran-typescript-reviewer)
6. Architecture review (architecture-strategist)
7. Performance review (performance-oracle)
8. Security audit (security-sentinel)
9. Data integrity review (data-integrity-guardian)
10. Code simplicity review (code-simplicity-reviewer)
11. Spec flow analysis (spec-flow-analyzer)
12. Pattern recognition (pattern-recognition-specialist)
13. Repo conventions research (repo-research-analyst)
14. Codebase exploration (Explore agent)

### Key Improvements
1. **Batch relation resolution** — Breadth-first level-by-level loading reduces N+1 scans from ~4,400 to 4. This is the #1 performance requirement (all agents agree).
2. **Security hardening** — 3 critical findings: table access allowlist (`REPORTING_ALLOWED_TABLES`), prototype pollution prevention in `resolvePath`, tenant isolation on ALL related entity lookups.
3. **Simplification** — Use 2-level concrete types instead of unbounded recursive `z.lazy()`. Ship 3 datasets first (Sales Order, Invoice, POS Receipt), not 9. Extend existing `reportLayouts` table instead of creating new `reportDefinitions` table (~990 LOC saved).
4. **Convention fixes** — `related_model` → `relatedModel` (camelCase), `field` → `fields` (plural arrays), separate Zod schemas from TypeScript types.
5. **PDF rendering fixes** — keyValue Y-position bug fix via `heightOfString()`, multi-page table header repetition, page numbering, locale-aware formatting.

### New Considerations Discovered
- Version increment race condition in `saveLayoutVersion` needs optimistic concurrency control (`expectedVersion` param)
- `getAvailableTables` endpoint exposes full schema — must filter out RBAC/credential tables
- No migration path defined from `reportLayouts` → new structure
- No CSV/Excel export, scheduling, delete confirmation, or unsaved changes protection in spec
- Layout `valuePath` strings can reference fields not in the dataset — needs validation pass

---

## Context

The current reporting system hardcodes a generic "dump all rows from one table" approach. Each entity gets the same flat table PDF. The user wants a **data-driven report builder** like Microsoft Report Builder where:

- **Reports = Dataset + Layout** — a dataset JSON defines WHAT data to fetch; a layout JSON defines HOW to display it
- **Datasets are JSON definitions, not hardcoded TypeScript** — a generic executor reads the definition and fetches data (primary entity + related entities via joins + filters)
- **Built-in datasets** ship with the system for common documents (Sales Order, Invoice, etc.) — but they're data, not code
- **Users can create/copy/edit datasets** via the builder UI — e.g., "all sales of a customer" by configuring a dataset with Customer as primary + Sales Orders as related
- Uses the same filter operator system as `matchesStructuredFilters` from `src/server/rpc/router/helpers.ts`

## Architecture: Report = Dataset + Layout

### Dataset Definition (JSON, follows `data-set.jsonc` pattern)

```jsonc
{
  "name": "Sales Order Document",
  "type": "single",           // "single" = one record (card view), "list" = multiple records
  "primaryTable": "salesHeaders",
  "fields": [
    // Direct fields from primary table
    { "name": "documentNo", "label": "Order No." },
    { "name": "status", "label": "Status" },
    { "name": "orderDate", "label": "Order Date" },
    // Related entity (lookup — one record)
    {
      "type": "related",
      "name": "customer",
      "label": "Customer",
      "relatedModel": "customers",       // ⚠ camelCase per project convention
      "joinField": "customerId",          // primary.customerId → related._id
      "filters": [],
      "fields": [                         // ⚠ plural per project convention
        { "name": "name", "label": "Customer Name" },
        { "name": "email", "label": "Email" }
      ]
    },
    // Related entity (child lines — many records)
    {
      "type": "related",
      "name": "lines",
      "label": "Order Lines",
      "relatedModel": "salesLines",
      "joinField": "documentNo",          // match on documentNo = documentNo
      "relatedJoinField": "documentNo",
      "filters": [],
      "fields": [
        { "name": "lineNo", "label": "Line" },
        { "name": "quantity", "label": "Qty" },
        { "name": "unitPrice", "label": "Unit Price" },
        { "name": "lineAmount", "label": "Amount" },
        // Nested related (lookup inside lines) — max depth 3
        {
          "type": "related",
          "name": "item",
          "label": "Item",
          "relatedModel": "items",
          "joinField": "itemId",
          "fields": [
            { "name": "description", "label": "Description" }
          ]
        }
      ]
    }
  ]
}
```

#### Research Insights — Dataset Definition

**Convention Fixes (pattern-recognition):**
- `related_model` → `relatedModel` — all project properties use camelCase
- `field` → `fields` — arrays use plural names per project convention (e.g., `columns`, `blocks`, `filters`)
- Update `data-set.jsonc` reference file to match

**Depth Limits (all agents agree):**
- Hard limit: **max 3 levels** of nesting (primary → related → nested-related)
- 2-level concrete types cover 99% of use cases without recursive `z.lazy()` complexity
- Example: `salesHeaders → salesLines → items` = 3 levels (primary + 2 related)

### Layout Definition (existing block system — unchanged)

Already works: heading, keyValue, table, spacer, paragraph blocks with value paths like `summary.documentNo`, `summary.customer.name`.

#### Research Insights — Layout Definition

**Layout-Dataset Validation (spec-flow, architecture):**
- Layout `valuePath` strings must be validated against the active dataset's field tree
- If a dataset is modified (field removed/renamed), check all layouts that reference it
- Add a `validateLayoutPaths(layout, dataset) → { valid: boolean, errors: string[] }` utility
- Run validation on save, show warnings in UI (don't block save — paths may be temporarily invalid during editing)

### Generic Dataset Executor

One function that reads ANY dataset JSON and fetches data:
1. Fetch primary records (by ids/filters/tenant)
2. For each `type: "related"` field: resolve via join config using `matchesStructuredFilters` operator logic
3. Flatten lookup relateds into summary fields (e.g., `customer.name` → `summary.customerName`)
4. Collect child-line relateds as `rows` (e.g., salesLines → rows array)
5. Return standard `ReportDataSet`

#### Research Insights — Dataset Executor

**Batch Resolution Pattern (performance-oracle — CRITICAL):**
```
Without batching: 200 orders × 1 customer lookup × 10 lines × 2 line lookups = 4,400 table scans
With batching:    1 primary query + 1 customer batch + 1 lines batch + 1 item batch = 4 queries
```

Implementation approach — breadth-first level-by-level:
```ts
// Phase 1: Fetch primary rows
const primaryRows = table.findMany({ where: tenantFilter, limit })

// Phase 2: Collect ALL foreign keys per related field, batch-fetch once
for (const relatedField of definition.fields.filter(f => f.type === 'related')) {
  const foreignKeys = new Set(primaryRows.map(r => r[relatedField.joinField]))
  const relatedTable = getTable(context, relatedField.relatedModel)
  const relatedRows = relatedTable.findMany({
    where: row => foreignKeys.has(row._id) && readTenantId(row) === tenantId
  })
  // Index by _id for O(1) lookup
  const relatedIndex = new Map(relatedRows.map(r => [r._id, r]))
  // Attach to each primary row
  for (const row of primaryRows) {
    row[relatedField.name] = relatedIndex.get(row[relatedField.joinField])
  }
}
```

**Table Accessor (typescript-reviewer):**
```ts
// Replace: context.db.schemas[tableName] as unknown as GenericTable  (type safety black hole)
// With single-point accessor:
function getTable(context: RpcContextType, tableName: string): GenericTable {
  const table = context.db.schemas[tableName as keyof typeof context.db.schemas]
  if (!table) throw new Error(`Unknown table: ${tableName}`)
  return table as unknown as GenericTable
}
```

**Circuit Breaker (performance-oracle):**
```ts
const HARD_LIMITS = {
  MAX_PRIMARY_ROWS: 5000,
  MAX_CHILD_LINES: 2000,
  MAX_DEPTH: 3,
  MAX_OPERATIONS: 50_000, // rows × fields × depth
} as const

let operationCount = 0
function checkBudget(increment: number) {
  operationCount += increment
  if (operationCount > HARD_LIMITS.MAX_OPERATIONS)
    throw new Error('Report data budget exceeded — narrow filters or reduce fields')
}
```

## Database Entity: Report Definitions

~~Replace `reportLayouts`~~ **Extend existing `reportLayouts` table** with a `datasetJson` column (Zod-validated structured object) alongside the existing `schemaJson` for layouts:

#### Research Insights — Database Strategy

**Simplification (code-simplicity — MAJOR):**
- Don't create a new `reportDefinitions` table — extend the existing `reportLayouts` table with a `datasetJson` column
- Avoids: new table creation, migration from old table, updating all references, breaking existing functionality
- Existing `reportLayoutVersions` already version-tracks `schemaJson` — add `datasetJson` alongside it
- `reportDefaults` and `reportRuns` continue referencing the same table by ID — zero changes needed

**Concurrency Control (data-integrity — CRITICAL):**
```ts
// Current race condition in saveLayoutVersion (lines 427-451):
// Two users editing same layout → version increments collide → one user's changes lost

// Fix: Add expectedVersion parameter
saveLayoutVersion.input(z.object({
  layoutId: z.string(),
  expectedVersion: z.number().int(), // Client sends current version
  draft: z.string(),
  dataSetDraft: z.string().optional(),
}))
// In handler:
const current = layouts.get(input.layoutId)
if (current.versionNo !== input.expectedVersion) {
  throw new Error('Layout was modified by another user. Refresh and try again.')
}
```

**Migration Strategy (data-integrity):**
- Phase 1: Add `datasetJson` column (nullable) to `reportLayouts` — existing layouts keep `datasetJson: null`
- Phase 2: Built-in datasets populate `datasetJson` for system layouts
- Phase 3: Custom layouts without `datasetJson` continue using `buildGenericDataSet` fallback
- No data migration needed — purely additive

```ts
// ---- Shared Zod schemas (defined in src/server/reporting/dataset-schema.ts) ----
const OPERATORS = [
  'contains', 'notContains', 'startsWith', 'endsWith', 'equals', 'notEquals',
  'greaterThan', 'greaterThanOrEqual', 'lessThan', 'lessThanOrEqual', 'isBetween',
  'before', 'after', 'onOrBefore', 'onOrAfter',
  'is', 'isNot', 'isAnyOf', 'isNoneOf',
  'isTrue', 'isFalse',
  'isEmpty', 'isNotEmpty'
] as const
const dataSetFilterSchema = z.object({
  name: z.string(),
  operator: z.enum(OPERATORS).default('equals'),   // same operators as matchesStructuredFilters
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]).optional(),
  endValue: z.union([z.string(), z.number()]).optional(),
})

const directFieldSchema = z.object({
  name: z.string(),
  label: z.string(),
})
```

#### Research Insights — Zod Schema Design

**Use Concrete 2-Level Types Instead of Recursive z.lazy() (code-simplicity, zod-research):**
```ts
// ✅ DO: Concrete 2-level types (covers 99% of use cases, ~990 LOC saved)
const nestedRelatedFieldSchema = z.object({
  type: z.literal('related'),
  name: z.string(),
  label: z.string(),
  relatedModel: z.string(),
  joinField: z.string().optional(),
  relatedJoinField: z.string().optional(),
  filters: z.array(dataSetFilterSchema).optional(),
  fields: z.array(directFieldSchema),  // Only direct fields at leaf level
})

const topLevelRelatedFieldSchema = z.object({
  type: z.literal('related'),
  name: z.string(),
  label: z.string(),
  relatedModel: z.string(),
  joinField: z.string().optional(),
  relatedJoinField: z.string().optional(),
  filters: z.array(dataSetFilterSchema).optional(),
  fields: z.array(z.union([directFieldSchema, nestedRelatedFieldSchema])),
})

const dataSetFieldSchema = z.union([directFieldSchema, topLevelRelatedFieldSchema])

// ❌ DON'T: Recursive z.lazy() — drops type inference, needs z.ZodType<T> annotation,
//    can cause infinite parsing, adds complexity for a feature that's not needed
```

**z.ZodType Annotation (zod-research):**
- If you MUST use recursive schemas: `const schema: z.ZodType<YourType> = z.lazy(...)` — not bare `z.ZodType`
- Without the generic parameter, Zod infers `any` and type safety is lost

**Depth Guard Pre-Parse (zod-research):**
```ts
function checkDepth(fields: unknown[], depth = 0): void {
  if (depth > 3) throw new Error('Dataset nesting exceeds maximum depth of 3')
  for (const field of fields) {
    if (typeof field === 'object' && field && 'fields' in field) {
      checkDepth((field as { fields: unknown[] }).fields, depth + 1)
    }
  }
}
// Call before z.parse() to fail fast with clear error
```

```ts
const reportDataSetSchema = z.object({
  type: z.enum(['single', 'list']),
  primaryTable: z.string(),
  fields: z.array(dataSetFieldSchema),
  filters: z.array(dataSetFilterSchema).optional(),  // default filters for LIST mode
})

const reportLayoutSchema = z.object({
  pageSize: z.enum(['A4', 'LETTER', 'THERMAL']),
  orientation: z.enum(['portrait', 'landscape']),
  blocks: z.array(reportBlockSchema),  // existing block types
})

// ---- DB table change (extend existing reportLayouts) ----

// Add to reportLayouts schema:
datasetJson: z.string().optional(),  // JSON string of reportDataSetSchema
```

The layout targets fields from the dataset:
- `keyValue.valuePath` → references dataset field path: `"documentNo"`, `"customer.name"`, `"summary.totalAmount"`
- `table.columns[].key` → references field names from child-lines related entity: `"lineNo"`, `"quantity"`, `"item.description"`

Keep existing tables `reportDefaults` and `reportRuns` (they reference by ID). Add `datasetJson` column to `reportLayoutVersions` alongside existing `schemaJson`.

### How LIST vs SINGLE Datasets Work

**SINGLE dataset** (`type: 'single'`):
- Fetches ONE record by ID from `primaryTable`
- Resolves lookup relations (one-to-one: customer, vendor)
- Fetches child lines (one-to-many: salesLines, ledger entries)
- No max row limit on child lines — fetches all lines for that document
- Used when printing from card views (ids.length === 1)

**LIST dataset** (`type: 'list'`):
- Fetches MULTIPLE records from `primaryTable`
- Supports filters (uses same `matchesStructuredFilters` operators: equals, contains, greaterThan, isBetween, before, after, isEmpty, isAnyOf, etc.)
- **No enforced max rows** — the user controls the limit in the report settings (or leave unlimited)
- Resolves lookup relations per row (e.g., resolve customerName for each sales order)
- Can include aggregated child data (e.g., line count, total amount per order)
- Used when printing from list views or running reports from the reporting center

**Filter operators** (reused from `src/server/rpc/router/helpers.ts` `matchesStructuredFilters`):
- Text: `contains`, `notContains`, `startsWith`, `endsWith`, `equals`, `notEquals`
- Numeric: `greaterThan`, `greaterThanOrEqual`, `lessThan`, `lessThanOrEqual`, `isBetween`
- Date: `before`, `after`, `onOrBefore`, `onOrAfter`, `isBetween`
- Select: `is`, `isNot`, `isAnyOf`, `isNoneOf`
- Boolean: `isTrue`, `isFalse`
- Null: `isEmpty`, `isNotEmpty`

#### Research Insights — Hard Limits

**Performance Guardrails (performance-oracle):**
- SINGLE mode: no primary row limit, but cap child lines at 2,000 per relation
- LIST mode: default 200 rows, user-configurable up to 5,000
- Total operation budget: `primaryRows × fieldsPerRow × depth ≤ 50,000`
- If budget exceeded: return error with suggestion to narrow filters

## Phase 1: Dataset Infrastructure (Server)

### 1.1 — Dataset Definition Types

**File:** `src/server/reporting/contracts.ts`

- [x] Add `ReportDataSetField` type (direct field or related field with nested fields — 2-level concrete, not recursive)
- [x] Add `ReportDataSetDefinition` type: `{ name, type: 'single'|'list', primaryTable, fields, filters }`
- [x] Add `BUILT_IN_DATASET_KEYS` const array (pattern-recognition: mirrors existing `BUILT_IN_LAYOUT_KEYS`)
- [x] Add 3 new layout keys to `BUILT_IN_LAYOUT_KEYS` (ship 3, not 7 initially)

#### Research Insights — Type Design

**Separation of Concerns (pattern-recognition, typescript-reviewer):**
- `contracts.ts` should contain ONLY TypeScript types and const arrays — no Zod schemas
- Zod schemas go in `dataset-schema.ts` (mirrors existing `layout-schema.ts` pattern)
- Types and schemas must stay in sync — export inferred types: `export type DataSetField = z.infer<typeof dataSetFieldSchema>`

**Concrete Types (code-simplicity):**
```ts
// contracts.ts — TypeScript types only
export interface DirectField {
  name: string
  label: string
}

export interface NestedRelatedField {
  type: 'related'
  name: string
  label: string
  relatedModel: string
  joinField?: string
  relatedJoinField?: string
  filters?: DataSetFilter[]
  fields: DirectField[]  // leaf level — only direct fields
}

export interface TopLevelRelatedField {
  type: 'related'
  name: string
  label: string
  relatedModel: string
  joinField?: string
  relatedJoinField?: string
  filters?: DataSetFilter[]
  fields: Array<DirectField | NestedRelatedField>
}

export type DataSetField = DirectField | TopLevelRelatedField

export const BUILT_IN_DATASET_KEYS = [
  'DOC_SALES_ORDER',
  'DOC_SALES_INVOICE',
  'DOC_POS_RECEIPT',
] as const
```

### 1.2 — Dataset Zod Validation Schema

**New file:** `src/server/reporting/dataset-schema.ts`

Zod schema for validating dataset definitions — mirrors the `data-set.jsonc` structure. **2-level concrete schema** (not recursive `z.lazy()`). Filter schema reuses the same `filterValueSchema` structure from helpers.ts.

#### Research Insights — Schema Validation

**Conditional Filter Validation (zod-research):**
```ts
const dataSetFilterSchema = z.object({
  name: z.string(),
  operator: z.enum(OPERATORS).default('equals'),
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]).optional(),
  endValue: z.union([z.string(), z.number()]).optional(),
}).refine(
  (f) => {
    if (f.operator === 'isBetween') return f.value !== undefined && f.endValue !== undefined
    if (['isEmpty', 'isNotEmpty', 'isTrue', 'isFalse'].includes(f.operator)) return true
    return f.value !== undefined
  },
  { message: 'Filter value required for this operator' }
)
```

**Test Coverage (zod-research):**
```ts
// Recommended test cases for dataset-schema.ts:
describe('dataSetSchema', () => {
  it('accepts valid direct-only dataset')
  it('accepts dataset with one related field')
  it('accepts dataset with nested related (2 levels)')
  it('rejects depth > 3')
  it('rejects unknown operator')
  it('rejects isBetween without endValue')
  it('accepts empty filters array')
  it('validates relatedModel against REPORTING_ALLOWED_TABLES')
})
```

### 1.3 — Extend DB: reportLayouts + reportLayoutVersions

**File:** `src/server/db/index.ts`

- [x] Add `datasetJson` column (nullable `z.string().optional()`) to `reportLayouts` table
- [x] Add `datasetJson` column to `reportLayoutVersions` table alongside existing `schemaJson`
- [x] Keep `reportDefaults` and `reportRuns` unchanged (reference by layout ID — still valid)
- [x] No new tables needed — purely additive change

#### Research Insights — DB Changes

**Why Extend Instead of Replace (code-simplicity):**
- Existing `reportLayouts` table already has: `name`, `moduleId`, `entityId`, `isSystem`, `active`, `versionNo`, `schemaJson`, `createdByUserId`
- Adding `datasetJson` column is a single-field addition — no migration, no FK updates
- `reportDefaults` and `reportRuns` reference `layoutId` — continues working unchanged
- `reportLayoutVersions` already tracks `schemaJson` per version — add `datasetJson` alongside it
- Old layouts with `datasetJson: null` → fall back to `buildGenericDataSet` (backward compatible)

**System Report Protection (data-integrity):**
```ts
// In saveLayoutVersion handler, before updating:
if (existing.isSystem && !context.auth.isSuperAdmin) {
  throw new Error('System reports cannot be modified — use "Copy & Customize" instead')
}
```

### 1.4 — Generic Dataset Executor

**New file:** `src/server/reporting/dataset-executor.ts`

Single function: `executeDataSet(context, definition, params) → ReportDataSet`

- Fetches primary records from `definition.primaryTable` (tenant-scoped)
- For **single** type: fetches by record ID, no row limit
- For **list** type: applies `matchesStructuredFilters` with all operators, user-controlled limit
- For each `type: "related"` field:
  - **Lookup (one-to-one)**: batch-fetch all related records via collected foreign keys, add fields to summary/row as `relatedName_fieldName`
  - **Child lines (one-to-many)**: batch-fetch all matching records via foreign keys, resolve nested lookups, add as `rows`
- Applies default dataset filters merged with user-provided runtime filters
- Returns `ReportDataSet` with `title`, `summary`, `rows`, `suggestedColumns`

Reuses: `matchesStructuredFilters` logic from `src/server/rpc/router/helpers.ts`, `GenericTable` interface (single location), tenant scoping.

#### Research Insights — Executor Implementation

**Architecture (architecture-strategist):**
```
executeDataSet pipeline:
  1. validateDefinition(definition)     → throws on invalid schema
  2. resolveTableAccess(primaryTable)   → checks REPORTING_ALLOWED_TABLES allowlist
  3. fetchPrimaryRows(context, params)  → tenant-scoped, filtered, limited
  4. batchResolveRelations(primaryRows) → breadth-first, level-by-level
  5. flattenSummary(resolvedRows)       → lookup fields → summary object
  6. buildDataSet(flattenedData)        → standard ReportDataSet shape
```

**Tenant Isolation on Relations (security-sentinel — CRITICAL):**
```ts
// EVERY related entity lookup MUST include tenant filter
const relatedRows = relatedTable.findMany({
  where: (row) =>
    readTenantId(row) === tenantId &&   // ← CRITICAL: tenant isolation
    foreignKeys.has(row[joinField])
})
// Without this: tenant A's report could pull tenant B's customer data
```

**O(1) Single-Record Lookups (performance-oracle):**
```ts
// For SINGLE mode (one record by ID):
// Use table.get(id) instead of table.findMany({ where: r => r._id === id })
// Avoids full table scan for single-record fetches
const primaryRow = table.get(recordId)
if (!primaryRow || readTenantId(primaryRow) !== tenantId) {
  throw new Error('Record not found')
}
```

**Circular Dependency Detection (best-practices):**
```ts
// Track visited tables to prevent infinite loops
const visited = new Set<string>()
function resolveRelation(tableName: string, depth: number) {
  const key = `${tableName}:${depth}`
  if (visited.has(key)) throw new Error(`Circular relation detected: ${tableName}`)
  if (depth > HARD_LIMITS.MAX_DEPTH) throw new Error('Max relation depth exceeded')
  visited.add(key)
  // ... resolve ...
}
```

### 1.5 — Built-in Dataset Definitions

**New file:** `src/server/reporting/built-in-datasets.ts`

#### Research Insights — Scope Reduction

**Ship 3 Datasets, Not 9 (code-simplicity — MAJOR):**

Start with the 3 most valuable datasets. Add more incrementally:

| Dataset Key | Primary Table | Type | Lookup Relations | Child Lines |
|------------|--------------|------|-----------------|------------|
| `DOC_SALES_ORDER` | salesHeaders | single | customers (customerId) | salesLines (documentNo) → items (itemId) |
| `DOC_SALES_INVOICE` | salesInvoiceHeaders | single | customers (customerId) | salesInvoiceLines (invoiceNo) → items (itemId) |
| `DOC_POS_RECEIPT` | posTransactions | single | posSessions (posSessionId) | posTransactionLines (transactionId) → items (itemId) |

**Why these 3:**
- Sales Order = most common document, validates the full executor pipeline
- Invoice = proves it works for a different entity with same structure
- POS Receipt = validates thermal format + proves the THERMAL layout path works

**Deferred datasets (add after core is proven):**
- `DOC_PURCHASE_ORDER`, `DOC_TRANSFER_ORDER`, `DOC_SHIPMENT`, `DOC_EMPLOYEE_CARD`, `DOC_BANK_STATEMENT`
- `LIST_GENERIC` — the existing `buildGenericDataSet` already handles this case

**File Naming (pattern-recognition):**
- Use `built-in-datasets.ts` not `built-in-reports.ts` — the file contains dataset definitions, not full reports

### 1.6 — Built-in Document Layout Templates

**File:** `src/server/reporting/template-library.ts`

3 new BC-style layouts (each paired with its dataset). Pattern:
```
Heading → Header KVs (from summary.*) → Spacer → Sub-heading → Table (from rows) → Spacer → Totals KVs → Footer
```

Each layout's keyValue paths reference the fields defined in the paired dataset definition.

#### Research Insights — Layout Templates

**Currency/Date Formatting (pdf-research):**
```ts
// Replace formatValue's naive toFixed(2) with locale-aware formatting:
function formatValue(value: unknown, fieldHint?: string): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'number') {
    // Use field name hints for formatting
    if (fieldHint?.match(/amount|price|total|cost|balance/i)) {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
    }
    return new Intl.NumberFormat('en-US').format(value)
  }
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(value))
  }
  return String(value)
}
```

### 1.7 — Fix keyValue Y-position Bug

**File:** `src/server/reporting/render-document.ts`

Use `doc.heightOfString()` to measure actual text height, then set `doc.y` to below the tallest of key/value.

#### Research Insights — PDF Fix

**Concrete Fix (pdf-research):**
```ts
// Current bug (lines 97-143): uses moveDown(0.2) which doesn't account for wrapped text

// Fix: measure both sides with heightOfString()
} else if (block.kind === 'keyValue') {
  const value = formatValue(resolvePath(root, block.valuePath))
  const x = doc.x
  const y = doc.y
  const keyWidth = pageWidth * 0.35
  const valWidth = pageWidth * 0.65

  const keyHeight = doc.heightOfString(block.key, { width: keyWidth })
  const valueHeight = doc.heightOfString(value, { width: valWidth })
  const rowHeight = Math.max(keyHeight, valueHeight)

  doc.font('Helvetica-Bold').fontSize(baseFontSize)
    .text(block.key, x, y, { width: keyWidth })
  doc.font('Helvetica').fontSize(baseFontSize)
    .text(value, x + keyWidth, y, { width: valWidth })

  doc.y = y + rowHeight + 4  // 4px gap between key-value pairs
}
```

**Multi-Page Table Headers (pdf-research):**
```ts
// Tables that span pages should repeat column headers on each page
// Track page count during row rendering:
for (const row of rows) {
  if (doc.y + rowHeight > doc.page.height - margin) {
    doc.addPage()
    renderTableHeader(doc, columns, colWidths, ...)  // Repeat headers
  }
  // ... render row ...
}
```

**Page Numbering (pdf-research):**
```ts
// After doc.end(), use bufferPages to add page numbers (non-thermal only)
if (!isThermal && doc.bufferedPageRange) {
  const range = doc.bufferedPageRange()
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i)
    doc.font('Helvetica').fontSize(8)
      .text(`Page ${i + 1} of ${range.count}`, 0, doc.page.height - 30, {
        align: 'center', width: doc.page.width,
      })
  }
}
```

**Dynamic Thermal Receipt Height (pdf-research):**
```ts
// Instead of hardcoded 1200pt height, calculate based on content:
if (layout.pageSize === 'THERMAL') {
  const estimatedHeight = estimateContentHeight(layout.blocks, dataSet)
  return { size: [226.77, Math.max(200, estimatedHeight + 40)], layout: 'portrait' }
}
```

### 1.8 — Relax Layout Schema Key Validation

**File:** `src/server/reporting/layout-schema.ts`

Change `key: z.enum(BUILT_IN_LAYOUT_KEYS)` to `key: z.string().min(1).max(50)` so custom layouts can have arbitrary keys.

## Phase 2: Router Integration

### 2.1 — Smart Dispatch in generateReport / previewReport

**File:** `src/server/rpc/router/uplink/reporting.router.ts`

Report generation flow becomes:

```
1. Resolve layout (existing resolveLayout function)
2. Resolve dataset:
   a. If layout has a datasetJson → parse and validate as dataset definition
   b. Else if ids.length === 1 and built-in dataset exists for entity → use built-in dataset
   c. Else → fall back to buildGenericDataSet (existing LIST behavior)
3. Execute dataset definition via generic executor → ReportDataSet
4. Render PDF with layout + dataset → File
```

#### Research Insights — Dispatch Logic

**Two-Way Dispatch, Not Three (code-simplicity):**
```ts
// Only two code paths needed:
function resolveDataSet(context, layout, input): ReportDataSet {
  // Path A: Dataset-driven (new system)
  if (layout.datasetJson) {
    const definition = JSON.parse(layout.datasetJson)
    dataSetDefinitionSchema.parse(definition)  // validate
    return executeDataSet(context, definition, input)
  }
  // Path B: Generic fallback (existing system)
  return buildGenericDataSet(context, input)
}
```

**Auth Rules (security-sentinel):**
- `previewReport` → VIEWER (read-only preview is safe)
- `generateReport` → VIEWER (generating a PDF is read-only)
- `createLayout` / `saveLayoutVersion` → MANAGER (mutations)
- `getAvailableTables` → MANAGER (exposes schema metadata)

### 2.2 — CRUD for Dataset Definitions

**File:** `src/server/rpc/router/uplink/reporting.router.ts`

Extend existing layout CRUD to handle the paired `datasetJson`:
- `createLayout` input: add optional `dataSetDraft` (JSON string of dataset definition)
- `saveLayoutVersion` input: add optional `dataSetDraft` + `expectedVersion` (OCC)
- `getLayout` output: include `dataSet` alongside `layout`
- `listLayouts`: include dataset info in listing

### 2.3 — Add getAvailableTables Endpoint

New read-only RPC endpoint that returns the list of available tables and their fields for the dataset builder UI. Derived from `ENTITY_TABLE_MAP` + schema introspection.

#### Research Insights — Table Exposure

**Security: Table Access Allowlist (security-sentinel — CRITICAL):**
```ts
// NEVER expose ALL tables — only reporting-safe ones
const REPORTING_ALLOWED_TABLES = new Set([
  'salesHeaders', 'salesLines', 'customers', 'items',
  'salesInvoiceHeaders', 'salesInvoiceLines',
  'purchaseHeaders', 'purchaseLines', 'vendors',
  'transferHeaders', 'transferLines',
  'posTransactions', 'posTransactionLines', 'posSessions', 'terminals',
  'employees', 'employeeLedgerEntries',
  'bankAccounts', 'bankAccountLedgerEntries',
  'shipments', 'shipmentMethods',
  'locations', 'itemLedgerEntries', 'valueEntries',
  'glEntries', 'custLedgerEntries',
])

// Tables NEVER exposed (contain credentials, RBAC, internal state):
// tenants, users, userRoles, apiKeys, sessions, reportRuns (meta)

function getAvailableTables(context: RpcContextType) {
  return Object.entries(ENTITY_TABLE_MAP)
    .filter(([_, tableName]) => REPORTING_ALLOWED_TABLES.has(tableName))
    .map(([entityKey, tableName]) => ({
      entityKey,
      tableName,
      fields: detectColumns(sampleRows, 50),  // all fields, not just top 5
    }))
}
```

**Prototype Pollution Prevention in resolvePath (security-sentinel — CRITICAL):**
```ts
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

function resolvePath(root: Record<string, unknown>, path: string): unknown {
  const keys = path.split('.').filter(Boolean)
  let cursor: unknown = root
  for (const key of keys) {
    if (FORBIDDEN_KEYS.has(key)) return undefined  // ← Block prototype pollution
    if (typeof cursor !== 'object' || cursor === null) return undefined
    cursor = (cursor as Record<string, unknown>)[key]
  }
  return cursor
}
```

### 2.4 — Update Exports

**File:** `src/server/reporting/index.ts`

## Phase 3: UI Enhancements

### 3.1 — Dataset Builder Panel

**New file:** `src/app/_shell/_views/hub/reporting/dataset-builder.tsx`

UI for building dataset definitions:
- Select primary table (dropdown of available tables)
- Select type: "single" or "list"
- Add/remove direct fields (from primary table's columns)
- Add related entities:
  - Select related table
  - Configure join field + related join field
  - Add filters (using same operator UI as DataGrid structured filters)
  - Select fields from related table
  - Optionally add nested relateds (max 1 level of nesting in UI)
- Preview data: execute the dataset definition and show results in a data preview table

#### Research Insights — Builder UI

**Progressive Disclosure (report-builder-ui-research):**
```
Tier 1 (always visible): Primary table selector, type toggle, field checkboxes
Tier 2 (expand on click): "Add Related Entity" button → reveals relation config
Tier 3 (advanced, collapsed): Custom filters, nested relations, join field overrides
```

**State Management (report-builder-ui-research):**
```ts
// useReducer with path-based addressing for the field tree
type DatasetAction =
  | { type: 'SET_PRIMARY_TABLE'; table: string }
  | { type: 'SET_TYPE'; datasetType: 'single' | 'list' }
  | { type: 'ADD_FIELD'; path: string[]; field: DirectField }
  | { type: 'REMOVE_FIELD'; path: string[]; index: number }
  | { type: 'ADD_RELATION'; path: string[]; relation: RelatedField }
  | { type: 'UPDATE_FILTER'; path: string[]; filterIndex: number; filter: DataSetFilter }

function datasetReducer(state: DataSetDefinition, action: DatasetAction): DataSetDefinition {
  // Immutable updates using path-based addressing
}
```

**Field Tree Display (report-builder-ui-research):**
- Indented tree with collapsible sections for related entities
- Drag handles for reordering fields within a level
- Checkbox to include/exclude fields
- Badge showing field count per relation

### 3.2 — Update Reporting Center Tabs

**File:** `src/app/_shell/_views/hub/reporting-center.tsx`

#### Research Insights — Tab Structure

**Keep 3 Tabs, Not 4 (code-simplicity):**
```
Templates | Builder | Saved Reports
                ↑
    Builder = Dataset + Layout in split pane (not separate tabs)
```
- **Templates** — built-in report templates (dataset + layout pairs) with "Use Template" / "Copy & Customize"
- **Builder** — split-pane: left = dataset fields/relations, right = layout block editor. Both edit the same report definition.
- **Saved Reports** — existing layout manager, now shows dataset info too

### 3.3 — Template Gallery with Document Templates

**File:** `src/app/_shell/_views/hub/reporting/template-gallery.tsx`

Show built-in templates (3 document initially). Each card shows:
- Template name + description
- Dataset info (primary table, related entities count)
- Layout info (block count, page size)
- "Use Template" button (loads both dataset + layout into builder)
- "Copy & Customize" button (creates editable copy)

Smart recommendations: when entity context is `salesOrders`, promote `DOC_SALES_ORDER`.

### 3.4 — Dynamic Value Paths from Dataset

**File:** `src/app/_shell/_views/hub/reporting/block-configs/key-value.tsx`

Instead of hardcoded `VALUE_PATH_OPTIONS`, generate paths from the active dataset definition:
- Direct fields → `summary.fieldName`
- Lookup related fields → `summary.relatedName.fieldName`
- Computed → `summary.totalAmount`, etc.

### 3.5 — Dynamic Table Columns from Dataset

**File:** `src/app/_shell/_views/hub/reporting/block-configs/table.tsx`

When auto-detecting columns, use the child-line related entity's fields from the dataset definition.

### 3.6 — Update use-report-builder.ts

**File:** `src/app/_shell/_views/hub/reporting/use-report-builder.ts`

Add state for:
- `dataSetDefinition: ReportDataSetDefinition | null`
- `dataSetType: 'single' | 'list'`
- `primaryTable: string`
- Field/relation editing functions

Wire dataset JSON to createLayout/saveLayoutVersion RPC calls.

### 3.7 — Update Constants

**File:** `src/app/_shell/_views/hub/reporting/constants.ts`

Add all entity-specific summary value paths. Also add a `TABLE_FIELD_MAP` that lists available fields per table for the dataset builder dropdowns.

## Files to Create

- [x] `src/server/reporting/dataset-schema.ts` — Zod validation for dataset definitions (2-level concrete, not recursive)
- [x] `src/server/reporting/dataset-executor.ts` — generic dataset execution engine with batch resolution
- [x] `src/server/reporting/built-in-datasets.ts` — 3 pre-configured dataset definitions (Sales Order, Invoice, POS Receipt)
- [x] `src/app/_shell/_views/hub/reporting/dataset-builder.tsx` — dataset builder UI

## Files to Modify

- [x] `src/server/reporting/contracts.ts` — dataset definition types + `BUILT_IN_DATASET_KEYS` const + 3 new layout keys
- [x] `src/server/reporting/template-library.ts` — 3 document layout templates
- [x] `src/server/reporting/layout-schema.ts` — relax key validation
- [x] `src/server/reporting/render-document.ts` — fix keyValue Y bug, multi-page table headers, prototype pollution in resolvePath
- [ ] `src/server/reporting/adapter-registry.ts` — extract `getTable()` accessor, use dataset executor for data fetching
- [x] `src/server/reporting/index.ts` — new exports
- [x] `src/server/db/index.ts` — add `datasetJson` column to `reportLayouts` + `reportLayoutVersions`
- [x] `src/server/rpc/router/uplink/reporting.router.ts` — dataset-aware dispatch + `getAvailableTables` endpoint
- [x] `src/app/_shell/_views/hub/reporting-center.tsx` — dataset builder integrated into Builder tab
- [x] `src/app/_shell/_views/hub/reporting/template-gallery.tsx` — document templates (3 initially)
- [x] `src/app/_shell/_views/hub/reporting/block-configs/key-value.tsx` — dynamic value paths from dataset
- [x] `src/app/_shell/_views/hub/reporting/block-configs/table.tsx` — dynamic columns from dataset
- [x] `src/app/_shell/_views/hub/reporting/use-report-builder.ts` — dataset state management
- [ ] `src/app/_shell/_views/hub/reporting/constants.ts` — table field maps, value paths
- [ ] `data-set.jsonc` — update to camelCase conventions (`relatedModel`, `fields`)

## Files Unchanged

- All 16 card components (already pass `ids: [recordId]`)
- `src/hooks/use-record-report-group.ts`, `use-report-actions.ts`
- Block builder UI components (block-builder.tsx, block-card.tsx)
- Filter builder components (filter-builder.tsx, filter-row.tsx)
- Layout manager, preview panel
- Heading/paragraph/spacer block configs
- `src/server/reporting/entity-adapters/pos-receipt.ts` (still works, eventually replaced by dataset definition)

## Security Checklist

- [x] Add `REPORTING_ALLOWED_TABLES` allowlist — prevent access to RBAC/credential/session tables
- [x] Add `FORBIDDEN_KEYS` check in `resolvePath` — prevent prototype pollution via `__proto__`, `constructor`
- [x] Enforce tenant isolation on ALL related entity lookups — not just primary table
- [x] `getAvailableTables` requires MANAGER role — don't expose schema to VIEWER
- [ ] System reports (`isSystem: true`) cannot be modified — only "Copy & Customize"
- [x] Validate `primaryTable` and all `relatedModel` values against allowlist before execution

## Performance Checklist

- [x] Batch relation resolution (breadth-first, level-by-level) — target: 4 queries not 4,400
- [x] Use `table.get(id)` for single-record lookups (O(1) vs O(n) table scan)
- [x] Index related rows by `_id` in `Map` for O(1) join resolution
- [x] Hard limits: 5,000 primary rows, 2,000 child lines per relation, depth 3
- [x] Operation budget circuit breaker: `rows × fields × depth ≤ 50,000`
- [ ] Remove `bufferPages: true` from PDFKit unless page numbering is needed
- [ ] Consider dynamic thermal receipt height instead of fixed 1200pt

## Verification

1. `bun run typecheck` — no type errors
2. `bun run test` — all tests pass
3. Sales Order card → Report → Download → proper Sales Order PDF (uses DOC_SALES_ORDER dataset + layout)
4. Invoice card → Report → proper Invoice PDF with customer info + line items + totals
5. List view → select multiple → Download → generic list report (LIST dataset fallback)
6. Hub > Reporting → Templates → 3+ templates with "Copy & Customize"
7. Hub > Reporting → Builder tab → build custom dataset (select table, add related, configure joins)
8. Hub > Reporting → create "Customer Sales Report": primary=customers, related=salesHeaders (filtered by customerId), nested related=salesLines
9. All saved reports store both datasetJson + schemaJson
10. POS receipt still works (thermal format)
11. keyValue blocks render with correct Y positioning (no overlap)
12. Multi-page table reports repeat column headers on each page
13. `getAvailableTables` only returns tables from allowlist
14. Related entity lookups enforce tenant isolation
