# Database Definitions Engine

A fully in-memory, reactive database engine with optional Redis persistence. Provides a type-safe, Zod-validated schema definition layer inspired by ERP systems (Microsoft Dynamics 365 Business Central), designed for rapid prototyping and server-side state management.

**~15,400 lines of TypeScript** across 30+ files powering ~40 tables in the Uplink platform.

---

## Architecture at a Glance

```
defineSchema(({ createTable }) => ({
  items: createTable('items', {
    schema: { name: z.string(), price: z.number() },
    seed: 20,
    noSeries: { pattern: 'ITEM0001', field: 'itemNo' },
  }).table().index('name_idx', ['name']).unique('sku_uq', ['sku']),
}), {
  adapter: redisAdapter({ url: '...' }),
  relations: (r) => ({
    items: { sales: r.items.many(r.items._id, r.salesLines.itemId) },
  }),
})
// => { schemas: { items: { insert, update, delete, findMany, paginate, ... } } }
```

### Core Modules

| Module | Purpose |
|---|---|
| `schema.ts` (3,700 LOC) | Orchestrator — sync and async `defineSchema`, wrapped table creation, plugin/observability integration |
| `table.ts` | `ReactiveTable` (sync) and `AsyncReactiveTable` (optimistic updates + rollback) |
| `relations.ts` | Type-safe `one`/`many` relations with automatic inverse inference |
| `no-series.ts` | ERP-style auto-numbering with date placeholders (`PUR-{YYYY}-####`) |
| `query/` | Chainable `QueryBuilder`, `QueryExecutor` pipeline, `RelationLoader` for eager loading |
| `fields/` | FlowFields (declarative aggregations), computed fields (Proxy-based), Zod 4 utilities |
| `adapters/` | `MemoryAdapter` (sync), `RedisAdapter` (Upstash, async), transaction contexts with snapshot rollback |
| `plugins/` | Lifecycle hook system (`before/afterInsert`, `before/afterUpdate`, `before/afterDelete`) |
| `observability/` | Query/mutation/error event tracking with per-table metrics |
| `migrations/` | Sequential migration runner with up/down/latest/rollback and version storage |
| `seeding/` | Faker-based data generation with topological ordering, hierarchical `perParent` seeding, unique constraint handling |
| `errors/` | Structured error hierarchy — `DatabaseError` → `ConstraintError` / `StorageError` / `ValidationError` |
| `types/` | End-to-end type inference for fields, tables, queries, relations, and the full schema |

---

## Pros

### 1. Extremely Fast Prototyping
The entire schema — tables, relations, indexes, seed data, auto-numbering — is declared in a single file. Adding a new table with realistic seed data, FK relations, and a unique index takes ~20 lines. No migrations needed during development; just change the schema and restart.

### 2. End-to-End Type Safety
Zod schemas are the single source of truth. Table insert/update types, query `where` clause operators, `findMany` return types, and `with` relation loading shapes are all inferred automatically. Refactoring a column name produces compile-time errors everywhere it's referenced.

### 3. Rich Query API
SQL-like operators (`eq`, `ne`, `gt`, `like`, `inArray`, `and`, `or`) with a chainable `QueryBuilder` and `findMany`/`findFirst` shorthand. Supports ordering (multi-field, null handling), cursor-based pagination, column projection, and nested eager loading via `with`.

### 4. ERP-Grade Features Out of the Box
- **FlowFields**: Declarative aggregations (`sum`, `count`, `average`, `min`, `max`, `lookup`, `exist`) that compute on read — no denormalization needed.
- **No Series**: Auto-incrementing document numbers with date-aware patterns.
- **Referential integrity**: Cascade/set-null/restrict on delete.
- **Unique constraints**: Enforced on insert and update.
- **History**: Undo/redo with operation stack and snapshots.

### 5. Pluggable Storage
The `StorageAdapter` interface cleanly separates storage from logic. Swap between `MemoryAdapter` (zero-config, instant) for development/testing and `RedisAdapter` (Upstash) for production persistence without changing application code.

### 6. Async Mode with Optimistic Updates
`AsyncReactiveTable` applies writes optimistically to a proxy view while flushing to the adapter in the background. On adapter failure, it rolls back the optimistic state — useful for real-time UIs backed by eventually-consistent storage.

### 7. Built-In Observability
Query/mutation/error hooks with per-table metrics (counts, average durations) that can be wired to any monitoring backend. Enabled at the schema level with zero per-table boilerplate.

### 8. Extensible Plugin System
Lifecycle hooks (`before/afterInsert`, `before/afterUpdate`, `before/afterDelete`, `before/afterClear`) with global or per-table scoping. Plugins receive full context (schemas, table name, document) and can modify data or reject operations.

### 9. Seeding That Actually Works
Faker-based generation that respects Zod types, meta hints (`type: 'email'`, `field: 'commerce.productName'`), unique constraints (retry with suffixes), FK references (topological ordering), hierarchical relationships (`perParent`), and skips computed/auto-generated fields. A realistic 40-table dataset seeds in milliseconds.

### 10. Zero External Dependencies for Core
The in-memory engine needs only Zod and cuid2. Redis, Faker, and other integrations are opt-in at the adapter/seeding layer.

---

## Cons

### 1. `schema.ts` Is a 3,700-Line Monolith
The sync and async `defineSchema` implementations are duplicated in a single file with interleaved wrapped-table creation logic, plugin hooks, observability instrumentation, relation resolution, FlowField computation, and seeding orchestration. This makes the file difficult to navigate, test in isolation, and maintain. Extracting the wrapped table factory and seeding logic into separate modules would improve cohesion.

### 2. Sync/Async Code Duplication
`defineSchemaImpl` (sync) and `defineSchemaImplAsync` (async) are near-identical ~1,500-line functions with the same wrapped-table creation pattern, differing only in `ReactiveTable` vs `AsyncReactiveTable` and `await` insertion. Changes must be applied to both paths, and divergence is inevitable (e.g., transactions only work in sync mode, `createView` only exists in sync mode). A shared factory parameterized on the table class would eliminate this.

### 3. In-Memory by Default — Not a Real Database
All data lives in JavaScript `Map` objects. There are no disk-backed indexes, no WAL, no crash recovery, no concurrent-access guarantees. The Redis adapter provides persistence but not query pushdown — every `findMany` loads the full table into memory first. This works for prototyping and moderate datasets but won't scale to production workloads with large tables.

### 4. FlowFields Are Computed on Every Read
FlowFields use `Proxy` to lazily compute aggregations when a property is accessed. Each access triggers a `findMany` + aggregation on the source table. Iterating over a list of items that each have FlowFields causes O(N) queries per field per item (O(N*M) total). There's a `WeakMap` cache for computed fields but FlowFields bypass it. Materialized/cached aggregations would be needed for any non-trivial dataset.

### 5. No Query Pushdown to Storage
All filtering, ordering, and pagination happens in JavaScript after loading the entire table into memory via `adapter.getAll()`. The `StorageAdapter` interface has no `query` method — even the Redis adapter fetches all rows and filters client-side. This means a `findMany({ where: { status: 'ACTIVE' }, limit: 10 })` on a 100K-row table loads all 100K rows into memory first.

### 6. Transaction Support Is Limited
Sync-mode transactions use snapshot-based rollback (copy the entire table state, restore on error). Async mode throws `NotImplementedError` for transactions entirely. There's no multi-table atomicity guarantee with Redis — a crash mid-write can leave tables in an inconsistent state.

### 7. No Connection Pooling or Concurrency Control
The engine assumes single-process, single-threaded access. There are no locks, no optimistic concurrency control (version fields), and no connection pooling for the Redis adapter. Multiple server instances writing to the same Redis keys will produce race conditions and lost updates.

### 8. Tight Zod 4 Coupling
The type system, validation, meta extraction (`z.globalRegistry`), and trait detection are deeply coupled to Zod 4 internals (`getZodMeta`, `hasZodTrait`, `unwrapOptional`). A Zod major version upgrade would require significant rework across `fields/zod-utils.ts`, `schema.ts`, `seeding/generator.ts`, and the type definitions.

### 9. Migration System Is In-Memory Only
`MigrationRunner` tracks applied versions via `InMemoryVersionStorage` or `TableVersionStorage` (which itself uses a `ReactiveTable`). Neither persists migration state across restarts when using the default memory adapter. This means migrations re-run on every cold start unless the Redis adapter is also used for version storage.

### 10. Testing Requires the Full Engine
There's no way to unit-test a single table's validation or a plugin hook without instantiating the entire `defineSchema` pipeline. The tightly coupled orchestrator makes it difficult to test individual features (e.g., relation loading, FlowField computation) in isolation.

### 11. No Schema Diffing or Auto-Migration
When the Zod schema changes, existing persisted data (in Redis) is not migrated automatically. There's no schema diffing, no `ALTER TABLE` equivalent, and no data coercion layer. Developers must manually write migrations or clear and re-seed — acceptable for prototyping but a gap for any production use.

---

## Summary

| Dimension | Assessment |
|---|---|
| **Prototyping speed** | Excellent — declare and go |
| **Type safety** | Excellent — full inference from Zod to query results |
| **Feature richness** | High — FlowFields, No Series, relations, plugins, observability, seeding |
| **Code maintainability** | Moderate — monolithic schema.ts, sync/async duplication |
| **Scalability** | Low — in-memory, no query pushdown, O(N) reads |
| **Production readiness** | Low — no concurrency control, no crash recovery, no schema migrations |
| **Testability** | Moderate — requires full engine instantiation |

This engine is a strong fit for **rapid prototyping, demos, and development environments** where type safety, realistic seed data, and ERP-style features matter more than raw performance or production durability. For production use, the architecture would need query pushdown to the storage layer, materialized FlowFields, proper transaction support, and schema migration tooling.
