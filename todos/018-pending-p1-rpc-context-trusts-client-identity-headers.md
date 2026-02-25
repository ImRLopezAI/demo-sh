---
status: completed
priority: p1
issue_id: "018"
tags: [code-review, security, auth, backend]
dependencies: []
---

# Stop Trusting Client Identity Headers in RPC Context

RPC auth context currently trusts unverified client headers and defaults to admin role, creating a critical privilege-escalation risk.

## Problem Statement

Identity and role are constructed from request headers (`x-tenant-id`, `x-user-id`, `x-user-role`) without verification. Missing values fall back to demo defaults including `ADMIN`. Any caller can spoof identity by setting headers.

## Findings

- RPC context directly reads and trusts identity headers (`src/server/rpc/init.ts:11`, `src/server/rpc/init.ts:12`, `src/server/rpc/init.ts:13`).
- Default role is `ADMIN` when header is absent (`src/server/rpc/init.ts:13`).
- Server entrypoint passes raw request headers into context creation (`src/server/index.ts:11`).
- Downstream tenant filtering and role checks rely on this context, so spoofed headers influence authorization behavior.

## Proposed Solutions

### Option 1: Session/JWT-backed auth context (recommended)

**Approach:** Derive `tenantId`, `userId`, and `role` from verified server-side session or signed JWT claims only.

**Pros:**
- Eliminates header spoofing vector
- Standard auth model for route and API security

**Cons:**
- Requires auth integration work
- Requires local dev auth bootstrap updates

**Effort:** 2-4 days

**Risk:** Medium

---

### Option 2: Trusted gateway headers with signature verification

**Approach:** Accept identity headers only when signed by an internal gateway and validated server-side.

**Pros:**
- Works with edge proxy patterns
- Keeps request-shaping compatibility

**Cons:**
- Additional signing infrastructure
- More moving parts than direct session validation

**Effort:** 3-5 days

**Risk:** Medium

---

### Option 3: Fail-closed interim patch

**Approach:** Remove demo defaults and reject requests missing verified identity, while full auth integration is prepared.

**Pros:**
- Immediate risk reduction
- Small code change footprint

**Cons:**
- May disrupt existing local/demo flows
- Still incomplete without durable auth source

**Effort:** 2-6 hours

**Risk:** Low

## Recommended Action

Apply a fail-closed RPC identity model that only accepts trusted server-provided auth context, removes raw identity-header trust, and defaults to non-admin bootstrap role only in non-production server bootstrap paths.

## Technical Details

**Affected files:**
- `src/server/rpc/init.ts`
- `src/server/index.ts`
- `src/server/rpc/router/helpers.ts` (consumes context auth)

**Related components:**
- RPC context initialization
- Tenant and role authorization checks

**Database changes:**
- Migration needed: No

## Resources

- `src/server/rpc/init.ts:11`
- `src/server/rpc/init.ts:13`
- `src/server/index.ts:11`

## Acceptance Criteria

- [x] RPC auth context no longer trusts raw client identity headers
- [x] Requests without verified identity fail with `UNAUTHORIZED`
- [x] No default admin role exists in production code paths
- [x] Automated tests cover header spoofing attempts

## Work Log

### 2026-02-23 - Initial Discovery

**By:** OpenCode

**Actions:**
- Reviewed RPC context initialization and request handling flow
- Verified identity source and fallback behavior
- Assessed impact on downstream tenant and role checks

**Learnings:**
- Auth context integrity is a prerequisite for any route-level security hardening.

### 2026-02-24 - Trusted Context Enforcement Implemented

**By:** Codex

**Actions:**
- Removed direct trust of `x-tenant-id`, `x-user-id`, and `x-user-role` headers in RPC context creation.
- Required trusted explicit auth identity input for context creation; unverified requests now throw `UNAUTHORIZED`.
- Added server bootstrap identity resolver with non-admin default role for non-production runtime fallback.
- Updated runtime and test callers to pass trusted auth identity explicitly.
- Added automated tests covering spoofed identity headers and trusted-context success paths.

**Learnings:**
- Enforcing trusted identity at context boundary gives immediate risk reduction and makes downstream authz enforcement reliable.

## Notes

- Coordinate with issue 019 so authz policies are effective once identity is fixed.
