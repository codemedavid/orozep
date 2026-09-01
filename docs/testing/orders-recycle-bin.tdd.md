# TDD Evidence: Recently Deleted bin for orders

**Source plan**: follow-on to the products bin; requested directly ("add in the order management a trash").
**Branch**: `fix/recently-deleted-recovery`
**Complexity**: Medium

## Why this work exists

Orders were the last destructive path with no way back. The admin panel could
clear every order in the system — customer names, addresses, phone numbers and
payment proofs included — and nothing could be recovered. The typed
confirmation added earlier said "this cannot be undone", which was accurate at
the time and is the reason this work followed.

## User journeys

| # | Journey |
|---|---|
| J13 | As an admin I can open a bin from Order Management and see every order I deleted |
| J14 | I can see how many days remain before each order is purged |
| J15 | I restore an order and it returns to the orders list with its details intact |
| J16 | The deletion prompt tells me the order is recoverable, because it now is |

## Task report

### Task 1 — `useOrders` owns removal

`OrdersManager` was reaching for `supabase` directly to delete rows. That logic
moved into the hook as `deleteOrders`, `deleteAllOrders`, `fetchDeletedOrders`
and `restoreOrder`, matching the container/presentational split the rest of the
codebase uses.

Two details worth recording:

- **The status-count tiles filter the bin too.** The paged list and the seven
  head-count queries all apply `deleted_at IS NULL`. Filtering only the list
  would leave the tiles claiming orders the table below cannot show.
- **`deleteAllOrders` bins only live rows.** Re-stamping an already binned order
  would reset its countdown and quietly extend the retention window past 30 days.

Validation: `npx vitest run src/hooks/__tests__/useOrders.softDelete.test.ts`
RED: 11 failed (11).
GREEN: 11 passed; the pre-existing `useOrders.test.ts` also stays green at 11.

### Task 2 — the bin view inside Order Management

A "Recently Deleted" control in the orders header opens a view listing binned
orders by order number and customer, with the amount, a purge countdown that
turns red inside the last 7 days, and a one-click restore. A failed restore is
surfaced and the order stays put so it can be retried.

Like the products bin, it offers **no permanent purge control**, and a test pins
that.

Validation: `npx vitest run src/components/__tests__/OrdersManager.trash.test.tsx`
RED: 8 failed | 1 passed (9).
GREEN: 9 passed.

### Task 3 — the prompts now tell the truth

Deletion prompts previously said orders had no bin and could not be recovered.
They now state the 30-day window. A test asserts the prompt mentions
recoverability, so the copy cannot drift back out of step with the behaviour.

### Task 4 — migration

`supabase/migrations/20260901120000_add_orders_soft_delete.sql` adds two nullable
columns plus two partial indexes: one for the live-row read path the orders list
and every count query hit, one for the bin's newest-first read.

Applied and verified:
```
orders_total 25 | orders_live 25 | orders_binned 0
new_columns 2 | new_indexes 2
```
Additive only — no row was modified.

### Task 5 — shared countdown label

`purgeCountdownLabel` moved into `utils/recycleBin` so the products bin and the
orders bin share one implementation rather than two copies drifting apart. Six
unit tests cover the pluralisation, the last day, the elapsed window, and the
two neutral phrases for rows with no readable stamp.

## Test specification

| # | What is guaranteed | Test file | Type | Result |
|---|---|---|---|---|
| 1 | The paged order list excludes binned orders in SQL | `useOrders.softDelete.test.ts` | integration | PASS |
| 2 | The status-count tiles exclude binned orders too | `useOrders.softDelete.test.ts` | integration | PASS |
| 3 | Deleting a selection never issues a hard DELETE | `useOrders.softDelete.test.ts` | integration | PASS |
| 4 | Deleting stamps a parseable `deleted_at` | `useOrders.softDelete.test.ts` | integration | PASS |
| 5 | Only the selected order ids are targeted | `useOrders.softDelete.test.ts` | integration | PASS |
| 6 | An empty selection issues no query at all | `useOrders.softDelete.test.ts` | integration | PASS |
| 7 | "Delete all" bins every order instead of emptying the table | `useOrders.softDelete.test.ts` | integration | PASS |
| 8 | The bin is read newest-removal-first | `useOrders.softDelete.test.ts` | integration | PASS |
| 9 | Restoring clears `deleted_at` and `deleted_by` on that order only | `useOrders.softDelete.test.ts` | integration | PASS |
| 10 | Order Management offers a way into the bin | `OrdersManager.trash.test.tsx` | component | PASS |
| 11 | The bin lists binned orders by number and customer | `OrdersManager.trash.test.tsx` | component | PASS |
| 12 | Each row shows its remaining days | `OrdersManager.trash.test.tsx` | component | PASS |
| 13 | Restore is called with the chosen order's id | `OrdersManager.trash.test.tsx` | component | PASS |
| 14 | A restored order leaves the bin, the rest remain | `OrdersManager.trash.test.tsx` | component | PASS |
| 15 | An empty bin says so | `OrdersManager.trash.test.tsx` | component | PASS |
| 16 | The admin can return to the orders list | `OrdersManager.trash.test.tsx` | component | PASS |
| 17 | The bin offers no permanent purge | `OrdersManager.trash.test.tsx` | component | PASS |
| 18 | The delete prompt says orders are recoverable | `OrdersManager.trash.test.tsx` | component | PASS |
| 19-24 | Countdown label: plural, singular, elapsed, long-expired, unreadable, never-deleted | `recycleBin.test.ts` | unit | PASS |

## Coverage

```
npx vitest run --coverage --coverage.include='src/hooks/useOrders.ts' \
  --coverage.include='src/utils/recycleBin.ts' \
  useOrders.softDelete.test.ts useOrders.test.ts recycleBin.test.ts

Statements   : 89.93% ( 134/149 )
Branches     : 73.01% ( 46/63 )
Functions    : 100% ( 26/26 )
Lines        : 93.18% ( 123/132 )
```

Branch coverage sits below the others because `useOrders` carries pagination,
debounce and race-guard branches that predate this work and are exercised by the
existing suite rather than these tests.

## Known gaps and pre-existing failures

Full suite: **252 passed, 9 failed (261)**. The 9 are the pre-existing
`MenuItemCard` (7) and `App.integration` (2) failures verified at `dab5395`.
`npm run build` succeeds. Type diff against a stashed baseline: **0 new errors**.

Two errors were caught by that diff and fixed: the generated Supabase `Database`
type predates these columns, so the update payloads widened to `never`. Resolved
with the same cast `useMenu.ts` already uses for the products table.

The existing `useOrders.test.ts` mock builder needed teaching `.is/.not/.in/
.update` — the third time a test double has lagged a new query filter in this
branch.

## Not yet done

- Nothing purges the bins yet. Rows past 30 days simply stay; the retention
  window is advertised in the UI but not enforced by a job.
- The `anon` write-grant lockdown remains outstanding. Every recovery path added
  in this branch protects against operator accidents; none of it stops someone
  with the public key writing to these tables directly.
