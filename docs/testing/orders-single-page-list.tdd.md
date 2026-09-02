# TDD Evidence — Single-page Order Management list

## Source plan

No `*.plan.md`. The journey below was derived during this TDD run from the
request: "make the orders in the order management in just 1 page no next page
just one page".

## User journey

> As a shop admin, I want every order visible in one continuous list, so that I
> can scan, search and bulk-select without stepping through pages.

## Task report

### 1. Remove pagination from the orders list

- **Summary:** `useOrders` now returns the entire matching result set in one
  pass; `OrdersManager` renders it as one list with a plain total instead of a
  prev/next bar.
- **Constraint honoured:** PostgREST caps a single response at 1000 rows — the
  reason pagination existed. The hook walks the set in `ORDERS_FETCH_CHUNK_SIZE`
  (1000) chunks internally and stitches them together, so the table can still
  grow past the cap without hiding older orders.
- **Chunk-loop termination:** a short chunk, not the reported `count`, ends the
  walk. `count` can shift mid-walk if an order arrives, and a short response is
  the only reliable end-of-list signal.
- **Validation command:** `npx vitest run src/hooks/__tests__/useOrders.test.ts src/components/__tests__/OrdersManager.test.tsx`
- **RED:** `Test Files 2 failed (2) | Tests 13 failed | 8 passed (21)` —
  `ORDERS_FETCH_CHUNK_SIZE` undefined, `page`/`setPage`/`totalPages` still on the
  hook, next/prev buttons still rendered.
- **GREEN:** `Test Files 2 passed (2) | Tests 21 passed (21)`.

## Test specification

| # | What is guaranteed | Test file or command | Test type | Result | Evidence |
|---|--------------------|----------------------|-----------|--------|----------|
| 1 | The list query asks for a full chunk (not a 50-row page), sorted `created_at` desc | `src/hooks/__tests__/useOrders.test.ts:loads every order sorted by created_at desc in a single pass` | unit | PASS | `npx vitest run src/hooks/__tests__/useOrders.test.ts` |
| 2 | A table larger than the 1000-row API cap comes back complete and in order, via successive chunk ranges | `useOrders.test.ts:returns every order on one page, chunking past the API row cap` | unit | PASS | same |
| 3 | Chunk fetching stops on the first short response — no wasted trailing request | `useOrders.test.ts:stops requesting chunks as soon as a short one comes back` | unit | PASS | same |
| 4 | The hook exposes no `page`, `setPage`, `totalPages` or `pageSize` | `useOrders.test.ts:exposes no pagination surface at all` | unit | PASS | same |
| 5 | Changing the status filter refetches the whole filtered set server-side | `useOrders.test.ts:applies a server-side status filter and refetches the whole filtered set` | unit | PASS | same |
| 6 | Deletions that shrink the total leave the admin on a complete, correct list (no empty page to clamp out of) | `useOrders.test.ts:still shows the whole list after deletions shrink the total` | unit | PASS | same |
| 7 | A stale in-flight fetch cannot overwrite a newer one | `useOrders.test.ts:ignores a stale in-flight response when a newer query resolves first` | unit | PASS | same |
| 8 | Every order renders at once with no next/prev controls and no "Page X of Y" | `src/components/__tests__/OrdersManager.test.tsx:lists every order on one page with no next/prev controls` | component | PASS | `npx vitest run src/components/__tests__/OrdersManager.test.tsx` |
| 9 | The footer states the full total ("Showing all 1,234 orders") rather than a page range | `OrdersManager.test.tsx:summarises the full list instead of a page range` | component | PASS | same |
| 10 | Recently Deleted bin behaviour is unaffected by the removal | `src/components/__tests__/OrdersManager.trash.test.tsx` | component | PASS | `npx vitest run src/components/__tests__/OrdersManager.trash.test.tsx` |

## Coverage and known gaps

- `npx vitest run --coverage` over the four orders test files:
  `useOrders.ts` — 89.28% stmts, 65% branch, 100% funcs, 93% lines. Above the
  80% target.
- `npx tsc --noEmit` — clean. `npm run build` — succeeds.
- **Pre-existing failures, untouched by this work:** 9 tests in
  `src/components/__tests__/MenuItemCard.test.tsx` (7) and
  `src/__tests__/App.integration.test.tsx` (2). Verified pre-existing by
  stashing this change and rerunning both files: the same 9 failed.
- **Untested follow-up:** no test asserts wall-clock behaviour on a very large
  table. With one chunk per 1000 orders the list now fetches serially, so a shop
  well past a few thousand orders will feel a slower first paint than the old
  50-row page. Acceptable at the current order volume; revisit with virtualised
  rendering if the table grows an order of magnitude.

## Merge evidence

RED → 13 failed / 8 passed (commit `539f873`).
GREEN → 21 passed / 21 (commit `9856bbe`).
Refactor → stale pagination stubs removed from the trash test, 42 passed / 42.
