---
status: completed
priority: p1
issue_id: "019"
tags: [code-review, security, authorization, backend]
dependencies: ["018"]
---

# Enforce Authorization on Generic CRUD Procedures

Generic CRUD endpoints are exposed with `publicProcedure` and lack consistent permission checks for create/update/delete operations.

## Problem Statement

Most entity routers are generated via `createTenantScopedCrudRouter`, where list/get/create/update/delete run as public procedures and rely mostly on tenant checks. Without explicit role/permission enforcement, unauthorized mutation capability is possible when identity is forged or over-permissive.

## Findings

- CRUD procedures are defined as `publicProcedure` in `src/server/rpc/router/helpers.ts:220`, `src/server/rpc/router/helpers.ts:320`, `src/server/rpc/router/helpers.ts:340`, `src/server/rpc/router/helpers.ts:373`.
- `transitionStatus` includes role checks, but core create/update/delete paths do not (`src/server/rpc/router/helpers.ts:397`).
- Module routers compose this helper broadly, including financial and operational entities (`src/server/rpc/router/uplink/ledger.router.ts:12`, `src/server/rpc/router/uplink/ledger.router.ts:25`).

## Proposed Solutions

### Option 1: Permission policy in CRUD router config (recommended)

**Approach:** Extend `CrudRouterConfig` with operation-level permission requirements and enforce with `assertPermission` / `assertRole` inside each handler.

**Pros:**
- Centralized and consistent enforcement
- Works across all modules using shared helper

**Cons:**
- Requires policy definitions for each entity
- Initial rollout can be broad

**Effort:** 3-6 days

**Risk:** Medium

---

### Option 2: Module-level wrapper procedures

**Approach:** Keep helper generic but wrap each generated route in module-specific protected procedures.

**Pros:**
- More incremental and explicit per module
- Lower helper-level complexity

**Cons:**
- Repetitive policy logic
- Higher drift risk between modules

**Effort:** 4-7 days

**Risk:** Medium

---

### Option 3: Temporary write lock

**Approach:** Disable generic write methods for sensitive entities until policy-backed authz is in place.

**Pros:**
- Immediate risk containment
- Clear rollback/allowlist surface

**Cons:**
- Feature impact for affected modules
- Operational overhead for temporary exceptions

**Effort:** 1 day

**Risk:** Low

## Recommended Action

Enforce centralized role policy in the shared CRUD router helper so every generated list/get/create/update/delete/transition/kpi operation has explicit authorization requirements, and document the policy matrix by module/entity.

## Technical Details

**Affected files:**
- `src/server/rpc/router/helpers.ts`
- `src/server/rpc/router/uplink/*.router.ts`
- `src/server/rpc/router/authz.ts`

**Related components:**
- Shared CRUD router factory
- Module entity router composition

**Database changes:**
- Migration needed: No

## Resources

- `src/server/rpc/router/helpers.ts:220`
- `src/server/rpc/router/helpers.ts:320`
- `src/server/rpc/router/helpers.ts:340`
- `src/server/rpc/router/helpers.ts:373`
- `src/server/rpc/router/helpers.ts:397`

## Acceptance Criteria

- [x] Every CRUD operation has explicit authz policy coverage
- [x] Unauthorized write attempts return `FORBIDDEN`
- [x] Existing valid workflows still pass integration tests
- [x] Policy matrix is documented per module/entity

## Work Log

### 2026-02-23 - Initial Discovery

**By:** OpenCode

**Actions:**
- Reviewed CRUD helper handler definitions for authz enforcement
- Compared transition handlers against create/update/delete coverage
- Mapped impact across module routers that rely on helper factory

**Learnings:**
- Shared helpers amplify authz gaps quickly; centralized policy enforcement is needed.

### 2026-02-24 - CRUD Policy Enforcement Completed

**By:** Codex

**Actions:**
- Added explicit `CrudRolePolicy` support to `createTenantScopedCrudRouter` with secure defaults per operation.
- Enforced role checks for `list`, `listViewRecords`, `getById`, `create`, `update`, `delete`, `transitionStatus`, and `kpis`.
- Switched role/permission denial paths to typed `FORBIDDEN` RPC errors.
- Added dedicated tests validating `FORBIDDEN` responses for unauthorized CRUD writes and success for authorized roles.
- Documented module/entity policy coverage in `docs/security/crud-authz-policy-matrix.md`.
- Re-ran uplink integration suites to validate existing workflows continue to pass.

**Learnings:**
- Centralized helper-level enforcement closes broad authz gaps quickly while preserving module workflow behavior.

## Notes

- Depends on issue 018 to ensure identity source is trustworthy.
