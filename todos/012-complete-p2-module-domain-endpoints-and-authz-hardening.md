---
status: complete
priority: p2
issue_id: "012"
tags: [code-review, architecture, security, functionality]
dependencies: []
---

# Add module-specific domain endpoints and harden authorization boundaries

## Problem Statement

Most module routers are composed exclusively from the same generic tenant-scoped CRUD helper, which limits domain behavior and leaves security boundaries coarse-grained.

## Findings

- Routers are mostly wiring of `createTenantScopedCrudRouter` with no domain services.
  - `src/server/rpc/router/uplink/market.router.ts:4`
  - `src/server/rpc/router/uplink/replenishment.router.ts:4`
  - `src/server/rpc/router/uplink/ledger.router.ts:4`
  - `src/server/rpc/router/uplink/flow.router.ts:4`
  - `src/server/rpc/router/uplink/payroll.router.ts:4`
  - `src/server/rpc/router/uplink/pos.router.ts:4`
  - `src/server/rpc/router/uplink/trace.router.ts:4`
  - `src/server/rpc/router/uplink/hub.router.ts:4`
  - `src/server/rpc/router/uplink/insight.router.ts:4`
- Generic helper uses broad `publicProcedure` for list/create/update/delete/transition operations.
  - `src/server/rpc/router/helpers.ts:169`
  - `src/server/rpc/router/helpers.ts:269`

## Proposed Solutions

### Option 1: Incremental domain endpoints per module

**Approach:** Keep CRUD baseline but add explicit business endpoints (`checkoutCart`, `postInvoice`, `generateReplenishment`, etc.).

**Pros:** Pragmatic, low migration risk.

**Cons:** Mixed style (generic + domain-specific) while transitioning.

**Effort:** Medium

**Risk:** Low

---

### Option 2: Introduce service layer and role-aware procedures

**Approach:** Route handlers delegate to module services; add role/permission checks and narrower procedures.

**Pros:** Better architecture and security posture.

**Cons:** Larger refactor.

**Effort:** Large

**Risk:** Medium

## Recommended Action

Start with Option 1 and include role-aware checks for new endpoints.

## Technical Details

- Add module policy checks (read/write/approve/post scopes).
- Keep tenant scoping, but avoid relying on tenant alone for privileged transitions.

## Resources

- `src/server/rpc/router/helpers.ts`
- `src/server/rpc/router/uplink/*.router.ts`

## Acceptance Criteria

- [x] Each module has at least one domain endpoint beyond CRUD.
- [x] Privileged transitions/actions enforce role-aware authorization.
- [x] Security tests cover unauthorized action attempts.

## Work Log

### 2026-02-23 - Review finding capture

**By:** Codex

**Actions:**
- Audited router composition patterns.
- Identified architectural and security constraints of pure generic CRUD approach.

**Learnings:**
- Domain correctness and security both improve with explicit module operations.

### 2026-02-23 - Implementation complete

**By:** Codex

**Actions:**
- Added role-aware auth context support in `src/server/rpc/init.ts` and shared authz utilities in `src/server/rpc/router/authz.ts`:
  - normalized role model (`VIEWER`, `AGENT`, `MANAGER`, `ADMIN`),
  - reusable `assertRole` gate for privileged actions.
- Hardened generic workflow transitions in `src/server/rpc/router/helpers.ts`:
  - all status transitions now require at least `AGENT`,
  - per-status elevated role requirements supported via `statusRoleRequirements`.
- Applied role-aware transition/action constraints across module routers:
  - `src/server/rpc/router/uplink/market.router.ts`
  - `src/server/rpc/router/uplink/replenishment.router.ts`
  - `src/server/rpc/router/uplink/ledger.router.ts`
  - `src/server/rpc/router/uplink/flow.router.ts`
  - `src/server/rpc/router/uplink/payroll.router.ts`
  - `src/server/rpc/router/uplink/trace.router.ts`
  - `src/server/rpc/router/uplink/hub.router.ts`
  - `src/server/rpc/router/uplink/pos.router.ts`
- Introduced explicit agent-invocable POS domain workflow endpoint:
  - `pos.sessions.startSession` in `src/server/rpc/router/uplink/pos.router.ts`,
  - updated POS session UI to consume server flow in `src/app/_shell/_views/pos/components/session-select-dialog.tsx`.
- Added security/authz coverage:
  - role-aware caller helper updates in `test/uplink/helpers.ts`,
  - unauthorized action tests in `test/uplink/authz-modules.test.ts`.
- Revalidated expanded workflow suite:
  - `test/uplink/cross-module-workflows.test.ts`,
  - `test/uplink/pos-modules.test.ts`.
- Verified with:
  - `bunx biome check --write <touched files>`
  - `bun run test test/uplink/*.test.ts`
  - `bun run typecheck`

**Learnings:**
- Enforcing role checks at both transition and domain-endpoint layers closes broad authorization gaps while preserving existing tenant scoping behavior.

## Notes

This item is foundational for scaling feature depth safely.
