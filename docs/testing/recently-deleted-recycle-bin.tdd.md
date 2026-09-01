# TDD Evidence: Recently Deleted bin for products

**Source plan**: inline plan from `/ecc:plan` (this session), Phase 2. No `*.plan.md` artifact was written.
**Branch**: `fix/recently-deleted-recovery`
**Complexity**: Medium

## Why this work exists

The Orozep catalog was reported as having "suddenly gone to 0" twice, with the two
admins certain neither of them removed anything. Investigation of the live
project found:

- Row Level Security is **off** on `products`, `product_variations`, `categories`,
  `orders`, `site_settings` and 7 other public tables, and `pg_policies` returns
  no policies for them.
- The `anon` role holds full write privileges on those tables.
- The `anon` key that unlocks them ships in the public JS bundle and is also
  hardcoded at `scripts/seed.js:5`.
- `scripts/seed.js:34` clears every product row before re-seeding demo data.
- Six migrations contain an unguarded full-table clear of `products`.
- `OrdersManager.tsx` exposes a "remove ALL orders" action behind `window.confirm`.
- There is no audit table, no `pgaudit`, and no logging trigger anywhere.

Postgres log retention had already lapsed, so **the cause cannot be attributed**.
That is the point of this change: removal stops being destructive, so the next
incident is recoverable regardless of who or what caused it.

A pre-work snapshot was captured with the new `scripts/backup_supabase.mjs`:
325 rows across 15 tables, written to a gitignored `backups/` directory.

## User journeys

| # | Journey |
|---|---|
| J1 | As an admin, when I remove a product it goes to a Recently Deleted bin instead of vanishing, so I can restore it if it was an accident or an attack |
| J2 | As a shopper, I never see a recently-removed product in the shop |
| J3 | As an admin, I can restore a product with its variations and stock intact |
| J4 | As an admin, the bin tells me how long I have left before an item is purged for good |
| J5 | As an admin I open Recently Deleted and see every product I removed, newest first |
| J6 | I can see how many days remain before each item is purged for good |
| J7 | I click Restore and the product leaves the bin and returns to the catalog |
| J8 | An empty bin tells me so, rather than showing a blank screen |

## Task report

### Task 1 — soft-delete predicates (`src/utils/recycleBin.ts`)

Pure module holding `isDeleted`, `isActive`, `partitionByDeletion`,
`daysUntilPurge`, `isPurgeable` and `RECYCLE_BIN_RETENTION_DAYS = 30`. Mirrors
the existing `src/utils/inventory.ts` pattern: pure, documented, single source of
truth, unit-tested.

Two deliberate safety asymmetries, both covered by tests:

- Any **non-blank** `deleted_at` hides the row, even one that will not parse as a
  date. Hiding a row we cannot date is safe; showing a binned product is not.
- A row whose stamp cannot be parsed is **never** purgeable. It is surfaced for a
  human instead of being destroyed automatically.

Validation: `npx vitest run src/utils/__tests__/recycleBin.test.ts`
RED: whole file failed — module did not exist (compile-time RED).
GREEN: 25 passed.

### Task 2 — storefront must not show binned products

`isVisibleOnStorefront` now requires `isActive(product)` in addition to
`available` and sellable stock. Admin surfaces intentionally do **not** use it —
they need binned and sold-out rows visible in order to restore or restock.

Validation: `npx vitest run src/utils/__tests__/inventory.test.ts`
RED excerpt:
```
AssertionError: expected [ 'prod-1', 'prod-6', 'prod-2' ] to deeply equal [ 'prod-1', 'prod-2' ]
```
GREEN: 19 passed.

### Task 3 — `useMenu` removes by UPDATE, and can restore

`deleteProduct` and `deleteVariation` now stamp `deleted_at` instead of clearing
the row. `restoreProduct` clears the stamp. `fetchDeletedProducts` reads the bin
newest-first. Reads filter `deleted_at IS NULL` in SQL for products; binned
variations are filtered while mapping, because a failed embedded PostgREST filter
would silently drop every variation and the join already has a fallback path.

Because no row is ever hard-removed, the cascade from `products` to
`product_variations` no longer fires — which is exactly what makes J3 work.

Validation: `npx vitest run src/hooks/__tests__/useMenu.softDelete.test.ts`
RED: 7 failed — hard removal issued; `restoreProduct` / `fetchDeletedProducts` absent.
GREEN: 7 passed.

### Task 4 — migration

`supabase/migrations/20260901080000_add_soft_delete_recycle_bin.sql` adds two
nullable columns to each table plus three partial indexes: two for the live-row
read path the storefront hits on every page load, one for the bin's newest-first
read.

Applied to the database and verified:
```
products_total 53 | products_live 53 | products_binned 0
variations_live 154 | new_columns 4 | new_indexes 3
```
Purely additive — no row was modified.

### Task 5 — admin Recently Deleted screen (`src/components/RecycleBinManager.tsx`)

The storage layer shipped without any way for an operator to use it. This screen
lists the bin with each product's removal date, stock, and a purge countdown that
turns red inside the last 7 days, plus a one-click restore.

It reuses `daysUntilPurge` rather than recomputing the retention window, and
consumes `useMenu()` — whose `restoreProduct` already refreshes the catalog, so
the extra read is load-bearing rather than waste.

Two deliberate properties, both pinned by tests:

- **No "delete forever" control.** A recovery surface that can itself destroy
  data defeats its own purpose. Items leave the bin only by being restored or by
  ageing out.
- **A failed restore is surfaced and the product stays put**, so the admin can
  retry instead of watching a click do nothing.

Reachable from Quick Actions, placed directly beside Inventory because that is
the screen products get removed from.

Validation: `npx vitest run src/components/__tests__/RecycleBinManager.test.tsx`
RED: `Failed to resolve import "../RecycleBinManager"` (compile-time RED).
GREEN: 13 passed. `npm run build` succeeds.

## Test specification

| # | What is guaranteed | Test file | Type | Result |
|---|---|---|---|---|
| 1 | A non-blank `deleted_at` marks a row as binned; null, absent, empty and whitespace do not | `recycleBin.test.ts:isDeleted` | unit | PASS |
| 2 | `partitionByDeletion` splits rows without mutating the input | `recycleBin.test.ts:partitionByDeletion` | unit | PASS |
| 3 | The purge countdown starts at 30 days, counts down, and clamps at 0 | `recycleBin.test.ts:daysUntilPurge` | unit | PASS |
| 4 | A row is purgeable only after the full window; never while live, never when undateable | `recycleBin.test.ts:isPurgeable` | unit | PASS |
| 5 | A binned product is hidden from the storefront even with stock and `available: true` | `inventory.test.ts:soft-deleted products` | unit | PASS |
| 6 | A restored product returns to the storefront | `inventory.test.ts:soft-deleted products` | unit | PASS |
| 7 | Rows predating the migration (no `deleted_at`) still render | `inventory.test.ts:soft-deleted products` | unit | PASS |
| 8 | Removing a product never issues a hard row removal | `useMenu.softDelete.test.ts` | integration | PASS |
| 9 | Removing stamps a parseable `deleted_at` on the requested id only | `useMenu.softDelete.test.ts` | integration | PASS |
| 10 | Removing a variation is also soft, so restoring brings stock back | `useMenu.softDelete.test.ts` | integration | PASS |
| 11 | Restoring clears both `deleted_at` and `deleted_by` | `useMenu.softDelete.test.ts` | integration | PASS |
| 12 | The catalog query excludes binned rows in SQL, not in JS | `useMenu.softDelete.test.ts` | integration | PASS |
| 13 | The bin screen names itself and lists every binned product | `RecycleBinManager.test.tsx` | component | PASS |
| 14 | Each item shows its remaining days before purge (28 days / 1 day) | `RecycleBinManager.test.tsx` | component | PASS |
| 15 | Every binned product offers a Restore action | `RecycleBinManager.test.tsx` | component | PASS |
| 16 | Restore is called with the id of the product the admin picked | `RecycleBinManager.test.tsx` | component | PASS |
| 17 | A restored item disappears from the bin and the rest remain | `RecycleBinManager.test.tsx` | component | PASS |
| 18 | An empty bin shows an explanatory state, not a blank screen | `RecycleBinManager.test.tsx` | component | PASS |
| 19 | A failed restore is shown to the admin and the product stays put | `RecycleBinManager.test.tsx` | component | PASS |
| 20 | A failed restore with no reason still explains itself | `RecycleBinManager.test.tsx` | component | PASS |
| 21 | The back control returns to the dashboard | `RecycleBinManager.test.tsx` | component | PASS |
| 22 | The bin offers no hard-purge control | `RecycleBinManager.test.tsx` | component | PASS |
| 23 | An item on its last day reads "Purges today" | `RecycleBinManager.test.tsx` | component | PASS |
| 24 | A row with an unreadable date renders and stays restorable | `RecycleBinManager.test.tsx` | component | PASS |

## Coverage

```
npx vitest run --coverage --coverage.include='src/utils/recycleBin.ts' \
  --coverage.include='src/utils/inventory.ts' \
  src/utils/__tests__/recycleBin.test.ts src/utils/__tests__/inventory.test.ts

Statements   : 100% ( 30/30 )
Branches     : 100% ( 24/24 )
Functions    : 100% ( 11/11 )
Lines        : 100% ( 27/27 )
```

```
npx vitest run --coverage --coverage.include='src/components/RecycleBinManager.tsx' \
  src/components/__tests__/RecycleBinManager.test.tsx

Statements   : 97.29% ( 36/37 )
Branches     : 97.05% ( 33/34 )
Functions    : 100% ( 8/8 )
Lines        : 100% ( 33/33 )
```

`@vitest/coverage-v8` was added as a dev dependency; the repo had no coverage
provider installed before this change.

## Known gaps and pre-existing failures

Full suite after this work: **168 passed, 9 failed (177)**.

All 9 failures are pre-existing and unrelated. Verified by checking out `dab5395`
(the commit before any of this work) in a scratch worktree and running the same
two files, which fails the identical 9:

- `src/components/__tests__/MenuItemCard.test.tsx` — 7 failures (variation buttons,
  discount badge, add-to-cart, cart indicator)
- `src/__tests__/App.integration.test.tsx` — 2 failures (add to cart, cart nav)

One regression **was** introduced and fixed within this work: adding the
`.is('deleted_at', null)` filter broke 3 tests in the existing `useMenu.test.ts`
whose mock builder did not model `.is`. The test double was taught the new query
shape; all 7 pass.

Also pre-existing, not addressed here:

- `npm run lint` throws repo-wide on `api/generate-protocol.ts`
  (`TypeError: Cannot read properties of undefined (reading 'allowShortCircuit')`) —
  an eslint 9.36 / typescript-eslint version mismatch.
- `npx tsc --noEmit` reports 163 errors repo-wide, mostly from the untyped
  Supabase `Database` generic. `npm run build` is `vite build` alone and does not
  typecheck. Zero errors remain in the files authored here.

## Not yet done

Removal and recovery are now complete end to end for **products and variations**.
Remaining:

- The other managers (FAQs, couriers, orders, reviews, COAs, promo codes) still
  remove rows outright. They need the same treatment before write grants can be
  tightened globally.
- ~~The typed-confirmation modal ("code before delete")~~ — done for the six
  product and order paths, see `typed-delete-confirmation.tdd.md`. Fourteen
  lower-risk `window.confirm` guards remain.
- Audit-log triggers capturing the full old row, so a future incident is
  attributable.
- The `anon` write-grant lockdown, RLS policies, and key rotation.

**The underlying exposure still stands.** Anyone holding the public key can write
to these tables directly. The bin makes an admin-panel wipe recoverable; it does
not stop someone hitting the API.

## Merge evidence

RED — `c448006` test: add reproducers for the Recently Deleted product bin
      (3 files failed, 9 tests failed, 20 passed)
GREEN — `6329f70` fix: send removed products to a Recently Deleted bin instead of
      destroying them (168 passed, 9 pre-existing failures)
REFACTOR — generic signatures on the recycleBin predicates so real rows and test
      literals both type-check; 51/51 still green, 0 tsc errors in new files.

RED — `564ecdb` test: add reproducers for the admin Recently Deleted bin
      (1 file failed, import unresolved)
GREEN — `6638739` feat: add the admin Recently Deleted bin
      (10/10 on the new file; 178 passed / 9 pre-existing failures; build OK)
REFACTOR — edge-case tests for the last-day, undateable-row and reasonless-failure
      branches; 13/13 green, coverage 97.29% statements / 97.05% branches.
