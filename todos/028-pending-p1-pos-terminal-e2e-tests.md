---
status: pending
priority: p1
issue_id: "028"
tags: [code-review, testing, e2e, pos, revenue, security]
dependencies: ["027"]
---

# Add POS Terminal and Shift Controls E2E Tests

The POS terminal is the revenue collection surface with zero browser E2E test coverage. It has the most complex client-side state machine in the platform (717-line reducer), offline queue persistence, and cash handling governance.

## Problem Statement

The POS terminal view (`src/app/_shell/_views/pos/terminal-view.tsx`) and shift controls (`src/app/_shell/_views/pos/shift-controls.tsx`) have zero Playwright E2E tests. The terminal manages a `useReducer`-based state machine with 20+ action types, localStorage-based offline queue, product search, numpad input, cart manipulation, and payment processing. The shift controls enforce cash variance thresholds requiring manager signoff and refund/void governance with idempotency keys. A UI regression here directly impacts revenue collection.

## Findings

- `src/app/_shell/_views/pos/hooks/use-pos-terminal.ts` is 717 lines with ADD_ITEM, NUMPAD_ENTER, COMPLETE_SALE etc.
- Offline queue uses `window.localStorage` key `uplink.pos.offline.queue.v1` — not encrypted, not user-scoped
- `completeSale` creates transaction header + individual line RPCs sequentially (30-item cart = 32+ requests)
- Shift close with variance > `VARIANCE_APPROVAL_THRESHOLD` (20) requires manager fields but only as client-side check
- Refund/void governance uses idempotency keys but has no browser verification
- Product grid filters 200 items on every keystroke with `Array.filter` + `String.includes`
- Session select dialog, payment dialog, customer search dialog — all untested

## Proposed Solutions

### Option 1: Minimal smoke coverage (fast)

**Approach:** Write 3-4 Playwright tests covering: session selection, adding items to cart, completing a cash sale, and verifying shift close.

**Pros:** Fast to implement, catches critical regressions
**Cons:** Does not cover offline mode, variance governance, or refund flows

**Effort:** Small (1-2 days)
**Risk:** Low

---

### Option 2: Comprehensive POS E2E suite (recommended)

**Approach:** Write 8-10 tests covering the full POS lifecycle: session start, product browsing/search, cart manipulation, numpad input, payment methods, cash sale completion, card sale, refund governance, shift close with variance, and offline queue sync.

**Pros:** Full coverage of revenue-critical paths
**Cons:** Requires more setup (terminal/session seed data, network interception for offline tests)

**Effort:** Medium (3-5 days)
**Risk:** Low

## Recommended Action

Implement Option 2 in phases: start with Option 1's smoke tests, then expand to offline and governance tests.

## Technical Details

**Affected files:**
- `test/e2e/pos/pos-terminal-checkout.spec.ts` — new
- `test/e2e/pos/pos-shift-controls.spec.ts` — new
- `test/e2e/pos/pos-sessions.spec.ts` — new

**Key test scenarios:**
1. Session select dialog opens on mount, allows session selection
2. Product grid renders items, clicking a product adds to cart
3. Numpad input modifies selected line quantity
4. Payment dialog opens, cash payment requires tendered >= total
5. Complete sale succeeds and clears cart
6. Offline sale enqueued to localStorage when backend unavailable
7. Online sync flushes queued sales
8. Shift close rejected when variance > threshold without manager signoff
9. Refund requires COMPLETED transaction, void requires OPEN
10. VIEWER cannot start POS session (role gate)

**Database changes:** None

## Acceptance Criteria

- [ ] POS terminal checkout happy path tested (session -> add items -> pay -> complete)
- [ ] Payment dialog validates cash tendered >= total before enabling completion
- [ ] Shift close with high variance blocked without manager signoff
- [ ] Refund/void governance buttons disabled for wrong transaction states
- [ ] VIEWER role cannot start a POS session in browser
- [ ] Product search filters grid correctly

## Work Log

### 2026-02-27 - Initial Discovery

**By:** Code Review

**Actions:**
- Analyzed POS terminal hook (717 lines), shift controls, and all POS components
- Identified offline queue, variance governance, and payment processing as untested critical paths
- Security review flagged localStorage queue as unencrypted and user-unscoped

**Learnings:**
- POS is architecturally unique — stateful reducer + offline queue + real-time search — needs dedicated test patterns, not just DataGrid POMs

## Resources

- `src/app/_shell/_views/pos/terminal-view.tsx`
- `src/app/_shell/_views/pos/hooks/use-pos-terminal.ts`
- `src/app/_shell/_views/pos/shift-controls.tsx`
- `src/app/_shell/_views/pos/components/payment-dialog.tsx`
